// src/domain/tournament/match.repository.interface.js

/**
 * @interface MatchRepositoryInterface
 */
class MatchRepositoryInterface {
  /**
   * Creates a new match.
   * @param {Match} matchEntity - The match entity to create.
   * @param {object} [options] - Database transaction options.
   * @returns {Promise<Match>} The created match entity.
   * @throws {ApiError} If an error occurs.
   */
  async create(matchEntity, options) {
    throw new Error('Method not implemented.');
  }

  /**
   * Creates multiple matches in bulk.
   * @param {Match[]} matchEntities - An array of match entities to create.
   * @param {object} [options] - Database transaction options.
   * @returns {Promise<Match[]>} An array of created match entities.
   * @throws {ApiError} If an error occurs.
   */
  async createBulk(matchEntities, options) {
    throw new Error('Method not implemented.');
  }

  /**
   * Finds a match by its ID.
   * @param {string} matchId - The ID of the match.
   * @param {object} [options] - Database transaction options.
   * @returns {Promise<Match|null>} The match entity or null if not found.
   */
  async findById(matchId, options) {
    throw new Error('Method not implemented.');
  }

  /**
   * Updates a match by its ID.
   * @param {string} matchId - The ID of the match to update.
   * @param {object} updateData - The data to update the match with.
   * @param {object} [options] - Database transaction options.
   * @returns {Promise<Match|null>} The updated match entity or null if not found or not updated.
   */
  async updateById(matchId, updateData, options) {
    throw new Error('Method not implemented.');
  }

  /**
   * Deletes a match by its ID.
   * @param {string} matchId - The ID of the match to delete.
   * @param {object} [options] - Database transaction options.
   * @returns {Promise<boolean>} True if deleted, false otherwise.
   */
  async deleteById(matchId, options) {
    throw new Error('Method not implemented.');
  }

  /**
   * Finds all matches for a given tournament.
   * @param {string} tournamentId - The ID of the tournament.
   * @param {object} [options] - Query and database transaction options (e.g., round, status, transaction).
   * @returns {Promise<Match[]>} An array of match entities.
   */
  async findByTournamentId(tournamentId, options) {
    throw new Error('Method not implemented.');
  }

  /**
   * Finds matches involving a specific participant.
   * @param {string} participantId - The ID of the participant.
   * @param {object} [options] - Query and database transaction options (e.g., status, tournamentId, limit, offset, transaction).
   * @returns {Promise<Match[]>} An array of match entities.
   */
  async findByParticipantId(participantId, options) {
    throw new Error('Method not implemented.');
  }
}

module.exports = MatchRepositoryInterface;
