// src/application/use-cases/game/deleteGame.useCase.js

class DeleteGameUseCase {
  constructor(gameRepository) {
    this.gameRepository = gameRepository;
  }

  async execute(gameId) {
    if (!gameId) {
      throw new Error('Game ID is required to delete a game.');
    }

    // Optional: Check if the game is associated with active tournaments before deleting
    // This would require access to TournamentRepository or a domain service.
    // For now, assuming deletion is allowed if gameId is valid.

    const success = await this.gameRepository.delete(gameId);
    if (!success) {
      // This might mean the game was not found, or deletion failed for other reasons.
      // Depending on repository implementation, it might throw an error for not found.
      throw new Error(`Game with ID ${gameId} not found or could not be deleted.`);
    }
    return true; // Or return some confirmation message
  }
}

module.exports = DeleteGameUseCase;
