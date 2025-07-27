const { User, VerificationLevel } = require('../../../domain/user/user.entity');
const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class SubmitIdCard {
  constructor({ userRepository, fileUploader }) {
    this.userRepository = userRepository;
    this.fileUploader = fileUploader;
  }

  async execute(userId, file) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User not found');
    }

    const fileUrl = await this.fileUploader.upload(file);

    user.idCardPhotoUrl = fileUrl;
    await this.userRepository.update(user);

    return { message: 'ID card submitted successfully. Waiting for admin approval.' };
  }
}

module.exports = SubmitIdCard;
