const { Wallet } = require('../../../../src/domain/wallet/wallet.entity');
const { v4: uuidv4 } = require('uuid');

describe('Wallet Entity', () => {
  const baseWalletData = {
    id: uuidv4(),
    userId: uuidv4(),
  };

  describe('Constructor', () => {
    it('should create a wallet instance with required fields and defaults', () => {
      const wallet = new Wallet(baseWalletData.id, baseWalletData.userId);
      expect(wallet).toBeInstanceOf(Wallet);
      expect(wallet.id).toBe(baseWalletData.id);
      expect(wallet.userId).toBe(baseWalletData.userId);
      expect(wallet.balance).toBe(0.00);
      expect(wallet.currency).toBe('USD');
      expect(wallet.createdAt).toBeInstanceOf(Date);
      expect(wallet.updatedAt).toBeInstanceOf(Date);
      expect(wallet._transactions).toEqual([]); // internal check
    });

    it('should allow overriding default fields (balance, currency)', () => {
      const specificData = {
        ...baseWalletData,
        balance: 100.50,
        currency: 'EUR',
      };
      const wallet = new Wallet(
        specificData.id,
        specificData.userId,
        specificData.balance,
        specificData.currency
      );
      expect(wallet.balance).toBe(100.50);
      expect(wallet.currency).toBe('EUR');
    });

    it('should correctly set balance with two decimal places', () => {
        const wallet1 = new Wallet(uuidv4(), uuidv4(), 123.456);
        expect(wallet1.balance).toBe(123.46);

        const wallet2 = new Wallet(uuidv4(), uuidv4(), 78.9);
        expect(wallet2.balance).toBe(78.90);

        const wallet3 = new Wallet(uuidv4(), uuidv4(), 50);
        expect(wallet3.balance).toBe(50.00);
    });

    const requiredFieldsValidation = [
      { field: 'id', value: null, message: 'Wallet ID is required.' },
      { field: 'userId', value: null, message: 'User ID for wallet is required.' },
      { field: 'balance', value: -10, message: 'Valid initial balance is required and must be non-negative.' },
      { field: 'balance', value: null, message: 'Valid initial balance is required and must be non-negative.' },
      { field: 'currency', value: 'US', message: 'Valid currency code (e.g., USD) is required.' },
      { field: 'currency', value: 'USDOLLARS', message: 'Valid currency code (e.g., USD) is required.' },
      { field: 'currency', value: null, message: 'Valid currency code (e.g., USD) is required.' },
    ];

    requiredFieldsValidation.forEach(testCase => {
      it(`should throw an error if ${testCase.field} is invalid (${testCase.value})`, () => {
        const data = { ...baseWalletData, balance: 0, currency: 'USD' }; // Start with valid defaults
        data[testCase.field] = testCase.value;
        expect(() => new Wallet(data.id, data.userId, data.balance, data.currency))
          .toThrow(testCase.message);
      });
    });
  });

  describe('balance getter', () => {
    it('should return the internal _balance value', () => {
      const wallet = new Wallet(baseWalletData.id, baseWalletData.userId, 50.75);
      expect(wallet.balance).toBe(50.75);
    });
  });

  describe('deposit', () => {
    let wallet;
    beforeEach(() => {
      wallet = new Wallet(baseWalletData.id, baseWalletData.userId, 100.00);
    });

    it('should increase the balance by the deposit amount and update updatedAt', () => {
      const initialUpdatedAt = wallet.updatedAt;
      wallet.deposit(50.25);
      expect(wallet.balance).toBe(150.25);
      expect(wallet.updatedAt).not.toBe(initialUpdatedAt);
    });

    it('should handle floating point precision correctly during deposit', () => {
        wallet.deposit(0.1);
        wallet.deposit(0.2);
        expect(wallet.balance).toBe(100.30); // 100.00 + 0.1 + 0.2 = 100.30
    });

    const invalidDepositAmounts = [0, -10, null, undefined, 'abc'];
    invalidDepositAmounts.forEach(amount => {
      it(`should throw an error for invalid deposit amount: ${amount}`, () => {
        expect(() => wallet.deposit(amount)).toThrow('Deposit amount must be a positive number.');
      });
    });
  });

  describe('withdraw', () => {
    let wallet;
    beforeEach(() => {
      wallet = new Wallet(baseWalletData.id, baseWalletData.userId, 100.00);
    });

    it('should decrease the balance by the withdrawal amount and update updatedAt', () => {
      const initialUpdatedAt = wallet.updatedAt;
      wallet.withdraw(30.50);
      expect(wallet.balance).toBe(69.50);
      expect(wallet.updatedAt).not.toBe(initialUpdatedAt);
    });

    it('should handle floating point precision correctly during withdrawal', () => {
        wallet = new Wallet(baseWalletData.id, baseWalletData.userId, 100.30);
        wallet.withdraw(0.1);
        wallet.withdraw(0.2);
        expect(wallet.balance).toBe(100.00); // 100.30 - 0.1 - 0.2 = 100.00
    });

    it('should throw an error if withdrawal amount exceeds balance', () => {
      expect(() => wallet.withdraw(100.01)).toThrow('Insufficient funds for withdrawal.');
    });

    it('should allow withdrawing the entire balance', () => {
      wallet.withdraw(100.00);
      expect(wallet.balance).toBe(0.00);
    });

    const invalidWithdrawalAmounts = [0, -10, null, undefined, 'abc'];
    invalidWithdrawalAmounts.forEach(amount => {
      it(`should throw an error for invalid withdrawal amount: ${amount}`, () => {
        expect(() => wallet.withdraw(amount)).toThrow('Withdrawal amount must be a positive number.');
      });
    });
  });

  describe('hasSufficientFunds', () => {
    const wallet = new Wallet(baseWalletData.id, baseWalletData.userId, 50.00);

    it('should return true if balance is greater than amount', () => {
      expect(wallet.hasSufficientFunds(40.00)).toBe(true);
    });

    it('should return true if balance is equal to amount', () => {
      expect(wallet.hasSufficientFunds(50.00)).toBe(true);
    });

    it('should return false if balance is less than amount', () => {
      expect(wallet.hasSufficientFunds(60.00)).toBe(false);
    });

    it('should correctly handle zero amount', () => {
        expect(wallet.hasSufficientFunds(0)).toBe(true);
    });

    const invalidAmounts = [-10, null, undefined, 'abc'];
    invalidAmounts.forEach(amount => {
        it(`should throw an error for invalid amount to check: ${amount}`, () => {
            expect(() => wallet.hasSufficientFunds(amount)).toThrow('Amount to check must be a non-negative number.');
        });
    });
  });

  describe('updateDetails', () => {
    let wallet;
    let consoleWarnSpy;

    beforeEach(() => {
      wallet = new Wallet(baseWalletData.id, baseWalletData.userId, 100, 'USD');
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        consoleWarnSpy.mockRestore();
    });

    it('should update updatedAt even if no actual details changed (as per current implementation)', () => {
      const initialUpdatedAt = wallet.updatedAt;
      wallet.updateDetails({});
      expect(wallet.updatedAt).not.toBe(initialUpdatedAt);
    });

    it('should log a warning when attempting to update currency and not change it', () => {
      const initialCurrency = wallet.currency;
      const initialUpdatedAt = wallet.updatedAt;
      wallet.updateDetails({ currency: 'EUR' });
      expect(wallet.currency).toBe(initialCurrency); // Currency does not change
      expect(consoleWarnSpy).toHaveBeenCalledWith('Wallet currency updates are complex and generally not supported this way.');
      expect(wallet.updatedAt).not.toBe(initialUpdatedAt);
    });

    it('should throw an error if trying to update with an invalid currency code format', () => {
      expect(() => wallet.updateDetails({ currency: 'EU' }))
        .toThrow('Invalid currency code for update.');
      expect(() => wallet.updateDetails({ currency: 'EURO' }))
        .toThrow('Invalid currency code for update.');
    });
  });
});
