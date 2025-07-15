const redisAdapter = require('../../cache/redis.adapter');
const LeaderboardRepositoryInterface = require('../../../domain/leaderboard/leaderboard.repository.interface');
const { LeaderboardEntry } = require('../../../domain/leaderboard/leaderboard.entity');
const logger = require('../../../utils/logger');

const LEADERBOARD_KEY_PREFIX = 'leaderboard';
const USER_INFO_KEY_PREFIX = 'userinfo'; // For storing username separate from score for efficient updates

class LeaderboardRedisRepository extends LeaderboardRepositoryInterface {
  constructor() {
    super();
    this.redisClient = null;
  }

  setClient(redisClient) {
    this.redisClient = redisClient;
  }

  /**
   * Generates the Redis key for a specific leaderboard.
   * @param {string} gameName - The name of the game.
   * @param {string} metric - The metric for ranking.
   * @param {string} period - The time period.
   * @returns {string} The Redis key.
   */
  _getLeaderboardKey(gameName, metric, period) {
    return `${LEADERBOARD_KEY_PREFIX}:${gameName}:${metric}:${period}`;
  }

  /**
   * Generates the Redis key for storing a user's auxiliary info (like username).
   * @param {string} userId - The ID of the user.
   * @returns {string} The Redis key.
   */
  _getUserInfoKey(userId) {
    return `${USER_INFO_KEY_PREFIX}:${userId}`;
  }

