// src/infrastructure/database/repositories/game.repository.js
const IGameRepository = require('../../../domain/game/game.repository.interface.js');
const Game = require('../../../domain/game/game.entity.js');
const { Op } = require('sequelize'); // For more complex queries if needed

class GameRepository extends IGameRepository {
  constructor(gameModel) {
    super();
    this.GameModel = gameModel;
  }

  async create(gameData) {
    try {
      const newGameModel = await this.GameModel.create(gameData);
      return Game.fromPersistence(newGameModel.toJSON());
    } catch (error) {
      // Handle Sequelize unique constraint errors (e.g., for name, shortName)
      if (error.name === 'SequelizeUniqueConstraintError') {
        // error.errors is an array of validation error items
        const fields = error.errors.map(e => e.path).join(', ');
        throw new Error(`A game with this ${fields} already exists.`);
      }
      throw error; // Re-throw other errors
    }
  }

  async findById(gameId) {
    const gameModel = await this.GameModel.findByPk(gameId);
    if (!gameModel) return null;
    return Game.fromPersistence(gameModel.toJSON());
  }

  async findByShortName(shortName) {
    const gameModel = await this.GameModel.findOne({ where: { shortName } });
    if (!gameModel) return null;
    return Game.fromPersistence(gameModel.toJSON());
  }

  async findAll({ filters = {}, includeInactive = false } = {}) {
    const queryOptions = { where: {} };

    if (!includeInactive) {
      queryOptions.where.isActive = true;
    }

    if (filters.name) {
      queryOptions.where.name = { [Op.iLike]: `%${filters.name}%` };
    }
    if (filters.platform) { // Assuming 'platform' is a string to search within the 'platforms' array
      queryOptions.where.platforms = { [Op.contains]: [filters.platform] }; // For PostgreSQL ARRAY type
    }
    // Add more filters as needed

    const gameModels = await this.GameModel.findAll(queryOptions);
    return gameModels.map(model => Game.fromPersistence(model.toJSON()));
  }

  async update(gameId, updateData) {
    const gameModel = await this.GameModel.findByPk(gameId);
    if (!gameModel) {
      // Or throw a NotFoundError
      return null;
    }
    try {
      const updatedGameModel = await gameModel.update(updateData);
      return Game.fromPersistence(updatedGameModel.toJSON());
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        const fields = error.errors.map(e => e.path).join(', ');
        throw new Error(`Cannot update game: A game with this ${fields} already exists.`);
      }
      throw error;
    }
  }

  async delete(gameId) {
    const gameModel = await this.GameModel.findByPk(gameId);
    if (!gameModel) {
      // Or throw a NotFoundError
      return false;
    }
    // Consider implications: what happens to tournaments associated with this game?
    // onDelete: 'CASCADE' or 'SET NULL' in Tournament model's gameId foreign key handles DB level.
    // Application level checks might be needed (e.g., cannot delete game with active tournaments).
    await gameModel.destroy();
    return true;
  }
}

module.exports = GameRepository;
