const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class LogoutUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute(userId) {
        if (!userId) {
            throw new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID is required.');
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new ApiError(httpStatusCodes.NOT_FOUND, 'User not found.');
        }

        user.updateRefreshToken(null);
        await this.userRepository.update(user);

        return { message: 'Logout successful.' };
    }
}

module.exports = LogoutUseCase;
