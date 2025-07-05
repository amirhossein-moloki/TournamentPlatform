const GetWalletDetailsUseCase = require('../../../../../src/application/use-cases/wallet/get-wallet-details.usecase');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');

describe('GetWalletDetailsUseCase', () => {
  let mockWalletRepository;
  let getWalletDetailsUseCase;

  beforeEach(() => {
    mockWalletRepository = {
      findByUserId: jest.fn(),
    };
    getWalletDetailsUseCase = new GetWalletDetailsUseCase(mockWalletRepository);
  });

  it('should return wallet details for a valid user ID', async () => {
    const userId = 'user-123';
    const mockWallet = {
      id: 'wallet-123',
      userId: userId,
      balance: '100.50', // Simulate string from DB
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);

    const result = await getWalletDetailsUseCase.execute(userId);

    expect(mockWalletRepository.findByUserId).toHaveBeenCalledWith(userId);
    expect(result).toEqual({
      id: mockWallet.id,
      userId: mockWallet.userId,
      balance: 100.50, // Expecting parsed float
      currency: mockWallet.currency,
      createdAt: mockWallet.createdAt,
      updatedAt: mockWallet.updatedAt,
    });
  });

  it('should throw ApiError with NOT_FOUND if wallet is not found', async () => {
    const userId = 'user-not-found';
    mockWalletRepository.findByUserId.mockResolvedValue(null);

    await expect(getWalletDetailsUseCase.execute(userId))
      .rejects
      .toThrow(new ApiError(httpStatusCodes.NOT_FOUND, 'Wallet not found for this user.'));
    expect(mockWalletRepository.findByUserId).toHaveBeenCalledWith(userId);
  });

  it('should throw ApiError with BAD_REQUEST if userId is not provided', async () => {
    await expect(getWalletDetailsUseCase.execute(null))
      .rejects
      .toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID is required to fetch wallet details.'));
    expect(mockWalletRepository.findByUserId).not.toHaveBeenCalled();
  });

  it('should handle errors from walletRepository.findByUserId', async () => {
    const userId = 'user-123';
    const errorMessage = 'Database error';
    mockWalletRepository.findByUserId.mockRejectedValue(new Error(errorMessage));

    await expect(getWalletDetailsUseCase.execute(userId))
      .rejects
      .toThrow(Error(errorMessage)); // Or a specific ApiError if the use case wraps it
    expect(mockWalletRepository.findByUserId).toHaveBeenCalledWith(userId);
  });
});
