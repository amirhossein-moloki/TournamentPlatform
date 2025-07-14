const { UserRankDetail } = require('../../../domain/leaderboard/leaderboard.entity');
const { BadRequestError, NotFoundError } = require('../../../utils/errors');

class GetUserRankUseCase {
  /**
   * @param {import('../../../domain/leaderboard/leaderboard.repository.interface')} leaderboardRepository
   */
  constructor(leaderboardRepository) {
    this.leaderboardRepository = leaderboardRepository;
  }

  /**
   * Executes the use case to get a user's rank details.
   * @param {string} userId - The ID of the user.
   * @param {object} queryParams - Parameters for fetching the rank.
   * @param {string} queryParams.gameName - The name of the game.
   * @param {string} queryParams.metric - The metric for ranking.
   * @param {string} queryParams.period - The time period.
   * @param {number} [surroundingCount=2] - Number of players to fetch above and below the user.
   * @returns {Promise<UserRankDetail>}
   */
  async execute(userId, { gameName, metric, period }, surroundingCount = 2) {
    if (!userId || !gameName || !metric || !period) {
      throw new BadRequestError('Missing required parameters for user rank.');
    }

    const rankDetails = await this.leaderboardRepository.getUserRank(
      userId,
      gameName,
      metric,
      period,
      surroundingCount
    );

    if (!rankDetails || !rankDetails.userExists) {
      throw new NotFoundError(`User ${userId} not found on leaderboard for ${gameName} (${metric}, ${period}).`);
    }

    // Adapt LeaderboardEntry structure (score to value) for API response consistency
    const adaptedSurrounding = rankDetails.surrounding.map(entry => ({
        rank: entry.rank,
        userId: entry.userId,
        username: entry.username,
        value: entry.score, // Adapt 'score' to 'value'
        gamesPlayed: entry.gamesPlayed, // Optional
    }));

    return new UserRankDetail(
      userId,
      gameName,
      metric,
      period,
      rankDetails.rank,
      rankDetails.score, // This is user's own score, adapt to 'value' for API response
      adaptedSurrounding
    );
  }
}

module.exports = GetUserRankUseCase;
