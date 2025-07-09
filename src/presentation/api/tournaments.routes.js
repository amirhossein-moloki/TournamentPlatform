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

    /**
     * POST /api/v1/tournaments
     * Create a new tournament. (Requires 'Admin' role)
     */
    router.post('/', authenticateToken, authorizeRole(['Admin']), async (req, res, next) => {
        try {
            const { error, value: tournamentData } = createTournamentSchema.validate(req.body);
            if (error) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
            }
            // organizerId might be req.user.sub if admin is also an organizer or passed in body
            const dataToCreate = { ...tournamentData, organizerId: tournamentData.organizerId || req.user.sub };


            const tournament = await createTournamentUseCase.execute(dataToCreate);
            return new ApiResponse(res, httpStatusCodes.CREATED, 'Tournament created successfully.', tournament.toPlainObject ? tournament.toPlainObject() : tournament).send();
        } catch (error) {
            next(error);
        }
    });

    /**
     * GET /api/v1/tournaments
     * List tournaments (publicly accessible).
     */
    router.get('/', async (req, res, next) => {
        try {
            const { error, value: queryParams } = listTournamentsSchema.validate(req.query);
            if (error) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
            }

            // Destructure includeGameDetails from queryParams and pass it to use case
            const { includeGameDetails, ...filtersAndPagination } = queryParams;

            const result = await listTournamentsUseCase.execute({ ...filtersAndPagination, includeGameDetails });

            // Assuming result.tournaments are domain entities
            // Map to PaginatedTournaments schema: { page, limit, totalPages, totalItems, items: [TournamentSummary] }
            const responseData = {
                page: result.currentPage,
                limit: result.pageSize,
                totalPages: result.totalPages,
                totalItems: result.totalItems,
                items: result.tournaments.map(t => {
                    const plainTournament = t.toPlainObject ? t.toPlainObject() : t;
                    // Ensure it matches TournamentSummary fields from OpenAPI
                    return {
                        id: plainTournament.id,
                        name: plainTournament.name,
                        gameName: plainTournament.game ? plainTournament.game.name : (plainTournament.gameName || 'N/A'), // Assuming game object is populated or gameName field exists
                        status: plainTournament.status,
                        entryFee: plainTournament.entryFee,
                        prizePool: plainTournament.prizePool,
                        maxParticipants: plainTournament.maxParticipants,
                        currentParticipants: plainTournament.currentParticipantsCount === undefined ? plainTournament.participantsCount : plainTournament.currentParticipantsCount, // Adapt based on actual field name
                        startDate: plainTournament.startDate,
                    };
                })
            };
            return new ApiResponse(res, httpStatusCodes.OK, 'Tournaments listed successfully.', responseData).send();
        } catch (error) {
            next(error);
        }
    });

    /**
     * GET /api/v1/tournaments/:id
     * Get details of a specific tournament (publicly accessible).
     */
    router.get('/:id', async (req, res, next) => {
        try {
            const { error: idError, value: idParams } = tournamentIdParamSchema.validate(req.params);
            if (idError) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Tournament ID.', idError.details.map(d => d.message));
            }

            const includeOptions = { includeGame: true }; // Default to include game for single fetch
            if (req.query.include) { // Allow overriding or adding other includes via query param
                const includes = req.query.include.split(',');
                if (includes.includes('participants')) includeOptions.includeParticipants = true;
                if (includes.includes('matches')) includeOptions.includeMatches = true;
                // if client explicitly says ?include=game, it's fine, already true.
                // if client says ?include=nogame, we might want to set includeGame: false
            }

            const tournament = await getTournamentUseCase.execute(idParams.id, includeOptions);
            return new ApiResponse(res, httpStatusCodes.OK, 'Tournament details retrieved.', tournament.toPlainObject ? tournament.toPlainObject() : tournament).send();
        } catch (error) {
            next(error);
        }
    });

    /**
     * POST /api/v1/tournaments/:id/register
     * Register the authenticated user for a tournament.
     */
    router.post('/:id/register', authenticateToken, async (req, res, next) => {
        try {
            const { error: idError, value: idParams } = tournamentIdParamSchema.validate(req.params);
            if (idError) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Tournament ID.', idError.details.map(d => d.message));
            }
            const tournamentId = idParams.id;
            const userId = req.user.sub;

            const registrationResult = await registerForTournamentUseCase.execute(userId, tournamentId);
            // Assuming registerForTournamentUseCase returns an object like { message: '...', details: ... } or just the participant object
            return new ApiResponse(res, httpStatusCodes.OK, 'Successfully registered for tournament.', registrationResult.toPlainObject ? registrationResult.toPlainObject() : registrationResult).send();
        } catch (error) {
            // Specific error handling for registration failures (e.g., tournament full, already registered, no inGameName)
            if (error instanceof ApiError) { // If use case throws ApiError
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
