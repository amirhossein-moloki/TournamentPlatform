const CreateTournamentByManagerUseCase = require('../../../../../src/application/use-cases/tournament/create-tournament-by-manager.usecase');
const { User, UserRoles } = require('../../../../../src/domain/user/user.entity');
const { Game } = require('../../../../../src/domain/game/game.entity');
const { Tournament, TournamentStatus, EntryFeeType, PrizeType, BracketType } = require('../../../../../src/domain/tournament/tournament.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { faker } = require('@faker-js/faker');

describe('CreateTournamentByManagerUseCase', () => {
  let mockTournamentRepository;
  let mockGameRepository;
  let mockUserRepository;
  let createTournamentByManagerUseCase;
  let managerUser;
  let game;
  let basicTournamentData;

  beforeEach(() => {
    mockTournamentRepository = {
      create: jest.fn(),
      findByNameAndDates: jest.fn(),
    };
    mockGameRepository = {
      findById: jest.fn(),
    };
    mockUserRepository = {
      findById: jest.fn(),
    };
    createTournamentByManagerUseCase = new CreateTournamentByManagerUseCase(
      mockTournamentRepository,
      mockGameRepository,
      mockUserRepository
    );

    managerUser = new User(
      faker.string.uuid(), 'managerUser', 'manager@example.com', 'hashedPass',
      [UserRoles.PLAYER, UserRoles.TOURNAMENT_MANAGER]
    );

    game = new Game(faker.string.uuid(), 'Test Game', 'game-slug');
    game.tournament_managers = [managerUser.id]; // Authorize this manager for the game

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    basicTournamentData = {
      name: 'Manager Created Tournament',
      gameId: game.id,
      startDate: tomorrow.toISOString(),
      endDate: dayAfterTomorrow.toISOString(),
      maxParticipants: 32,
      entryFeeType: EntryFeeType.FREE,
      prizeType: PrizeType.NONE,
      // other fields can be added if needed for specific tests
    };

    mockUserRepository.findById.mockResolvedValue(managerUser);
    mockGameRepository.findById.mockResolvedValue(game);
    mockTournamentRepository.findByNameAndDates.mockResolvedValue(null); // No conflicts by default
    mockTournamentRepository.create.mockImplementation(tournament => Promise.resolve(tournament));
  });

  it('should create a tournament successfully by an authorized manager', async () => {
    const result = await createTournamentByManagerUseCase.execute(managerUser.id, basicTournamentData);

    expect(mockUserRepository.findById).toHaveBeenCalledWith(managerUser.id);
    expect(mockGameRepository.findById).toHaveBeenCalledWith(game.id);
    expect(mockTournamentRepository.create).toHaveBeenCalledTimes(1);

    const createdTournament = mockTournamentRepository.create.mock.calls[0][0];
    expect(createdTournament).toBeInstanceOf(Tournament);
    expect(createdTournament.name).toBe(basicTournamentData.name);
    expect(createdTournament.gameId).toBe(game.id);
    expect(createdTournament.status).toBe(TournamentStatus.PENDING);
    expect(createdTournament.organizerId).toBe(managerUser.id);
    expect(createdTournament.managed_by).toEqual([managerUser.id]);
    expect(result.name).toBe(basicTournamentData.name);
  });

  it('should throw ApiError if managerUserId is not provided', async () => {
    await expect(createTournamentByManagerUseCase.execute(null, basicTournamentData))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Manager User ID is required.'));
  });

  it('should throw ApiError if tournamentData is not provided', async () => {
    await expect(createTournamentByManagerUseCase.execute(managerUser.id, null))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Tournament data is required.'));
  });

  it('should throw ApiError if gameId is missing in tournamentData', async () => {
    const dataWithoutGameId = { ...basicTournamentData, gameId: undefined };
    await expect(createTournamentByManagerUseCase.execute(managerUser.id, dataWithoutGameId))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Game ID is required in tournament data.'));
  });


  it('should throw ApiError if manager is not found', async () => {
    mockUserRepository.findById.mockResolvedValue(null);
    await expect(createTournamentByManagerUseCase.execute('non-existent-manager', basicTournamentData))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, 'User with ID non-existent-manager not found.'));
  });

  it('should throw ApiError if manager does not have TOURNAMENT_MANAGER role', async () => {
    managerUser.roles = [UserRoles.PLAYER]; // Remove manager role
    mockUserRepository.findById.mockResolvedValue(managerUser);
    await expect(createTournamentByManagerUseCase.execute(managerUser.id, basicTournamentData))
      .rejects.toThrow(new ApiError(httpStatusCodes.FORBIDDEN, `User ${managerUser.id} is not authorized to create tournaments (missing TOURNAMENT_MANAGER role).`));
  });

  it('should throw ApiError if game is not found', async () => {
    mockGameRepository.findById.mockResolvedValue(null);
    await expect(createTournamentByManagerUseCase.execute(managerUser.id, basicTournamentData))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `Game with ID ${game.id} not found.`));
  });

  it('should throw ApiError if manager is not in game.tournament_managers', async () => {
    game.tournament_managers = ['another-manager-id']; // Manager not authorized for this game
    mockGameRepository.findById.mockResolvedValue(game);
    await expect(createTournamentByManagerUseCase.execute(managerUser.id, basicTournamentData))
      .rejects.toThrow(new ApiError(httpStatusCodes.FORBIDDEN, `Manager ${managerUser.id} is not authorized to create tournaments for game ${game.id}.`));
  });

  it('should throw ApiError if game.tournament_managers is null or undefined', async () => {
    game.tournament_managers = null;
    mockGameRepository.findById.mockResolvedValue(game);
    await expect(createTournamentByManagerUseCase.execute(managerUser.id, basicTournamentData))
      .rejects.toThrow(new ApiError(httpStatusCodes.FORBIDDEN, `Manager ${managerUser.id} is not authorized to create tournaments for game ${game.id}.`));
  });


  it('should throw ApiError if tournament name/date conflict exists', async () => {
    mockTournamentRepository.findByNameAndDates.mockResolvedValue(new Tournament(faker.string.uuid(), basicTournamentData.name, game.id, '', '', TournamentStatus.PENDING, 0, EntryFeeType.FREE,0,PrizeType.NONE,null,32,0,new Date(basicTournamentData.startDate)));
    await expect(createTournamentByManagerUseCase.execute(managerUser.id, basicTournamentData))
      .rejects.toThrow(new ApiError(httpStatusCodes.CONFLICT, 'A tournament with the same name and overlapping dates already exists.'));
  });

  it('should throw ApiError from Tournament constructor for invalid tournament data', async () => {
    const invalidData = { ...basicTournamentData, maxParticipants: 0 }; // Invalid maxParticipants
    await expect(createTournamentByManagerUseCase.execute(managerUser.id, invalidData))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Failed to create tournament entity: Max participants must be greater than 1.'));
  });

  it('should throw ApiError if tournamentRepository.create fails', async () => {
    mockTournamentRepository.create.mockResolvedValue(null); // Simulate repository failure
    await expect(createTournamentByManagerUseCase.execute(managerUser.id, basicTournamentData))
      .rejects.toThrow(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to save the new tournament.'));
  });
});
