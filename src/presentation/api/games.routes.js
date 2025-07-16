const router = require('express').Router();
const { authenticateToken, authorizeRole } = require('../../middleware/auth.middleware');
const { UserRoles } = require('../../domain/user/user.entity');
const validate = require('../../middleware/validation.middleware');
const { gameIdParamSchema, gamePayloadSchema, listGamesSchema } = require('../validators/game.validator');


module.exports = ({ gameController }) => {
    // --- Routes ---

    // Create a new game (Admin only)
    router.post('/', authenticateToken, authorizeRole([UserRoles.ADMIN]), validate(gamePayloadSchema), gameController.createGame);
    /*  #swagger.tags = ['Games']
        #swagger.summary = 'Create a new game (Admin only)'
        #swagger.description = 'Allows an Admin to add a new game to the platform.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.requestBody = {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/Game" } } } // Assuming Game schema matches GameBase + id, createdAt, updatedAt
        }
        #swagger.responses[201] = {
            description: 'Game created successfully.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/Game" } } }
        }
        #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
        #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
    */

    // Get a list of all games (Public, can filter by isActive)
    router.get('/', validate(listGamesSchema), gameController.listGames);
    /*  #swagger.tags = ['Games']
        #swagger.summary = 'Get a list of games'
        #swagger.description = 'Retrieves a paginated list of games, optionally filtered by active status.'
        #swagger.parameters['page'] = { $ref: '#/components/parameters/PageParam' }
        #swagger.parameters['limit'] = { $ref: '#/components/parameters/LimitParam' }
        #swagger.parameters['isActive'] = { in: 'query', schema: { type: 'boolean' }, description: 'Filter by active status.' }
        #swagger.parameters['sortBy'] = { in: 'query', schema: { type: 'string' }, description: 'Sort by field (e.g., name:asc).' }
        #swagger.responses[200] = {
            description: 'A list of games.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedGamesResponse" } } } // Define PaginatedGamesResponse
        }
        #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    */

    // Get a specific game by ID (Public)
    router.get('/:id', validate(gameIdParamSchema), gameController.getGameById);
    /*  #swagger.tags = ['Games']
        #swagger.summary = 'Get game details by ID'
        #swagger.description = 'Retrieves detailed information for a specific game.'
        #swagger.parameters['id'] = { $ref: '#/components/parameters/GameIdPath' } // Ensure GameIdPath is defined in components
        #swagger.responses[200] = {
            description: 'Game details retrieved successfully.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/Game" } } }
        }
        #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
    */

    // Update a game by ID (Admin only)
    router.put('/:id', authenticateToken, authorizeRole([UserRoles.ADMIN]), validate(gameIdParamSchema), validate(gamePayloadSchema), gameController.updateGame);
    /*  #swagger.tags = ['Games']
        #swagger.summary = 'Update a game by ID (Admin only)'
        #swagger.description = 'Allows an Admin to update an existing game.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { $ref: '#/components/parameters/GameIdPath' }
        #swagger.requestBody = {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/Game" } } } // Can reuse Game schema or a specific UpdateGameRequest
        }
        #swagger.responses[200] = {
            description: 'Game updated successfully.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/Game" } } }
        }
        #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
        #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
        #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
    */

    // Delete a game by ID (Admin only)
    router.delete('/:id', authenticateToken, authorizeRole([UserRoles.ADMIN]), validate(gameIdParamSchema), gameController.deleteGame);
    /*  #swagger.tags = ['Games']
        #swagger.summary = 'Delete a game by ID (Admin only)'
        #swagger.description = 'Allows an Admin to delete a game.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { $ref: '#/components/parameters/GameIdPath' }
        #swagger.responses[200] = {
            description: 'Game deleted successfully.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponseMessage" } } }
        }
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
        #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
        #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
    */

    return router;
};
