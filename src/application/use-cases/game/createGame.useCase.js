const { ConflictError, InternalServerError } = require('../../../utils/errors');

class CreateGameUseCase {
  constructor(gameRepository) {
    this.gameRepository = gameRepository;
  }

  async execute(gameData) {
    // gameData includes game details and an array of images
    // The repository will handle the transaction of creating the game and its associated images
    try {
      const newGame = await this.gameRepository.create(gameData);
      return newGame;
    } catch (error) {
      // Handle specific errors, e.g., unique constraint violation for name/shortName
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('A game with this name or short name already exists.');
      }
      throw new InternalServerError(`Error creating game: ${error.message}`);
    }
  }
}

module.exports = CreateGameUseCase;
