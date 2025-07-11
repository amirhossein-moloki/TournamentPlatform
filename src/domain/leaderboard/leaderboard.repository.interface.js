/* eslint-disable no-unused-vars */

/**
 * Interface for a leaderboard repository.
 * Defines methods for managing leaderboard data.
 */
class LeaderboardRepositoryInterface {
  /**
   * Adds or updates a user's score on a specific leaderboard.
   * If the user already exists, their score is updated.
   * If the leaderboard does not exist, it might be created implicitly.
   * @param {string} userId - The ID of the user.
   * @param {string} username - The username of the user (for display on leaderboards).
   * @param {number} score - The score to add or set for the user.
   * @param {string} gameName - The name of the game.
   * @param {string} metric - The metric for ranking (e.g., 'wins', 'score', 'rating').
   * @param {string} period - The time period (e.g., 'daily', 'weekly', 'all_time').
   * @returns {Promise<void>}
   * @throws {Error} If there's an issue updating the score.
   */
  async addScore(userId, username, score, gameName, metric, period) {
    throw new Error('Method not implemented.');
  }

  /**
   * Retrieves a paginated list of leaderboard entries.
   * @param {string} gameName - The name of the game.
   * @param {string} metric - The metric for ranking.
   * @param {string} period - The time period.
   * @param {number} page - The page number (1-indexed).
   * @param {number} limit - The number of entries per page.
   * @returns {Promise<{ entries: Array<{userId: string, username: string, score: number, rank: number}>, totalItems: number }>}
   *          An object containing the list of entries and the total number of items in the leaderboard.
   *          Entries should be ordered by rank (highest score first, typically).
   * @throws {Error} If there's an issue retrieving the leaderboard.
   */
  async getLeaderboard(gameName, metric, period, page, limit) {
    throw new Error('Method not implemented.');
  }

  /**
   * Retrieves a user's rank, score, and surrounding players on a specific leaderboard.
   * @param {string} userId - The ID of the user.
   * @param {string} gameName - The name of the game.
   * @param {string} metric - The metric for ranking.
   * @param {string} period - The time period.
   * @param {number} [surroundingCount=2] - Number of players to fetch above and below the user.
   * @returns {Promise<{rank: number, score: number, userExists: boolean, surrounding: Array<{userId: string, username: string, score: number, rank: number}>} | null>}
   *          An object with the user's rank details, or null if the user is not on the leaderboard.
   *          'userExists' indicates if the user was found.
   *          'surrounding' includes the user themselves if they exist.
   * @throws {Error} If there's an issue retrieving the user's rank.
   */
  async getUserRank(userId, gameName, metric, period, surroundingCount = 2) {
    throw new Error('Method not implemented.');
  }

  /**
   * Optional: Updates user's auxiliary data like username if it changes.
   * Scores are typically updated via addScore.
   * @param {string} userId - The ID of the user.
   * @param {object} dataToUpdate - e.g., { username: 'newUsername' }
   * @returns {Promise<void>}
   */
  // async updateUserData(userId, dataToUpdate) {
  //   throw new Error('Method not implemented.');
  // }

  /**
   * Optional: Removes a user from all leaderboards or specific ones.
   * Useful for GDPR compliance or account deletion.
   * @param {string} userId - The ID of the user.
   * @param {string} [gameName] - Optional: Specific game leaderboard.
   * @param {string} [metric] - Optional: Specific metric.
   * @param {string} [period] - Optional: Specific period.
   * @returns {Promise<void>}
   */
  // async removeUser(userId, gameName, metric, period) {
  //   throw new Error('Method not implemented.');
  // }
}

module.exports = LeaderboardRepositoryInterface;
