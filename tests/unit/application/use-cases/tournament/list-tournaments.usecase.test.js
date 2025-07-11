const ListTournamentsUseCase = require('../../../../../src/application/use-cases/tournament/list-tournaments.usecase');
const { createTournament, faker } = require('../../../../utils/factories');
const ApiError = require('../../../../../src/utils/ApiError'); // Added import
const httpStatusCodes = require('http-status-codes'); // Added import

// Mock TournamentRepository
const mockTournamentRepository = {
  findAll: jest.fn(),
  // countAll is not used by the use case, repository.findAll should return total
};

describe('ListTournamentsUseCase', () => {
  let listTournamentsUseCase;
  const defaultPage = 1;
  const defaultLimit = 10;
  const defaultSortBy = 'startDate';
  const defaultSortOrder = 'ASC';
  const defaultIncludeGame = true;

  beforeEach(() => {
    jest.clearAllMocks();
    listTournamentsUseCase = new ListTournamentsUseCase(mockTournamentRepository);
  });

  it('should list tournaments with default options if none provided', async () => {
    const tournaments = [createTournament(), createTournament()];
    const mockRepoResult = { tournaments, total: tournaments.length, page: defaultPage, limit: defaultLimit };
    mockTournamentRepository.findAll.mockResolvedValue(mockRepoResult);

    const result = await listTournamentsUseCase.execute({});

    expect(mockTournamentRepository.findAll).toHaveBeenCalledWith({
      page: defaultPage,
      limit: defaultLimit,
      filters: {},
      sortBy: defaultSortBy,
      sortOrder: defaultSortOrder,
      includeGame: defaultIncludeGame,
    });
    expect(result.tournaments).toEqual(tournaments);
    expect(result.totalItems).toBe(tournaments.length);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(defaultPage);
    expect(result.pageSize).toBe(defaultLimit);
  });

  it('should list tournaments with provided filters', async () => {
    const gameIdFilter = faker.string.uuid();
    const statusFilter = 'PENDING';
    const filters = { gameId: gameIdFilter, status: statusFilter };
    const tournaments = [createTournament({ gameId: gameIdFilter, status: statusFilter })];
    const mockRepoResult = { tournaments, total: tournaments.length, page: defaultPage, limit: defaultLimit };
    mockTournamentRepository.findAll.mockResolvedValue(mockRepoResult);

    const result = await listTournamentsUseCase.execute({ filters });

    expect(mockTournamentRepository.findAll).toHaveBeenCalledWith({
      page: defaultPage,
      limit: defaultLimit,
      filters,
      sortBy: defaultSortBy,
      sortOrder: defaultSortOrder,
      includeGame: defaultIncludeGame,
    });
    expect(result.tournaments).toEqual(tournaments);
  });

  it('should list tournaments with provided pagination', async () => {
    const page = 2;
    const limit = 5;
    const tournaments = Array(limit).fill(null).map(() => createTournament());
    const totalItems = 15;
    const mockRepoResult = { tournaments, total: totalItems, page, limit };
    mockTournamentRepository.findAll.mockResolvedValue(mockRepoResult);

    const result = await listTournamentsUseCase.execute({ page, limit });

    expect(mockTournamentRepository.findAll).toHaveBeenCalledWith({
      page,
      limit,
      filters: {},
      sortBy: defaultSortBy,
      sortOrder: defaultSortOrder,
      includeGame: defaultIncludeGame,
    });
    expect(result.tournaments.length).toBe(limit);
    expect(result.totalItems).toBe(totalItems);
    expect(result.totalPages).toBe(Math.ceil(totalItems / limit));
    expect(result.currentPage).toBe(page);
    expect(result.pageSize).toBe(limit);
  });

  it('should list tournaments with provided sorting', async () => {
    const sortBy = 'name';
    const sortOrder = 'DESC';
    const tournaments = [createTournament(), createTournament()].sort((a, b) => b.name.localeCompare(a.name));
    const mockRepoResult = { tournaments, total: tournaments.length, page: defaultPage, limit: defaultLimit };
    mockTournamentRepository.findAll.mockResolvedValue(mockRepoResult);

    const result = await listTournamentsUseCase.execute({ sortBy, sortOrder });
    expect(mockTournamentRepository.findAll).toHaveBeenCalledWith({
      page: defaultPage,
      limit: defaultLimit,
      filters: {},
      sortBy,
      sortOrder,
      includeGame: defaultIncludeGame,
    });
    expect(result.tournaments).toEqual(tournaments);
  });

  it('should handle empty result correctly', async () => {
    const mockRepoResult = { tournaments: [], total: 0, page: 1, limit: 10 };
    mockTournamentRepository.findAll.mockResolvedValue(mockRepoResult);

    const result = await listTournamentsUseCase.execute({});

    expect(result.tournaments).toEqual([]);
    expect(result.totalItems).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.currentPage).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it('should calculate totalPages correctly for various counts and limits', async () => {
    const limit = 10;
    const testCases = [
      { totalItems: 0, expectedTotalPages: 0 },
      { totalItems: 5, expectedTotalPages: 1 },
      { totalItems: 10, expectedTotalPages: 1 },
      { totalItems: 11, expectedTotalPages: 2 },
      { totalItems: 20, expectedTotalPages: 2 },
    ];

    for (const tc of testCases) {
      const mockRepoResult = { tournaments: [], total: tc.totalItems, page: 1, limit };
      mockTournamentRepository.findAll.mockResolvedValue(mockRepoResult);
      const result = await listTournamentsUseCase.execute({ page: 1, limit });
      expect(result.totalPages).toBe(tc.expectedTotalPages);
      expect(result.totalItems).toBe(tc.totalItems);
    }
  });

  it('should use default page and limit if provided values are invalid', async () => {
    const mockRepoResult = { tournaments: [], total: 0, page: defaultPage, limit: defaultLimit };
    mockTournamentRepository.findAll.mockResolvedValue(mockRepoResult);

    // Test invalid page
    await listTournamentsUseCase.execute({ page: 0, limit: 5 });
    expect(mockTournamentRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({ page: defaultPage, limit: 5 }));

    // Test invalid limit
    await listTournamentsUseCase.execute({ page: 1, limit: 0 });
    expect(mockTournamentRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 1 })); // Corrected expectation: limit becomes 1

     // Test limit > max (e.g. 100)
    await listTournamentsUseCase.execute({ page: 1, limit: 200 });
    expect(mockTournamentRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 100 }));
  });

  it('should pass search term (as part of filters) to repository if provided', async () => {
    const searchTerm = 'Championship';
    const filters = { name: searchTerm }; // Search term passed in filters
    const tournaments = [createTournament({ name: 'Grand Championship'})];
    const mockRepoResult = { tournaments, total: tournaments.length, page: defaultPage, limit: defaultLimit };
    mockTournamentRepository.findAll.mockResolvedValue(mockRepoResult);

    await listTournamentsUseCase.execute({ filters });

    expect(mockTournamentRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ name: searchTerm }),
      })
    );
  });

  it('should throw ApiError if repository throws an error', async () => {
    const errorMessage = 'Database connection error';
    mockTournamentRepository.findAll.mockRejectedValue(new Error(errorMessage));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await listTournamentsUseCase.execute({});
      // If execute doesn't throw, the test should fail
      // eslint-disable-next-line no-undef
      fail('Expected listTournamentsUseCase.execute to throw an ApiError, but it did not.');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
      expect(error.message).toBe('Failed to retrieve tournaments.');
      expect(consoleErrorSpy).toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
