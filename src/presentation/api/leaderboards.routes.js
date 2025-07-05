const express = require('express');
const Joi = require('joi');
// const GetLeaderboardUseCase = require('../../application/use-cases/leaderboard/get-leaderboard.usecase');
// const LeaderboardRepository = require('../../infrastructure/database/repositories/leaderboard.repository'); // e.g., RedisLeaderboardRepository or PostgresLeaderboardRepository
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');

const router = express.Router();
// const leaderboardRepository = new LeaderboardRepository(); // Instantiate when repository exists

// --- Schemas for Validation ---
const getLeaderboardSchema = Joi.object({
  gameName: Joi.string().min(2).max(50).required().description('Name of the game for the leaderboard.'),
  metric: Joi.string().valid('wins', 'score', 'rating', 'earnings').default('rating').description('Metric to rank by.'),
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'all_time').default('all_time').description('Time period for the leaderboard.'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20), // Leaderboards often show top N
});

// --- Route Handlers ---

/**
 * GET /api/v1/leaderboards
 * Get leaderboards, typically filtered by game, metric, and period.
 */
router.get('/', async (req, res, next) => {
  try {
    const { error, value: queryParams } = getLeaderboardSchema.validate(req.query);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    // const getLeaderboard = new GetLeaderboardUseCase(leaderboardRepository);
    // const { leaderboard, totalItems } = await getLeaderboard.execute(queryParams);

    // --- Placeholder Logic ---
    // This would involve querying a read-optimized store like Redis (using sorted sets)
    // or a specific table/view in PostgreSQL designed for fast leaderboard queries.
    // The data might be aggregated from match results, tournament winnings, user stats, etc.
    const placeholderLeaderboard = [];
    const numEntries = queryParams.limit > 50 ? 50 : queryParams.limit; // Max 50 for placeholder
    for (let i = 0; i < numEntries; i++) {
      placeholderLeaderboard.push({
        rank: ((queryParams.page - 1) * queryParams.limit) + i + 1,
        userId: `user-id-${1000 + i}`, // Placeholder user ID
        username: `Player${1000 + i}`, // Placeholder username
        [queryParams.metric]: Math.floor(Math.random() * (queryParams.metric === 'earnings' ? 5000 : 3000)) + (queryParams.metric === 'earnings' ? 100 : 50), // Placeholder score
        gamesPlayed: Math.floor(Math.random() * 100) + 10, // Example additional stat
      });
    }
    const totalItems = 1000; // Mock total items for this leaderboard
    const leaderboard = placeholderLeaderboard;
    // --- End Placeholder Logic ---

    return new ApiResponse(res, httpStatusCodes.OK, `Leaderboard for ${queryParams.gameName} (${queryParams.metric} - ${queryParams.period}) retrieved.`, {
      leaderboard,
      gameName: queryParams.gameName,
      metric: queryParams.metric,
      period: queryParams.period,
      totalItems,
      currentPage: queryParams.page,
      pageSize: queryParams.limit,
      totalPages: Math.ceil(totalItems / queryParams.limit),
    }).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/leaderboards/user/:userId
 * Get a specific user's rank and surrounding entries on leaderboards.
 * (This is a common feature, though not explicitly in the blueprint's API table)
 */
router.get('/user/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        // Validate userId format if necessary (e.g., Joi.string().uuid())
        if (Joi.string().uuid().validate(userId).error && Joi.string().alphanum().min(1).validate(userId).error) {
             throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid user ID format.');
        }


        // Query parameters might include gameName, metric, period similar to the main leaderboard
        const { error, value: queryParams } = getLeaderboardSchema.validate(req.query);
         if (error) {
            throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
        }

        // const getUserRank = new GetUserRankUseCase(leaderboardRepository);
        // const userRankDetails = await getUserRank.execute(userId, queryParams);

        // --- Placeholder Logic ---
        const userRank = Math.floor(Math.random() * 100) + 1; // Random rank for placeholder
        const userScore = Math.floor(Math.random() * 3000) + 50;
        const surroundingEntries = [];
        for (let i = -2; i <= 2; i++) {
            if (userRank + i > 0) {
                surroundingEntries.push({
                    rank: userRank + i,
                    userId: (userRank + i === userRank) ? userId : `user-id-${2000 + i}`,
                    username: (userRank + i === userRank) ? `User_${userId.substring(0,5)}` : `OtherPlayer${2000 + i}`,
                    [queryParams.metric]: userScore + (i * (queryParams.metric === 'earnings' ? 10 : 5)), // Adjust score slightly
                });
            }
        }
        const userRankDetails = {
            userId,
            gameName: queryParams.gameName,
            metric: queryParams.metric,
            period: queryParams.period,
            rank: userRank,
            [queryParams.metric]: userScore,
            surrounding: surroundingEntries,
        };
        // --- End Placeholder Logic ---

        return new ApiResponse(res, httpStatusCodes.OK, `Rank details for user ${userId} retrieved.`, userRankDetails).send();

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
