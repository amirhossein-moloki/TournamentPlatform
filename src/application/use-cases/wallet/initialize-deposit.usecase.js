const { v4: uuidv4 } = require('uuid');
const { BadRequestError, ConflictError, NotFoundError, InternalServerError } = require('../../../utils/errors');
const { Transaction } = require('../../../domain/wallet/transaction.entity'); // Domain entity
const zarinpal = require('../../../config/zarinpal'); // Import Zarinpal instance
const { appConfig } = require('../../../../config/config');

// const { Wallet } = require('../../../domain/wallet/wallet.entity'); // Not directly manipulated here, but fetched

class InitializeDepositUseCase {
  /**
   * @param {object} walletRepository - Repository for wallet data.
   * @param {object} transactionRepository - Repository for transaction data.
   * @param {object} [idempotencyService] - Optional: A more sophisticated idempotency service.
   */
  constructor(walletRepository, transactionRepository, idempotencyService = null) {
    this.walletRepository = walletRepository;
    this.transactionRepository = transactionRepository;
    this.idempotencyService = idempotencyService; // For future advanced idempotency handling
  }

  /**
   * Initializes a deposit request.
   * @param {string} userId - The ID of the user initiating the deposit.
   * @param {number} amount - The amount to deposit (in Rials for Zarinpal).
   * @param {string} currency - The currency of the deposit (e.g., 'IRR'). Zarinpal only supports IRR.
   * @param {string} idempotencyKey - A unique key to ensure the operation is processed only once.
   * @returns {Promise<{paymentGatewayUrl: string, transactionId: string, message: string, authority: string}>}
   * @throws {import('../../../utils/errors').BadRequestError}
   * @throws {import('../../../utils/errors').ConflictError}
   * @throws {import('../../../utils/errors').NotFoundError}
   * @throws {import('../../../utils/errors').InternalServerError}
   */
  async execute(userId, amount, currency, idempotencyKey) {
    if (!userId || amount == null || !currency || !idempotencyKey) {
      throw new BadRequestError('User ID, amount, currency, and idempotency key are required.');
    }
    if (typeof amount !== 'number' || amount <= 0) {
      throw new BadRequestError('Deposit amount must be a positive number.');
    }
    // Zarinpal expects amounts in Rials. We'll assume the input amount is already in Rials.
    // Currency should ideally be 'IRR' for Zarinpal.
    if (currency !== 'IRR') {
      // For now, we'll proceed but log a warning. In a real system, this might be an error or trigger conversion.
      console.warn(`InitializeDepositUseCase: Currency is ${currency}, but Zarinpal primarily uses IRR. Ensure amount is in Rials.`);
      // throw new BadRequestError("Invalid currency for Zarinpal. Only IRR is supported and amount should be in Rials.");
    }


    // 1. Idempotency Check
    const existingTransaction = await this.transactionRepository.findByIdempotencyKey(idempotencyKey);
    if (existingTransaction) {
      if (existingTransaction.status === 'PENDING' || existingTransaction.status === 'COMPLETED') {
        const walletForExistingTx = await this.walletRepository.findById(existingTransaction.walletId);
        if (
          walletForExistingTx &&
          walletForExistingTx.userId === userId &&
          parseFloat(existingTransaction.amount) === amount &&
          existingTransaction.metadata &&
          existingTransaction.metadata.requestedCurrency === currency
        ) {
          // If an existing transaction matches, and it has an authority, attempt to reconstruct the payment URL
          // This is helpful if the user retries before being redirected or after a browser crash.
          let paymentGatewayUrl = `https://www.zarinpal.com/pg/StartPay/${existingTransaction.metadata.authority}`;
          if (zarinpal.sandbox) {
            paymentGatewayUrl = `https://sandbox.zarinpal.com/pg/StartPay/${existingTransaction.metadata.authority}`;
          }

          return {
            message: `Deposit already initiated or completed (Idempotency). Status: ${existingTransaction.status}`,
            paymentGatewayUrl: existingTransaction.metadata.authority ? paymentGatewayUrl : null, // Only if authority exists
            transactionId: existingTransaction.id,
            authority: existingTransaction.metadata.authority,
          };
        } else {
          throw new ConflictError(`Idempotency key ${idempotencyKey} already used with different request parameters.`);
        }
      } else {
        throw new ConflictError(`Idempotency key ${idempotencyKey} corresponds to a transaction with status ${existingTransaction.status}. Cannot re-initiate.`);
      }
    }

    // 2. Get user's wallet
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundError('User wallet not found.');
    }

