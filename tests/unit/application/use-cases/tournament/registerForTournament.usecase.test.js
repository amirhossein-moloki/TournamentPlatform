console.log('Test file loading...');
const RegisterForTournamentUseCase = require('../../../../../src/application/use-cases/tournament/registerForTournament.useCase');
const { Tournament, TournamentStatus, EntryFeeType, PrizeType } = require('../../../../../src/domain/tournament/tournament.entity'); // Added Enums
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
// Assuming createTournament from factories is updated or not used for this specific mock setup
// const { createTournament, createUser, createWallet, createTransaction } = require('../../../../utils/factories');

// Mock Repositories
const mockTournamentRepository = {
  findById: jest.fn(),
  incrementParticipantCount: jest.fn(),
};
const mockTournamentParticipantRepository = {
  findByUserIdAndTournamentId: jest.fn(),
  create: jest.fn(),
};
const mockUserGameProfileRepository = {
  findByUserIdAndGameId: jest.fn(),
};

describe('RegisterForTournamentUseCase', () => {
  let registerForTournamentUseCase;
  const userId = 'user-uuid-123';
  const tournamentId = 'tournament-uuid-456';
  const gameId = 'game-uuid-789';
  let testTournamentEntity;
  let testUserGameProfile;

  beforeEach(() => {
    console.log('beforeEach start');
    jest.clearAllMocks();
    registerForTournamentUseCase = new RegisterForTournamentUseCase(
      mockTournamentRepository,
      mockTournamentParticipantRepository,
      mockUserGameProfileRepository
    );

    // Create a real Tournament entity instance to use its methods like canRegister()
    // and ensure it has the new fields with valid default enum values.
    testTournamentEntity = new Tournament(
        tournamentId,
        'Test Tournament',
        gameId,
        'Description',
        'Rules',
        TournamentStatus.REGISTRATION_OPEN, // status
        0, // entryFee
        EntryFeeType.FREE, // entryFeeType - using Enum
        100, // prizePool
        PrizeType.CASH,    // prizeType - using Enum
        'Cash prize',      // prizeDetails
        10, // maxParticipants
        0, // currentParticipants
        new Date(Date.now() + 100000), // startDate (future)
        null, // endDate
        null, // organizerId
        [],   // managed_by
        [],   // supported_by
        {},   // entryConditions
        new Date(), // createdAt
        new Date(), // updatedAt
        null, // bannerImageUrl
        Tournament.BracketType.SINGLE_ELIMINATION, // bracketType
        {}    // settings
    );
    // Mocking a game object associated with the tournament if needed by the use case logic (e.g. for game name in errors)
    // This was previously testTournamentEntity.game = { name: 'Test Game' };
    // If the use case fetches the Game entity separately, that should be mocked.
    // For now, assuming the error messages in the use case might construct this part or it's not strictly needed for these tests.
    // If game name is needed:
    // mockGameRepository.findById.mockResolvedValue({ id: gameId, name: 'Test Game', isActive: true });


    testUserGameProfile = {
        userId,
        gameId,
        inGameName: 'PlayerOne',
    };

    mockTournamentRepository.findById.mockResolvedValue(testTournamentEntity);
    mockTournamentParticipantRepository.findByUserIdAndTournamentId.mockResolvedValue(null); // Not yet registered
    mockUserGameProfileRepository.findByUserIdAndGameId.mockResolvedValue(testUserGameProfile);
    mockTournamentParticipantRepository.create.mockResolvedValue({ userId, tournamentId, registeredAt: new Date() });
    mockTournamentRepository.incrementParticipantCount.mockResolvedValue(true);
    console.log('beforeEach end');
  });

  it('should register user successfully', async () => {
    const canRegisterSpy = jest.spyOn(testTournamentEntity, 'canRegister').mockReturnValue(true);
    const result = await registerForTournamentUseCase.execute({ userId, tournamentId });
    expect(mockTournamentRepository.findById).toHaveBeenCalledWith(tournamentId);
    expect(canRegisterSpy).toHaveBeenCalledTimes(1);
    expect(mockTournamentParticipantRepository.findByUserIdAndTournamentId).toHaveBeenCalledWith(userId, tournamentId);
    expect(mockUserGameProfileRepository.findByUserIdAndGameId).toHaveBeenCalledWith(userId, gameId);
    expect(mockTournamentParticipantRepository.create).toHaveBeenCalledWith(expect.objectContaining({ userId, tournamentId }));
    expect(mockTournamentRepository.incrementParticipantCount).toHaveBeenCalledWith(tournamentId);
    expect(result).toEqual(expect.objectContaining({ userId, tournamentId }));
  });

  it('should throw ApiError if userId or tournamentId is missing', async () => {
    await expect(registerForTournamentUseCase.execute({ userId: null, tournamentId }))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID and Tournament ID are required.'));
  });

  it('should throw ApiError if tournament not found', async () => {
    mockTournamentRepository.findById.mockResolvedValue(null);
    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, `Tournament with ID ${tournamentId} not found.`));
  });

  it('should throw ApiError if registration is not open (e.g. PENDING)', async () => {
    testTournamentEntity.status = TournamentStatus.PENDING; // Change status
    jest.spyOn(testTournamentEntity, 'canRegister').mockReturnValue(false); // Ensure canRegister reflects this
    mockTournamentRepository.findById.mockResolvedValue(testTournamentEntity);

    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
      .rejects.toThrow(new ApiError(httpStatusCodes.FORBIDDEN, `Cannot register for tournament: Tournament registration is not open (status: ${TournamentStatus.PENDING}).`));
  });

  it('should throw ApiError if tournament is full', async () => {
    testTournamentEntity.currentParticipants = testTournamentEntity.maxParticipants;
    jest.spyOn(testTournamentEntity, 'canRegister').mockReturnValue(false);
    mockTournamentRepository.findById.mockResolvedValue(testTournamentEntity);

    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
      .rejects.toThrow(new ApiError(httpStatusCodes.FORBIDDEN, 'Cannot register for tournament: Tournament is full.'));
  });

  it('should throw ApiError if user is already registered', async () => {
    mockTournamentParticipantRepository.findByUserIdAndTournamentId.mockResolvedValue({ userId, tournamentId });
    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
      .rejects.toThrow(new ApiError(httpStatusCodes.CONFLICT, 'User is already registered for this tournament.'));
  });

  it('should throw ApiError if tournament gameId is missing (data inconsistency)', async () => {
    testTournamentEntity.gameId = null; // Simulate inconsistent data
    mockTournamentRepository.findById.mockResolvedValue(testTournamentEntity);
    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
        .rejects.toThrow(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Tournament game ID is missing.'));
  });

  it('should throw ApiError if user game profile not found for the tournament game', async () => {
    mockUserGameProfileRepository.findByUserIdAndGameId.mockResolvedValue(null);
    // For the error message, the use case might try to get gameName.
    // If the tournament entity doesn't have game name directly, and GameRepository isn't used by use case
    // to fetch game name, the error message might be simpler or the test needs adjustment.
    // Current use case error: `You must set your In-Game Name for the game '${tournament.game.name}'...`
    // This implies tournament entity needs a game name or the game entity itself.
    // Let's assume the testTournamentEntity.game.name part is handled or not critical for this specific test path.
    // To make it robust, we can mock the game name if it's fetched:
    // testTournamentEntity.game = { name: 'Test Game for Profile Error' };
    // Or, if the use case is expected to fetch the game via gameRepository:
    // mockGameRepository.findById.mockResolvedValueOnce({ name: 'Test Game for Profile Error' });
    // For now, let's assume the error message construction in use case is robust enough or doesn't rely on game name.
    // The original test had testTournamentEntity.game = { name: 'Test Game' };
    // Let's restore a simplified version of that for the error message if it's indeed used.
    testTournamentEntity.game = { name: 'Test Game' }; // Simplified mock for game name in error

    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `You must set your In-Game Name for the game '${testTournamentEntity.game.name}' before registering for this tournament.`));
  });

  it('should throw ApiError if user game profile inGameName is missing', async () => {
    testUserGameProfile.inGameName = null;
    mockUserGameProfileRepository.findByUserIdAndGameId.mockResolvedValue(testUserGameProfile);
    testTournamentEntity.game = { name: 'Test Game' }; // For error message

    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `You must set your In-Game Name for the game '${testTournamentEntity.game.name}' before registering for this tournament.`));
  });

  it('should throw error if participant creation fails', async () => {
    mockTournamentParticipantRepository.create.mockRejectedValue(new Error('DB participant error'));
    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
        .rejects.toThrow('DB participant error');
  });

  it('should throw error if incrementing participant count fails', async () => {
    mockTournamentRepository.incrementParticipantCount.mockRejectedValue(new Error('DB count error'));
    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
        .rejects.toThrow('DB count error');
  });

});
