class ListActiveGamesUseCase {
  constructor(gameRepository) {
    this.gameRepository = gameRepository;
  }

  async execute() {
    // The repository should handle filtering by isActive: true
    const activeGames = await this.gameRepository.findAll({ isActive: true });
    return activeGames; // Should return an array of Game domain entities
  }
}

module.exports = ListActiveGamesUseCase;
