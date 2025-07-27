const { User, VerificationLevel } = require('../../../domain/user/user.entity');
const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class ApproveVerification {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute(adminId, userIdToApprove) {
    const admin = await this.userRepository.findById(adminId);
    if (!admin || !admin.hasRole('ADMIN')) {
      throw new ApiError(httpStatusCodes.FORBIDDEN, 'Only admins can approve verifications.');
    }

    const user = await this.userRepository.findById(userIdToApprove);
    if (!user) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User to approve not found');
    }

    if (user.verificationLevel === VerificationLevel.LEVEL_1 && user.idCardPhotoUrl) {
      user.verificationLevel = VerificationLevel.LEVEL_2;
    } else if (user.verificationLevel === VerificationLevel.LEVEL_2 && user.verificationVideoUrl) {
      user.verificationLevel = VerificationLevel.LEVEL_3;
    } else {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'User has not submitted the required documents for the next verification level.');
    }

    await this.userRepository.update(user);

    return { message: `User ${user.username} has been approved for verification level ${user.verificationLevel}.` };
  }
}

module.exports = ApproveVerification;
