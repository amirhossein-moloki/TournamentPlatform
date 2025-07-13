const ApiResponse = require('../../utils/ApiResponse');
const httpStatusCodes = require('http-status-codes');

const getCurrentUserProfile = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'User profile fetched successfully.'));
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

const assignRole = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'Role assigned successfully.'));
};

const removeRole = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'Role removed successfully.'));
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
