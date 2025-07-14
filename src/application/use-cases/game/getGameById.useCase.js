const { BadRequestError, NotFoundError } = require('../../../utils/errors');

class GetGameByIdUseCase {
  constructor(gameRepository) {
    this.gameRepository = gameRepository;
  }

  async execute(gameId) {
    if (!gameId) {
      throw new Error('Game ID is required to fetch a game.');
    }
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      // Consider throwing a custom NotFoundError or returning null based on application policy
      return null;
    }
    return game; // Should return a Game domain entity
  }
}

module.exports = GetGameByIdUseCase;
