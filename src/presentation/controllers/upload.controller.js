const httpStatusCodes = require('http-status-codes');

class UploadController {
  constructor({ uploadFileUseCase }) {
    this.uploadFileUseCase = uploadFileUseCase;
  }

  uploadFile = async (req, res, next) => {
    try {
      const { file } = req;
      const { id: userId } = req.user;

      const fileUrl = await this.uploadFileUseCase.execute({ file, userId });

      res.status(httpStatusCodes.OK).json({ fileUrl });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = UploadController;
