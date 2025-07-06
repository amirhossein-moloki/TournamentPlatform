// src/application/use-cases/user/getUserGameProfiles.useCase.js

class GetUserGameProfilesUseCase {
  constructor(userGameProfileRepository) {
    this.userGameProfileRepository = userGameProfileRepository;
  }

  async execute(userId) {
    if (!userId) {
      throw new Error('User ID is required to fetch game profiles.');
    }

    const profiles = await this.userGameProfileRepository.findAllByUserId(userId);
    // Profiles should be an array of UserGameProfile domain entities.
    // The repository should handle joining with Game details if needed by default, or allow options.
    return profiles;
  }
}

module.exports = GetUserGameProfilesUseCase;
