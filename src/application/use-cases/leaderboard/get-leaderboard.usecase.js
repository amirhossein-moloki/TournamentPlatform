const { Leaderboard } = require('../../../domain/leaderboard/leaderboard.entity');
const { BadRequestError } = require('../../../utils/errors');

class GetLeaderboardUseCase {
  /**
   * @param {import('../../../domain/leaderboard/leaderboard.repository.interface')} leaderboardRepository
   */
  constructor(leaderboardRepository) {
    this.leaderboardRepository = leaderboardRepository;
  }

  /**
   * Executes the use case to get a leaderboard.
   * @param {object} queryParams - Parameters for fetching the leaderboard.
   * @param {string} queryParams.gameName - The name of the game.
   * @param {string} queryParams.metric - The metric for ranking.
   * @param {string} queryParams.period - The time period.
   * @param {number} queryParams.page - The page number.
   * @param {number} queryParams.limit - The number of entries per page.
   * @returns {Promise<Leaderboard>}
   */
  async execute({ gameName, metric, period, page, limit }) {
    if (!gameName || !metric || !period || !page || !limit) {
      throw new BadRequestError('Missing required query parameters for leaderboard.');
    }

    const { entries, totalItems } = await this.leaderboardRepository.getLeaderboard(
      gameName,
      metric,
      period,
      page,
      limit
    );

    const totalPages = Math.ceil(totalItems / limit) || 1; // Ensure totalPages is at least 1

    // The API response schema expects 'leaderboard' for the list of entries,
    // and 'value' for the score field inside each entry.
    // The LeaderboardEntity uses 'entries' and 'score'. We adapt here.
    const adaptedEntries = entries.map(entry => ({
        rank: entry.rank,
        userId: entry.userId,
        username: entry.username,
        value: entry.score, // Adapt 'score' to 'value' for API response
        gamesPlayed: entry.gamesPlayed, // Optional, pass through if exists
    }));

    return new Leaderboard(
      gameName,
      metric,
      period,
      adaptedEntries, // Use adapted entries
      totalItems,
      page,
      limit, // This is pageSize in the API response
      totalPages
    );
  }
}

module.exports = GetLeaderboardUseCase;
