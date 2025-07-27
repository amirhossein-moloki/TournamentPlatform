const { User } = require('../../../domain/user/user.entity');
const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class RejectVerification {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute(adminId, userIdToReject) {
    const admin = await this.userRepository.findById(adminId);
    if (!admin || !admin.hasRole('ADMIN')) {
      throw new ApiError(httpStatusCodes.FORBIDDEN, 'Only admins can reject verifications.');
    }

    const user = await this.userRepository.findById(userIdToReject);
    if (!user) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User to reject not found');
    }

    // Optionally, you could add logic to clear the photo/video URLs upon rejection
    // user.idCardPhotoUrl = null;
    // user.verificationVideoUrl = null;

    await this.userRepository.update(user);

    return { message: `Verification for user ${user.username} has been rejected.` };
  }
}

module.exports = RejectVerification;
