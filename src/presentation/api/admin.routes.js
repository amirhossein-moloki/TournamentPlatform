const express = require('express');
const Joi = require('joi');
const { authenticateToken, authorizeRole } = require('../../middleware/auth.middleware');
const ListDisputesUseCase = require('../../application/use-cases/admin/list-disputes.usecase');
const ResolveDisputeUseCase = require('../../application/use-cases/admin/resolve-dispute.usecase');
const ListWithdrawalsUseCase = require('../../application/use-cases/admin/list-withdrawals.usecase');
const ApproveWithdrawalUseCase = require('../../application/use-cases/admin/approve-withdrawal.usecase');
const RejectWithdrawalUseCase = require('../../application/use-cases/admin/reject-withdrawal.usecase');

const PostgresDisputeRepository = require('../../infrastructure/database/repositories/postgres.dispute.repository');
const { PostgresTournamentRepository, TournamentModel, MatchModel, TournamentParticipantModel } = require('../../infrastructure/database/repositories/postgres.tournament.repository');
const PostgresTransactionRepository = require('../../infrastructure/database/repositories/postgres.transaction.repository');
const PostgresWalletRepository = require('../../infrastructure/database/repositories/postgres.wallet.repository');
// Conceptual: PaymentService and NotificationService would be imported if implemented
// const PaymentService = require('../../infrastructure/services/payment.service');
// const NotificationService = require('../../infrastructure/services/notification.service');
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');

const router = express.Router();

// Instantiate Repositories
const disputeRepository = new PostgresDisputeRepository();
const tournamentRepository = new PostgresTournamentRepository(TournamentModel, MatchModel, TournamentParticipantModel);
const transactionRepository = new PostgresTransactionRepository();
const walletRepository = new PostgresWalletRepository();
// const paymentService = null; // new PaymentService(); // Placeholder
// const notificationService = null; // new NotificationService(); // Placeholder

// Instantiate Use Cases
const listDisputesUseCase = new ListDisputesUseCase(disputeRepository);
const resolveDisputeUseCase = new ResolveDisputeUseCase(disputeRepository, tournamentRepository /*, notificationService */);
const listWithdrawalsUseCase = new ListWithdrawalsUseCase(transactionRepository);
const approveWithdrawalUseCase = new ApproveWithdrawalUseCase(transactionRepository, walletRepository /*, paymentService, notificationService */);
const rejectWithdrawalUseCase = new RejectWithdrawalUseCase(transactionRepository /*, notificationService */);


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

// --- Dispute Management Routes (DisputeModerator & Admin) ---

/**
 * GET /api/v1/admin/disputes
 * Get a list of disputes.
 */
router.get('/disputes', authenticateToken, authorizeRole(['DisputeModerator', 'Admin']), async (req, res, next) => {
  try {
    const { error, value: queryParams } = disputeFilterSchema.validate(req.query);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const result = await listDisputesUseCase.execute(queryParams);
    // Result: {disputes, totalItems, totalPages, currentPage, pageSize}

    return new ApiResponse(res, httpStatusCodes.OK, 'Disputes retrieved successfully.', result).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/admin/disputes/:id/resolve
 * Resolve a dispute.
 */
router.post('/disputes/:id/resolve', authenticateToken, authorizeRole(['DisputeModerator', 'Admin']), async (req, res, next) => {
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
    // result: { dispute: UpdatedDisputeTicket, match: UpdatedMatch }

    return new ApiResponse(res, httpStatusCodes.OK, 'Dispute resolved successfully.', result).send();
  } catch (error) {
    next(error);
  }
});


// --- Withdrawal Management Routes (FinanceManager & Admin) ---

/**
 * GET /api/v1/admin/withdrawals
 * Get a list of withdrawal requests.
 */
router.get('/withdrawals', authenticateToken, authorizeRole(['FinanceManager', 'Admin']), async (req, res, next) => {
  try {
    const { error, value: queryParams } = withdrawalFilterSchema.validate(req.query);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const result = await listWithdrawalsUseCase.execute(queryParams);
    // result: {withdrawals, totalItems, totalPages, currentPage, pageSize}

    return new ApiResponse(res, httpStatusCodes.OK, 'Withdrawal requests retrieved successfully.', result).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/admin/withdrawals/:id/approve
 * Approve a withdrawal request.
 */
router.post('/withdrawals/:id/approve', authenticateToken, authorizeRole(['FinanceManager', 'Admin']), async (req, res, next) => {
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

    return new ApiResponse(res, httpStatusCodes.OK, 'Withdrawal request approved.', updatedWithdrawal).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/admin/withdrawals/:id/reject
 * Reject a withdrawal request.
 */
router.post('/withdrawals/:id/reject', authenticateToken, authorizeRole(['FinanceManager', 'Admin']), async (req, res, next) => {
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

    return new ApiResponse(res, httpStatusCodes.OK, 'Withdrawal request rejected.', updatedWithdrawal).send();
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
