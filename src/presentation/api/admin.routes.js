const router = require('express').Router();
const adminController = require('../controllers/admin.controller'); // Assuming you will create this
const { authenticateToken, authorizeRole } = require('../../middleware/auth.middleware');
const { UserRoles } = require('../../domain/user/user.entity');
const validate = require('../../middleware/validation.middleware');
const {
  listDisputesSchema,
  disputeIdParamSchema,
  resolveDisputeSchema,
  listWithdrawalsSchema,
  withdrawalIdParamSchema,
  approveWithdrawalSchema,
  rejectWithdrawalSchema,
} = require('../validators/admin.validator');


// --- Routes ---

// --- Dispute Management ---
router.get('/disputes', authenticateToken, authorizeRole([UserRoles.ADMIN, UserRoles.DISPUTE_MODERATOR]), validate(listDisputesSchema), adminController.listDisputes);
/*  #swagger.tags = ['Admin']
    #swagger.summary = 'List dispute tickets (Admin/Moderator)'
    #swagger.description = 'Retrieves a paginated list of dispute tickets, with optional filters.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['page'] = { $ref: '#/components/parameters/PageParam' }
    #swagger.parameters['limit'] = { $ref: '#/components/parameters/LimitParam' }
    #swagger.parameters['status'] = { in: 'query', schema: { type: 'string', enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED_PARTICIPANT1_WIN', 'RESOLVED_PARTICIPANT2_WIN', 'RESOLVED_REPLAY', 'CLOSED', 'CLOSED_INVALID'] }, description: 'Filter by dispute status.' }
    #swagger.parameters['tournamentId'] = { in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by tournament ID.' }
    #swagger.parameters['matchId'] = { in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by match ID.' }
    #swagger.parameters['moderatorId'] = { in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by moderator ID.' }
    #swagger.parameters['sortBy'] = { in: 'query', schema: { type: 'string' }, description: 'Sort by field (e.g., createdAt:desc).' }
    #swagger.responses[200] = {
        description: 'A list of dispute tickets.',
        content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedDisputesResponse" } } }
    }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
*/

router.post('/disputes/:id/resolve', authenticateToken, authorizeRole([UserRoles.ADMIN, UserRoles.DISPUTE_MODERATOR]), validate(disputeIdParamSchema), validate(resolveDisputeSchema), adminController.resolveDispute);
/*  #swagger.tags = ['Admin']
    #swagger.summary = 'Resolve a dispute ticket (Admin/Moderator)'
    #swagger.description = 'Allows an Admin or Dispute Moderator to resolve a dispute ticket and update the related match if necessary.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { $ref: '#/components/parameters/DisputeIdPath' }
    #swagger.requestBody = {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/ResolveDisputeRequest" } } }
    }
    #swagger.responses[200] = {
        description: 'Dispute resolved successfully. Returns the updated dispute and match.',
        content: { "application/json": { schema: {
            type: "object",
            properties: {
                dispute: { $ref: "#/components/schemas/DisputeTicketResponse" },
                match: { $ref: "#/components/schemas/MatchDetailsResponse" }
            }
        }}}
    }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' } // If dispute or match not found
*/

// --- Withdrawal Management ---
router.get('/withdrawals', authenticateToken, authorizeRole([UserRoles.ADMIN, UserRoles.FINANCE_MANAGER]), validate(listWithdrawalsSchema), adminController.listWithdrawals);
/*  #swagger.tags = ['Admin']
    #swagger.summary = 'List withdrawal requests (Admin/Finance Manager)'
    #swagger.description = 'Retrieves a paginated list of withdrawal requests, with optional filters.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['page'] = { $ref: '#/components/parameters/PageParam' }
    #swagger.parameters['limit'] = { $ref: '#/components/parameters/LimitParam' }
    #swagger.parameters['status'] = { in: 'query', schema: { type: 'string', enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED'] }, description: 'Filter by withdrawal status.' }
    #swagger.parameters['userId'] = { in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by user ID.' }
    #swagger.parameters['sortBy'] = { in: 'query', schema: { type: 'string' }, description: 'Sort by field (e.g., createdAt:desc).' }
    #swagger.responses[200] = {
        description: 'A list of withdrawal requests.',
        content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedWithdrawalsAdminResponse" } } }
    }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
*/

router.post('/withdrawals/:id/approve', authenticateToken, authorizeRole([UserRoles.ADMIN, UserRoles.FINANCE_MANAGER]), validate(withdrawalIdParamSchema), validate(approveWithdrawalSchema), adminController.approveWithdrawal);
/*  #swagger.tags = ['Admin']
    #swagger.summary = 'Approve a withdrawal request (Admin/Finance Manager)'
    #swagger.description = 'Marks a withdrawal request as approved.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { $ref: '#/components/parameters/WithdrawalIdPath' }
    #swagger.requestBody = {
        required: false, // Notes are optional
        content: { "application/json": { schema: { $ref: "#/components/schemas/ApproveWithdrawalRequest" } } }
    }
    #swagger.responses[200] = {
        description: 'Withdrawal request approved successfully.',
        content: { "application/json": { schema: { $ref: "#/components/schemas/WithdrawalRequestAdminView" } } }
    }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
*/

router.post('/withdrawals/:id/reject', authenticateToken, authorizeRole([UserRoles.ADMIN, UserRoles.FINANCE_MANAGER]), validate(withdrawalIdParamSchema), validate(rejectWithdrawalSchema), adminController.rejectWithdrawal);
/*  #swagger.tags = ['Admin']
    #swagger.summary = 'Reject a withdrawal request (Admin/Finance Manager)'
    #swagger.description = 'Marks a withdrawal request as rejected.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { $ref: '#/components/parameters/WithdrawalIdPath' }
    #swagger.requestBody = {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/RejectWithdrawalRequest" } } }
    }
    #swagger.responses[200] = {
        description: 'Withdrawal request rejected successfully.',
        content: { "application/json": { schema: { $ref: "#/components/schemas/WithdrawalRequestAdminView" } } }
    }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
*/

module.exports = router;
