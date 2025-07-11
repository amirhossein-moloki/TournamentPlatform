const express = require('express');
const Joi = require('joi');
const { authenticateToken, authorizeRole } = require('../../middleware/auth.middleware');
const ListDisputesUseCase = require('../../application/use-cases/admin/list-disputes.usecase');
const ResolveDisputeUseCase = require('../../application/use-cases/admin/resolve-dispute.usecase');
const ListWithdrawalsUseCase = require('../../application/use-cases/admin/list-withdrawals.usecase');
const ApproveWithdrawalUseCase = require('../../application/use-cases/admin/approve-withdrawal.usecase');
const RejectWithdrawalUseCase = require('../../application/use-cases/admin/reject-withdrawal.usecase');

// Import database models
const db = require('../../infrastructure/database/models');

const { PostgresDisputeRepository } = require('../../infrastructure/database/repositories/postgres.dispute.repository');
const { PostgresTournamentRepository } = require('../../infrastructure/database/repositories/postgres.tournament.repository');
const { PostgresTransactionRepository } = require('../../infrastructure/database/repositories/postgres.transaction.repository');
const { PostgresWalletRepository } = require('../../infrastructure/database/repositories/postgres.wallet.repository');
// Conceptual: PaymentService and NotificationService would be imported if implemented
// const PaymentService = require('../../infrastructure/services/payment.service');
// const NotificationService = require('../../infrastructure/services/notification.service');
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');

const router = express.Router();

// Instantiate Repositories
const disputeRepository = new PostgresDisputeRepository({
    DisputeTicketModel: db.DisputeTicketModel,
    UserModel: db.UserModel,
    MatchModel: db.MatchModel
});
const tournamentRepository = new PostgresTournamentRepository({
    TournamentModel: db.TournamentModel,
    TournamentParticipantModel: db.TournamentParticipantModel,
    // Add MatchModel if PostgresTournamentRepository's constructor expects it,
    // or if any methods used by ResolveDisputeUseCase via tournamentRepository need it.
    // For now, assuming it might not be strictly needed for the routes in this file if methods are limited.
    // MatchModel: db.MatchModel,
    GameModel: db.GameModel, // Add if needed by tournament repo methods used here
    UserModel: db.UserModel   // Add if needed by tournament repo methods used here
});
const transactionRepository = new PostgresTransactionRepository({
    TransactionModel: db.TransactionModel,
    WalletModel: db.WalletModel
});
const walletRepository = new PostgresWalletRepository({
    WalletModel: db.WalletModel,
    UserModel: db.UserModel
});
// const paymentService = null; // new PaymentService(); // Placeholder
// const notificationService = null; // new NotificationService(); // Placeholder

// Instantiate Use Cases
const listDisputesUseCase = new ListDisputesUseCase(disputeRepository);
const resolveDisputeUseCase = new ResolveDisputeUseCase(disputeRepository, tournamentRepository /*, notificationService */);
const listWithdrawalsUseCase = new ListWithdrawalsUseCase(transactionRepository);
const approveWithdrawalUseCase = new ApproveWithdrawalUseCase(transactionRepository, walletRepository /*, paymentService, notificationService */);
const rejectWithdrawalUseCase = new RejectWithdrawalUseCase(transactionRepository /*, notificationService */);

// --- Tournament Admin Use Cases (to be instantiated) ---
const UpdateTournamentDetailsUseCase = require('../../application/use-cases/admin/update-tournament-details.usecase');
// const ChangeTournamentStatusUseCase = require('../../application/use-cases/admin/change-tournament-status.usecase');
const ChangeTournamentStatusUseCase = require('../../application/use-cases/admin/change-tournament-status.usecase');
const RemoveTournamentParticipantUseCase = require('../../application/use-cases/admin/remove-tournament-participant.usecase');
const ListTournamentParticipantsUseCase = require('../../application/use-cases/admin/list-tournament-participants.usecase');

// Instantiate Tournament Admin Use Cases
const GameRepository = require('../../infrastructure/database/repositories/game.repository'); // Corrected import
const gameRepository = new GameRepository(db.GameModel);
const { PostgresUserRepository } = require('../../infrastructure/database/repositories/postgres.user.repository');
// Correctly pass models as an object
const userRepository = new PostgresUserRepository({ UserModel: db.UserModel });


