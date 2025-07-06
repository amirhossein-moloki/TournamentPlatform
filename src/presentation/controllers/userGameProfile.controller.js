// src/presentation/controllers/userGameProfile.controller.js
const httpStatusCodes = require('http-status-codes');
const ApiError = require('../../utils/ApiError.js');

class UserGameProfileController {
  constructor(
    upsertUserGameProfileUseCase,
    getUserGameProfilesUseCase,
    getUserGameProfileForGameUseCase
  ) {
    this.upsertUserGameProfileUseCase = upsertUserGameProfileUseCase;
    this.getUserGameProfilesUseCase = getUserGameProfilesUseCase;
    this.getUserGameProfileForGameUseCase = getUserGameProfileForGameUseCase;

    this.upsertProfile = this.upsertProfile.bind(this);
    this.getProfiles = this.getProfiles.bind(this);
    this.getProfileForGame = this.getProfileForGame.bind(this);
  }

  async upsertProfile(req, res, next) {
    try {
      const userId = req.user.id; // Assuming authMiddleware populates req.user
      const { gameId, inGameName } = req.body;

      if (!gameId || !inGameName) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Game ID and In-Game Name are required.');
      }

      const profile = await this.upsertUserGameProfileUseCase.execute(userId, gameId, inGameName);
      res.status(httpStatusCodes.OK).json(profile.toPlainObject ? profile.toPlainObject() : profile);
    } catch (error) {
      if (error.message.includes('not found or is not active')) {
        next(new ApiError(httpStatusCodes.BAD_REQUEST, error.message));
      } else if (error.message.includes('Invalid user or game ID')) {
        next(new ApiError(httpStatusCodes.BAD_REQUEST, error.message));
      } else {
        next(error);
      }
    }
  }

  async getProfiles(req, res, next) {
    try {
      const userId = req.user.id; // Assuming authMiddleware populates req.user
      // const { includeGameDetails } = req.query; // Optional: to include full game details

      // The use case currently doesn't take includeGameDetails,
      // but the repository layer does. This can be an enhancement.
      const profiles = await this.getUserGameProfilesUseCase.execute(userId);
      res.status(httpStatusCodes.OK).json(profiles.map(p => p.toPlainObject ? p.toPlainObject() : p));
    } catch (error) {
      next(error);
    }
  }

  async getProfileForGame(req, res, next) {
    try {
      const userId = req.user.id; // Assuming authMiddleware populates req.user
      const { gameId } = req.params;
      // const { includeGameDetails } = req.query;

      const profile = await this.getUserGameProfileForGameUseCase.execute(userId, gameId);
      if (!profile) {
        throw new ApiError(httpStatusCodes.NOT_FOUND, 'User game profile not found for this game.');
      }
      res.status(httpStatusCodes.OK).json(profile.toPlainObject ? profile.toPlainObject() : profile);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserGameProfileController;
