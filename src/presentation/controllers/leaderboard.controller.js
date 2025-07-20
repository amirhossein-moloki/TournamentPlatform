const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const httpStatusCodes = require('http-status-codes');

class LeaderboardController {
    constructor({ getLeaderboardUseCase, getUserRankUseCase }) {
        this.getLeaderboardUseCase = getLeaderboardUseCase;
        this.getUserRankUseCase = getUserRankUseCase;
    }

    getLeaderboard = catchAsync(async (req, res) => {
        const { gameName, metric, period, page, limit } = req.query;
        const leaderboardData = await this.getLeaderboardUseCase.execute({ gameName, metric, period, page, limit });
        res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, leaderboardData, 'Leaderboard retrieved successfully'));
    });

    getUserRank = catchAsync(async (req, res) => {
        const { userId } = req.params;
        const { gameName, metric, period, surroundingCount } = req.query;
        const userRankData = await this.getUserRankUseCase.execute({ userId, gameName, metric, period, surroundingCount });
        res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, userRankData, 'User rank retrieved successfully'));
    });
}

module.exports = LeaderboardController;
