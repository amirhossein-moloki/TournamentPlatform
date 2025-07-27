const { User, VerificationLevel } = require('../../../domain/user/user.entity');
const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class SubmitVerificationVideo {
  constructor({ userRepository, fileUploader }) {
    this.userRepository = userRepository;
    this.fileUploader = fileUploader;
  }

  async execute(userId, file) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User not found');
    }

    if (user.verificationLevel < VerificationLevel.LEVEL_2) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Please complete level 2 verification first.');
    }

    const fileUrl = await this.fileUploader.upload(file);

    user.verificationVideoUrl = fileUrl;
    await this.userRepository.update(user);

    return { message: 'Verification video submitted successfully. Waiting for admin approval.' };
  }
}

module.exports = SubmitVerificationVideo;
