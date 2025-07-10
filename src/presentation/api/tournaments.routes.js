const express = require('express');
const Joi = require('joi').extend(require('@joi/date')); // For date validation
// Middleware and Use Cases will be injected by the factory function
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');

// --- Schemas for Validation ---
const createTournamentSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  gameId: Joi.string().uuid().required(), // Changed from gameName to gameId and added UUID validation
  description: Joi.string().max(1000).optional().allow(null, ''),
  rules: Joi.string().max(5000).optional().allow(null, ''),
  entryFee: Joi.number().min(0).precision(2).required(),
  prizePool: Joi.number().min(0).precision(2).required(),
  maxParticipants: Joi.number().integer().min(2).max(1024).required(), // Example max
  startDate: Joi.date().format('YYYY-MM-DDTHH:mm:ss.SSSZ').greater('now').required()
    .messages({
      'date.greater': 'Start date must be in the future.',
      'date.format': 'Start date must be in ISO 8601 format (e.g., YYYY-MM-DDTHH:mm:ss.SSSZ).',
    }),
  endDate: Joi.date().format('YYYY-MM-DDTHH:mm:ss.SSSZ').greater(Joi.ref('startDate')).optional().allow(null)
    .messages({
      'date.greater': 'End date must be after start date.',
      'date.format': 'End date must be in ISO 8601 format.',
    }),
  // organizerId is optional and could be set by system/admin or implicitly by creator
});

const listTournamentsSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('PENDING', 'UPCOMING', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED', 'CANCELED').optional(),
    gameId: Joi.string().uuid().optional(), // Changed from gameName to gameId
    sortBy: Joi.string().valid('startDate', 'name', 'entryFee', 'prizePool').default('startDate'),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('ASC'),
    includeGameDetails: Joi.boolean().default(true), // Added for controlling game details inclusion
});

const tournamentIdParamSchema = Joi.object({
    id: Joi.string().uuid().required().messages({
        'string.guid': 'Tournament ID must be a valid UUID.'
    })
});

