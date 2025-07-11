const CreateTournamentUseCase = require('../../../../../src/application/use-cases/tournament/create-tournament.usecase');
const { Tournament, TournamentStatus, EntryFeeType, PrizeType, BracketType } = require('../../../../../src/domain/tournament/tournament.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { createUser, createGame, faker } = require('../../../../utils/factories'); // createTournament factory might not be fully updated yet

// Mock repositories
const mockTournamentRepository = {
  create: jest.fn(),
};
const mockUserRepository = {
  findById: jest.fn(),
};
const mockGameRepository = {
  findById: jest.fn(),
};

describe('CreateTournamentUseCase', () => {
  let createTournamentUseCase;

  // Define a static base for validation test cases, accessible during test collection
  const staticBaseDataForValidation = {
    name: 'Validation Tournament Name',
    gameId: faker.string.uuid(),
    description: 'A grand tournament for validation.',
    rules: 'Standard validation rules apply.',
    entryFee: 10, // Valid default
    entryFeeType: EntryFeeType.PAID_CASH, // Valid default
    prizePool: 1000, // Valid default
    prizeType: PrizeType.CASH, // Valid default
    prizeDetails: 'Top prize: $500',
    maxParticipants: 64, // Valid default
    startDate: faker.date.future({ years: 0.1 }).toISOString(),
    organizerId: faker.string.uuid(),
    managed_by: [faker.string.uuid()], // Keep as array
    supported_by: [faker.string.uuid()], // Keep as array
    entryConditions: { minRank: 'Diamond' },
    bannerImageUrl: faker.image.url(),
    bracketType: BracketType.SINGLE_ELIMINATION, // Valid default
    settings: { allowCheckIns: true },
  };
  // Ensure endDate is after startDate for the static base
  staticBaseDataForValidation.endDate = new Date(new Date(staticBaseDataForValidation.startDate).getTime() + 86400000).toISOString();

  let baseValidTournamentData; // For general tests, can be a fresh copy from static or different

  beforeEach(() => {
    jest.clearAllMocks();
    createTournamentUseCase = new CreateTournamentUseCase(
      mockTournamentRepository,
      mockUserRepository,
      mockGameRepository
    );

    baseValidTournamentData = {
      name: 'Epic Valorant Championship',
      gameId: faker.string.uuid(),
      description: 'A grand tournament for Valorant players.',
      rules: 'Standard competitive rules apply.',
      entryFee: 10,
      entryFeeType: EntryFeeType.PAID_CASH,
      prizePool: 1000,
      prizeType: PrizeType.CASH,
      prizeDetails: 'Top prize: $500',
      maxParticipants: 64,
      startDate: faker.date.future({ years: 0.1 }).toISOString(),
      organizerId: faker.string.uuid(),
      managed_by: [faker.string.uuid()],
      supported_by: [faker.string.uuid()],
      entryConditions: { minRank: 'Diamond' },
      bannerImageUrl: faker.image.url(),
      bracketType: BracketType.SINGLE_ELIMINATION,
      settings: { allowCheckIns: true },
    };
    // Initialize baseValidTournamentData for other tests (can be a copy of static or a new dynamic one)
    baseValidTournamentData = {
      ...staticBaseDataForValidation, // Start with a copy of the static data
      name: 'Epic Valorant Championship', // Override specific fields for general tests if needed
      gameId: faker.string.uuid(),
      organizerId: faker.string.uuid(),
      managed_by: [faker.string.uuid()],
      supported_by: [faker.string.uuid()],
      startDate: faker.date.future({ years: 0.1 }).toISOString(), // Potentially new dynamic date
    };
    // Ensure endDate is consistent for this dynamic startDate
    baseValidTournamentData.endDate = new Date(new Date(baseValidTournamentData.startDate).getTime() + 86400000).toISOString();
  });

  it('should create a tournament successfully with all valid data', async () => {
    const game = createGame({ id: baseValidTournamentData.gameId, isActive: true });
    const organizer = createUser({ id: baseValidTournamentData.organizerId });
    // We expect the use case to create the Tournament entity itself
    // The mock repository's create method will receive this instance.
    mockGameRepository.findById.mockResolvedValue(game);
    if (baseValidTournamentData.organizerId) {
      mockUserRepository.findById.mockResolvedValue(organizer);
    }
    // The actual created entity will be asserted via the mock call argument
    mockTournamentRepository.create.mockImplementation(tournamentEntity => Promise.resolve(tournamentEntity));


    const result = await createTournamentUseCase.execute(baseValidTournamentData);

    expect(mockGameRepository.findById).toHaveBeenCalledWith(baseValidTournamentData.gameId);
    if (baseValidTournamentData.organizerId) {
      expect(mockUserRepository.findById).toHaveBeenCalledWith(baseValidTournamentData.organizerId);
    }
    expect(mockTournamentRepository.create).toHaveBeenCalledTimes(1);

    const tournamentInstance = mockTournamentRepository.create.mock.calls[0][0];
    expect(tournamentInstance).toBeInstanceOf(Tournament);
    expect(tournamentInstance.name).toBe(baseValidTournamentData.name);
    expect(tournamentInstance.gameId).toBe(baseValidTournamentData.gameId);
    expect(tournamentInstance.organizerId).toBe(baseValidTournamentData.organizerId);
    expect(tournamentInstance.status).toBe(TournamentStatus.PENDING);
    expect(tournamentInstance.entryFeeType).toBe(baseValidTournamentData.entryFeeType);
    expect(tournamentInstance.prizeType).toBe(baseValidTournamentData.prizeType);
    expect(tournamentInstance.managed_by).toEqual(baseValidTournamentData.managed_by);
    expect(tournamentInstance.supported_by).toEqual(baseValidTournamentData.supported_by);
    expect(tournamentInstance.entryConditions).toEqual(baseValidTournamentData.entryConditions);

    expect(result.name).toEqual(baseValidTournamentData.name); // Check some props on the returned result
  });

  it('should create a tournament successfully without an organizerId and with minimal optional fields', async () => {
    const game = createGame({ id: baseValidTournamentData.gameId, isActive: true });
    const { organizerId, managed_by, supported_by, ...dataWithoutOrganizerEtc } = baseValidTournamentData;
    const minimalData = {
        ...dataWithoutOrganizerEtc,
        description: undefined, // Explicitly test undefined for optional fields
        rules: undefined,
        prizeDetails: undefined,
        entryConditions: undefined,
        bannerImageUrl: undefined,
        bracketType: undefined, // Will use entity default
        settings: undefined,    // Will use entity default
        managed_by: undefined,
        supported_by: undefined,
    };

    mockGameRepository.findById.mockResolvedValue(game);
    mockTournamentRepository.create.mockImplementation(tournamentEntity => Promise.resolve(tournamentEntity));

    const result = await createTournamentUseCase.execute(minimalData);

    expect(mockGameRepository.findById).toHaveBeenCalledWith(minimalData.gameId);
    expect(mockUserRepository.findById).not.toHaveBeenCalled();
    expect(mockTournamentRepository.create).toHaveBeenCalledTimes(1);

    const tournamentInstance = mockTournamentRepository.create.mock.calls[0][0];
    expect(tournamentInstance.organizerId).toBeNull();
    expect(tournamentInstance.description).toBeNull(); // Entity default
    expect(tournamentInstance.managed_by).toEqual([]); // Entity default
    expect(tournamentInstance.bracketType).toBe(BracketType.SINGLE_ELIMINATION); // Entity default
    expect(result.name).toEqual(minimalData.name);
  });

  it('should throw ApiError if gameId is not found or game is inactive', async () => {
    mockGameRepository.findById.mockResolvedValue(null);
    await expect(createTournamentUseCase.execute(baseValidTournamentData))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `Game with ID ${baseValidTournamentData.gameId} not found or is not active.`));

    mockGameRepository.findById.mockResolvedValue(createGame({ id: baseValidTournamentData.gameId, isActive: false }));
     await expect(createTournamentUseCase.execute(baseValidTournamentData))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `Game with ID ${baseValidTournamentData.gameId} not found or is not active.`));
  });

  it('should throw ApiError if organizerId is provided but user not found', async () => {
    const game = createGame({ id: baseValidTournamentData.gameId, isActive: true });
    mockGameRepository.findById.mockResolvedValue(game);
    mockUserRepository.findById.mockResolvedValue(null);
    await expect(createTournamentUseCase.execute(baseValidTournamentData))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `Organizer with ID ${baseValidTournamentData.organizerId} not found.`));
  });

  // getValidationTestCases now uses the statically defined 'staticBaseDataForValidation'
  const getValidationTestCases = (currentStaticData) => [ // Parameter name updated for clarity
    { field: 'name', value: undefined, error: 'Missing required field: name' },
    { field: 'gameId', value: undefined, error: 'Missing required field: gameId' },
    { field: 'entryFee', value: -5, error: 'Entry fee cannot be negative.' },
    { field: 'prizePool', value: -100, error: 'Prize pool cannot be negative.' },
    { field: 'maxParticipants', value: 1, error: 'Maximum participants must be greater than 1.' },
    { field: 'startDate', value: faker.date.past().toISOString(), error: 'Start date must be in the future.' },
    // Use currentStaticData for refDate as it's guaranteed to be defined when this function is called
    { field: 'endDate', value: faker.date.past({refDate: new Date(currentStaticData.startDate)}).toISOString(), base: { startDate: currentStaticData.startDate }, error: 'End date must be after the start date.' },
    { field: 'entryFeeType', value: 'INVALID_FEE_TYPE', error: 'Invalid entry fee type: INVALID_FEE_TYPE.'},
    { field: 'prizeType', value: 'INVALID_PRIZE_TYPE', error: 'Invalid prize type: INVALID_PRIZE_TYPE.'},
    { field: 'managed_by', value: 'not-an-array', error: 'managed_by must be an array.'}, // This will test if the use case/entity validates type
    { field: 'supported_by', value: 'not-an-array', error: 'supported_by must be an array.'}, // This will test if the use case/entity validates type
    // Add a test for managed_by/supported_by not being arrays of strings if that's a validation rule
    // For example, if the entity constructor expects string arrays for managed_by/supported_by:
    // { field: 'managed_by', value: [123], error: 'managed_by must be an array of strings.' },
  ];

  // Call with the statically defined data
  getValidationTestCases(staticBaseDataForValidation).forEach(({ field, value, error, base = {} }) => {
    it(`should throw ApiError for invalid ${field}: ${value}`, async () => {
      // Use staticBaseDataForValidation as the base for constructing testData here
      const testData = { ...staticBaseDataForValidation, ...base, [field]: value };

      // Adjust mocks based on the field being tested to ensure other validations pass
      if (field !== 'gameId' && testData.gameId) {
        mockGameRepository.findById.mockResolvedValue(createGame({ id: testData.gameId, isActive: true }));
      } else if (field === 'gameId' && value === undefined) {
        // For the "gameId is undefined" test, we don't need to mock findById, as the use case should fail before that.
        // Or, if it reaches findById, it should handle the undefined gameId.
      }

      if (field !== 'organizerId' && testData.organizerId) {
         mockUserRepository.findById.mockResolvedValue(createUser({ id: testData.organizerId }));
      }
      // If testing for undefined organizerId, no need to mock findById for organizer.

      // If the 'base' object provides a startDate, it means this specific test case for 'endDate'
      // needs a particular 'startDate' to ensure the "endDate before startDate" logic is correctly tested.
      if (field === 'endDate' && base && base.startDate) {
          testData.startDate = base.startDate;
      }


      await expect(createTournamentUseCase.execute(testData))
        .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, error));
    });
  });

  it('should correctly parse string numbers for entryFee, prizePool, maxParticipants and use valid enums', async () => {
    const stringData = {
      ...baseValidTournamentData,
      entryFee: "20",
      prizePool: "2000",
      maxParticipants: "128",
      entryFeeType: EntryFeeType.PAID_CASH, // Ensure valid enum
      prizeType: PrizeType.CASH,           // Ensure valid enum
    };
    const game = createGame({ id: stringData.gameId, isActive: true });
    if (stringData.organizerId) {
        mockUserRepository.findById.mockResolvedValue(createUser({ id: stringData.organizerId }));
    }
    mockGameRepository.findById.mockResolvedValue(game);
    mockTournamentRepository.create.mockImplementation(tournamentEntity => Promise.resolve(tournamentEntity));

    await createTournamentUseCase.execute(stringData);

    const tournamentInstance = mockTournamentRepository.create.mock.calls[0][0];
    expect(tournamentInstance.entryFee).toBe(20);
    expect(tournamentInstance.prizePool).toBe(2000);
    expect(tournamentInstance.maxParticipants).toBe(128);
    expect(tournamentInstance.entryFeeType).toBe(EntryFeeType.PAID_CASH);
    expect(tournamentInstance.prizeType).toBe(PrizeType.CASH);
  });
});
