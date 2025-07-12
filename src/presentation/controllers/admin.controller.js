const listDisputes = (req, res, next) => {
  res.status(200).json([]);
};

const resolveDispute = (req, res, next) => {
  res.status(200).json({});
};

const listWithdrawals = (req, res, next) => {
  res.status(200).json([]);
};

const approveWithdrawal = (req, res, next) => {
  res.status(200).json({});
};

const rejectWithdrawal = (req, res, next) => {
  res.status(200).json({});
};

module.exports = {
  listDisputes,
  resolveDispute,
  listWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
};
