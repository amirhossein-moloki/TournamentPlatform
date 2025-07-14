const router = require('express').Router();
const leaderboardController = require('../controllers/leaderboard.controller');
const validate = require('../../middleware/validation.middleware');
const { getLeaderboardSchema, getUserRankSchema } = require('../validators/leaderboard.validator');


// --- Routes ---

router.get('/', validate(getLeaderboardSchema), leaderboardController.getLeaderboard);
/*  #swagger.tags = ['Leaderboards']
    #swagger.summary = 'Get a leaderboard'
    #swagger.description = 'Retrieves leaderboard data based on game, metric, and period.'
    #swagger.parameters['gameName'] = { in: 'query', required: true, schema: { type: 'string' }, description: 'Name of the game for the leaderboard.' }
    #swagger.parameters['metric'] = { in: 'query', schema: { type: 'string', enum: ['wins', 'score', 'rating', 'earnings'], default: 'rating' }, description: 'Metric to base the leaderboard on.' }
    #swagger.parameters['period'] = { in: 'query', schema: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'all_time'], default: 'all_time' }, description: 'Time period for the leaderboard.' }
    #swagger.parameters['page'] = { $ref: '#/components/parameters/PageParam' }
    #swagger.parameters['limit'] = { $ref: '#/components/parameters/LimitParam' }
    #swagger.responses[200] = {
        description: 'Leaderboard data retrieved successfully.',
        content: { "application/json": { schema: { $ref: '#/components/schemas/LeaderboardResponse' } } }
    }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
*/

router.get('/user/:userId', validate(getUserRankSchema), leaderboardController.getUserRank);
/*  #swagger.tags = ['Leaderboards']
    #swagger.summary = "Get user's rank on leaderboards"
    #swagger.description = "Retrieves the rank and surrounding entries for a specific user on leaderboards."
    #swagger.parameters['userId'] = { $ref: '#/components/parameters/UserIdPath' }
    #swagger.parameters['gameName'] = { in: 'query', required: true, schema: { type: 'string' }, description: 'Name of the game.' }
    #swagger.parameters['metric'] = { in: 'query', schema: { type: 'string', enum: ['wins', 'score', 'rating', 'earnings'], default: 'rating' } }
    #swagger.parameters['period'] = { in: 'query', schema: { type: "string", enum: ["daily", "weekly", "monthly", "all_time"], default: "all_time" } }
    #swagger.parameters['surroundingCount'] = { in: 'query', schema: { type: 'integer', default: 5 }, description: 'Number of entries to show above and below the user.' }
    #swagger.responses[200] = {
        description: "User rank details retrieved successfully.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/UserRankDetail" } } }
    }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
*/

module.exports = router;
