/**
 * Represents a single entry on a leaderboard.
 */
class LeaderboardEntry {
  /**
   * @param {string} userId - The ID of the user.
   * @param {string} username - The username of the user.
   * @param {number} score - The score of the user for the given metric.
   * @param {number} rank - The rank of the user on the leaderboard.
   * @param {number} [gamesPlayed] - Optional: Number of games played by the user.
   */
  constructor(userId, username, score, rank, gamesPlayed = undefined) {
    this.userId = userId;
    this.username = username;
    this.score = score; // Renamed from 'value' to 'score' for clarity, will be mapped to 'value' in API response
    this.rank = rank;
    if (gamesPlayed !== undefined) {
      this.gamesPlayed = gamesPlayed;
    }
  }
}

/**
 * Represents the data for a leaderboard.
 */
class Leaderboard {
  /**
   * @param {string} gameName - The name of the game.
   * @param {string} metric - The metric used for ranking (e.g., 'wins', 'score', 'rating').
   * @param {string} period - The time period for the leaderboard (e.g., 'daily', 'weekly', 'all_time').
   * @param {LeaderboardEntry[]} entries - The list of leaderboard entries.
   * @param {number} totalItems - Total number of items in this leaderboard.
   * @param {number} currentPage - The current page number.
   * @param {number} pageSize - The number of items per page.
   * @param {number} totalPages - Total number of pages.
   */
  constructor(gameName, metric, period, entries, totalItems, currentPage, pageSize, totalPages) {
    this.gameName = gameName;
    this.metric = metric;
    this.period = period;
    this.entries = entries; // API schema expects 'leaderboard' for this array
    this.totalItems = totalItems;
    this.currentPage = currentPage;
    this.pageSize = pageSize;
    this.totalPages = totalPages;
  }
}

/**
 * Represents the rank details for a specific user on a leaderboard.
 */
class UserRankDetail {
  /**
   * @param {string} userId - The ID of the user.
   * @param {string} gameName - The name of the game.
   * @param {string} metric - The metric used for ranking.
   * @param {string} period - The time period for the leaderboard.
   * @param {number} rank - The user's rank.
   * @param {number} score - The user's score for the given metric.
   * @param {LeaderboardEntry[]} surrounding - List of entries surrounding the user (e.g., +/- N players).
   */
  constructor(userId, gameName, metric, period, rank, score, surrounding) {
    this.userId = userId;
    this.gameName = gameName;
    this.metric = metric;
    this.period = period;
    this.rank = rank;
    this.score = score; // Renamed from 'value' to 'score' for clarity
    this.surrounding = surrounding;
  }
}

module.exports = {
  LeaderboardEntry,
  Leaderboard,
  UserRankDetail,
};