    // 3. Create Payment Request with Zarinpal
    const callbackURL = `${appConfig.baseUrl}/api/v1/wallet/deposit/callback`; // Construct full callback URL
    let zarinpalResponse;
    try {
      zarinpalResponse = await zarinpal.payments.create({
        amount: Number(amount), // Ensure amount is a number
        callback_url: callbackURL,
        description: `Wallet deposit for user ${userId}, Transaction ID will be generated.`, // Temp description, will update later
        // mobile: '09123456789', // Optional
        // email: 'customer@example.com', // Optional
      });

      if (!zarinpalResponse || zarinpalResponse.data.errors || !zarinpalResponse.data.authority) {
        console.error('Zarinpal payment creation error:', zarinpalResponse ? zarinpalResponse.data.errors : 'No response');
        throw new InternalServerError('Failed to create payment request with Zarinpal.', zarinpalResponse ? zarinpalResponse.data.errors : undefined);
      }
    } catch (error) {
      console.error('Error calling Zarinpal payments.create:', error);
      if (error instanceof InternalServerError || error instanceof BadRequestError || error instanceof ConflictError || error instanceof NotFoundError) throw error;
      throw new InternalServerError('Error initiating payment with Zarinpal.', error.message);
    }

    const { authority } = zarinpalResponse.data;
    const paymentUrl = zarinpal.getRedirectUrl(authority);

    // 4. Create a PENDING transaction record
    const transactionId = uuidv4();
    const transactionDescription = `Wallet deposit via Zarinpal for ${amount} ${currency}. Authority: ${authority}.`;
    const transactionEntity = new Transaction(
      transactionId,
      wallet.id,
      'DEPOSIT',
      amount, // Store the amount as sent to Zarinpal (Rials)
      'PENDING',
      idempotencyKey,
      transactionDescription,
      {
        userId,
        requestedAmount: amount, // Amount in Rials
        requestedCurrency: currency, // Original currency from request, e.g., 'IRR'
        paymentGateway: 'Zarinpal',
        authority, // Store Zarinpal authority
        zarinpalFee: zarinpalResponse.data.fee, // Store Zarinpal fee if available
      },
      new Date()
    );

    // Update the description in Zarinpal request now that we have the transactionId
    // Note: Zarinpal SDK might not support updating description post-creation.
    // This is more for our records. The description in transactionEntity is the primary one.

    await this.transactionRepository.create(transactionEntity);

    return {
      message: 'Deposit initialized successfully. Proceed to Zarinpal payment gateway.',
      paymentGatewayUrl: paymentUrl,
      transactionId,
      authority,
    };
  }
}

module.exports = InitializeDepositUseCase;

// Notes:
// - Integrated Zarinpal SDK for payment request creation.
// - `amount` is assumed to be in Rials. Currency is expected to be 'IRR'.
// - `callback_url` is constructed dynamically using `appConfig.baseUrl`. Ensure `appConfig.baseUrl` is set correctly.
// - Zarinpal `authority` and original `amount` are stored in transaction metadata.
// - Idempotency check now tries to reconstruct payment URL if authority exists.
// - Error handling for Zarinpal API calls is added.
// - The description for Zarinpal is generic initially; the detailed description is in our local transaction record.
// - Ensure `appConfig.baseUrl` correctly points to your application's public base URL.
// - The Zarinpal SDK uses `axios` which returns `response.data`.
// - Reverted to CommonJS module syntax (module.exports and require) for consistency with the project.
