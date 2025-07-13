const ApiResponse = require('../../utils/ApiResponse');
const httpStatusCodes = require('http-status-codes');

const getWalletDetails = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'Wallet details fetched successfully.'));
};

const initializeDeposit = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'Deposit initialized successfully.'));
};

const getTransactionHistory = (req, res, next) => {
  res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, [], 'Transaction history fetched successfully.'));
};

const requestWithdrawal = (req, res, next) => {
  res.status(httpStatusCodes.ACCEPTED).json(new ApiResponse(httpStatusCodes.ACCEPTED, {}, 'Withdrawal request accepted.'));
};

module.exports = {
  getWalletDetails,
  initializeDeposit,
  getTransactionHistory,
  requestWithdrawal,
};
