const express = require('express');
const Joi = require('joi');
const { authenticateToken, authorizeRole } = require('../../middleware/auth.middleware');
// const GetDisputesUseCase = require('../../application/use-cases/admin/get-disputes.usecase');
// const ResolveDisputeUseCase = require('../../application/use-cases/admin/resolve-dispute.usecase');
// const GetWithdrawalsUseCase = require('../../application/use-cases/admin/get-withdrawals.usecase');
// const ApproveWithdrawalUseCase = require('../../application/use-cases/admin/approve-withdrawal.usecase');
// const RejectWithdrawalUseCase = require('../../application/use-cases/admin/reject-withdrawal.usecase');
// Repositories (placeholders, actual ones would be used by use cases)
// const DisputeRepository = require('../../infrastructure/database/repositories/postgres.dispute.repository');
// const TransactionRepository = require('../../infrastructure/database/repositories/postgres.transaction.repository'); // For withdrawals
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');

const router = express.Router();
// const disputeRepository = new DisputeRepository();
// const transactionRepository = new TransactionRepository(); // For withdrawal data

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


// --- Placeholder Data (to be replaced by repository/use case calls) ---
let DISPUTES_DB_PLACEHOLDER = [
    // { id: 'disp-uuid-1', matchId: 'match-uuid-1', reporterId: 'user-uuid-1', reason: 'Opponent cheated', status: 'OPEN', createdAt: new Date(), updatedAt: new Date() }
];
let WITHDRAWALS_DB_PLACEHOLDER = [
    // { id: 'wdrl-uuid-1', userId: 'user-uuid-2', amount: 50.00, currency: 'USD', status: 'PENDING_APPROVAL', requestedAt: new Date(), withdrawalMethodDetails: {type: 'paypal', email: 'user@example.com'} }
];
let nextDisputeId = 1;
let nextWithdrawalId = 1;

// --- Dispute Management Routes (DisputeModerator) ---

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

    // const getDisputes = new GetDisputesUseCase(disputeRepository);
    // const result = await getDisputes.execute(queryParams);

    // Placeholder logic:
    let filteredDisputes = [...DISPUTES_DB_PLACEHOLDER];
    if (queryParams.status) filteredDisputes = filteredDisputes.filter(d => d.status === queryParams.status);
    // Add other filters...
    const totalItems = filteredDisputes.length;
    const items = filteredDisputes.slice((queryParams.page - 1) * queryParams.limit, queryParams.page * queryParams.limit);
    const result = { items, totalItems, page: queryParams.page, limit: queryParams.limit };
    // End placeholder

    return new ApiResponse(res, httpStatusCodes.OK, 'Disputes retrieved successfully.', {
      disputes: result.items,
      totalItems: result.totalItems,
      currentPage: result.page,
      pageSize: result.limit,
      totalPages: Math.ceil(result.totalItems / result.limit),
    }).send();
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
    const { id: disputeId } = req.params;
    if (Joi.string().uuid().validate(disputeId).error && !disputeId.startsWith('disp-uuid-')) { // Allow placeholder ID
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid dispute ID format.');
    }

    const { error, value: resolutionData } = resolveDisputeSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    // const resolveDispute = new ResolveDisputeUseCase(disputeRepository /*, matchRepository, ... */);
    // const updatedDispute = await resolveDispute.execute(disputeId, req.user.sub, resolutionData);

    // Placeholder logic:
    const disputeIndex = DISPUTES_DB_PLACEHOLDER.findIndex(d => d.id === disputeId);
    if (disputeIndex === -1) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Dispute not found.');
    }
    if (DISPUTES_DB_PLACEHOLDER[disputeIndex].status !== 'OPEN' && DISPUTES_DB_PLACEHOLDER[disputeIndex].status !== 'UNDER_REVIEW') {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, `Dispute cannot be resolved from status: ${DISPUTES_DB_PLACEHOLDER[disputeIndex].status}`);
    }
    DISPUTES_DB_PLACEHOLDER[disputeIndex] = {
      ...DISPUTES_DB_PLACEHOLDER[disputeIndex],
      status: resolutionData.resolutionStatus, // This status needs to be mapped from the request to internal dispute statuses
      resolutionDetails: resolutionData.resolutionDetails,
      moderatorId: req.user.sub,
      updatedAt: new Date(),
    };
    const updatedDispute = DISPUTES_DB_PLACEHOLDER[disputeIndex];
    // This would also trigger updates to the related Match entity.
    // End placeholder

    return new ApiResponse(res, httpStatusCodes.OK, 'Dispute resolved successfully.', updatedDispute).send();
  } catch (error) {
    next(error);
  }
});


