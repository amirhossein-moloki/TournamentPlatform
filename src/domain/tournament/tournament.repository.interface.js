/**
 * @interface TournamentRepositoryInterface
 * Defines the contract for tournament data persistence operations.
 * Implementations of this interface will handle the actual database interactions.
 */
class TournamentRepositoryInterface {
  /**
   * Finds a tournament by its ID.
   * @param {string} id - The UUID of the tournament.
   * @returns {Promise<Tournament|null>} The Tournament entity if found, otherwise null.
   *                                    Implementations should handle eager/lazy loading of related entities (participants, matches) as appropriate.
   */
  async findById(id) {
    throw new Error('Method "findById" not implemented.');
  }

  /**
   * Creates a new tournament.
   * @param {Tournament} tournamentEntity - The Tournament entity instance to persist.
   * @returns {Promise<Tournament>} The created Tournament entity.
   */
  async create(tournamentEntity) {
    throw new Error('Method "create" not implemented.');
  }

  /**
   * Updates an existing tournament.
   * @param {string} id - The ID of the tournament to update.
   * @param {object} updateData - An object containing fields to update.
   *                              Example: { name, description, status, currentParticipants, etc. }
   *                              The implementation should only update provided fields.
   * @returns {Promise<Tournament|null>} The updated Tournament entity, or null if not found.
   */
  async update(id, updateData) {
    throw new Error('Method "update" not implemented.');
  }

  /**
   * Deletes a tournament by its ID.
   * Note: Consider implications for related matches and participant records (cascading deletes, archival, etc.).
   * @param {string} id - The ID of the tournament to delete.
   * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
   */
  async delete(id) {
    throw new Error('Method "delete" not implemented.');
  }

  /**
   * Lists all tournaments with pagination and filtering.
   * @param {object} options - Options for listing.
   * @param {number} [options.page=1] - The page number.
   * @param {number} [options.limit=10] - The number of tournaments per page.
   * @param {object} [options.filters] - Optional filters (e.g., { status: 'REGISTRATION_OPEN', gameName: 'Chess' }).
   * @param {string} [options.sortBy='startDate'] - Field to sort by.
   * @param {string} [options.sortOrder='ASC'] - Sort order ('ASC' or 'DESC').
   * @returns {Promise<{tournaments: Tournament[], total: number, page: number, limit: number}>} Paginated list of tournaments.
   */
  async findAll({ page = 1, limit = 10, filters = {}, sortBy = 'startDate', sortOrder = 'ASC' } = {}) {
    throw new Error('Method "findAll" not implemented.');
  }

  /**
   * Adds a participant to a tournament.
   * This typically involves creating a record in a join table (e.g., TournamentParticipants).
   * The repository method might abstract this creation.
   * @param {string} tournamentId - The ID of the tournament.
   * @param {string} userId - The ID of the user participating.
   * @param {object} [additionalData={}] - Any additional data for the participation record (e.g., teamId, registrationDate).
   * @returns {Promise<object|null>} The created participant record or representation, or null if failed.
   */
  async addParticipant(tournamentId, userId, additionalData = {}) {
    throw new Error('Method "addParticipant" not implemented.');
  }

  /**
   * Removes a participant from a tournament.
   * @param {string} tournamentId - The ID of the tournament.
   * @param {string} userId - The ID of the user to remove.
   * @returns {Promise<boolean>} True if removal was successful.
   */
  async removeParticipant(tournamentId, userId) {
    throw new Error('Method "removeParticipant" not implemented.');
  }

  /**
   * Finds a specific participant in a tournament.
   * @param {string} tournamentId - The ID of the tournament.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object|null>} The participant record if found, otherwise null.
   */
  async findParticipant(tournamentId, userId) {
    throw new Error('Method "findParticipant" not implemented.');
  }

  /**
   * Lists all participants for a given tournament.
   * @param {string} tournamentId - The ID of the tournament.
   * @param {object} [options] - Pagination options if needed.
   * @returns {Promise<Array<object>>} An array of participant records/objects.
   */
  async findAllParticipants(tournamentId, options = {}) {
    throw new Error('Method "findAllParticipants" not implemented.');
  }


  // --- Match related methods within Tournament context ---
  // While matches might have their own repository, sometimes it's useful for the
  // TournamentRepository to handle batch creation or retrieval of matches for a tournament.

  /**
   * Adds multiple matches to a tournament (e.g., when generating a bracket).
   * @param {string} tournamentId - The ID of the tournament.
   * @param {Array<Match>} matchEntities - An array of Match entity instances to persist.
   * @returns {Promise<Array<Match>>} The created Match entities.
   */
  async addMatches(tournamentId, matchEntities) {
    throw new Error('Method "addMatches" not implemented.');
  }

  /**
   * Finds a match by its ID within a specific tournament context (optional, could be in MatchRepository).
   * @param {string} tournamentId - The ID of the tournament.
   * @param {string} matchId - The ID of the match.
   * @returns {Promise<Match|null>} The Match entity if found, otherwise null.
   */
  async findMatchById(tournamentId, matchId) {
    throw new Error('Method "findMatchById" not implemented.');
  }

  /**
   * Lists all matches for a given tournament.
   * @param {string} tournamentId - The ID of the tournament.
   * @param {object} [options] - Filtering/sorting options (e.g., by roundNumber).
   * @returns {Promise<Array<Match>>} An array of Match entities.
   */
  async findAllMatches(tournamentId, options = {}) {
    throw new Error('Method "findAllMatches" not implemented.');
  }

  /**
   * Updates a match within a tournament.
   * (Often better in a dedicated MatchRepository, but included for completeness if TRepository handles this).
   * @param {string} matchId - The ID of the match to update.
   * @param {object} updateData - Data to update for the match.
   * @returns {Promise<Match|null>} The updated match or null.
   */
  async updateMatch(matchId, updateData) {
      throw new Error('Method "updateMatch" not implemented.');
  }

}

module.exports = TournamentRepositoryInterface;

// Note:
// The Tournament type referred to in return types is the domain entity `Tournament` from `tournament.entity.js`.
// The Match type is from `match.entity.js`.
// Participant-related methods return generic `object` as the structure of a "participant record"
// can vary (it might be a User entity, a Team entity, or a specific TournamentParticipant entity).
// The decision to include match-related methods here vs. a dedicated MatchRepository depends on
// how aggregates are structured. If Matches are part of the Tournament aggregate root and always
// managed through it, these methods make sense. If Matches can be managed independently,
// a separate MatchRepository would be more appropriate. Given the blueprint, it's common
// to have repositories per primary entity.
// For now, including them here to show a comprehensive interface related to tournaments.
// These can be split out to a MatchRepositoryInterface later if deemed cleaner.
// The `addParticipant` and `removeParticipant` methods imply interaction with a join table
// or a list of participant IDs associated with the tournament.
// The `findAll` method includes sorting options.
