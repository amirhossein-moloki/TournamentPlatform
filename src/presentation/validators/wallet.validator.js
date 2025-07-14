const Joi = require('joi');
const { TransactionStatus, TransactionType } = require('../../domain/wallet/transaction.entity');

const initializeDepositSchema = Joi.object({
    body: Joi.object({
        amount: Joi.number().positive().precision(2).required(),
        currency: Joi.string().length(3).uppercase().default('IRR'), // Example default
    }),
});

const getTransactionHistorySchema = Joi.object({
    query: Joi.object({
        page: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1).max(100),
        type: Joi.string().valid(...Object.values(TransactionType)),
        status: Joi.string().valid(...Object.values(TransactionStatus)),
        sortBy: Joi.string().valid('transactionDate', 'amount'),
        sortOrder: Joi.string().valid('ASC', 'DESC'),
    }),
});

const requestWithdrawalSchema = Joi.object({
    body: Joi.object({
        amount: Joi.number().positive().precision(2).required(),
        currency: Joi.string().length(3).uppercase().required(),
        withdrawalMethodDetails: Joi.object({
            type: Joi.string().valid('PAYPAL', 'BANK_TRANSFER').required(),
            email: Joi.string().email().when('type', { is: 'PAYPAL', then: Joi.required() }),
            accountHolderName: Joi.string().when('type', { is: 'BANK_TRANSFER', then: Joi.required() }),
            accountNumber: Joi.string().when('type', { is: 'BANK_TRANSFER', then: Joi.required() }),
            routingNumber: Joi.string().when('type', { is: 'BANK_TRANSFER', then: Joi.required() }),
            bankName: Joi.string().when('type', { is: 'BANK_TRANSFER', then: Joi.optional() }),
        }).required(),
    }),
});


module.exports = {
  initializeDepositSchema,
  getTransactionHistorySchema,
  requestWithdrawalSchema,
};
