const catchAsync = require('../../utils/catchAsync');
const { getLeaderboardUseCase, getUserRankUseCase } = require('../../config/dependency-injection');
const ApiResponse = require('../../utils/ApiResponse');
const httpStatusCodes = require('http-status-codes');

const getLeaderboard = catchAsync(async (req, res) => {
  const { gameName, metric, period, page, limit } = req.query;
  const leaderboardData = await getLeaderboardUseCase.execute({ gameName, metric, period, page, limit });
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, leaderboardData, 'Leaderboard retrieved successfully'));
});

const getUserRank = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { gameName, metric, period, surroundingCount } = req.query;
  const userRankData = await getUserRankUseCase.execute({ userId, gameName, metric, period, surroundingCount });
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, userRankData, 'User rank retrieved successfully'));
});

module.exports = {
  getLeaderboard,
  getUserRank,
};
