// src/domain/game/game.repository.interface.js

/**
 * Interface for Game repository.
 * Defines the contract for any persistence layer implementation for Games.
 */
class IGameRepository {
    /**
     * Creates a new game.
     * @param {object} gameData - The data for the new game.
     * @returns {Promise<import('./game.entity').default>} The created game entity.
     */
    async create(gameData) {
      throw new Error('Method not implemented.');
    }

    /**
     * Creates a new game image.
     * @param {object} imageData - The data for the new game image.
     * @returns {Promise<import('./gameImage.entity').default>} The created game image entity.
     */
    async createImage(imageData) {
      throw new Error('Method not implemented.');
    }

    /**
     * Finds a game by its ID.
     * @param {string} gameId - The ID of the game.
     * @returns {Promise<import('./game.entity').default|null>} The game entity or null if not found.
     */
    async findById(gameId) {
      throw new Error('Method not implemented.');
    }

    /**
     * Finds a game by its short name.
     * @param {string} shortName - The short name of the game.
     * @returns {Promise<import('./game.entity').default|null>} The game entity or null if not found.
     */
    async findByShortName(shortName) {
      throw new Error('Method not implemented.');
    }

    /**
     * Retrieves all games.
     * @param {object} filters - Optional filters (e.g., { isActive: true }).
     * @returns {Promise<import('./game.entity').default[]>} A list of game entities.
     */
    async findAll(filters = {}) {
      throw new Error('Method not implemented.');
    }

    /**
     * Updates an existing game.
     * @param {string} gameId - The ID of the game to update.
     * @param {object} updateData - The data to update.
     * @returns {Promise<import('./game.entity').default|null>} The updated game entity or null if not found.
     */
    async update(gameId, updateData) {
      throw new Error('Method not implemented.');
    }

    /**
     * Deletes a game by its ID.
     * @param {string} gameId - The ID of the game to delete.
     * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
     */
    async delete(gameId) {
      throw new Error('Method not implemented.');
    }
  }

  export default IGameRepository;
