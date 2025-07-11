const express = require('express');
const Joi = require('joi');
const { leaderboardService } = require('../../config/dependencies'); // Direct import
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');

const router = express.Router();

// Destructure use cases for cleaner access
const { getLeaderboardUseCase, getUserRankUseCase } = leaderboardService;

// --- Schemas for Validation ---
const getLeaderboardSchema = Joi.object({
  gameName: Joi.string().min(2).max(50).required().description('Name of the game for the leaderboard.'),
  metric: Joi.string().valid('wins', 'score', 'rating', 'earnings').default('rating').description('Metric to rank by.'),
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'all_time').default('all_time').description('Time period for the leaderboard.'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20), // Leaderboards often show top N
});

// --- Route Handlers ---

router.get('/', async (req, res, next) => {
  /*
    #swagger.tags = ['Leaderboards']
    #swagger.summary = 'Get a specific leaderboard.'
    #swagger.description = 'Retrieves leaderboard entries based on game, metric, period, and pagination. Publicly accessible.'
    #swagger.parameters['gameName'] = {
        in: 'query', required: true, description: 'Name of the game for the leaderboard.',
        schema: { type: 'string', minLength: 2, maxLength: 50, example: 'Epic Quest RPG' }
    }
    #swagger.parameters['metric'] = {
        in: 'query', description: 'Metric to rank by.',
        schema: { type: 'string', enum: ['wins', 'score', 'rating', 'earnings'], default: 'rating' }
    }
    #swagger.parameters['period'] = {
        in: 'query', description: 'Time period for the leaderboard.',
        schema: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'all_time'], default: 'all_time' }
    }
    #swagger.parameters['page'] = {
        in: 'query', description: 'Page number for pagination.',
        schema: { type: 'integer', minimum: 1, default: 1 }
    }
    #swagger.parameters['limit'] = {
        in: 'query', description: 'Number of entries per page.',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
    }
    #swagger.responses[200] = {
        description: 'Leaderboard retrieved successfully.',
        content: { "application/json": { schema: { $ref: "#/components/schemas/LeaderboardResponse" } } }
    }
    #swagger.responses[400] = {
        description: 'Validation error (e.g., missing gameName or invalid parameters).',
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    }
    #swagger.responses[500] = {
        description: 'Internal server error.',
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    }
  */
  try {
    const { error, value: queryParams } = getLeaderboardSchema.validate(req.query);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const leaderboardData = await getLeaderboardUseCase.execute(queryParams);

    // The GetLeaderboardUseCase returns a Leaderboard entity.
    // We need to map its fields to the expected API response structure.
    // The entity has 'entries', API expects 'leaderboard'.
    // The entity entries have 'score', API expects 'value'.
    // The use case already adapts 'score' to 'value' in its adaptedEntries.
    // The use case returns an instance of Leaderboard entity which has:
    // gameName, metric, period, entries (already adapted), totalItems, currentPage, pageSize, totalPages

    return new ApiResponse(res, httpStatusCodes.OK, `Leaderboard for ${leaderboardData.gameName} (${leaderboardData.metric} - ${leaderboardData.period}) retrieved.`, {
      leaderboard: leaderboardData.entries, // Use case returns adapted entries in 'entries' field
      gameName: leaderboardData.gameName,
      metric: leaderboardData.metric,
      period: leaderboardData.period,
      totalItems: leaderboardData.totalItems,
      currentPage: leaderboardData.currentPage,
      pageSize: leaderboardData.pageSize, // Use case uses 'pageSize' which matches API
      totalPages: leaderboardData.totalPages,
    }).send();
  } catch (error) {
    next(error);
  }
});

