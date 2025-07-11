const RegisterForTournamentUseCase = require('../../../../../src/application/use-cases/tournament/registerForTournament.useCase');
const { Tournament, TournamentStatus } = require('../../../../../src/domain/tournament/tournament.entity');
const { User } = require('../../../../../src/domain/user/user.entity');
const { Wallet } = require('../../../../../src/domain/wallet/wallet.entity');
const { Transaction, TransactionType, TransactionStatus } = require('../../../../../src/domain/wallet/transaction.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { createTournament, createUser, createWallet, createTransaction } = require('../../../../utils/factories');

// Mock Repositories
const mockTournamentRepository = {
  findById: jest.fn(),
  incrementParticipantCount: jest.fn(), // As per use case
};
const mockTournamentParticipantRepository = {
  findByUserIdAndTournamentId: jest.fn(),
  create: jest.fn(),
};
const mockUserGameProfileRepository = {
  findByUserIdAndGameId: jest.fn(),
};
// const mockUserRepository = { findById: jest.fn() }; // Not used in current use case version

describe('RegisterForTournamentUseCase', () => {
  let registerForTournamentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    registerForTournamentUseCase = new RegisterForTournamentUseCase(
      mockTournamentRepository,
      mockTournamentParticipantRepository,
      mockUserGameProfileRepository
      // mockUserRepository // Not used
    );
  });

  const userId = 'user-uuid-123';
  const tournamentId = 'tournament-uuid-456';
  const gameId = 'game-uuid-789';
  let testTournamentEntity; // Will be an instance of Tournament for its methods
  let testUserGameProfile;

  beforeEach(() => {
    // Create a real Tournament entity instance to use its methods like canRegister()
    testTournamentEntity = new Tournament(
        tournamentId,
        'Test Tournament',
        gameId,
        'Description',
        'Rules',
        'REGISTRATION_OPEN', // status
        0, // entryFee
        100, // prizePool
        10, // maxParticipants
        0, // currentParticipants
        new Date(Date.now() + 100000), // startDate (future)
    );
    testTournamentEntity.game = { name: 'Test Game' }; // Mock game name for error message

    testUserGameProfile = {
        userId,
        gameId,
        inGameName: 'PlayerOne',
    };

    mockTournamentRepository.findById.mockResolvedValue(testTournamentEntity);
    mockTournamentParticipantRepository.findByUserIdAndTournamentId.mockResolvedValue(null); // Not yet registered
    mockUserGameProfileRepository.findByUserIdAndGameId.mockResolvedValue(testUserGameProfile);
    mockTournamentParticipantRepository.create.mockResolvedValue({ userId, tournamentId, registeredAt: new Date() });
    mockTournamentRepository.incrementParticipantCount.mockResolvedValue(true); // Mock successful increment
  });

  it('should register user successfully', async () => {
    // Spy on entity methods for this specific test case
    const canRegisterSpy = jest.spyOn(testTournamentEntity, 'canRegister').mockReturnValue(true);
    // const isFullSpy = jest.spyOn(testTournamentEntity, 'isFull').mockReturnValue(false); // Optional: if canRegister doesn't cover it

    const result = await registerForTournamentUseCase.execute(userId, tournamentId);

    expect(mockTournamentRepository.findById).toHaveBeenCalledWith(tournamentId);
    expect(canRegisterSpy).toHaveBeenCalledTimes(1); // Check if entity method was called
    // expect(isFullSpy).toHaveBeenCalledTimes(1); // Optional
    expect(mockTournamentParticipantRepository.findByUserIdAndTournamentId).toHaveBeenCalledWith(userId, tournamentId);
    expect(mockUserGameProfileRepository.findByUserIdAndGameId).toHaveBeenCalledWith(userId, gameId);
    expect(mockTournamentParticipantRepository.create).toHaveBeenCalledWith(expect.objectContaining({ userId, tournamentId }));
    expect(mockTournamentRepository.incrementParticipantCount).toHaveBeenCalledWith(tournamentId);
    expect(result).toEqual(expect.objectContaining({ userId, tournamentId }));
  });

  it('should throw ApiError if userId or tournamentId is missing', async () => {
    await expect(registerForTournamentUseCase.execute(null, tournamentId))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID and Tournament ID are required.'));
    await expect(registerForTournamentUseCase.execute(userId, null))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID and Tournament ID are required.'));
  });

  it('should throw ApiError if tournament not found', async () => {
    mockTournamentRepository.findById.mockResolvedValue(null);
    await expect(registerForTournamentUseCase.execute(userId, tournamentId))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, `Tournament with ID ${tournamentId} not found.`));
  });

  it('should throw ApiError if registration is not open (e.g. PENDING)', async () => {
    testTournamentEntity.status = 'PENDING';
    // We need to mock canRegister to return false based on the new status
    jest.spyOn(testTournamentEntity, 'canRegister').mockReturnValue(false);
    mockTournamentRepository.findById.mockResolvedValue(testTournamentEntity);

    await expect(registerForTournamentUseCase.execute(userId, tournamentId))
      .rejects.toThrow(new ApiError(httpStatusCodes.FORBIDDEN, `Cannot register for tournament: Tournament registration is not open (status: PENDING).`));
    expect(testTournamentEntity.canRegister).toHaveBeenCalledTimes(1);
  });

  it('should throw ApiError if tournament is full', async () => {
    testTournamentEntity.currentParticipants = testTournamentEntity.maxParticipants;
    jest.spyOn(testTournamentEntity, 'canRegister').mockReturnValue(false); // isFull will make canRegister return false
    jest.spyOn(testTournamentEntity, 'isFull').mockReturnValue(true); // Explicitly mock isFull for clarity
    mockTournamentRepository.findById.mockResolvedValue(testTournamentEntity);

    await expect(registerForTournamentUseCase.execute(userId, tournamentId))
      .rejects.toThrow(new ApiError(httpStatusCodes.FORBIDDEN, 'Cannot register for tournament: Tournament is full.'));
    expect(testTournamentEntity.canRegister).toHaveBeenCalledTimes(1);
  });

  it('should throw ApiError if user is already registered', async () => {
    mockTournamentParticipantRepository.findByUserIdAndTournamentId.mockResolvedValue({ userId, tournamentId });
    await expect(registerForTournamentUseCase.execute(userId, tournamentId))
      .rejects.toThrow(new ApiError(httpStatusCodes.CONFLICT, 'User is already registered for this tournament.'));
  });

  it('should throw ApiError if tournament gameId is missing (data inconsistency)', async () => {
    testTournamentEntity.gameId = null;
    mockTournamentRepository.findById.mockResolvedValue(testTournamentEntity);
    await expect(registerForTournamentUseCase.execute(userId, tournamentId))
        .rejects.toThrow(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Tournament game ID is missing.'));
  });

  it('should throw ApiError if user game profile not found for the tournament game', async () => {
    mockUserGameProfileRepository.findByUserIdAndGameId.mockResolvedValue(null);
    await expect(registerForTournamentUseCase.execute(userId, tournamentId))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `You must set your In-Game Name for the game '${testTournamentEntity.game.name}' before registering for this tournament.`));
  });

  it('should throw ApiError if user game profile inGameName is missing', async () => {
    testUserGameProfile.inGameName = null;
    mockUserGameProfileRepository.findByUserIdAndGameId.mockResolvedValue(testUserGameProfile);
    await expect(registerForTournamentUseCase.execute(userId, tournamentId))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `You must set your In-Game Name for the game '${testTournamentEntity.game.name}' before registering for this tournament.`));
  });

  it('should throw error if participant creation fails', async () => {
    mockTournamentParticipantRepository.create.mockRejectedValue(new Error('DB participant error'));
    await expect(registerForTournamentUseCase.execute(userId, tournamentId))
        .rejects.toThrow('DB participant error');
    expect(mockTournamentRepository.incrementParticipantCount).not.toHaveBeenCalled(); // Should not be called if create fails
  });

  it('should throw error if incrementing participant count fails', async () => {
    mockTournamentRepository.incrementParticipantCount.mockRejectedValue(new Error('DB count error'));
    await expect(registerForTournamentUseCase.execute(userId, tournamentId))
        .rejects.toThrow('DB count error');
    // Participant would have been created in this flow before increment fails
    expect(mockTournamentParticipantRepository.create).toHaveBeenCalled();
  });

  // Commenting out tests related to Wallet, Transaction, Idempotency as they are not in the current use case version
  /*
  it('should register user successfully if tournament has no entry fee', async () => {
    testTournament.entryFee = 0;
    mockTournamentRepository.findById.mockResolvedValue(testTournament); // Re-mock with updated tournament

    const result = await registerForTournamentUseCase.execute(userId, tournamentId, idempotencyKey);

    expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    expect(mockTournamentRepository.findById).toHaveBeenCalledWith(tournamentId);
    expect(mockTournamentParticipantRepository.findByUserIdAndTournamentId).toHaveBeenCalledWith(userId, tournamentId);
    expect(mockTournamentRepository.update).toHaveBeenCalledTimes(1);
    // Verify that the tournament instance passed to update has currentParticipants incremented
    const updatedTournamentCall = mockTournamentRepository.update.mock.calls[0][0];
    expect(updatedTournamentCall.currentParticipants).toBe(testTournament.currentParticipants + 1);

    expect(mockTournamentParticipantRepository.create).toHaveBeenCalledWith(expect.objectContaining({ userId, tournamentId }));
    expect(mockWalletRepository.findByUserId).not.toHaveBeenCalled();
    expect(mockTransactionRepository.create).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ userId, tournamentId }));
    expect(mockIdempotencyRepository.createRequest).toHaveBeenCalledWith(idempotencyKey, expect.any(String), expect.any(Object), result);
  });

  it('should register user successfully if tournament has entry fee and user has sufficient balance', async () => {
    const result = await registerForTournamentUseCase.execute(userId, tournamentId, idempotencyKey);

    expect(mockWalletRepository.findByUserId).toHaveBeenCalledWith(userId);
    expect(mockTransactionRepository.create).toHaveBeenCalledTimes(1);
    const transactionCall = mockTransactionRepository.create.mock.calls[0][0];
    expect(transactionCall.amount).toBe(testTournament.entryFee);
    expect(transactionCall.type).toBe('DEBIT'); // Using string literal from TransactionType
    expect(transactionCall.status).toBe('COMPLETED'); // Using string literal from TransactionStatus
    expect(transactionCall.description).toContain(`Entry fee for tournament ${testTournament.name}`);

    expect(mockWalletRepository.updateBalance).toHaveBeenCalledWith(userId, testWallet.balance - testTournament.entryFee);
    expect(mockTournamentRepository.update).toHaveBeenCalledTimes(1);
    expect(mockTournamentParticipantRepository.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({ userId, tournamentId }));
    expect(mockIdempotencyRepository.createRequest).toHaveBeenCalled();
  });

  it('should throw ApiError if user not found', async () => {
    mockUserRepository.findById.mockResolvedValue(null);
    await expect(registerForTournamentUseCase.execute(userId, tournamentId, idempotencyKey))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, 'User not found.'));
  });


  it('should throw ApiError if user is not active or email not verified (if required by entity)', async () => {
    testUser.status = 'PENDING'; // Using string literal
    mockUserRepository.findById.mockResolvedValue(testUser);
    await expect(registerForTournamentUseCase.execute(userId, tournamentId, idempotencyKey))
      .rejects.toThrow(new ApiError(httpStatusCodes.FORBIDDEN, 'User account is not active or email not verified.'));

    testUser.status = 'ACTIVE'; // Using string literal
    testUser.emailVerified = false;
     mockUserRepository.findById.mockResolvedValue(createUser({ id: userId, emailVerified: false, status: 'ACTIVE'}));
     await expect(registerForTournamentUseCase.execute(userId, tournamentId, idempotencyKey))
       .rejects.toThrow(new ApiError(httpStatusCodes.FORBIDDEN, 'User account is not active or email not verified.'));
  });

  it('should throw ApiError if wallet not found when entry fee is required', async () => {
    mockWalletRepository.findByUserId.mockResolvedValue(null);
    await expect(registerForTournamentUseCase.execute(userId, tournamentId, idempotencyKey))
      .rejects.toThrow(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'User wallet not found.'));
  });

  it('should throw ApiError if user has insufficient balance', async () => {
    const tempTestWallet = createWallet({ userId, balance: 5 }); // Create wallet with specific balance
    mockWalletRepository.findByUserId.mockResolvedValue(tempTestWallet);
    await expect(registerForTournamentUseCase.execute(userId, tournamentId, idempotencyKey))
      .rejects.toThrow(new ApiError(httpStatusCodes.PAYMENT_REQUIRED, 'Insufficient balance to pay entry fee.'));
  });

  it('should return existing response if idempotency key already processed', async () => {
    const existingResponse = { message: 'Already processed' };
    mockIdempotencyRepository.findRequest.mockResolvedValue({
        idempotencyKey,
        requestPath: '/tournaments/register',
        requestParams: { userId, tournamentId },
        response: existingResponse,
        createdAt: new Date()
    });

    const result = await registerForTournamentUseCase.execute(userId, tournamentId, idempotencyKey);
    expect(result).toEqual(existingResponse);
    expect(mockTournamentRepository.findById).not.toHaveBeenCalled();
  });

  it('should throw error if transaction creation fails', async () => {
    mockTransactionRepository.create.mockRejectedValue(new Error('DB transaction error'));
    await expect(registerForTournamentUseCase.execute(userId, tournamentId, idempotencyKey))
        .rejects.toThrow('DB transaction error');
    expect(mockTournamentParticipantRepository.create).not.toHaveBeenCalled();
    // expect(mockTournamentRepository.update).not.toHaveBeenCalled(); // update is now incrementParticipantCount
  });

  it('should throw error if participant creation fails after successful transaction', async () => {
    mockTournamentParticipantRepository.create.mockRejectedValue(new Error('DB participant error'));
    await expect(registerForTournamentUseCase.execute(userId, tournamentId, idempotencyKey))
        .rejects.toThrow('DB participant error');
    expect(mockTransactionRepository.create).toHaveBeenCalled();
  });

  it('should throw error if tournament update (participant count) fails', async () => {
    // mockTournamentRepository.update.mockRejectedValue(new Error('DB tournament update error')); // update is now incrementParticipantCount
    mockTournamentRepository.incrementParticipantCount.mockRejectedValue(new Error('DB tournament update error'));
    await expect(registerForTournamentUseCase.execute(userId, tournamentId, idempotencyKey))
        .rejects.toThrow('DB tournament update error');
    expect(mockTransactionRepository.create).toHaveBeenCalled();
    expect(mockTournamentParticipantRepository.create).toHaveBeenCalled();
  });
  */
});
