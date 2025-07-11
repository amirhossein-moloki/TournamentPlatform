const GetManagedTournamentsUseCase = require('../../../../../src/application/use-cases/tournament/get-managed-tournaments.usecase');
const { User, UserRoles } = require('../../../../../src/domain/user/user.entity');
const { Tournament } = require('../../../../../src/domain/tournament/tournament.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { faker } = require('@faker-js/faker');

describe('GetManagedTournamentsUseCase', () => {
  let mockTournamentRepository;
  let mockUserRepository;
  let getManagedTournamentsUseCase;
  let managerUser;

  beforeEach(() => {
    mockTournamentRepository = {
      findAndCountAll: jest.fn(),
    };
    mockUserRepository = {
      findById: jest.fn(),
    };
    getManagedTournamentsUseCase = new GetManagedTournamentsUseCase(mockTournamentRepository, mockUserRepository);

    managerUser = new User(
      faker.string.uuid(), 'managerUser', 'manager@example.com', 'hashedPass',
      [User.UserRoles.PLAYER, User.UserRoles.TOURNAMENT_MANAGER]
    );
    mockUserRepository.findById.mockResolvedValue(managerUser);
  });

  it('should retrieve tournaments managed by the user with default pagination', async () => {
    const tournaments = [new Tournament(faker.string.uuid(), 'Tour 1', 'game1'), new Tournament(faker.string.uuid(), 'Tour 2', 'game1')];
    mockTournamentRepository.findAndCountAll.mockResolvedValue({ tournaments, totalItems: 2 });

    const result = await getManagedTournamentsUseCase.execute(managerUser.id);

    expect(mockUserRepository.findById).toHaveBeenCalledWith(managerUser.id);
    expect(mockTournamentRepository.findAndCountAll).toHaveBeenCalledWith({
      filters: { managedBy: managerUser.id },
      limit: 10,
      offset: 0,
      sortBy: 'startDate',
      sortOrder: 'ASC',
    });
    expect(result.tournaments.length).toBe(2);
    expect(result.totalItems).toBe(2);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(1);
  });

  it('should apply pagination, filters, and sorting options', async () => {
    const tournaments = [new Tournament(faker.string.uuid(), 'Filtered Tour', 'game-filtered')];
    mockTournamentRepository.findAndCountAll.mockResolvedValue({ tournaments, totalItems: 1 });
    const options = {
      page: 2,
      limit: 5,
      status: 'ONGOING',
      gameId: 'game-filtered',
      sortBy: 'name:desc'
    };

    await getManagedTournamentsUseCase.execute(managerUser.id, options);

    expect(mockTournamentRepository.findAndCountAll).toHaveBeenCalledWith({
      filters: {
        managedBy: managerUser.id,
        status: 'ONGOING',
        gameId: 'game-filtered',
      },
      limit: 5,
      offset: 5, // (2-1)*5
      sortBy: 'name',
      sortOrder: 'DESC',
    });
  });

  it('should throw ApiError if managerUserId is not provided', async () => {
    await expect(getManagedTournamentsUseCase.execute(null))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Manager User ID is required.'));
  });

  it('should throw ApiError if manager is not found', async () => {
    mockUserRepository.findById.mockResolvedValue(null);
    await expect(getManagedTournamentsUseCase.execute('non-existent-manager'))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, 'Manager with ID non-existent-manager not found.'));
  });

  it('should throw ApiError if user is not a TOURNAMENT_MANAGER', async () => {
    managerUser.roles = [UserRoles.PLAYER]; // Not a manager
    mockUserRepository.findById.mockResolvedValue(managerUser);
    await expect(getManagedTournamentsUseCase.execute(managerUser.id))
      .rejects.toThrow(new ApiError(httpStatusCodes.FORBIDDEN, `User ${managerUser.id} is not authorized (missing TOURNAMENT_MANAGER role).`));
  });

  it('should handle empty result correctly', async () => {
    mockTournamentRepository.findAndCountAll.mockResolvedValue({ tournaments: [], totalItems: 0 });
    const result = await getManagedTournamentsUseCase.execute(managerUser.id);
    expect(result.tournaments.length).toBe(0);
    expect(result.totalItems).toBe(0);
    expect(result.totalPages).toBe(0);
  });

});