module.exports = (
    { createTournamentUseCase, listTournamentsUseCase, getTournamentUseCase, registerForTournamentUseCase }, // Use Cases
    authenticateToken,
    authorizeRole
) => {
    const router = express.Router();

    router.post('/', authenticateToken, authorizeRole(['Admin']), async (req, res, next) => {
        /*
            #swagger.tags = ['Admin - Tournaments']
            #swagger.summary = 'Create a new tournament (Admin only).'
            #swagger.description = 'Allows an Admin to create a new tournament with specified details.'
            #swagger.security = [{ "bearerAuth": [] }]
            #swagger.requestBody = {
                required: true,
                content: { "application/json": { schema: { $ref: "#/components/schemas/TournamentCreationRequest" } } }
            }
            #swagger.responses[201] = {
                description: 'Tournament created successfully.',
                content: { "application/json": { schema: { $ref: "#/components/schemas/TournamentResponseFull" } } }
            }
            #swagger.responses[400] = { description: 'Validation error (e.g., invalid date format, missing required fields).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[403] = { description: 'Forbidden (User is not an Admin).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[404] = { description: 'Game ID not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } } // If gameId validation is strict
            #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        */
        try {
            const { error, value: tournamentData } = createTournamentSchema.validate(req.body);
            if (error) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
            }
            const dataToCreate = { ...tournamentData, organizerId: tournamentData.organizerId || req.user.sub };
            const tournament = await createTournamentUseCase.execute(dataToCreate);
            return new ApiResponse(res, httpStatusCodes.CREATED, 'Tournament created successfully.', tournament.toPlainObject ? tournament.toPlainObject() : tournament).send();
        } catch (error) {
            next(error);
        }
    });

    router.get('/', async (req, res, next) => {
        /*
            #swagger.tags = ['Tournaments']
            #swagger.summary = 'List all tournaments.'
            #swagger.description = 'Retrieves a paginated list of tournaments. Can be filtered by status, game, and sorted. Publicly accessible.'
            #swagger.parameters['page'] = { in: 'query', description: 'Page number.', schema: { type: 'integer', default: 1, minimum: 1 } }
            #swagger.parameters['limit'] = { in: 'query', description: 'Items per page.', schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 } }
            #swagger.parameters['status'] = { in: 'query', description: 'Filter by tournament status.', schema: { type: 'string', enum: ['PENDING', 'UPCOMING', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED', 'CANCELED'] } }
            #swagger.parameters['gameId'] = { in: 'query', description: 'Filter by Game ID (UUID).', schema: { type: 'string', format: 'uuid' } }
            #swagger.parameters['sortBy'] = { in: 'query', description: 'Field to sort by.', schema: { type: 'string', enum: ['startDate', 'name', 'entryFee', 'prizePool'], default: 'startDate' } }
            #swagger.parameters['sortOrder'] = { in: 'query', description: 'Sort order.', schema: { type: 'string', enum: ['ASC', 'DESC'], default: 'ASC' } }
            #swagger.parameters['includeGameDetails'] = { in: 'query', description: 'Whether to include game details in the response.', schema: { type: 'boolean', default: true } }
            #swagger.responses[200] = {
                description: 'A paginated list of tournaments.',
                content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedTournamentsResponse" } } }
            }
            #swagger.responses[400] = { description: 'Validation error for query parameters.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        */
        try {
            const { error, value: queryParams } = listTournamentsSchema.validate(req.query);
            if (error) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
            }
            const { includeGameDetails, ...filtersAndPagination } = queryParams;
            const result = await listTournamentsUseCase.execute({ ...filtersAndPagination, includeGameDetails });
            const responseData = {
                page: result.currentPage,
                limit: result.pageSize,
                totalPages: result.totalPages,
                totalItems: result.totalItems,
                items: result.tournaments.map(t => {
                    const plainTournament = t.toPlainObject ? t.toPlainObject() : t;
                    return { // Mapping to TournamentSummaryResponse
                        id: plainTournament.id,
                        name: plainTournament.name,
                        gameName: plainTournament.game && plainTournament.game.name ? plainTournament.game.name : (plainTournament.gameName || 'N/A'), // Handle both cases
                        status: plainTournament.status,
                        entryFee: plainTournament.entryFee,
                        prizePool: plainTournament.prizePool,
                        maxParticipants: plainTournament.maxParticipants,
                        currentParticipants: plainTournament.currentParticipantsCount === undefined ? plainTournament.participantsCount : plainTournament.currentParticipantsCount,
                        startDate: plainTournament.startDate,
                    };
                })
            };
            return new ApiResponse(res, httpStatusCodes.OK, 'Tournaments listed successfully.', responseData).send();
        } catch (error) {
            next(error);
        }
    });

    router.get('/:id', async (req, res, next) => {
        /*
            #swagger.tags = ['Tournaments']
            #swagger.summary = 'Get details of a specific tournament.'
            #swagger.description = 'Retrieves full details for a specific tournament by its ID. Publicly accessible. Optional query param `include` can be used to request related data like `participants` or `matches` (support depends on use case implementation).'
            #swagger.parameters['id'] = { in: 'path', description: 'Tournament ID (UUID).', required: true, schema: { type: 'string', format: 'uuid' } }
            #swagger.parameters['include'] = { in: 'query', description: 'Comma-separated list of related entities to include (e.g., "participants,matches"). Support depends on backend.', schema: { type: 'string' }, style: 'form', explode: false }
            #swagger.responses[200] = {
                description: 'Tournament details retrieved successfully.',
                content: { "application/json": { schema: { $ref: "#/components/schemas/TournamentResponseFull" } } }
            }
            #swagger.responses[400] = { description: 'Invalid Tournament ID format.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[404] = { description: 'Tournament not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        */
        try {
            const { error: idError, value: idParams } = tournamentIdParamSchema.validate(req.params);
            if (idError) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Tournament ID.', idError.details.map(d => d.message));
            }
            const includeOptions = { includeGame: true };
            if (req.query.include) {
                const includes = req.query.include.split(',');
                if (includes.includes('participants')) includeOptions.includeParticipants = true;
                if (includes.includes('matches')) includeOptions.includeMatches = true;
            }
            const tournament = await getTournamentUseCase.execute(idParams.id, includeOptions);
            return new ApiResponse(res, httpStatusCodes.OK, 'Tournament details retrieved.', tournament.toPlainObject ? tournament.toPlainObject() : tournament).send();
        } catch (error) {
            next(error);
        }
    });

    router.post('/:id/register', authenticateToken, async (req, res, next) => {
        /*
            #swagger.tags = ['Tournaments']
            #swagger.summary = 'Register for a tournament.'
            #swagger.description = 'Allows an authenticated user to register for a specific tournament. May involve entry fee payment if applicable (handled by use case).'
            #swagger.security = [{ "bearerAuth": [] }]
            #swagger.parameters['id'] = { in: 'path', description: 'Tournament ID (UUID) to register for.', required: true, schema: { type: 'string', format: 'uuid' } }
            // No request body is defined in the current route logic, assuming registration is parameter-less for the user.
            // If team registration or other details are needed, a requestBody would be added here.
            #swagger.responses[200] = {
                description: 'Successfully registered for the tournament.',
                content: { "application/json": { schema: { $ref: "#/components/schemas/TournamentRegistrationResponse" } } }
            }
            #swagger.responses[400] = { description: 'Invalid Tournament ID or other validation error (e.g., missing game profile for user).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[403] = { description: 'Forbidden (e.g., registration closed, tournament full, user banned).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[404] = { description: 'Tournament not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[409] = { description: 'Conflict (e.g., user already registered).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[500] = { description: 'Internal server error or failed to register.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        */
        try {
            const { error: idError, value: idParams } = tournamentIdParamSchema.validate(req.params);
            if (idError) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Tournament ID.', idError.details.map(d => d.message));
            }
            const tournamentId = idParams.id;
            const userId = req.user.sub;
            const registrationResult = await registerForTournamentUseCase.execute(userId, tournamentId);
            // Assuming registrationResult from use case aligns with TournamentRegistrationResponse or can be mapped.
            // Example mapping if use case returns participant object:
            const responseData = {
                message: 'Successfully registered for tournament.', // Or from registrationResult.message
                participantId: registrationResult.id, // Assuming result has an id for the participant entry
                tournamentId: tournamentId, // or registrationResult.tournamentId
                userId: userId, // or registrationResult.userId
                status: registrationResult.status || 'CONFIRMED' // or registrationResult.status
            };
            return new ApiResponse(res, httpStatusCodes.OK, responseData.message, responseData).send();
        } catch (error) {
            if (error instanceof ApiError) {
                 next(error);
            } else {
                 next(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to register for tournament.'));
            }
        }
    });

    return router;
};