const updateTournamentDetailsUseCase = new UpdateTournamentDetailsUseCase(tournamentRepository, gameRepository);
const changeTournamentStatusUseCase = new ChangeTournamentStatusUseCase(tournamentRepository);
const removeTournamentParticipantUseCase = new RemoveTournamentParticipantUseCase(tournamentRepository, userRepository);
const listTournamentParticipantsUseCase = new ListTournamentParticipantsUseCase(tournamentRepository);


// --- Schemas for Validation ---
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const disputeFilterSchema = paginationSchema.keys({
  status: Joi.string().valid('OPEN', 'UNDER_REVIEW', 'RESOLVED_PARTICIPANT1_WIN', 'RESOLVED_PARTICIPANT2_WIN', 'RESOLVED_REPLAY', 'CLOSED', 'CLOSED_INVALID').optional(),
  tournamentId: Joi.string().uuid().optional(),
  matchId: Joi.string().uuid().optional(),
  moderatorId: Joi.string().uuid().optional(),
});

const resolveDisputeSchema = Joi.object({
  resolutionStatus: Joi.string().valid('RESOLVED_PARTICIPANT1_WIN', 'RESOLVED_PARTICIPANT2_WIN', 'RESOLVED_REPLAY', 'CLOSED_INVALID').required(),
  resolutionDetails: Joi.string().min(10).max(1000).required(),
  // winningParticipantId: Joi.string().uuid().optional().allow(null), // If status doesn't imply winner
});

const withdrawalFilterSchema = paginationSchema.keys({
  status: Joi.string().valid('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED').optional(),
  userId: Joi.string().uuid().optional(),
});

const approveWithdrawalSchema = Joi.object({
  notes: Joi.string().max(500).optional().allow(null, ''),
});

const rejectWithdrawalSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required(),
});

const updateTournamentDetailsSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  gameId: Joi.string().uuid().optional(),
  description: Joi.string().max(1000).optional().allow(null, ''),
  rules: Joi.string().max(5000).optional().allow(null, ''),
  entryFee: Joi.number().min(0).precision(2).optional(),
  prizePool: Joi.number().min(0).precision(2).optional(),
  maxParticipants: Joi.number().integer().min(2).optional(), // Min 2 participants generally
  startDate: Joi.date().iso().optional(), // Ensure it's in ISO format if provided
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).optional().allow(null),
  bannerImageUrl: Joi.string().uri().optional().allow(null, ''),
  bracketType: Joi.string().valid(...Object.values(require('../../domain/tournament/tournament.entity').BracketType)).optional(),
  settings: Joi.object().optional(),
  // Status changes are handled by a different endpoint
}).min(1); // At least one field must be provided for an update

const changeTournamentStatusSchema = Joi.object({
  newStatus: Joi.string().valid(...Object.values(require('../../domain/tournament/tournament.entity').TournamentStatus)).required(),
  cancelReason: Joi.string().max(500).when('newStatus', {
    is: require('../../domain/tournament/tournament.entity').TournamentStatus.CANCELED,
    then: Joi.string().min(10).required(), // Reason is required if canceling
    otherwise: Joi.optional().allow(null, ''),
  }),
});

const listParticipantsSchema = paginationSchema.keys({ // Reusing paginationSchema defined earlier
  // Add any specific filters for participants if needed, e.g., status: Joi.string()
});


// --- Dispute Management Routes (DisputeModerator & Admin) ---

