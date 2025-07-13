const ApiResponse = require('../../utils/ApiResponse');
const httpStatusCodes = require('http-status-codes');

const listDisputes = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, [], 'Disputes fetched successfully.'));
};

const resolveDispute = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'Dispute resolved successfully.'));
};

const listWithdrawals = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, [], 'Withdrawals fetched successfully.'));
};

const approveWithdrawal = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'Withdrawal approved successfully.'));
};

const rejectWithdrawal = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'Withdrawal rejected successfully.'));
};

module.exports = {
  listDisputes,
  resolveDispute,
  listWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
};
