// src/infrastructure/database/repositories/userGameProfile.repository.js
const IUserGameProfileRepository = require('../../../domain/user/userGameProfile.repository.interface.js');
const UserGameProfile = require('../../../domain/user/userGameProfile.entity.js');
// const Game = require('../../../domain/game/game.entity.js');

class UserGameProfileRepository extends IUserGameProfileRepository.default {
  constructor(userGameProfileModel, gameModel) { // gameModel for including game details
    super();
    this.UserGameProfileModel = userGameProfileModel;
    this.GameModel = gameModel; // Sequelize model for Game
  }

  async upsert(userId, gameId, inGameName) {
    try {
      const [profileModel, created] = await this.UserGameProfileModel.upsert(
        { userId, gameId, inGameName },
        { returning: true } // Ensure the model instance is returned
      );
      // upsert might not run hooks or some validations as smoothly as find/create + update.
      // Test this behavior. `profileModel` here is the Sequelize model instance.
      return UserGameProfile.fromPersistence(profileModel.toJSON());
    } catch (error) {
      // Handle potential errors, e.g., foreign key constraint if userId or gameId is invalid
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        throw new Error('Invalid user or game ID provided.');
      }
      throw error;
    }
  }

  async findByUserIdAndGameId(userId, gameId, { includeGame = false } = {}) {
    const queryOptions = {
      where: { userId, gameId },
    };
    if (includeGame && this.GameModel) {
      queryOptions.include = [{
        model: this.GameModel,
        as: 'game', // Must match 'as' in UserGameProfileModel.associate
      }];
    }

    const profileModel = await this.UserGameProfileModel.findOne(queryOptions);
    if (!profileModel) return null;

    const profileData = profileModel.toJSON();
    // If game was included, it will be under profileData.game
    // The UserGameProfile.fromPersistence needs to handle this if it's to populate a Game entity
    return UserGameProfile.fromPersistence(profileData);
  }

  async findAllByUserId(userId, { includeGame = false } = {}) {
    const queryOptions = {
      where: { userId },
      order: [['updatedAt', 'DESC']], // Example ordering
    };
    if (includeGame && this.GameModel) {
      queryOptions.include = [{
        model: this.GameModel,
        as: 'game',
      }];
    }

    const profileModels = await this.UserGameProfileModel.findAll(queryOptions);
    return profileModels.map(model => UserGameProfile.fromPersistence(model.toJSON()));
  }

  async findAllByGameId(gameId) {
    // This might be useful for leaderboards or game-specific views, not immediately for user profile management
    const profileModels = await this.UserGameProfileModel.findAll({
      where: { gameId },
      // Potentially include User model details here if needed
      // include: [{ model: this.UserModel, as: 'user' }]
    });
    return profileModels.map(model => UserGameProfile.fromPersistence(model.toJSON()));
  }

  async findById(profileId) {
    const profileModel = await this.UserGameProfileModel.findByPk(profileId);
    if (!profileModel) return null;
    return UserGameProfile.fromPersistence(profileModel.toJSON());
  }

  async delete(userId, gameId) {
    const result = await this.UserGameProfileModel.destroy({
      where: { userId, gameId },
    });
    return result > 0; // Returns true if one or more rows were deleted
  }
}

module.exports = UserGameProfileRepository;
