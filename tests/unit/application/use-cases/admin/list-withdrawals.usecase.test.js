const ListWithdrawalsUseCase = require('../../../../../src/application/use-cases/admin/list-withdrawals.usecase');
// Assuming Withdrawal entity and factory exist or will be created
// const { Withdrawal, WithdrawalStatus } = require('../../../../../src/domain/wallet/withdrawal.entity'); // Adjust path if needed
// const { createWithdrawal, createUser } = require('../../../../utils/factories');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { faker } = require('@faker-js/faker');

// Mock TransactionRepository (renamed from mockWithdrawalRepository)
const mockTransactionRepository = {
  findAll: jest.fn(),
};

// Mock User Entity for populated fields - simplified
const mockUserEntity = (id) => ({
    id,
    username: faker.internet.userName(),
    toPublicProfile: () => ({ id, username: faker.internet.userName() })
});


// Simplified createWithdrawal for testing structure
const createWithdrawal = (overrides = {}) => { // This function creates data that looks like a withdrawal transaction
  const defaultWithdrawal = {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    amount: parseFloat(faker.finance.amount({min: 10, max: 1000, dec: 2})), // Corrected faker usage
    type: 'WITHDRAWAL', // Important: this is a transaction of type WITHDRAWAL
    status: 'PENDING', // Default status for a new withdrawal
    currency: 'USD',
    method: 'BANK_TRANSFER', // This might be part of metadata or details
    details: { bankName: 'Test Bank', accountNumber: '12345' },
    adminNotes: null,
    requestedAt: new Date(),
    processedAt: null,
    user: mockUserEntity(overrides.userId || faker.string.uuid()), // Populate user
    ...overrides,
  };
  return defaultWithdrawal;
};


describe('ListWithdrawalsUseCase', () => {
  let listWithdrawalsUseCase;
  const defaultPage = 1;
  const defaultLimit = 10;
  const defaultSortBy = 'requestedAt';
  const defaultSortOrder = 'DESC';

  beforeEach(() => {
    jest.clearAllMocks();
    listWithdrawalsUseCase = new ListWithdrawalsUseCase(mockTransactionRepository); // Use renamed mock
  });

  it('should list withdrawals with default options if none provided', async () => {
    const transactions = [createWithdrawal(), createWithdrawal()]; // These are transaction objects of type WITHDRAWAL
    mockTransactionRepository.findAll.mockResolvedValue({
      transactions, // Repository returns 'transactions'
      total: transactions.length,
      page: defaultPage,
      limit: defaultLimit,
    });

    const result = await listWithdrawalsUseCase.execute({});

    expect(mockTransactionRepository.findAll).toHaveBeenCalledWith({
      page: defaultPage,
      limit: defaultLimit,
      filters: { type: 'WITHDRAWAL' }, // Ensure type filter is applied
      sortBy: defaultSortBy,
      sortOrder: defaultSortOrder,
      // includeUser: true, // This option is specific to how findAll in repo is implemented for transactions
    });
    // Use case maps repo's 'transactions' to 'withdrawals' in its output
    expect(result.withdrawals).toEqual(transactions);
    expect(result.totalItems).toBe(transactions.length);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(defaultPage);
  });

  it('should list withdrawals with provided filters (e.g., status)', async () => {
    const statusFilter = 'COMPLETED';
    const filters = { status: statusFilter };
    const transactions = [createWithdrawal({ status: statusFilter })];
    mockTransactionRepository.findAll.mockResolvedValue({ transactions, total: transactions.length, page: defaultPage, limit: defaultLimit });

    const result = await listWithdrawalsUseCase.execute({ filters });

    expect(mockTransactionRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({
      filters: { ...filters, type: 'WITHDRAWAL' }
    }));
    expect(result.withdrawals).toEqual(transactions);
  });

  it('should list withdrawals with pagination', async () => {
    const page = 2;
    const limit = 5;
    const transactions = Array(limit).fill(null).map(() => createWithdrawal());
    const totalItems = 12;
    mockTransactionRepository.findAll.mockResolvedValue({ transactions, total: totalItems, page, limit });

    const result = await listWithdrawalsUseCase.execute({ page, limit });

    expect(mockTransactionRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({
      page,
      limit,
      filters: { type: 'WITHDRAWAL' }
    }));
    expect(result.withdrawals.length).toBe(limit);
    expect(result.totalItems).toBe(totalItems);
    expect(result.totalPages).toBe(Math.ceil(totalItems / limit));
    expect(result.currentPage).toBe(page);
  });

  it('should list withdrawals with sorting', async () => {
    const sortBy = 'amount';
    const sortOrder = 'ASC';
    const transactions = [createWithdrawal({ amount: 10 }), createWithdrawal({ amount: 50 })];
    mockTransactionRepository.findAll.mockResolvedValue({ transactions, total: transactions.length, page: defaultPage, limit: defaultLimit });

    const result = await listWithdrawalsUseCase.execute({ sortBy, sortOrder });

    expect(mockTransactionRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({
      sortBy,
      sortOrder,
      filters: { type: 'WITHDRAWAL' }
    }));
    expect(result.withdrawals).toEqual(transactions);
  });

  // The includeUser option is not directly handled by this use case,
  // it's an option for the repository. So, a test for it here might be redundant
  // unless the use case specifically manipulates it.
  // For now, removing the specific 'includeUser: false' test as the default is not explicitly set by use case.
  // The repository should handle includes if the entities are structured for it.

  it('should handle empty result correctly', async () => {
    mockTransactionRepository.findAll.mockResolvedValue({ transactions: [], total: 0, page: 1, limit: 10 });
    const result = await listWithdrawalsUseCase.execute({});
    expect(result.withdrawals).toEqual([]);
    expect(result.totalItems).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('should throw ApiError if repository throws an error', async () => {
    mockTransactionRepository.findAll.mockRejectedValue(new Error('DB Error'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(listWithdrawalsUseCase.execute({}))
      .rejects.toThrow(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to retrieve withdrawal requests.')); // Message from use case
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error listing withdrawals in use case:', expect.any(Error)); // Message from use case
    consoleErrorSpy.mockRestore();
  });

  it('should throw an error if TransactionRepository is not provided or invalid', () => {
    expect(() => new ListWithdrawalsUseCase(null))
      .toThrow('ListWithdrawalsUseCase requires a valid transactionRepository with a findAll method.');
    expect(() => new ListWithdrawalsUseCase({})) // No findAll method
      .toThrow('ListWithdrawalsUseCase requires a valid transactionRepository with a findAll method.');
  });
});
