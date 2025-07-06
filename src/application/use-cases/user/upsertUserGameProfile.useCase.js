// src/application/use-cases/user/upsertUserGameProfile.useCase.js
const UserGameProfile = require('../../../domain/user/userGameProfile.entity.js'); // For potential validation or domain object creation

class UpsertUserGameProfileUseCase {
  constructor(userGameProfileRepository, gameRepository) {
    this.userGameProfileRepository = userGameProfileRepository;
    this.gameRepository = gameRepository; // To validate gameId
  }

  async execute(userId, gameId, inGameName) {
    if (!userId || !gameId || !inGameName) {
      throw new Error('User ID, Game ID, and In-Game Name are required.');
    }

    // Validate inGameName length or characters if needed (can also be in domain entity)
    if (inGameName.length < 1 || inGameName.length > 100) {
        throw new Error('In-game name must be between 1 and 100 characters.');
    }

    // Check if the game exists and is active
    const game = await this.gameRepository.findById(gameId);
    if (!game || !game.isActive) {
      throw new Error(`Game with ID ${gameId} not found or is not active.`);
    }

    // The repository's upsert method handles create or update logic
    try {
      const userGameProfile = await this.userGameProfileRepository.upsert(userId, gameId, inGameName);
      return userGameProfile; // Returns the UserGameProfile domain entity
    } catch (error) {
      // Handle specific errors, e.g., database errors
      throw new Error(`Error upserting user game profile: ${error.message}`);
    }
  }
}

module.exports = UpsertUserGameProfileUseCase;
