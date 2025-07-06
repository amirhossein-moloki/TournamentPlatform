// src/presentation/api/games.routes.js
const express = require('express');
// const GameController = require('../controllers/game.controller.js');
// const { authMiddleware, adminRoleMiddleware } = require('../../middleware/auth.middleware.js');

const router = express.Router();

module.exports = (gameController, authMiddleware, adminRoleMiddleware) => {
    // Public routes
    router.get('/', gameController.listGames);
    router.get('/:gameId', gameController.getGame);

    // Admin routes
    router.post(
        '/',
        authMiddleware, // General authentication
        adminRoleMiddleware, // Role check for admin
        // TODO: Add Joi validation middleware for req.body
        gameController.createGame
    );
    router.put(
        '/:gameId',
        authMiddleware,
        adminRoleMiddleware,
        // TODO: Add Joi validation middleware for req.body & req.params
        gameController.updateGame
    );
    router.delete(
        '/:gameId',
        authMiddleware,
        adminRoleMiddleware,
        // TODO: Add Joi validation middleware for req.params
        gameController.deleteGame
    );

    return router;
};

// Example of how it might be used in app.js (or a main routes index file):
// import gameRoutesFactory from './games.routes.js';
// import GameController from '../controllers/game.controller.js';
// // ... import use cases and repositories, then instantiate them
// const gameControllerInstance = new GameController(...);
// const authMiddlewareInstance = ...; // your auth middleware
// const adminRoleMiddlewareInstance = ...; // your admin role middleware
//
// app.use('/api/v1/games', gameRoutesFactory(gameControllerInstance, authMiddlewareInstance, adminRoleMiddlewareInstance));

// Note: The actual middleware for auth and admin roles needs to be implemented
// and available. For example:
// export const authMiddleware = (req, res, next) => { /* ... */ };
// export const adminRoleMiddleware = (req, res, next) => { /* ... if (req.user.role === 'Admin') next(); else res.sendStatus(403); ... */ };
// These are simplified. Real auth is more complex.
// Joi validation middleware would also be added here.
// e.g. router.post('/', auth, admin, validate(createGameSchema), gameController.createGame);
