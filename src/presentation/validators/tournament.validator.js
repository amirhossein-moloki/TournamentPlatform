const Joi = require('joi');

const createTournamentSchema = Joi.object({
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
});

const listTournamentsSchema = Joi.object({
    query: Joi.object({
        page: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1).max(100),
        status: Joi.string().valid('PENDING', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED', 'CANCELED'),
        gameName: Joi.string(), // Changed from gameId to gameName as per audit notes for filtering
        sortBy: Joi.string().valid('startDate', 'name', 'entryFee', 'prizePool'),
        sortOrder: Joi.string().valid('ASC', 'DESC'),
    }),
});

const tournamentIdParamSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
});

const getTournamentSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
    query: Joi.object({
        include: Joi.string().optional(), // e.g., 'participants,matches'
    }),
});

module.exports = {
  createTournamentSchema,
  listTournamentsSchema,
  tournamentIdParamSchema,
  getTournamentSchema,
};