router.get('/disputes', authenticateToken, authorizeRole(['DisputeModerator', 'Admin']), async (req, res, next) => {
  /*
    #swagger.tags = ['Admin - Disputes']
    #swagger.summary = 'List and filter dispute tickets.'
    #swagger.description = 'Retrieves a paginated list of dispute tickets. Can be filtered by status, tournament ID, match ID, or moderator ID. Requires DisputeModerator or Admin role.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['page'] = { in: 'query', description: 'Page number.', schema: { type: 'integer', default: 1 } }
    #swagger.parameters['limit'] = { in: 'query', description: 'Items per page.', schema: { type: 'integer', default: 10 } }
    #swagger.parameters['status'] = { in: 'query', description: 'Filter by dispute status.', schema: { type: 'string', enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED_PARTICIPANT1_WIN', 'RESOLVED_PARTICIPANT2_WIN', 'RESOLVED_REPLAY', 'CLOSED', 'CLOSED_INVALID'] } }
    #swagger.parameters['tournamentId'] = { in: 'query', description: 'Filter by Tournament ID (UUID).', schema: { type: 'string', format: 'uuid' } }
    #swagger.parameters['matchId'] = { in: 'query', description: 'Filter by Match ID (UUID).', schema: { type: 'string', format: 'uuid' } }
    #swagger.parameters['moderatorId'] = { in: 'query', description: 'Filter by Moderator ID (UUID) who handled it.', schema: { type: 'string', format: 'uuid' } }
    #swagger.responses[200] = {
      description: 'A paginated list of disputes.',
      content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedDisputesResponse" } } }
    }
    #swagger.responses[400] = { description: 'Validation error for query parameters.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[403] = { description: 'Forbidden.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
  */
  try {
    const { error, value: queryParams } = disputeFilterSchema.validate(req.query);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const result = await listDisputesUseCase.execute(queryParams);
    const responseData = {
      page: result.currentPage,
      limit: result.pageSize,
      totalPages: result.totalPages,
      totalItems: result.totalItems,
      items: result.disputes.map(d => d.toPlainObject ? d.toPlainObject() : d)
    };
    return new ApiResponse(res, httpStatusCodes.OK, 'Disputes retrieved successfully.', responseData).send();
  } catch (error) {
    next(error);
  }
});

router.get('/tournaments/:id/participants', authenticateToken, authorizeRole(['Admin']), async (req, res, next) => {
  /*
    #swagger.tags = ['Admin - Tournaments']
    #swagger.summary = 'List participants of a tournament (Admin only).'
    #swagger.description = 'Retrieves a paginated list of participants for a specific tournament.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', description: 'ID of the tournament.', required: true, schema: { type: 'string', format: 'uuid' } }
    #swagger.parameters['page'] = { in: 'query', description: 'Page number.', schema: { type: 'integer', default: 1 } }
    #swagger.parameters['limit'] = { in: 'query', description: 'Items per page.', schema: { type: 'integer', default: 10 } }
    #swagger.responses[200] = {
      description: 'A paginated list of tournament participants.',
      content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedTournamentParticipantsResponse" } } } // Define this schema
    }
    #swagger.responses[400] = { description: 'Validation error (e.g., invalid tournament ID, invalid pagination params).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[403] = { description: 'Forbidden (User is not an Admin).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[404] = { description: 'Tournament not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
  */
  try {
    const { id: tournamentId } = req.params;
    const { error: idError } = Joi.string().uuid().required().validate(tournamentId);
    if (idError) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Tournament ID format.', idError.details.map(d => d.message));
    }

    const { error: queryError, value: queryParams } = listParticipantsSchema.validate(req.query);
    if (queryError) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error for query parameters.', queryError.details.map(d => d.message));
    }

    const result = await listTournamentParticipantsUseCase.execute(tournamentId, queryParams);
    // The result from use case is { participants, totalItems, totalPages, currentPage, pageSize }
    // Participants are likely TournamentParticipant entities/objects.
    // These might need mapping to a DTO, especially if user details (username etc.) are to be included.
    // For now, returning them as is.
    return new ApiResponse(res, httpStatusCodes.OK, 'Tournament participants listed successfully.', result).send();
  } catch (error) {
    next(error);
  }
});

router.delete('/tournaments/:tournamentId/participants/:userId', authenticateToken, authorizeRole(['Admin']), async (req, res, next) => {
  /*
    #swagger.tags = ['Admin - Tournaments']
    #swagger.summary = 'Remove a participant from a tournament (Admin only).'
    #swagger.description = 'Allows an Admin to remove a participant (user) from a specific tournament.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['tournamentId'] = { in: 'path', description: 'ID of the tournament.', required: true, schema: { type: 'string', format: 'uuid' } }
    #swagger.parameters['userId'] = { in: 'path', description: 'User ID of the participant to remove.', required: true, schema: { type: 'string', format: 'uuid' } }
    #swagger.responses[204] = { description: 'Participant removed successfully.' }
    #swagger.responses[400] = { description: 'Validation error (e.g., invalid IDs, participant cannot be removed).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[403] = { description: 'Forbidden (User is not an Admin).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[404] = { description: 'Tournament or User not found, or User not in Tournament.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
  */
  try {
    const { tournamentId, userId } = req.params;

    const { error: tournamentIdError } = Joi.string().uuid().required().validate(tournamentId);
    if (tournamentIdError) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Tournament ID format.', tournamentIdError.details.map(d => d.message));
    }
    const { error: userIdError } = Joi.string().uuid().required().validate(userId);
    if (userIdError) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid User ID format.', userIdError.details.map(d => d.message));
    }

    await removeTournamentParticipantUseCase.execute(tournamentId, userId);
    return new ApiResponse(res, httpStatusCodes.NO_CONTENT, 'Participant removed successfully.').send();
  } catch (error) {
    next(error);
  }
});

