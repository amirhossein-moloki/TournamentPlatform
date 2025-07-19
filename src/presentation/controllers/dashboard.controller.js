const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');
const getDashboardDataUseCase = require('../../application/use-cases/dashboard/get-dashboard-data.usecase');

const getDashboardData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const dashboardData = await getDashboardDataUseCase.execute({ userId });
    const response = new ApiResponse(httpStatusCodes.OK, 'Dashboard data retrieved successfully.', dashboardData);
    res.status(httpStatusCodes.OK).json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardData,
};
