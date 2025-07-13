const router = require('express').Router();
const { Joi, validate } = require('express-validation');
const { tournamentController } = require('../../config/dependencies');
const { authenticateToken, authorizeRole } = require('../../middleware/auth.middleware');
const { UserRoles } = require('../../domain/user/user.entity'); // Corrected path

// Joi validation schemas
const createTournamentSchema = {
    body: Joi.object({
        name: Joi.string().min(3).max(100).required(),
        gameId: Joi.string().uuid().required(),
        description: Joi.string().max(1000).optional().allow('', null),
        rules: Joi.string().max(5000).optional().allow('', null),
        entryFee: Joi.number().min(0).required(),
        // entryFeeType: Joi.string().valid(...Object.values(Tournament.EntryFeeType)).default(Tournament.EntryFeeType.FREE), // Assuming Tournament entity is available
        // prizeType: Joi.string().valid(...Object.values(Tournament.PrizeType)).default(Tournament.PrizeType.NONE), // Assuming Tournament entity is available
        prizePool: Joi.number().min(0).required(),
        maxParticipants: Joi.number().integer().min(2).max(1024).required(), // Example: min 2, max 1024
        startDate: Joi.date().iso().greater('now').required(),
        endDate: Joi.date().iso().greater(Joi.ref('startDate')).optional().allow(null),
        organizerId: Joi.string().uuid().optional().allow(null),
        // New fields for Phase 1
        entryFeeType: Joi.string().valid('FREE', 'PAID_CASH', 'PAID_INGAME_CURRENCY').default('FREE'),
        prizeType: Joi.string().valid('NONE', 'CASH', 'PHYSICAL_ITEM', 'INGAME_ITEM', 'MIXED').default('NONE'),
        prizeDetails: Joi.string().optional().allow('', null),
        managed_by: Joi.array().items(Joi.string().uuid()).optional().allow(null),
        supported_by: Joi.array().items(Joi.string().uuid()).optional().allow(null),
        entryConditions: Joi.object().optional().allow(null) // Define more specific structure if needed
    }),
};

const listTournamentsSchema = {
    query: Joi.object({
        page: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1).max(100),
        status: Joi.string().valid('PENDING', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED', 'CANCELED'),
        gameName: Joi.string(), // Changed from gameId to gameName as per audit notes for filtering
        sortBy: Joi.string().valid('startDate', 'name', 'entryFee', 'prizePool'),
        sortOrder: Joi.string().valid('ASC', 'DESC'),
    }),
};

const tournamentIdParamSchema = {
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
};

const getTournamentSchema = {
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
    query: Joi.object({
        include: Joi.string().optional(), // e.g., 'participants,matches'
    }),
};


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

module.exports = router;
