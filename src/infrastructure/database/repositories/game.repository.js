// src/infrastructure/database/repositories/game.repository.js
const IGameRepository = require('../../../domain/game/game.repository.interface.js');
const Game = require('../../../domain/game/game.entity.js');
const { Op } = require('sequelize'); // For more complex queries if needed

class GameRepository extends IGameRepository.default {
  constructor(gameModel, gameImageModel) {
    super();
    this.GameModel = gameModel;
    this.GameImageModel = gameImageModel;
  }

  async create(gameData) {
    const { images, ...gameDetails } = gameData;
    try {
      const newGameModel = await this.GameModel.create(gameDetails, {
        include: [{ model: this.GameImageModel, as: 'images' }]
      });

      if (images && images.length > 0) {
        const imagePromises = images.map(image => this.createImage({ ...image, gameId: newGameModel.id }));
        await Promise.all(imagePromises);
      }

      const gameWithImages = await this.findById(newGameModel.id);
      return gameWithImages;

    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        const fields = error.errors.map(e => e.path).join(', ');
        throw new Error(`A game with this ${fields} already exists.`);
      }
      throw error;
    }
  }

  async createImage(imageData) {
    const newImageModel = await this.GameImageModel.create(imageData);
    return newImageModel.toJSON();
  }

  async findById(gameId) {
    const gameModel = await this.GameModel.findByPk(gameId, {
      include: [{ model: this.GameImageModel, as: 'images' }]
    });
    if (!gameModel) return null;
    return Game.fromPersistence(gameModel.toJSON());
  }

  async findByShortName(shortName) {
    const gameModel = await this.GameModel.findOne({
      where: { shortName },
      include: [{ model: this.GameImageModel, as: 'images' }]
    });
    if (!gameModel) return null;
    return Game.fromPersistence(gameModel.toJSON());
  }

  async findAll({ filters = {}, includeInactive = false } = {}) {
    const queryOptions = {
      where: {},
      include: [{ model: this.GameImageModel, as: 'images' }]
    };

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
    const { images, ...gameDetails } = updateData;
    const gameModel = await this.GameModel.findByPk(gameId);
    if (!gameModel) {
      return null;
    }

    try {
      await gameModel.update(gameDetails);

      if (images) {
        // Simple approach: remove existing and add new ones
        await this.GameImageModel.destroy({ where: { gameId } });
        const imagePromises = images.map(image => this.createImage({ ...image, gameId }));
        await Promise.all(imagePromises);
      }

      const updatedGameWithImages = await this.findById(gameId);
      return updatedGameWithImages;

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