router.patch('/tournaments/:id/status', authenticateToken, authorizeRole(['Admin']), async (req, res, next) => {
  /*
    #swagger.tags = ['Admin - Tournaments']
    #swagger.summary = 'Change status of a tournament (Admin only).'
    #swagger.description = 'Allows an Admin to change the status of a tournament (e.g., open registration, start, complete, cancel).'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', description: 'ID of the tournament to update status for.', required: true, schema: { type: 'string', format: 'uuid' } }
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: "#/components/schemas/ChangeTournamentStatusRequest" } } }
    }
    #swagger.responses[200] = {
      description: 'Tournament status updated successfully.',
      content: { "application/json": { schema: { $ref: "#/components/schemas/TournamentResponseFull" } } } // Assuming returns full tournament
    }
    #swagger.responses[400] = { description: 'Validation error (e.g., invalid status, invalid transition).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[403] = { description: 'Forbidden (User is not an Admin).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[404] = { description: 'Tournament not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
  */
  try {
    const { id: tournamentId } = req.params;
    const { error: idError } = Joi.string().uuid().required().validate(tournamentId);
    if (idError) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Tournament ID format.', idError.details.map(d => d.message));
    }

    const { error: bodyError, value: statusData } = changeTournamentStatusSchema.validate(req.body);
    if (bodyError) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', bodyError.details.map(d => d.message));
    }

    const updatedTournament = await changeTournamentStatusUseCase.execute(tournamentId, statusData.newStatus, statusData.cancelReason);
    return new ApiResponse(res, httpStatusCodes.OK, 'Tournament status updated successfully.', updatedTournament.toPlainObject ? updatedTournament.toPlainObject() : updatedTournament).send();
  } catch (error) {
    next(error);
  }
});

router.post('/disputes/:id/resolve', authenticateToken, authorizeRole(['DisputeModerator', 'Admin']), async (req, res, next) => {
  /*
    #swagger.tags = ['Admin - Disputes']
    #swagger.summary = 'Resolve a dispute ticket.'
    #swagger.description = 'Allows a DisputeModerator or Admin to resolve a dispute by setting its status and providing resolution details. This may also trigger updates to the related match.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', description: 'ID of the dispute to resolve.', required: true, schema: { type: 'string', format: 'uuid' } }
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: "#/components/schemas/ResolveDisputeRequest" } } }
    }
    #swagger.responses[200] = {
      description: 'Dispute resolved successfully. Returns the updated dispute ticket.',
      content: { "application/json": { schema: { $ref: "#/components/schemas/DisputeTicketResponse" } } }
    }
    #swagger.responses[400] = { description: 'Invalid Dispute ID or validation error for resolution data.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[403] = { description: 'Forbidden (e.g., dispute already resolved, user not authorized).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[404] = { description: 'Dispute not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
  */
  try {
    const { id: disputeIdParam } = req.params;
    const { error: idError } = Joi.string().uuid().required().validate(disputeIdParam);
    if (idError) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Dispute ID format.', idError.details.map(d => d.message));
    }

    const { error, value: resolutionData } = resolveDisputeSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const result = await resolveDisputeUseCase.execute(disputeIdParam, req.user.sub, resolutionData);
    const disputeResponse = result.dispute.toPlainObject ? result.dispute.toPlainObject() : result.dispute;
    return new ApiResponse(res, httpStatusCodes.OK, 'Dispute resolved successfully.', disputeResponse).send();
  } catch (error) {
    next(error);
  }
});

// --- Tournament Management Routes (Admin) ---

