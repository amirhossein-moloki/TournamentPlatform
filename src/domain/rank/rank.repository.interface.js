/**
 * Interface for a repository that manages Rank data.
 */
class IRankRepository {
  /**
   * Finds a rank by its ID.
   * @param {string} rankId - The ID of the rank to find.
   * @returns {Promise<Rank|null>} The rank object or null if not found.
   */
  async findById(rankId) {
    throw new Error('Method not implemented.');
  }

  /**
   * Finds all ranks.
   * @returns {Promise<Rank[]>} A list of all ranks.
   */
  async findAll() {
    throw new Error('Method not implemented.');
  }

  /**
   * Finds the appropriate rank for a given number of points.
   * @param {number} points - The number of points.
   * @returns {Promise<Rank|null>} The rank object or null if no rank is suitable.
   */
  async findRankByPoints(points) {
    throw new Error('Method not implemented.');
  }
}

module.exports = { IRankRepository };