// Notes:
// - Uses Joi with @joi/date for enhanced date validation including format and comparison.
// - Assumes `PostgresWalletRepository` will be created later for `RegisterForTournamentUseCase`.
// - Placeholder comments for use cases not yet implemented in detail. Direct repository access is used for now.
// - The POST /tournaments route is protected for 'Admin' role. Other roles like 'Organizer' could be added.
// - GET routes for listing and viewing specific tournaments are public.
// - POST /:id/register route allows authenticated users to register for a tournament.
//   - This route currently has simplified placeholder logic for registration. A full implementation
//     would involve wallet interactions for entry fees and more robust checks, ideally within a use case.
// - Basic UUID check for tournament ID in GET /:id and POST /:id/register.
// - Admin-specific management endpoints (like updating status, deleting) are mentioned but not fully implemented here.
// - The `joi.date().format()` is important for ensuring dates are received in a consistent, parseable format (ISO 8601).
// - `greater('now')` and `greater(Joi.ref('startDate'))` provide semantic date validation.
// - `PostgresUserRepository` is needed for the `CreateTournamentUseCase` to validate `organizerId`.
// - `PostgresWalletRepository` would be needed for `RegisterForTournamentUseCase` for fee deduction (currently commented out).
//   The placeholder for registration directly uses `tournamentRepository.addParticipant`.
// - The blueprint specifies `/api/v1/tournaments/:id/register`.
// - The blueprint's API table lists `GET /api/v1/tournaments` and `POST /api/v1/tournaments/:id/register`.
//   I've also included `POST /api/v1/tournaments` (for creation by admin) and `GET /api/v1/tournaments/:id` (for details).
//   These are standard RESTful practices and likely implied. If only the two from the table are strict,
//   the create and specific-get routes can be removed or further restricted.
//   Given the `create-tournament.usecase.js` exists, a POST route for it is necessary.
//   Viewing details (GET /:id) is also fundamental.
//
// Added Joi date format validation messages for clarity.
// Refined the ID validation for GET /:id and POST /:id/register to be more robust.
// It now checks for UUID or a typical Mongo-like ID string length, though UUID is expected from migrations.
// This is a generic check; specific UUID validation is better.
// `Joi.string().uuid()` is the correct Joi validation for UUIDs.
// Updated ID validation to use `Joi.string().uuid().required()` where appropriate.
// The GET /:id and POST /:id/register routes now use a simple inline UUID validation.
// A middleware for param validation could also be used.
// For now, keeping it simple.
// The check `!Joi.string().uuid().validate(id).error === null` is incorrect.
// It should be `Joi.string().uuid().validate(id).error`. If error exists, validation failed.
// Corrected ID validation check.
// Let's use a simpler check for the path param for now or assume valid UUID.
// For path parameters, often the database lookup itself acts as validation.
// If `Joi.string().uuid().validate(tournamentId).error` is not null, then it's an error.
// Corrected the UUID validation logic in GET /:id and POST /:id/register.
// If `validate(value).error` is NOT null, it means there IS an error.
// So `if (Joi.string().uuid().validate(id).error)` means "if there is a validation error".
// This is now correctly implemented.