router.put('/tournaments/:id', authenticateToken, authorizeRole(['Admin']), async (req, res, next) => {
  /*
    #swagger.tags = ['Admin - Tournaments']
    #swagger.summary = 'Update details of a tournament (Admin only).'
    #swagger.description = 'Allows an Admin to update various details of an existing tournament. Fields not provided will not be changed.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', description: 'ID of the tournament to update.', required: true, schema: { type: 'string', format: 'uuid' } }
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateTournamentDetailsRequest" } } }
    }
    #swagger.responses[200] = {
      description: 'Tournament updated successfully.',
      content: { "application/json": { schema: { $ref: "#/components/schemas/TournamentResponseFull" } } }
    }
    #swagger.responses[400] = { description: 'Validation error (e.g., invalid data, tournament ID format).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[403] = { description: 'Forbidden (User is not an Admin or trying to update a non-updatable tournament).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[404] = { description: 'Tournament not found or Game ID not found (if changed).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
  */
  try {
    const { id: tournamentId } = req.params;
    const { error: idError } = Joi.string().uuid().required().validate(tournamentId);
    if (idError) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Tournament ID format.', idError.details.map(d => d.message));
    }

    const { error: bodyError, value: updateData } = updateTournamentDetailsSchema.validate(req.body);
    if (bodyError) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', bodyError.details.map(d => d.message));
    }

    const updatedTournament = await updateTournamentDetailsUseCase.execute(tournamentId, updateData);
    return new ApiResponse(res, httpStatusCodes.OK, 'Tournament updated successfully.', updatedTournament.toPlainObject ? updatedTournament.toPlainObject() : updatedTournament).send();
  } catch (error) {
    next(error);
  }
});


// --- Withdrawal Management Routes (FinanceManager & Admin) ---

router.get('/withdrawals', authenticateToken, authorizeRole(['FinanceManager', 'Admin']), async (req, res, next) => {
  /*
    #swagger.tags = ['Admin - Withdrawals']
    #swagger.summary = 'List and filter withdrawal requests.'
    #swagger.description = 'Retrieves a paginated list of withdrawal requests. Can be filtered by status or user ID. Requires FinanceManager or Admin role.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['page'] = { in: 'query', description: 'Page number.', schema: { type: 'integer', default: 1 } }
    #swagger.parameters['limit'] = { in: 'query', description: 'Items per page.', schema: { type: 'integer', default: 10 } }
    #swagger.parameters['status'] = { in: 'query', description: 'Filter by withdrawal status.', schema: { type: 'string', enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED'] } }
    #swagger.parameters['userId'] = { in: 'query', description: 'Filter by User ID (UUID).', schema: { type: 'string', format: 'uuid' } }
    #swagger.responses[200] = {
      description: 'A paginated list of withdrawal requests.',
      content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedWithdrawalsAdminResponse" } } }
    }
    #swagger.responses[400] = { description: 'Validation error for query parameters.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[403] = { description: 'Forbidden.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
  */
  try {
    const { error, value: queryParams } = withdrawalFilterSchema.validate(req.query);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const result = await listWithdrawalsUseCase.execute(queryParams);
    const responseData = {
      page: result.currentPage,
      limit: result.pageSize,
      totalPages: result.totalPages,
      totalItems: result.totalItems,
      items: result.withdrawals.map(w => w.toPlainObject ? w.toPlainObject() : w)
    };
    return new ApiResponse(res, httpStatusCodes.OK, 'Withdrawal requests retrieved successfully.', responseData).send();
  } catch (error) {
    next(error);
  }
});

router.post('/withdrawals/:id/approve', authenticateToken, authorizeRole(['FinanceManager', 'Admin']), async (req, res, next) => {
  /*
    #swagger.tags = ['Admin - Withdrawals']
    #swagger.summary = 'Approve a withdrawal request.'
    #swagger.description = 'Allows a FinanceManager or Admin to approve a pending withdrawal request. This may trigger payment processing.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', description: 'ID of the withdrawal request to approve.', required: true, schema: { type: 'string', format: 'uuid' } }
    #swagger.requestBody = {
      required: false, // Notes are optional
      content: { "application/json": { schema: { $ref: "#/components/schemas/ApproveWithdrawalRequest" } } }
    }
    #swagger.responses[200] = {
      description: 'Withdrawal request approved successfully. Returns the updated withdrawal transaction.',
      content: { "application/json": { schema: { $ref: "#/components/schemas/WithdrawalRequestAdminView" } } } // Or a simpler success response
    }
    #swagger.responses[400] = { description: 'Invalid Withdrawal ID or validation error for notes.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[403] = { description: 'Forbidden (e.g., request not in approvable state).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[404] = { description: 'Withdrawal request not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[500] = { description: 'Internal server error or payment processing error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
  */
  try {
    const { id: withdrawalIdParam } = req.params;
    const { error: idError } = Joi.string().uuid().required().validate(withdrawalIdParam);
    if (idError) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Withdrawal ID format.', idError.details.map(d => d.message));
    }

    const { error, value: approvalData } = approveWithdrawalSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const updatedWithdrawal = await approveWithdrawalUseCase.execute(
      withdrawalIdParam,
      req.user.sub, // adminUserId
      approvalData.notes
    );

    return new ApiResponse(res, httpStatusCodes.OK, 'Withdrawal request approved.', updatedWithdrawal.toPlainObject ? updatedWithdrawal.toPlainObject() : updatedWithdrawal).send();
  } catch (error) {
    next(error);
  }
});

