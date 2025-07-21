const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');

class DashboardController {
  constructor(useCases) {
    this.useCases = useCases;
    this.getDashboardData = this.getDashboardData.bind(this);
  }

  async getDashboardData(req, res, next) {
    try {
      const userId = req.user.id;
      const dashboardData = await this.useCases.getDashboardDataUseCase.execute({ userId });
      const response = new ApiResponse(httpStatusCodes.OK, 'Dashboard data retrieved successfully.', dashboardData);
      res.status(httpStatusCodes.OK).json(response);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DashboardController;
