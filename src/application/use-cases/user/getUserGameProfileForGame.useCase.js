const { BadRequestError } = require('../../../utils/errors');

class GetUserGameProfileForGameUseCase {
  constructor(userGameProfileRepository) {
    this.userGameProfileRepository = userGameProfileRepository;
  }

  async execute(userId, gameId) {
    if (!userId || !gameId) {
      throw new BadRequestError('User ID and Game ID are required.');
    }

    const profile = await this.userGameProfileRepository.findByUserIdAndGameId(userId, gameId);

    // if (!profile) {
    //   // Depending on requirements, either return null or throw a NotFoundError
    //   // For example, if this use case is checked before tournament registration,
    //   // returning null might be appropriate for the caller to handle.
    //   return null;
    // }

    return profile; // Returns a UserGameProfile domain entity or null
  }
}

module.exports = GetUserGameProfileForGameUseCase;
