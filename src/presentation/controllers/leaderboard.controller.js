const leaderboardService = require('../../services/leaderboard.service');
const catchAsync = require('../../utils/catchAsync');
const { successResponse } = require('../../utils/responseHandlers');

const getLeaderboard = catchAsync(async (req, res) => {
    const { gameName, metric, period, page, limit } = req.query;
    const leaderboardData = await leaderboardService.getLeaderboard(gameName, metric, period, { page, limit });
    successResponse(res, 200, leaderboardData, 'Leaderboard data retrieved successfully.');
});

const getUserRank = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { gameName, metric, period, surroundingCount } = req.query;
    const userRankData = await leaderboardService.getUserRank(userId, gameName, metric, period, surroundingCount);
    successResponse(res, 200, userRankData, "User's rank retrieved successfully.");
});

module.exports = {
    getLeaderboard,
    getUserRank,
};