router.post('/withdrawals/:id/reject', authenticateToken, authorizeRole(['FinanceManager', 'Admin']), async (req, res, next) => {
  /*
    #swagger.tags = ['Admin - Withdrawals']
    #swagger.summary = 'Reject a withdrawal request.'
    #swagger.description = 'Allows a FinanceManager or Admin to reject a pending withdrawal request, providing a reason.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', description: 'ID of the withdrawal request to reject.', required: true, schema: { type: 'string', format: 'uuid' } }
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: "#/components/schemas/RejectWithdrawalRequest" } } }
    }
    #swagger.responses[200] = {
      description: 'Withdrawal request rejected successfully. Returns the updated withdrawal transaction.',
      content: { "application/json": { schema: { $ref: "#/components/schemas/WithdrawalRequestAdminView" } } } // Or a simpler success response
    }
    #swagger.responses[400] = { description: 'Invalid Withdrawal ID or missing/invalid reason.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[403] = { description: 'Forbidden (e.g., request not in rejectable state).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[404] = { description: 'Withdrawal request not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
  */
  try {
    const { id: withdrawalIdParam } = req.params;
    const { error: idError } = Joi.string().uuid().required().validate(withdrawalIdParam);
    if (idError) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Withdrawal ID format.', idError.details.map(d => d.message));
    }

    const { error, value: rejectionData } = rejectWithdrawalSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const updatedWithdrawal = await rejectWithdrawalUseCase.execute(
      withdrawalIdParam,
      req.user.sub, // adminUserId
      rejectionData.reason
    );

    return new ApiResponse(res, httpStatusCodes.OK, 'Withdrawal request rejected.', updatedWithdrawal.toPlainObject ? updatedWithdrawal.toPlainObject() : updatedWithdrawal).send();
  } catch (error) {
    next(error);
  }
});


module.exports = router;

// Notes:
// - This file defines admin-specific routes for managing disputes and withdrawals.
// - All routes are protected by `authenticateToken` and `authorizeRole` middleware,
//   ensuring only users with appropriate roles (DisputeModerator, FinanceManager, Admin) can access them.
// - Joi schemas are used for input validation for query parameters and request bodies.
// - Placeholder data arrays (DISPUTES_DB_PLACEHOLDER, WITHDRAWALS_DB_PLACEHOLDER) and logic are used
//   as the actual repositories and use cases for these admin functions are not yet implemented.
// - Comments indicate where dedicated use cases and repositories would be integrated.
// - The API structure aligns with the "Admin Panel (Role-Based)" section of the blueprint.
// - The placeholder IDs (`disp-uuid-`, `wdrl-uuid-`) are used to simplify testing without real UUIDs for now.
//   Validation for IDs allows these placeholder prefixes or actual UUIDs.
// - A `RejectWithdrawalUseCase` and corresponding route were added for completeness, as approving usually implies rejecting is also possible.
//   The blueprint mentioned `/admin/withdrawals/:id/approve` but not reject. It's a common counterpart.
//   If this is not desired, the reject route can be removed.
// - The role 'Admin' is added to `authorizeRole` for all admin routes as a common super-role.
//   Specific roles like 'DisputeModerator' and 'FinanceManager' grant more granular access.
// - The `resolutionStatus` for disputes and `status` for withdrawals should map to defined enums in domain entities.
// - Actual implementation of dispute resolution and withdrawal processing would involve complex interactions
//   with Match entities, Wallet entities, Transaction entities, and potentially external payment services.
//   These are abstracted away by the use case layer (which is currently placeholder).