  /**
   * Adds or updates a user's score on a specific leaderboard.
   * Also stores/updates the username in a separate hash for easy retrieval.
   */
  async addScore(userId, username, score, gameName, metric, period) {
    if (typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('User ID must be a non-empty string.');
    }
    if (typeof username !== 'string') { // Username can be empty, but must be string
        throw new Error('Username must be a string.');
    }
    if (typeof score !== 'number' || isNaN(score)) {
        throw new Error('Score must be a valid number.');
    }
    const leaderboardKey = this._getLeaderboardKey(gameName, metric, period);
    const userInfoKey = this._getUserInfoKey(userId);

    try {
      // Store/update username. HSET is idempotent.
      // Storing it separately means we don't have to encode it in the sorted set member,
      // which would make score updates and rank lookups more complex if username changes.
      const redisClient = this._getClient();
      await redisClient.hSet(userInfoKey, 'username', username);
      // TODO: Consider adding other user info if needed, e.g., avatarUrl

      // Add score to the sorted set.
      // Scores are stored as numbers. Higher scores mean better rank.
      await redisClient.zAdd(leaderboardKey, {
        score: score,
        value: userId, // Store userId as the member
      });
      logger.info(`Score updated for user ${userId} (${username}) on leaderboard ${leaderboardKey}: ${score}`);
    } catch (error) {
      logger.error(`Error adding score for user ${userId} on leaderboard ${leaderboardKey}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves a paginated list of leaderboard entries.
   */
  async getLeaderboard(gameName, metric, period, page = 1, limit = 20) {
    const leaderboardKey = this._getLeaderboardKey(gameName, metric, period);
    const start = (page - 1) * limit;
    const stop = start + limit - 1;

    try {
      const redisClient = this._getClient();
      // Get total items for pagination
      const totalItems = await redisClient.zCard(leaderboardKey);
      if (totalItems === 0) {
        return { entries: [], totalItems: 0 };
      }

      // Get user IDs and scores from the sorted set, highest score first
      // ZREVRANGE returns an array of [member1, score1, member2, score2, ...] if WITHSCORES is used with node-redis v4 client.
      // Or an array of {value: member, score: score} objects. Let's check redis client version / behavior.
      // Assuming node-redis v4, `zRangeWithScores` is more explicit or `zRevRange` with `WITHSCORES`
      const results = await redisClient.zRangeWithScores(leaderboardKey, start, stop, { REV: true });
      // results is like: [{value: 'userId1', score: 100}, {value: 'userId2', score: 90}]

      if (!results || results.length === 0) {
        return { entries: [], totalItems };
      }

      const entries = [];
      const userInfoKeys = results.map(result => this._getUserInfoKey(result.value));

      // Fetch usernames. Using MGET on HGETALL fields if possible, or multiple HGETs.
      // For simplicity, let's do multiple HGETs. In high performance scenarios, pipeline or Lua script.
      const usernames = await Promise.all(userInfoKeys.map(key => this.redisClient.hGet(key, 'username')));

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const rank = start + i + 1;
        const username = usernames[i] || `User ${result.value.substring(0, 6)}`; // Fallback username
        entries.push(new LeaderboardEntry(result.value, username, Number(result.score), rank));
      }

      return { entries, totalItems };
    } catch (error) {
      logger.error(`Error retrieving leaderboard ${leaderboardKey}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves a user's rank, score, and surrounding players on a specific leaderboard.
   */
  async getUserRank(userId, gameName, metric, period, surroundingCount = 2) {
    const leaderboardKey = this._getLeaderboardKey(gameName, metric, period);
    let userRank; // 0-indexed from ZREVRANK
    let userScore;

    try {
      const redisClient = this._getClient();
      // Atomically get rank and score
      const pipeline = redisClient.multi();
      pipeline.zRevRank(leaderboardKey, userId);
      pipeline.zScore(leaderboardKey, userId);
      const [rankResult, scoreResult] = await pipeline.exec();

      if (rankResult === null || scoreResult === null) { // User not in leaderboard
        return { rank: -1, score: 0, userExists: false, surrounding: [] };
      }
      userRank = rankResult + 1; // Convert 0-indexed to 1-indexed
      userScore = Number(scoreResult);

      // Determine range for surrounding players
      // Ensure startRank is not negative and endRank is within bounds (though ZREVRANGE handles out of bounds)
      const startRankOffset = Math.max(0, userRank - surroundingCount - 1); // -1 because ZREVRANGE is 0-indexed
      const endRankOffset = userRank + surroundingCount -1; // -1 because ZREVRANGE is 0-indexed

      const surroundingResults = await this.redisClient.zRangeWithScores(leaderboardKey, startRankOffset, endRankOffset, { REV: true });

      const surroundingEntries = [];
      if (surroundingResults && surroundingResults.length > 0) {
         const userInfoKeys = surroundingResults.map(result => this._getUserInfoKey(result.value));
         const usernames = await Promise.all(userInfoKeys.map(key => this.redisClient.hGet(key, 'username')));

        for (let i = 0; i < surroundingResults.length; i++) {
            const result = surroundingResults[i];
            const rank = startRankOffset + i + 1; // Calculate actual rank
            const username = usernames[i] || `User ${result.value.substring(0, 6)}`;
            surroundingEntries.push(new LeaderboardEntry(result.value, username, Number(result.score), rank));
        }
      }

      return {
        rank: userRank,
        score: userScore,
        userExists: true,
        surrounding: surroundingEntries,
      };

    } catch (error) {
      logger.error(`Error retrieving user rank for ${userId} on ${leaderboardKey}:`, error);
      // If error occurs after user rank/score found, but surrounding fails, could return partial.
      // For now, treat as full failure.
      throw error;
    }
  }

  /**
   * Updates a user's username if it changes.
   * This is useful if usernames are mutable and should be reflected on leaderboards.
   * @param {string} userId - The ID of the user.
   * @param {string} newUsername - The new username.
   * @returns {Promise<void>}
   */
  async updateUsername(userId, newUsername) {
    const userInfoKey = this._getUserInfoKey(userId);
    try {
      const redisClient = this._getClient();
      await redisClient.hSet(userInfoKey, 'username', newUsername);
      logger.info(`Username updated for user ${userId} to ${newUsername}`);
    } catch (error) {
      logger.error(`Error updating username for user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = LeaderboardRedisRepository;
