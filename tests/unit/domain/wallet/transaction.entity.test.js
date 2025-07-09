const { Transaction } = require('../../../../src/domain/wallet/transaction.entity');
const { v4: uuidv4 } = require('uuid');

describe('Transaction Entity', () => {
  const baseTransactionData = {
    id: uuidv4(),
    walletId: uuidv4(),
    type: 'DEPOSIT',
    amount: 100.00,
  };

  describe('Constructor', () => {
    it('should create a transaction instance with required fields and defaults', () => {
      const transaction = new Transaction(
        baseTransactionData.id,
        baseTransactionData.walletId,
        baseTransactionData.type,
        baseTransactionData.amount
      );
      expect(transaction).toBeInstanceOf(Transaction);
      expect(transaction.id).toBe(baseTransactionData.id);
      expect(transaction.walletId).toBe(baseTransactionData.walletId);
      expect(transaction.type).toBe(baseTransactionData.type);
      expect(transaction.amount).toBe(100.00);
      expect(transaction.status).toBe(Transaction.Status.PENDING);
      expect(transaction.idempotencyKey).toBeNull();
      expect(transaction.description).toBeNull();
      expect(transaction.metadata).toEqual({});
      expect(transaction.transactionDate).toBeInstanceOf(Date);
      expect(transaction.createdAt).toBeInstanceOf(Date);
      expect(transaction.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow overriding default fields', () => {
      const specificData = {
        ...baseTransactionData,
        status: Transaction.Status.COMPLETED,
        idempotencyKey: 'idemp-key-123',
        description: 'Test deposit',
        metadata: { gatewayId: 'gw_123' },
      };
      const transaction = new Transaction(
        specificData.id,
        specificData.walletId,
        specificData.type,
        specificData.amount,
        specificData.status,
        specificData.idempotencyKey,
        specificData.description,
        specificData.metadata
      );
      expect(transaction.status).toBe(specificData.status);
      expect(transaction.idempotencyKey).toBe(specificData.idempotencyKey);
      expect(transaction.description).toBe(specificData.description);
      expect(transaction.metadata).toEqual(specificData.metadata);
    });

    it('should correctly set amount with two decimal places', () => {
        const tx1 = new Transaction(uuidv4(), uuidv4(), 'DEPOSIT', 123.456);
        expect(tx1.amount).toBe(123.46);
        const tx2 = new Transaction(uuidv4(), uuidv4(), 'WITHDRAWAL', 78.9);
        expect(tx2.amount).toBe(78.90);
    });

    const requiredFieldsValidation = [
      { field: 'id', value: null, message: 'Transaction ID is required.' },
      { field: 'walletId', value: null, message: 'Wallet ID for transaction is required.' },
      { field: 'type', value: null, message: 'Transaction type is required.' },
      { field: 'amount', value: 0, message: 'Transaction amount must be a positive number.' },
      { field: 'amount', value: -10, message: 'Transaction amount must be a positive number.' },
      { field: 'amount', value: null, message: 'Transaction amount must be a positive number.' },
      { field: 'status', value: null, message: 'Transaction status is required.' },
    ];

    requiredFieldsValidation.forEach(testCase => {
      it(`should throw an error if ${testCase.field} is invalid (${testCase.value})`, () => {
        const data = { ...baseTransactionData, status: Transaction.Status.PENDING }; // Start with valid defaults
        data[testCase.field] = testCase.value;
        expect(() => new Transaction(data.id, data.walletId, data.type, data.amount, data.status))
          .toThrow(testCase.message);
      });
    });
  });

  describe('Static Properties', () => {
    it('should have validTypes array', () => {
      expect(Transaction.validTypes).toBeInstanceOf(Array);
      expect(Transaction.validTypes.length).toBeGreaterThan(0);
    });
    it('should have Status object', () => {
      expect(Transaction.Status).toBeInstanceOf(Object);
      expect(Transaction.Status.PENDING).toBe('PENDING');
    });
    it('should have validStatuses array derived from Status object', () => {
      expect(Transaction.validStatuses).toBeInstanceOf(Array);
      expect(Transaction.validStatuses).toContain(Transaction.Status.COMPLETED);
      expect(Transaction.validStatuses.length).toEqual(Object.keys(Transaction.Status).length);
    });
  });

  describe('updateStatus', () => {
    let transaction;
    beforeEach(() => {
      transaction = new Transaction(baseTransactionData.id, baseTransactionData.walletId, baseTransactionData.type, baseTransactionData.amount);
    });

    it('should update status and updatedAt', () => {
      const initialUpdatedAt = transaction.updatedAt;
      transaction.updateStatus(Transaction.Status.COMPLETED);
      expect(transaction.status).toBe(Transaction.Status.COMPLETED);
      expect(transaction.updatedAt).not.toBe(initialUpdatedAt);
    });

    it('should append reason to description if provided', () => {
      transaction.updateStatus(Transaction.Status.FAILED, 'Payment gateway error');
      expect(transaction.description).toBe('Status changed: Payment gateway error');

      transaction.setDescription('Initial desc.');
      transaction.updateStatus(Transaction.Status.CANCELED, 'User request');
      expect(transaction.description).toBe('Initial desc. | Status changed: User request');
    });

    it('should throw an error for invalid status', () => {
      expect(() => transaction.updateStatus('INVALID_STATUS')).toThrow('Invalid transaction status: INVALID_STATUS.');
    });
  });

  describe('complete', () => {
    const allowedInitialStatuses = [Transaction.Status.PENDING, Transaction.Status.PROCESSING, Transaction.Status.REQUIRES_APPROVAL];

    allowedInitialStatuses.forEach(initialStatus => {
        it(`should set status to COMPLETED from ${initialStatus}, update transactionDate and metadata`, () => {
            const transaction = new Transaction(baseTransactionData.id, baseTransactionData.walletId, baseTransactionData.type, baseTransactionData.amount, initialStatus);
            const initialTransactionDate = transaction.transactionDate;
            const completionMeta = { confirmationCode: 'CONF123' };

            transaction.complete(completionMeta);

            expect(transaction.status).toBe(Transaction.Status.COMPLETED);
            expect(transaction.transactionDate).not.toBe(initialTransactionDate);
            expect(transaction.transactionDate).toBeInstanceOf(Date);
            expect(transaction.metadata).toMatchObject(completionMeta);
        });
    });

    it('should throw an error if trying to complete from an invalid status', () => {
      const transaction = new Transaction(baseTransactionData.id, baseTransactionData.walletId, baseTransactionData.type, baseTransactionData.amount, Transaction.Status.FAILED);
      expect(() => transaction.complete()).toThrow(`Transaction cannot be completed from status: ${Transaction.Status.FAILED}.`);
    });
  });

  describe('fail', () => {
    let transaction;
    beforeEach(() => {
      transaction = new Transaction(baseTransactionData.id, baseTransactionData.walletId, baseTransactionData.type, baseTransactionData.amount);
    });

    it('should set status to FAILED, update description with reason, and add metadata', () => {
      const failureReason = 'Insufficient funds in gateway';
      const failureMeta = { errorCode: 'GW_ERR_05' };
      transaction.fail(failureReason, failureMeta);

      expect(transaction.status).toBe(Transaction.Status.FAILED);
      expect(transaction.description).toContain(failureReason);
      expect(transaction.metadata).toMatchObject(failureMeta);
    });

    it('should throw an error if failureReason is not provided', () => {
      expect(() => transaction.fail(null)).toThrow('Failure reason is required.');
    });
  });

  describe('cancel', () => {
    const allowedInitialStatuses = [Transaction.Status.PENDING, Transaction.Status.REQUIRES_APPROVAL];

    allowedInitialStatuses.forEach(initialStatus => {
        it(`should set status to CANCELED from ${initialStatus} and update description with reason`, () => {
            const transaction = new Transaction(baseTransactionData.id, baseTransactionData.walletId, baseTransactionData.type, baseTransactionData.amount, initialStatus);
            const cancelReason = 'User requested cancellation';
            transaction.cancel(cancelReason);
            expect(transaction.status).toBe(Transaction.Status.CANCELED);
            expect(transaction.description).toContain(cancelReason);
        });
    });

    it('should throw an error if trying to cancel from an invalid status', () => {
      const transaction = new Transaction(baseTransactionData.id, baseTransactionData.walletId, baseTransactionData.type, baseTransactionData.amount, Transaction.Status.COMPLETED);
      expect(() => transaction.cancel('Too late')).toThrow(`Transaction in status ${Transaction.Status.COMPLETED} cannot be canceled.`);
    });

    it('should throw an error if cancelReason is not provided', () => {
      const transaction = new Transaction(baseTransactionData.id, baseTransactionData.walletId, baseTransactionData.type, baseTransactionData.amount);
      expect(() => transaction.cancel(null)).toThrow('Cancellation reason is required.');
    });
  });

  describe('addMetadata', () => {
    let transaction;
    beforeEach(() => {
      transaction = new Transaction(baseTransactionData.id, baseTransactionData.walletId, baseTransactionData.type, baseTransactionData.amount, Transaction.Status.PENDING, null, null, { initial: 'data' });
    });

    it('should merge new data with existing metadata and update updatedAt', () => {
      const initialUpdatedAt = transaction.updatedAt;
      const newData = { additional: 'info', override: 'new_value' };
      transaction.metadata.override = 'old_value'; // ensure override works

      transaction.addMetadata(newData);

      expect(transaction.metadata).toEqual({ initial: 'data', additional: 'info', override: 'new_value' });
      expect(transaction.updatedAt).not.toBe(initialUpdatedAt);
    });

    it('should throw an error if dataToAdd is not an object', () => {
      expect(() => transaction.addMetadata(null)).toThrow('Metadata to add must be an object.');
      expect(() => transaction.addMetadata('string')).toThrow('Metadata to add must be an object.');
    });
  });

  describe('setDescription', () => {
    it('should update description and updatedAt', () => {
      const transaction = new Transaction(baseTransactionData.id, baseTransactionData.walletId, baseTransactionData.type, baseTransactionData.amount);
      const initialUpdatedAt = transaction.updatedAt;
      const newDescription = 'This is a test description.';

      transaction.setDescription(newDescription);

      expect(transaction.description).toBe(newDescription);
      expect(transaction.updatedAt).not.toBe(initialUpdatedAt);
    });
  });

  describe('isType', () => {
    const transaction = new Transaction(baseTransactionData.id, baseTransactionData.walletId, 'DEPOSIT', 100);
    it('should return true if transaction type matches', () => {
      expect(transaction.isType('DEPOSIT')).toBe(true);
    });
    it('should return false if transaction type does not match', () => {
      expect(transaction.isType('WITHDRAWAL')).toBe(false);
    });
  });

  describe('isStatus', () => {
    const transaction = new Transaction(baseTransactionData.id, baseTransactionData.walletId, 'DEPOSIT', 100, Transaction.Status.COMPLETED);
    it('should return true if transaction status matches', () => {
      expect(transaction.isStatus(Transaction.Status.COMPLETED)).toBe(true);
    });
    it('should return false if transaction status does not match', () => {
      expect(transaction.isStatus(Transaction.Status.PENDING)).toBe(false);
    });
  });
});