// --- Withdrawal Management Routes (FinanceManager) ---

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

    // const getWithdrawals = new GetWithdrawalsUseCase(transactionRepository); // Assuming withdrawals are transactions
    // const result = await getWithdrawals.execute(queryParams);

    // Placeholder logic:
    let filteredWithdrawals = [...WITHDRAWALS_DB_PLACEHOLDER];
    if (queryParams.status) filteredWithdrawals = filteredWithdrawals.filter(w => w.status === queryParams.status);
    // Add other filters...
    const totalItems = filteredWithdrawals.length;
    const items = filteredWithdrawals.slice((queryParams.page - 1) * queryParams.limit, queryParams.page * queryParams.limit);
    const result = { items, totalItems, page: queryParams.page, limit: queryParams.limit };
    // End placeholder

    return new ApiResponse(res, httpStatusCodes.OK, 'Withdrawal requests retrieved successfully.', {
      withdrawals: result.items,
      totalItems: result.totalItems,
      currentPage: result.page,
      pageSize: result.limit,
      totalPages: Math.ceil(result.totalItems / result.limit),
    }).send();
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
    const { id: withdrawalId } = req.params;
     if (Joi.string().uuid().validate(withdrawalId).error && !withdrawalId.startsWith('wdrl-uuid-')) { // Allow placeholder ID
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid withdrawal ID format.');
    }

    const { error, value: approvalData } = approveWithdrawalSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    // const approveWithdrawal = new ApproveWithdrawalUseCase(transactionRepository /*, paymentService */);
    // const updatedWithdrawal = await approveWithdrawal.execute(withdrawalId, req.user.sub, approvalData.notes);

    // Placeholder logic:
    const withdrawalIndex = WITHDRAWALS_DB_PLACEHOLDER.findIndex(w => w.id === withdrawalId);
    if (withdrawalIndex === -1) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Withdrawal request not found.');
    }
    if (WITHDRAWALS_DB_PLACEHOLDER[withdrawalIndex].status !== 'PENDING_APPROVAL') {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, `Withdrawal cannot be approved from status: ${WITHDRAWALS_DB_PLACEHOLDER[withdrawalIndex].status}`);
    }
    WITHDRAWALS_DB_PLACEHOLDER[withdrawalIndex] = {
      ...WITHDRAWALS_DB_PLACEHOLDER[withdrawalIndex],
      status: 'APPROVED', // Or 'PROCESSING' if it triggers actual payment
      adminNotes: approvalData.notes,
      moderatorId: req.user.sub, // User who approved
      updatedAt: new Date(),
    };
    const updatedWithdrawal = WITHDRAWALS_DB_PLACEHOLDER[withdrawalIndex];
    // This would then trigger actual fund transfer via a payment service.
    // And update wallet balance upon successful transfer.
    // End placeholder

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
    const { id: withdrawalId } = req.params;
    if (Joi.string().uuid().validate(withdrawalId).error && !withdrawalId.startsWith('wdrl-uuid-')) { // Allow placeholder ID
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid withdrawal ID format.');
    }

    const { error, value: rejectionData } = rejectWithdrawalSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    // const rejectWithdrawal = new RejectWithdrawalUseCase(transactionRepository);
    // const updatedWithdrawal = await rejectWithdrawal.execute(withdrawalId, req.user.sub, rejectionData.reason);

    // Placeholder logic:
    const withdrawalIndex = WITHDRAWALS_DB_PLACEHOLDER.findIndex(w => w.id === withdrawalId);
    if (withdrawalIndex === -1) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Withdrawal request not found.');
    }
     if (WITHDRAWALS_DB_PLACEHOLDER[withdrawalIndex].status !== 'PENDING_APPROVAL') {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, `Withdrawal cannot be rejected from status: ${WITHDRAWALS_DB_PLACEHOLDER[withdrawalIndex].status}`);
    }
    WITHDRAWALS_DB_PLACEHOLDER[withdrawalIndex] = {
      ...WITHDRAWALS_DB_PLACEHOLDER[withdrawalIndex],
      status: 'REJECTED',
      adminNotes: rejectionData.reason,
      moderatorId: req.user.sub, // User who rejected
      updatedAt: new Date(),
    };
    const updatedWithdrawal = WITHDRAWALS_DB_PLACEHOLDER[withdrawalIndex];
    // If funds were on hold, release them back to user's main balance.
    // End placeholder

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
