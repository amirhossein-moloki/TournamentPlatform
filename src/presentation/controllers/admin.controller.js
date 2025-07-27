const ApiResponse = require('../../utils/ApiResponse');
const httpStatusCodes = require('http-status-codes');

class AdminController {
  constructor({ approveVerificationUseCase, rejectVerificationUseCase }) {
    this.approveVerificationUseCase = approveVerificationUseCase;
    this.rejectVerificationUseCase = rejectVerificationUseCase;
  }

  async approveVerification(req, res, next) {
    try {
      const { id: adminId } = req.user;
      const { userId } = req.params;
      const result = await this.approveVerificationUseCase.execute(adminId, userId);
      res.status(httpStatusCodes.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  async rejectVerification(req, res, next) {
    try {
      const { id: adminId } = req.user;
      const { userId } = req.params;
      const result = await this.rejectVerificationUseCase.execute(adminId, userId);
      res.status(httpStatusCodes.OK).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;