router.get('/user/:userId', async (req, res, next) => {
  /*
    #swagger.tags = ['Leaderboards']
    #swagger.summary = "Get a user's rank on a leaderboard."
    #swagger.description = "Retrieves a specific user's rank and surrounding entries on a leaderboard, based on game, metric, and period. Publicly accessible."
    #swagger.parameters['userId'] = {
        in: 'path', required: true, description: "ID of the user whose rank is to be retrieved.",
        schema: { type: 'string', example: 'user-id-123' } // Can be more specific e.g. format: 'uuid' if applicable
    }
    #swagger.parameters['gameName'] = {
        in: 'query', required: true, description: 'Name of the game for the leaderboard context.',
        schema: { type: 'string', minLength: 2, maxLength: 50, example: 'Epic Quest RPG' }
    }
    #swagger.parameters['metric'] = {
        in: 'query', description: 'Metric to rank by.',
        schema: { type: 'string', enum: ['wins', 'score', 'rating', 'earnings'], default: 'rating' }
    }
    #swagger.parameters['period'] = {
        in: 'query', description: 'Time period for the leaderboard.',
        schema: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'all_time'], default: 'all_time' }
    }
    // Note: page/limit for the surrounding entries are not query params here, typically fixed (e.g. +/-2)
    #swagger.responses[200] = {
        description: "User's rank details retrieved successfully.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/UserRankDetail" } } }
    }
    #swagger.responses[400] = {
        description: 'Validation error (e.g., invalid User ID or missing gameName).',
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    }
    #swagger.responses[404] = {
        description: 'User not found on the specified leaderboard.', // Or User ID itself not found
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    }
    #swagger.responses[500] = {
        description: 'Internal server error.',
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
    }
  */
    try {
        const { userId } = req.params;
        // Validate userId format if necessary
        if (Joi.string().uuid().validate(userId).error && Joi.string().alphanum().min(1).validate(userId).error) { // Basic check
             throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid user ID format.');
        }

        const { error, value: queryParams } = getLeaderboardSchema.validate(req.query); // Re-use schema, but page/limit are not for user rank query
         if (error) {
            throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error (query params)', error.details.map(d => d.message));
        }

        const userRankData = await getUserRankUseCase.execute(userId, queryParams);

        // GetUserRankUseCase returns a UserRankDetail entity.
        // The entity has user's score as 'score', API expects 'value'.
        // The entity's surrounding entries have scores as 'score', API expects 'value'.
        // The use case already adapts these to 'value'.

        // The UserRankDetail entity structure:
        // userId, gameName, metric, period, rank, score (user's own), surrounding (list of adapted entries)
        // We need to map this to the API response, ensuring the user's own score is also under 'value'.
        const responsePayload = {
            userId: userRankData.userId,
            gameName: userRankData.gameName,
            metric: userRankData.metric,
            period: userRankData.period,
            rank: userRankData.rank,
            value: userRankData.score, // User's own score, use case provides it as 'score' field in UserRankDetail entity
            surrounding: userRankData.surrounding, // Use case provides adapted surrounding entries
        };

        return new ApiResponse(res, httpStatusCodes.OK, `Rank details for user ${userId} retrieved.`, responsePayload).send();

    } catch (error) {
        next(error);
    }
});


module.exports = router;

// Notes:
// - This file defines routes for accessing leaderboards.
// - Leaderboard data is typically stored in a read-optimized database like Redis (using Sorted Sets)
//   or specially indexed tables in PostgreSQL. The `LeaderboardRepository` would abstract this.
// - Placeholder logic is used to return mock leaderboard data.
// - Input query parameters (gameName, metric, period, pagination) are validated using Joi.
// - The `/user/:userId` route is an example of a common feature to get a user's specific rank.
//   This was not in the blueprint's API table but is a logical extension for leaderboards.
// - Actual implementation of leaderboards requires significant backend logic for data aggregation,
//   ranking calculations, and efficient querying, which would be handled by use cases and repositories.
// - The `metric` and `period` parameters allow for flexible leaderboard views.
// - The blueprint mentions "Leaderboards are served from a database optimized for fast reads (e.g., Redis)."
//   This implies a `RedisLeaderboardRepository` would be a likely implementation choice.
// - The Joi validation for `gameName` is required in the schema. This means every leaderboard request
//   must specify a game.
// - Updated userId validation in `/user/:userId` to be more generic.
