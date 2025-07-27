const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');

class UserController {
  constructor({
    getUserProfileUseCase,
    updateUserProfileUseCase,
    listUsersUseCase,
    adminUpdateUserUseCase,
    adminDeleteUserUseCase,
    assignRoleUseCase,
    removeRoleUseCase,
    submitIdCardUseCase,
    submitVerificationVideoUseCase,
  }) {
    this.getUserProfileUseCase = getUserProfileUseCase;
    this.updateUserProfileUseCase = updateUserProfileUseCase;
    this.listUsersUseCase = listUsersUseCase;
    this.adminUpdateUserUseCase = adminUpdateUserUseCase;
    this.adminDeleteUserUseCase = adminDeleteUserUseCase;
    this.assignRoleUseCase = assignRoleUseCase;
    this.removeRoleUseCase = removeRoleUseCase;
    this.submitIdCardUseCase = submitIdCardUseCase;
    this.submitVerificationVideoUseCase = submitVerificationVideoUseCase;
  }

  async getCurrentUserProfile(req, res, next) {
    try {
      const { id: userId } = req.user;
      const userProfile = await this.getUserProfileUseCase.execute(userId);
      res.status(httpStatusCodes.OK).json(userProfile);
    } catch (error) {
      next(error);
    }
  }

  updateCurrentUserProfile(req, res, next) {
    res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'User profile updated successfully.'));
  }

  listUsers(req, res, next) {
    res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, [], 'Users fetched successfully.'));
  }

  getUserById(req, res, next) {
    res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'User fetched successfully.'));
  }

  updateUserById(req, res, next) {
    res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'User updated successfully.'));
  }

  deleteUserById(req, res, next) {
    res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'User deleted successfully.'));
  }

  async assignRole(req, res, next) {
    try {
      const { id: userId } = req.params;
      const { role } = req.body;
      const updatedUser = await this.assignRoleUseCase.execute({ userId, role });
      res.status(httpStatusCodes.OK).json(updatedUser);
    } catch (error) {
      next(error);
    }
  }

  async removeRole(req, res, next) {
    try {
      const { id: userId, role } = req.params;
      const updatedUser = await this.removeRoleUseCase.execute({ userId, role });
      res.status(httpStatusCodes.OK).json(updatedUser);
    } catch (error) {
      next(error);
    }
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
}

module.exports = UserController;
