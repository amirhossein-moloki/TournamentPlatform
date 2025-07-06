// src/application/use-cases/game/createGame.useCase.js
const Game = require('../../../domain/game/game.entity.js');

class CreateGameUseCase {
  constructor(gameRepository) {
    this.gameRepository = gameRepository;
  }

  async execute(gameData) {
    // Add validation for gameData here if necessary, or use a validation library
    // Ensure all required fields are present (name, shortName, iconUrl, platforms, supportedModes, winCondition)

    // const game = new Game({ // This is for domain entity, repository should handle persistence details
    //   ...gameData,
    // });
    // For now, repository's create method will receive plain data and return a domain entity

    try {
      const newGame = await this.gameRepository.create(gameData);
      return newGame;
    } catch (error) {
      // Handle specific errors, e.g., unique constraint violation for name/shortName
      if (error.message.includes('already exists')) { // Basic check, can be improved
        throw new Error(`Cannot create game: ${error.message}`);
      }
      throw new Error(`Error creating game: ${error.message}`);
    }
  }
}

module.exports = CreateGameUseCase;
