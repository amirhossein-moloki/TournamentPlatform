const httpStatusCodes = require('http-status-codes');

class VerificationController {
  constructor({ submitIdCardUseCase, submitVerificationVideoUseCase, approveVerificationUseCase, rejectVerificationUseCase }) {
    this.submitIdCardUseCase = submitIdCardUseCase;
    this.submitVerificationVideoUseCase = submitVerificationVideoUseCase;
    this.approveVerificationUseCase = approveVerificationUseCase;
    this.rejectVerificationUseCase = rejectVerificationUseCase;
  }

  async submitIdCard(req, res, next) {
    try {
      const { id: userId } = req.user;
      const result = await this.submitIdCardUseCase.execute(userId, req.file);
      res.status(httpStatusCodes.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  async submitVerificationVideo(req, res, next) {
    try {
      const { id: userId } = req.user;
      const result = await this.submitVerificationVideoUseCase.execute(userId, req.file);
      res.status(httpStatusCodes.OK).json(result);
    } catch (error) {
      next(error);
    }
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

module.exports = VerificationController;
