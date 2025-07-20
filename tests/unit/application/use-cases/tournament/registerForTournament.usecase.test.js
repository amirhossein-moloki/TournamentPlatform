const RegisterForTournamentUseCase = require('../../../../../src/application/use-cases/tournament/registerForTournament.useCase');
const { Tournament, TournamentStatus, EntryFeeType, PrizeType } = require('../../../../../src/domain/tournament/tournament.entity');
const { BadRequestError, NotFoundError, ForbiddenError, ConflictError, InternalServerError } = require('../../../../../src/utils/errors');

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
const mockWalletRepository = {
  findByUserId: jest.fn(),
  debit: jest.fn(),
}

describe('RegisterForTournamentUseCase', () => {
  let registerForTournamentUseCase;
  const userId = 'user-uuid-123';
  const tournamentId = 'tournament-uuid-456';
  const gameId = 'game-uuid-789';
  let testTournamentEntity;
  let testUserGameProfile;

  beforeEach(() => {
    jest.clearAllMocks();
    registerForTournamentUseCase = new RegisterForTournamentUseCase(
      mockTournamentRepository,
      mockTournamentParticipantRepository,
      mockUserGameProfileRepository,
      mockWalletRepository
    );

    testTournamentEntity = new Tournament(
        tournamentId, 'Test Tournament', gameId, 'Description', 'Rules',
        TournamentStatus.REGISTRATION_OPEN, 0, EntryFeeType.FREE, 100, PrizeType.CASH,
        'Cash prize', 10, 0, new Date(Date.now() + 100000), null, null, [], [], {},
        new Date(), new Date(), null, Tournament.BracketType.SINGLE_ELIMINATION, {}
    );

    testUserGameProfile = {
        userId,
        gameId,
        inGameName: 'PlayerOne',
    };

    mockTournamentRepository.findById.mockResolvedValue(testTournamentEntity);
    mockTournamentParticipantRepository.findByUserIdAndTournamentId.mockResolvedValue(null);
    mockUserGameProfileRepository.findByUserIdAndGameId.mockResolvedValue(testUserGameProfile);
    mockTournamentParticipantRepository.create.mockResolvedValue({ userId, tournamentId, registeredAt: new Date() });
    mockTournamentRepository.incrementParticipantCount.mockResolvedValue(true);
  });

  it('should register user successfully', async () => {
    const canRegisterSpy = jest.spyOn(testTournamentEntity, 'canRegister').mockReturnValue(true);
    mockTournamentRepository.findById.mockResolvedValue(testTournamentEntity);
    mockTournamentParticipantRepository.findByUserIdAndTournamentId.mockResolvedValue(null);
    mockUserGameProfileRepository.findByUserIdAndGameId.mockResolvedValue(testUserGameProfile);
    mockTournamentParticipantRepository.create.mockResolvedValue({ userId, tournamentId, registeredAt: new Date() });
    mockTournamentRepository.incrementParticipantCount.mockResolvedValue(true);

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
      .rejects.toThrow(new BadRequestError('User ID and Tournament ID are required.'));
  });

  it('should throw ApiError if tournament not found', async () => {
    mockTournamentRepository.findById.mockResolvedValue(null);
    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
      .rejects.toThrow(new NotFoundError(`Tournament with ID ${tournamentId} not found.`));
  });

  it('should throw ApiError if registration is not open (e.g. PENDING)', async () => {
    testTournamentEntity.status = TournamentStatus.PENDING; // Change status
    jest.spyOn(testTournamentEntity, 'canRegister').mockReturnValue(false); // Ensure canRegister reflects this
    mockTournamentRepository.findById.mockResolvedValue(testTournamentEntity);

    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
      .rejects.toThrow(new ForbiddenError(`Cannot register for tournament: Tournament registration is not open (status: ${TournamentStatus.PENDING}).`));
  });

  it('should throw ApiError if tournament is full', async () => {
    testTournamentEntity.currentParticipants = testTournamentEntity.maxParticipants;
    jest.spyOn(testTournamentEntity, 'canRegister').mockReturnValue(false);
    mockTournamentRepository.findById.mockResolvedValue(testTournamentEntity);

    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
      .rejects.toThrow(new ForbiddenError('Cannot register for tournament: Tournament is full.'));
  });

  it('should throw ApiError if user is already registered', async () => {
    mockTournamentParticipantRepository.findByUserIdAndTournamentId.mockResolvedValue({ userId, tournamentId });
    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
      .rejects.toThrow(new ConflictError('User is already registered for this tournament.'));
  });

  it('should throw ApiError if tournament gameId is missing (data inconsistency)', async () => {
    testTournamentEntity.gameId = null; // Simulate inconsistent data
    mockTournamentRepository.findById.mockResolvedValue(testTournamentEntity);
    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
        .rejects.toThrow(new InternalServerError('Tournament game ID is missing.'));
  });

  it('should throw ApiError if user game profile not found for the tournament game', async () => {
    mockUserGameProfileRepository.findByUserIdAndGameId.mockResolvedValue(null);
    testTournamentEntity.game = { name: 'Test Game' };

    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
      .rejects.toThrow(new BadRequestError(`You must set your In-Game Name for the game '${testTournamentEntity.game.name}' before registering for this tournament.`));
  });

  it('should throw ApiError if user game profile inGameName is missing', async () => {
    testUserGameProfile.inGameName = null;
    mockUserGameProfileRepository.findByUserIdAndGameId.mockResolvedValue(testUserGameProfile);
    testTournamentEntity.game = { name: 'Test Game' };

    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
      .rejects.toThrow(new BadRequestError(`You must set your In-Game Name for the game '${testTournamentEntity.game.name}' before registering for this tournament.`));
  });

  it('should throw error if participant creation fails', async () => {
    mockTournamentRepository.findById.mockResolvedValue(testTournamentEntity);
    mockTournamentParticipantRepository.findByUserIdAndTournamentId.mockResolvedValue(null);
    mockUserGameProfileRepository.findByUserIdAndGameId.mockResolvedValue(testUserGameProfile);
    mockTournamentParticipantRepository.create.mockRejectedValue(new Error('DB participant error'));
    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
        .rejects.toThrow('DB participant error');
  });

  it('should throw error if incrementing participant count fails', async () => {
    mockTournamentRepository.findById.mockResolvedValue(testTournamentEntity);
    mockTournamentParticipantRepository.findByUserIdAndTournamentId.mockResolvedValue(null);
    mockUserGameProfileRepository.findByUserIdAndGameId.mockResolvedValue(testUserGameProfile);
    mockTournamentParticipantRepository.create.mockResolvedValue({ userId, tournamentId, registeredAt: new Date() });
    mockTournamentRepository.incrementParticipantCount.mockRejectedValue(new Error('DB count error'));
    await expect(registerForTournamentUseCase.execute({ userId, tournamentId }))
        .rejects.toThrow('DB count error');
  });

});
