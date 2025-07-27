const router = require('express').Router();
const { authenticateToken, authorizeRole } = require('../../middleware/auth.middleware');
const { UserRoles } = require('../../domain/user/user.entity'); // Corrected path
const validate = require('../../middleware/validation.middleware');
const {
  createTournamentSchema,
  listTournamentsSchema,
  tournamentIdParamSchema,
  getTournamentSchema,
} = require('../validators/tournament.validator');


module.exports = ({ tournamentController }) => {
    // --- Routes ---

    // Create a new tournament (Admin only)
    router.post('/', authenticateToken, authorizeRole([UserRoles.ADMIN]), validate(createTournamentSchema), tournamentController.createTournament);
    /*  #swagger.tags = ['Tournaments']
        #swagger.summary = 'Create a new tournament (Admin only)'
        #swagger.description = 'Allows an Admin to create a new tournament.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.requestBody = {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/TournamentCreationRequest" } } }
        }
        #swagger.responses[201] = {
            description: 'Tournament created successfully.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/TournamentResponseFull" } } }
        }
        #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
        #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
        #swagger.responses[404] = { description: 'Game ID not found.', schema: { $ref: '#/components/schemas/ErrorResponse' } }
    */

    // Get a list of all tournaments (Public)
    router.get('/', validate(listTournamentsSchema), tournamentController.listTournaments);
    /*  #swagger.tags = ['Tournaments']
        #swagger.summary = 'Get a list of tournaments'
        #swagger.description = 'Retrieves a paginated list of tournaments. Can be filtered and sorted.'
        #swagger.parameters['page'] = { $ref: '#/components/parameters/PageParam' }
        #swagger.parameters['limit'] = { $ref: '#/components/parameters/LimitParam' }
        #swagger.parameters['status'] = { in: 'query', schema: { type: 'string', enum: ['PENDING', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED', 'CANCELED'] }, description: 'Filter by tournament status.' }
        #swagger.parameters['gameName'] = { in: 'query', schema: { type: 'string' }, description: 'Filter by game name.' }
        #swagger.parameters['sortBy'] = { in: 'query', schema: { type: 'string', enum: ['startDate', 'name', 'entryFee', 'prizePool'] }, description: 'Field to sort by.' }
        #swagger.parameters['sortOrder'] = { in: 'query', schema: { type: 'string', enum: ['ASC', 'DESC'] }, description: 'Sort order.' }
        #swagger.responses[200] = {
            description: 'A list of tournaments.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedTournamentsResponse" } } }
        }
        #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    */

    // Get a specific tournament by ID (Public)
    router.get('/:id', validate(getTournamentSchema), tournamentController.getTournamentById);
    /*  #swagger.tags = ['Tournaments']
        #swagger.summary = 'Get tournament details by ID'
        #swagger.description = 'Retrieves detailed information for a specific tournament.'
        #swagger.parameters['id'] = { $ref: '#/components/parameters/TournamentIdPath' }
        #swagger.parameters['include'] = { in: 'query', schema: { type: 'string' }, description: 'Comma-separated list of relations to include (e.g., "participants,matches").' }
        #swagger.responses[200] = {
            description: 'Tournament details retrieved successfully.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/TournamentResponseFull" } } }
        }
        #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
    */

    // Register for a tournament
    router.post('/:id/register', authenticateToken, validate(tournamentIdParamSchema), tournamentController.registerForTournament);
    /*  #swagger.tags = ['Tournaments']
        #swagger.summary = 'Register for a tournament'
        #swagger.description = 'Allows an authenticated user to register for an open tournament.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { $ref: '#/components/parameters/TournamentIdPath' }
        #swagger.responses[200] = {
            description: 'Successfully registered for the tournament.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/TournamentRegistrationResponse" } } }
        }
        #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' } // e.g., registration not open, already registered, tournament full
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
        #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' } // e.g., user does not meet entry criteria
        #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
    */

    router.post('/:id/decide', authenticateToken, checkRole(UserRoles.TOURNAMENT_MANAGER), tournamentController.decideTournament);
    /*  #swagger.tags = ['Tournaments']
        #swagger.summary = 'Decide on a tournament (Tournament Manager)'
        #swagger.description = 'Allows a tournament manager to start or cancel a tournament that is awaiting decision.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { $ref: '#/components/parameters/TournamentIdPath' }
        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            decision: { type: "string", enum: ["start", "cancel"] }
                        }
                    }
                }
            }
        }
        #swagger.responses[200] = { description: 'Decision processed successfully.' }
        #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
        #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
        #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
    */

    return router;
};
