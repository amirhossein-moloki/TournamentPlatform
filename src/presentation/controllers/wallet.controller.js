const getWalletDetails = (req, res, next) => {
  res.status(200).json({});
};

const initializeDeposit = (req, res, next) => {
  res.status(200).json({});
};

const getTransactionHistory = (req, res, next) => {
  res.status(200).json([]);
};

const requestWithdrawal = (req, res, next) => {
  res.status(202).json({});
};

module.exports = {
  getWalletDetails,
  initializeDeposit,
  getTransactionHistory,
  requestWithdrawal,
};
