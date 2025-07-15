const httpStatusCodes = require('http-status-codes');
const { uploadFileUseCase } = require('../../config/dependencies');

const uploadFile = async (req, res, next) => {
  try {
    const { file } = req;
    const { id: userId } = req.user;

    const fileUrl = await uploadFileUseCase.execute({ file, userId });

    res.status(httpStatusCodes.OK).json({ fileUrl });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
};
