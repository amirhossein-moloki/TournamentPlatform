const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { getUserProfileUseCase, updateUserProfileUseCase } = require('../../config/dependencies');

const getCurrentUserProfile = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const userProfile = await getUserProfileUseCase.execute(userId);
    res.status(httpStatusCodes.OK).json(userProfile);
  } catch (error) {
    next(error);
  }
};

const updateCurrentUserProfile = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'User profile updated successfully.'));
};

const listUsers = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, [], 'Users fetched successfully.'));
};

const getUserById = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'User fetched successfully.'));
};

const updateUserById = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'User updated successfully.'));
};

const deleteUserById = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'User deleted successfully.'));
};

const { assignRoleUseCase, removeRoleUseCase } = require('../../config/dependencies');

const assignRole = async (req, res, next) => {
  try {
    const { id: userId } = req.params;
    const { role } = req.body;
    const updatedUser = await assignRoleUseCase.execute({ userId, role });
    res.status(httpStatusCodes.OK).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

const removeRole = async (req, res, next) => {
  try {
    const { id: userId, role } = req.params;
    const updatedUser = await removeRoleUseCase.execute({ userId, role });
    res.status(httpStatusCodes.OK).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  listUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  assignRole,
  removeRole,
};
