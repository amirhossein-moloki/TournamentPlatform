const CreateTournamentUseCase = require('../../../../../src/application/use-cases/tournament/create-tournament.usecase');
const { Tournament } = require('../../../../../src/domain/tournament/tournament.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { createTournament, createUser, createGame, faker } = require('../../../../utils/factories');

// Mock repositories
const mockTournamentRepository = {
  create: jest.fn(),
  findByName: jest.fn(), // Assuming it might be used for uniqueness, though not in current code
};
const mockUserRepository = {
  findById: jest.fn(),
};
const mockGameRepository = {
  findById: jest.fn(),
};

describe('CreateTournamentUseCase', () => {
  let createTournamentUseCase;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    createTournamentUseCase = new CreateTournamentUseCase(
      mockTournamentRepository,
      mockUserRepository,
      mockGameRepository
    );
  });

  const validTournamentData = {
    name: 'Epic Valorant Championship',
    gameId: faker.string.uuid(),
    description: 'A grand tournament for Valorant players.',
    rules: 'Standard competitive rules apply.',
    entryFee: 10,
    prizePool: 1000,
    maxParticipants: 64,
    startDate: faker.date.future({ years: 0.1 }).toISOString(), // Ensure it's a future date string
    organizerId: faker.string.uuid(),
  };

  it('should create a tournament successfully with valid data', async () => {
    const game = createGame({ id: validTournamentData.gameId, isActive: true });
    const organizer = createUser({ id: validTournamentData.organizerId });
    const createdTournamentEntity = createTournament(validTournamentData); // Using factory

    mockGameRepository.findById.mockResolvedValue(game);
    mockUserRepository.findById.mockResolvedValue(organizer);
    mockTournamentRepository.create.mockResolvedValue(createdTournamentEntity);

    const result = await createTournamentUseCase.execute(validTournamentData);

    expect(mockGameRepository.findById).toHaveBeenCalledWith(validTournamentData.gameId);
    expect(mockUserRepository.findById).toHaveBeenCalledWith(validTournamentData.organizerId);
    expect(mockTournamentRepository.create).toHaveBeenCalledTimes(1);
    // Check if the argument to create is an instance of Tournament and has correct data
    const tournamentInstance = mockTournamentRepository.create.mock.calls[0][0];
    expect(tournamentInstance).toBeInstanceOf(Tournament);
    expect(tournamentInstance.name).toBe(validTournamentData.name);
    expect(tournamentInstance.gameId).toBe(validTournamentData.gameId);
    expect(tournamentInstance.organizerId).toBe(validTournamentData.organizerId);
    expect(tournamentInstance.status).toBe('PENDING'); // Default initial status

    expect(result).toEqual(createdTournamentEntity);
  });

  it('should create a tournament successfully without an organizerId', async () => {
    const game = createGame({ id: validTournamentData.gameId, isActive: true });
    const { organizerId, ...dataWithoutOrganizer } = validTournamentData;
    const createdTournamentEntity = createTournament(dataWithoutOrganizer);


    mockGameRepository.findById.mockResolvedValue(game);
    mockTournamentRepository.create.mockResolvedValue(createdTournamentEntity);

    const result = await createTournamentUseCase.execute(dataWithoutOrganizer);

    expect(mockGameRepository.findById).toHaveBeenCalledWith(validTournamentData.gameId);
    expect(mockUserRepository.findById).not.toHaveBeenCalled();
    expect(mockTournamentRepository.create).toHaveBeenCalledTimes(1);
    const tournamentInstance = mockTournamentRepository.create.mock.calls[0][0];
    expect(tournamentInstance.organizerId).toBeNull();
    expect(result).toEqual(createdTournamentEntity);
  });


  it('should throw ApiError if gameId is not found or game is inactive', async () => {
    mockGameRepository.findById.mockResolvedValue(null); // Game not found

    await expect(createTournamentUseCase.execute(validTournamentData))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `Game with ID ${validTournamentData.gameId} not found or is not active.`));

    mockGameRepository.findById.mockResolvedValue(createGame({ id: validTournamentData.gameId, isActive: false })); // Game inactive
     await expect(createTournamentUseCase.execute(validTournamentData))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `Game with ID ${validTournamentData.gameId} not found or is not active.`));
  });

  it('should throw ApiError if organizerId is provided but user not found', async () => {
    const game = createGame({ id: validTournamentData.gameId, isActive: true });
    mockGameRepository.findById.mockResolvedValue(game);
    mockUserRepository.findById.mockResolvedValue(null); // Organizer not found

    await expect(createTournamentUseCase.execute(validTournamentData))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `Organizer with ID ${validTournamentData.organizerId} not found.`));
  });

  const validationTestCases = [
    { field: 'name', value: undefined, error: 'Missing required field: name' },
    { field: 'gameId', value: undefined, error: 'Missing required field: gameId' },
    { field: 'entryFee', value: undefined, error: 'Missing required field: entryFee' },
    { field: 'prizePool', value: undefined, error: 'Missing required field: prizePool' },
    { field: 'maxParticipants', value: undefined, error: 'Missing required field: maxParticipants' },
    { field: 'startDate', value: undefined, error: 'Missing required field: startDate' },
    { field: 'startDate', value: faker.date.past().toISOString(), error: 'Start date must be in the future.' },
    { field: 'endDate', value: faker.date.past({refDate: validTournamentData.startDate}).toISOString(), base: { startDate: validTournamentData.startDate }, error: 'End date must be after the start date.' },
    { field: 'entryFee', value: -5, error: 'Entry fee cannot be negative.' },
    { field: 'prizePool', value: -100, error: 'Prize pool cannot be negative.' },
    { field: 'maxParticipants', value: 1, error: 'Maximum participants must be greater than 1.' },
  ];

  validationTestCases.forEach(({ field, value, error, base = {} }) => {
    it(`should throw ApiError for invalid ${field}: ${value}`, async () => {
      const testData = { ...validTournamentData, ...base, [field]: value };
      // Ensure game and organizer checks pass if they are not the focus of this validation test
      if (field !== 'gameId') {
        mockGameRepository.findById.mockResolvedValue(createGame({ id: testData.gameId, isActive: true }));
      }
      if (field !== 'organizerId' && testData.organizerId) {
         mockUserRepository.findById.mockResolvedValue(createUser({ id: testData.organizerId }));
      }


      await expect(createTournamentUseCase.execute(testData))
        .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, error));
    });
  });

  it('should correctly parse string numbers for entryFee, prizePool, maxParticipants', async () => {
    const stringData = {
      ...validTournamentData,
      entryFee: "20",
      prizePool: "2000",
      maxParticipants: "128",
    };
    const game = createGame({ id: stringData.gameId, isActive: true });
    const organizer = createUser({ id: stringData.organizerId });
    const createdTournamentEntity = createTournament(stringData);

    mockGameRepository.findById.mockResolvedValue(game);
    mockUserRepository.findById.mockResolvedValue(organizer);
    mockTournamentRepository.create.mockResolvedValue(createdTournamentEntity);

    await createTournamentUseCase.execute(stringData);

    const tournamentInstance = mockTournamentRepository.create.mock.calls[0][0];
    expect(tournamentInstance.entryFee).toBe(20);
    expect(tournamentInstance.prizePool).toBe(2000);
    expect(tournamentInstance.maxParticipants).toBe(128);
  });
});
