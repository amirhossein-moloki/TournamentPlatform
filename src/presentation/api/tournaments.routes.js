const express = require('express');
const Joi = require('joi').extend(require('@joi/date')); // For date validation
const { authenticateToken, authorizeRole } = require('../../middleware/auth.middleware');
const CreateTournamentUseCase = require('../../application/use-cases/tournament/create-tournament.usecase');
const GetTournamentUseCase = require('../../application/use-cases/tournament/get-tournament.usecase');
const ListTournamentsUseCase = require('../../application/use-cases/tournament/list-tournaments.usecase');
const RegisterForTournamentUseCase = require('../../application/use-cases/tournament/register-for-tournament.usecase');
// const UpdateTournamentUseCase = require('../../application/use-cases/tournament/update-tournament.usecase'); // For admin
// const DeleteTournamentUseCase = require('../../application/use-cases/tournament/delete-tournament.usecase'); // For admin
const { PostgresTournamentRepository, TournamentModel, MatchModel, TournamentParticipantModel } = require('../../infrastructure/database/repositories/postgres.tournament.repository'); // Destructure models if needed by repo constructor
const PostgresUserRepository = require('../../infrastructure/database/repositories/postgres.user.repository');
const PostgresWalletRepository = require('../../infrastructure/database/repositories/postgres.wallet.repository');
const PostgresTransactionRepository = require('../../infrastructure/database/repositories/postgres.transaction.repository');
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');

const router = express.Router();

// Instantiate Repositories
// Note: The constructor for PostgresTournamentRepository in the blueprint takes models as arguments.
// This is unusual for a repository pattern where the repo itself defines/imports its models.
// Assuming the constructor was `constructor()` and it internally uses `TournamentModel`, `MatchModel`, etc.
// If it strictly requires models passed in:
// const tournamentRepository = new PostgresTournamentRepository(TournamentModel, MatchModel, TournamentParticipantModel);
// For now, assuming the simpler constructor as per typical repository pattern (models are internal).
const tournamentRepository = new PostgresTournamentRepository(TournamentModel, MatchModel, TournamentParticipantModel); // Corrected based on repo constructor
const userRepository = new PostgresUserRepository();
const walletRepository = new PostgresWalletRepository();
const transactionRepository = new PostgresTransactionRepository();

// Instantiate Use Cases
const createTournamentUseCase = new CreateTournamentUseCase(tournamentRepository, userRepository);
const listTournamentsUseCase = new ListTournamentsUseCase(tournamentRepository);
const getTournamentUseCase = new GetTournamentUseCase(tournamentRepository);
const registerForTournamentUseCase = new RegisterForTournamentUseCase(
  tournamentRepository,
  walletRepository,
  transactionRepository,
  userRepository
);
// TODO: Instantiate UpdateTournamentUseCase, DeleteTournamentUseCase when implemented


// --- Schemas for Validation ---
const createTournamentSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  gameName: Joi.string().min(2).max(50).required(),
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
    status: Joi.string().valid('PENDING', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED', 'CANCELED').optional(),
    gameName: Joi.string().min(1).max(50).optional(),
    sortBy: Joi.string().valid('startDate', 'name', 'entryFee', 'prizePool').default('startDate'),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('ASC'),
});


// --- Route Handlers ---

/**
 * POST /api/v1/tournaments
 * Create a new tournament. (Requires 'Admin' role or specific 'Organizer' role)
 */
router.post('/', authenticateToken, authorizeRole(['Admin']), async (req, res, next) => {
  try {
    const { error, value: tournamentData } = createTournamentSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    // Add organizerId from authenticated user if not provided, or based on role logic
    // For now, assuming admin creates it, organizerId can be explicitly passed or null.
    // If an admin creates it, they might be the organizerId, or they specify one.
    // const dataToCreate = { ...tournamentData, organizerId: tournamentData.organizerId || req.user.sub };
    // The CreateTournamentUseCase already handles optional organizerId.

    const tournament = await createTournamentUseCase.execute(tournamentData);
    return new ApiResponse(res, httpStatusCodes.CREATED, 'Tournament created successfully.', tournament).send();
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

    const result = await listTournamentsUseCase.execute(queryParams);

    return new ApiResponse(res, httpStatusCodes.OK, 'Tournaments listed successfully.', result).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/tournaments/:id
 * Get details of a specific tournament (publicly accessible).
 */
const tournamentIdParamSchema = Joi.object({
    id: Joi.string().uuid().required().messages({
        'string.guid': 'Tournament ID must be a valid UUID.'
    })
});
router.get('/:id', async (req, res, next) => {
  try {
    const { error: idError, value: idParams } = tournamentIdParamSchema.validate(req.params);
    if (idError) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Tournament ID.', idError.details.map(d => d.message));
    }

    // Options for GetTournamentUseCase, e.g., from query params like ?include=participants,matches
    const includeOptions = {};
    if (req.query.include) {
        const includes = req.query.include.split(',');
        if (includes.includes('participants')) includeOptions.includeParticipants = true;
        if (includes.includes('matches')) includeOptions.includeMatches = true;
    }

    const tournament = await getTournamentUseCase.execute(idParams.id, includeOptions);

    // GetTournamentUseCase throws ApiError if not found, so direct check not strictly needed here
    // if (!tournament) {
    //   throw new ApiError(httpStatusCodes.NOT_FOUND, 'Tournament not found.');
    // }
    return new ApiResponse(res, httpStatusCodes.OK, 'Tournament details retrieved.', tournament).send();
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
    const userId = req.user.sub; // User ID from JWT (authMiddleware ensures req.user exists)

    const result = await registerForTournamentUseCase.execute(userId, tournamentId);

    return new ApiResponse(res, httpStatusCodes.OK, result.message, result.registrationDetails).send();
  } catch (error) {
    next(error);
  }
});


// Admin-only routes for managing tournaments (e.g., update status, delete)
// Example: PUT /api/v1/tournaments/:id/status
// router.put('/:id/status', authenticateToken, authorizeRole(['Admin']), async (req, res, next) => { ... });

module.exports = router;

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
