const Joi = require('joi');

const assignRoleSchema = Joi.object({
  body: Joi.object({
    targetUserId: Joi.string().uuid().required(),
    roleToAssign: Joi.string().required(),
  }),
});

const removeRoleSchema = Joi.object({
  body: Joi.object({
    targetUserId: Joi.string().uuid().required(),
    roleToRemove: Joi.string().required(),
  }),
});

const changeTournamentStatusSchema = Joi.object({
  params: Joi.object({
    tournamentId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    newStatus: Joi.string().required(),
    cancelReason: Joi.string(),
  }),
});

const listDisputesSchema = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    status: Joi.string().valid('OPEN', 'UNDER_REVIEW', 'RESOLVED_PARTICIPANT1_WIN', 'RESOLVED_PARTICIPANT2_WIN', 'RESOLVED_REPLAY', 'CLOSED', 'CLOSED_INVALID'),
    tournamentId: Joi.string().uuid(),
    matchId: Joi.string().uuid(), // Was undocumented
    moderatorId: Joi.string().uuid(), // Was undocumented
    sortBy: Joi.string(), // e.g., 'createdAt:desc'
  }),
});

const disputeIdParamSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
});

const resolveDisputeSchema = Joi.object({
    body: Joi.object({
        resolutionStatus: Joi.string().valid('RESOLVED_PARTICIPANT1_WIN', 'RESOLVED_PARTICIPANT2_WIN', 'RESOLVED_REPLAY', 'CLOSED_INVALID').required(),
        resolutionDetails: Joi.string().min(10).max(1000).required(),
        winningParticipantId: Joi.string().uuid().optional().allow(null), // If applicable
    }),
});

const listWithdrawalsSchema = Joi.object({
    query: Joi.object({
        page: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1).max(100),
        status: Joi.string().valid('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED'),
        userId: Joi.string().uuid(),
        sortBy: Joi.string(), // e.g., 'createdAt:desc'
    }),
});

const withdrawalIdParamSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
});

const approveWithdrawalSchema = Joi.object({
    body: Joi.object({
        notes: Joi.string().max(500).optional().allow('', null),
    }),
});

const rejectWithdrawalSchema = Joi.object({
    body: Joi.object({
        reason: Joi.string().min(10).max(500).required(),
    }),
});


module.exports = {
  assignRoleSchema,
  removeRoleSchema,
  changeTournamentStatusSchema,
  listDisputesSchema,
  disputeIdParamSchema,
  resolveDisputeSchema,
  listWithdrawalsSchema,
  withdrawalIdParamSchema,
  approveWithdrawalSchema,
  rejectWithdrawalSchema,
};
