const { BadRequestError, NotFoundError } = require('../../../utils/errors');

class UpdateGameUseCase {
  constructor(gameRepository) {
    this.gameRepository = gameRepository;
  }

  async execute(gameId, updateData) {
    if (!gameId) {
      throw new Error('Game ID is required to update a game.');
    }
    if (Object.keys(updateData).length === 0) {
      throw new Error('No update data provided.');
    }

    // Optional: Fetch the game first to ensure it exists, or let repository handle it
    // const existingGame = await this.gameRepository.findById(gameId);
    // if (!existingGame) {
    //   throw new Error(`Game with ID ${gameId} not found.`);
    // }

    // Add validation for updateData here if necessary
    // e.g., prevent changing shortName if it's immutable after creation, or validate data types

    try {
      const updatedGame = await this.gameRepository.update(gameId, updateData);
      if (!updatedGame) {
        // This case might occur if the repository's update method returns null for non-existent ID
        throw new Error(`Game with ID ${gameId} not found or update failed.`);
      }
      return updatedGame; // Should return the updated Game domain entity
    } catch (error) {
      // Handle specific errors, e.g., unique constraint violation if name/shortName is updated to an existing one
      if (error.message.includes('already exists')) {
        throw new Error(`Cannot update game: ${error.message}`);
      }
      throw new Error(`Error updating game ${gameId}: ${error.message}`);
    }
  }
}

module.exports = UpdateGameUseCase;
