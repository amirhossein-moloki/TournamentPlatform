const ApiResponse = require('../../utils/ApiResponse');
const httpStatusCodes = require('http-status-codes');
const catchAsync = require('../../utils/catchAsync');

class WalletController {
  constructor(useCases) {
    this.useCases = useCases;
  }

  getWalletDetails = catchAsync(async (req, res, next) => {
    const walletDetails = await this.useCases.getWalletDetailsUseCase.execute(req.user.id);
    res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, walletDetails, 'Wallet details fetched successfully.'));
  });

  initializeDeposit = catchAsync(async (req, res, next) => {
    const { amount, currency } = req.body;
    const depositInfo = await this.useCases.initializeDepositUseCase.execute(req.user.id, amount, currency);
    res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, depositInfo, 'Deposit initialized successfully.'));
  });

  getTransactionHistory = catchAsync(async (req, res, next) => {
    const transactions = await this.useCases.getTransactionHistoryUseCase.execute(req.user.id);
    res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, transactions, 'Transaction history fetched successfully.'));
  });

  requestWithdrawal = catchAsync(async (req, res, next) => {
    const { amount, currency, details } = req.body;
    await this.useCases.requestWithdrawalUseCase.execute(req.user.id, amount, currency, details);
    res.status(httpStatusCodes.ACCEPTED).json(new ApiResponse(httpStatusCodes.ACCEPTED, {}, 'Withdrawal request accepted.'));
  });
}

module.exports = WalletController;
