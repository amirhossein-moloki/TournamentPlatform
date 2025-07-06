// src/domain/user/userGameProfile.repository.interface.js

/**
 * Interface for UserGameProfile repository.
 * Defines the contract for any persistence layer implementation for UserGameProfiles.
 */
class IUserGameProfileRepository {
    /**
     * Creates or updates a user's game profile (e.g., their in-game name for a specific game).
     * If a profile for the user and game exists, it updates it. Otherwise, it creates a new one.
     * @param {string} userId - The ID of the user.
     * @param {string} gameId - The ID of the game.
     * @param {string} inGameName - The user's in-game name for that game.
     * @returns {Promise<import('./userGameProfile.entity').default>} The created or updated user game profile entity.
     */
    async upsert(userId, gameId, inGameName) {
      throw new Error('Method not implemented.');
    }

    /**
     * Finds a user's game profile by user ID and game ID.
     * @param {string} userId - The ID of the user.
     * @param {string} gameId - The ID of the game.
     * @returns {Promise<import('./userGameProfile.entity').default|null>} The profile entity or null if not found.
     */
    asyncfindByUserIdAndGameId(userId, gameId) {
      throw new Error('Method not implemented.');
    }

    /**
     * Finds all game profiles for a given user.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<import('./userGameProfile.entity').default[]>} A list of game profile entities for the user.
     */
    asyncfindAllByUserId(userId) {
      throw new Error('Method not implemented.');
    }

    /**
     * Finds all game profiles for a given game.
     * @param {string} gameId - The ID of the game.
     * @returns {Promise<import('./userGameProfile.entity').default[]>} A list of game profile entities for the game.
     */
    asyncfindAllByGameId(gameId) {
      throw new Error('Method not implemented.');
    }

    /**
     * Deletes a specific game profile for a user.
     * @param {string} userId - The ID of the user.
     * @param {string} gameId - The ID of the game.
     * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
     */
    async delete(userId, gameId) {
        throw new Error('Method not implemented.');
    }

    /**
     * Finds a user's game profile by its ID.
     * @param {string} profileId - The ID of the user game profile.
     * @returns {Promise<import('./userGameProfile.entity').default|null>} The profile entity or null if not found.
     */
    async findById(profileId) {
        throw new Error('Method not implemented.');
    }
  }

  export default IUserGameProfileRepository;
