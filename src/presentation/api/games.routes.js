// src/presentation/api/games.routes.js
const express = require('express');
// const GameController = require('../controllers/game.controller.js');
// const { authMiddleware, adminRoleMiddleware } = require('../../middleware/auth.middleware.js');

const router = express.Router();

module.exports = (gameController, authMiddleware, adminRoleMiddleware) => {
    // Public routes
    router.get('/', gameController.listGames);
    // #swagger.tags = ['Games']
    // #swagger.summary = 'List all available games.'
    // #swagger.description = 'Retrieves a paginated list of all games available on the platform. Publicly accessible.'
    // #swagger.parameters['page'] = { in: 'query', description: 'Page number for pagination.', schema: { type: 'integer', default: 1, minimum: 1 } }
    // #swagger.parameters['limit'] = { in: 'query', description: 'Number of games per page.', schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 } }
    // #swagger.parameters['genre'] = { in: 'query', description: 'Filter games by genre.', schema: { type: 'string' } }
    // #swagger.parameters['platform'] = { in: 'query', description: 'Filter games by platform.', schema: { type: 'string' } }
    /* #swagger.responses[200] = {
            description: 'A paginated list of games.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedGamesResponse" } } }
    } */
    /* #swagger.responses[500] = {
            description: 'Internal server error.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */

    router.get('/:gameId', gameController.getGame);
    // #swagger.tags = ['Games']
    // #swagger.summary = 'Get details of a specific game.'
    // #swagger.description = 'Retrieves detailed information about a specific game by its ID. Publicly accessible.'
    // #swagger.parameters['gameId'] = { in: 'path', description: 'ID of the game to retrieve.', required: true, schema: { type: 'string', format: 'uuid' } }
    /* #swagger.responses[200] = {
            description: 'Game details retrieved successfully.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameResponse" } } }
    } */
    /* #swagger.responses[404] = {
            description: 'Game not found.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */
    /* #swagger.responses[500] = {
            description: 'Internal server error.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */


    // Admin routes
    router.post(
        '/',
        authMiddleware, // General authentication
        adminRoleMiddleware, // Role check for admin
        // TODO: Add Joi validation middleware for req.body
        gameController.createGame
    );
    // #swagger.tags = ['Admin - Games']
    // #swagger.summary = 'Create a new game (Admin only).'
    // #swagger.description = 'Adds a new game to the platform. Requires Admin privileges.'
    // #swagger.security = [{ "bearerAuth": [] }]
    /* #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/GameRequest" }
                }
            }
    } */
    /* #swagger.responses[201] = {
            description: 'Game created successfully.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameResponse" } } }
    } */
    /* #swagger.responses[400] = {
            description: 'Validation error (e.g., missing required fields).',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */
    /* #swagger.responses[401] = {
            description: 'Unauthorized (not logged in).',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */
    /* #swagger.responses[403] = {
            description: 'Forbidden (user is not an Admin).',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */
    /* #swagger.responses[500] = {
            description: 'Internal server error.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */

    router.put(
        '/:gameId',
        authMiddleware,
        adminRoleMiddleware,
        // TODO: Add Joi validation middleware for req.body & req.params
        gameController.updateGame
    );
    // #swagger.tags = ['Admin - Games']
    // #swagger.summary = 'Update an existing game (Admin only).'
    // #swagger.description = 'Updates the details of an existing game. Requires Admin privileges.'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.parameters['gameId'] = { in: 'path', description: 'ID of the game to update.', required: true, schema: { type: 'string', format: 'uuid' } }
    /* #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/GameRequest" }
                }
            }
    } */
    /* #swagger.responses[200] = {
            description: 'Game updated successfully.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameResponse" } } }
    } */
    /* #swagger.responses[400] = {
            description: 'Validation error or invalid Game ID.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */
    /* #swagger.responses[401] = {
            description: 'Unauthorized.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */
    /* #swagger.responses[403] = {
            description: 'Forbidden.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */
    /* #swagger.responses[404] = {
            description: 'Game not found.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */
    /* #swagger.responses[500] = {
            description: 'Internal server error.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */

    router.delete(
        '/:gameId',
        authMiddleware,
        adminRoleMiddleware,
        // TODO: Add Joi validation middleware for req.params
        gameController.deleteGame
    );
    // #swagger.tags = ['Admin - Games']
    // #swagger.summary = 'Delete a game (Admin only).'
    // #swagger.description = 'Deletes a game from the platform. Requires Admin privileges.'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.parameters['gameId'] = { in: 'path', description: 'ID of the game to delete.', required: true, schema: { type: 'string', format: 'uuid' } }
    /* #swagger.responses[200] = {
            description: 'Game deleted successfully.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } // Or 204 No Content
    } */
    // #swagger.responses[204] = { description: 'Game deleted successfully (No Content).' }
    /* #swagger.responses[401] = {
            description: 'Unauthorized.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */
    /* #swagger.responses[403] = {
            description: 'Forbidden.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */
    /* #swagger.responses[404] = {
            description: 'Game not found.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */
    /* #swagger.responses[500] = {
            description: 'Internal server error.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    } */

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
