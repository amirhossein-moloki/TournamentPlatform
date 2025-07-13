// src/presentation/controllers/game.controller.js
const httpStatusCodes = require('http-status-codes');
// const CreateGameUseCase = require('../../application/use-cases/game/createGame.useCase.js');
// const GetGameByIdUseCase = require('../../application/use-cases/game/getGameById.useCase.js');
// const ListActiveGamesUseCase = require('../../application/use-cases/game/listActiveGames.useCase.js');
// const UpdateGameUseCase = require('../../application/use-cases/game/updateGame.useCase.js');
// const DeleteGameUseCase = require('../../application/use-cases/game/deleteGame.useCase.js');
const ApiError = require('../../utils/ApiError.js'); // Assuming ApiError utility

class GameController {
  constructor(createGameUseCase, getGameByIdUseCase, listActiveGamesUseCase, updateGameUseCase, deleteGameUseCase) {
    this.createGameUseCase = createGameUseCase;
    this.getGameByIdUseCase = getGameByIdUseCase;
    this.listActiveGamesUseCase = listActiveGamesUseCase;
    this.updateGameUseCase = updateGameUseCase;
    this.deleteGameUseCase = deleteGameUseCase;

    // Bind methods to ensure 'this' context is correct
    this.createGame = this.createGame.bind(this);
    this.getGame = this.getGame.bind(this);
    this.listGames = this.listGames.bind(this);
    this.updateGame = this.updateGame.bind(this);
    this.deleteGame = this.deleteGame.bind(this);
  }

  async createGame(req, res, next) {
    try {
      // TODO: Add input validation (e.g., using Joi) for req.body
      // Required fields: name, shortName, iconUrl, platforms, supportedModes, winCondition
      // Optional: description, bannerUrl, isActive
      const gameData = req.body;
      const game = await this.createGameUseCase.execute(gameData);
      res.status(httpStatusCodes.CREATED).json(game.toPlainObject ? game.toPlainObject() : game);
    } catch (error) {
      next(error);
    }
  }

  async getGame(req, res, next) {
    try {
      const { gameId } = req.params;
      const game = await this.getGameByIdUseCase.execute(gameId);
      if (!game) {
        throw new ApiError(httpStatusCodes.NOT_FOUND, 'Game not found');
      }
      res.status(httpStatusCodes.OK).json(game.toPlainObject ? game.toPlainObject() : game);
    } catch (error) {
      next(error);
    }
  }

  async listGames(req, res, next) {
    try {
      // TODO: Add query param validation if supporting filters, pagination for all games (admins)
      // For now, this lists only active games as per ListActiveGamesUseCase
      const games = await this.listActiveGamesUseCase.execute();
      res.status(httpStatusCodes.OK).json(games.map(g => g.toPlainObject ? g.toPlainObject() : g));
    } catch (error) {
      next(error);
    }
  }

  async updateGame(req, res, next) {
    try {
      const { gameId } = req.params;
      const updateData = req.body;
      // TODO: Add input validation for updateData
      if (Object.keys(updateData).length === 0) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'No update data provided.');
      }
      const updatedGame = await this.updateGameUseCase.execute(gameId, updateData);
      if (!updatedGame) {
        throw new ApiError(httpStatusCodes.NOT_FOUND, 'Game not found or update failed');
      }
      res.status(httpStatusCodes.OK).json(updatedGame.toPlainObject ? updatedGame.toPlainObject() : updatedGame);
    } catch (error) {
      next(error);
    }
  }

  async deleteGame(req, res, next) {
    try {
      const { gameId } = req.params;
      await this.deleteGameUseCase.execute(gameId);
      res.status(httpStatusCodes.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = GameController;
