const UpdateTournamentDetailsByManagerUseCase = require('../../../../../src/application/use-cases/tournament/update-tournament-details-by-manager.usecase');
const { User, UserRoles } = require('../../../../../src/domain/user/user.entity');
const { Game } = require('../../../../../src/domain/game/game.entity');
const { Tournament, TournamentStatus, EntryFeeType, PrizeType } = require('../../../../../src/domain/tournament/tournament.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { faker } = require('@faker-js/faker');

describe('UpdateTournamentDetailsByManagerUseCase', () => {
  let mockTournamentRepository;
  let mockUserRepository;
  let mockGameRepository;
  let updateTournamentDetailsByManagerUseCase;
  let managerUser;
  let tournamentToUpdate;
  let game;

  beforeEach(() => {
    mockTournamentRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    mockUserRepository = {
      findById: jest.fn(),
    };
    mockGameRepository = {
      findById: jest.fn(),
    };
    updateTournamentDetailsByManagerUseCase = new UpdateTournamentDetailsByManagerUseCase(
      mockTournamentRepository,
      mockUserRepository,
      mockGameRepository
    );

    managerUser = new User(
      faker.string.uuid(), 'managerUser', 'manager@example.com', 'hashedPass',
      [User.UserRoles.PLAYER, User.UserRoles.TOURNAMENT_MANAGER]
    );

    game = new Game({
      id: faker.string.uuid(),
      name: 'Test Game',
      shortName: 'game-slug'
    });

    tournamentToUpdate = new Tournament(
      faker.string.uuid(), 'Original Tournament Name', game.id, 'Original Desc', 'Original Rules',
      TournamentStatus.PENDING, 0, EntryFeeType.FREE, 0, PrizeType.NONE, null, 32, 0,
      faker.date.future(), null, managerUser.id, [managerUser.id] // managerUser is managing this tournament
    );

    mockUserRepository.findById.mockResolvedValue(managerUser);
    mockTournamentRepository.findById.mockResolvedValue(tournamentToUpdate);
    mockGameRepository.findById.mockResolvedValue(game); // Default mock for existing game
    // Default mock for successful update
    mockTournamentRepository.update.mockImplementation((id, data) => {
        // Simulate returning the updated tournament data
        const updatedData = { ...tournamentToUpdate };
        Object.keys(data).forEach(key => {
            if (data[key] !== undefined) { // Only update defined fields
                updatedData[key] = data[key];
            }
        });
        return Promise.resolve(new Tournament(
            updatedData.id, updatedData.name, updatedData.gameId, updatedData.description, updatedData.rules,
            updatedData.status, updatedData.entryFee, updatedData.entryFeeType, updatedData.prizePool, updatedData.prizeType,
            updatedData.prizeDetails, updatedData.maxParticipants, updatedData.currentParticipants,
            updatedData.startDate, updatedData.endDate, updatedData.organizerId, updatedData.managed_by,
            updatedData.supported_by, updatedData.entryConditions, updatedData.createdAt, updatedData.updatedAt,
            updatedData.bannerImageUrl, updatedData.bracketType, updatedData.settings
        ));
    });
  });

  it('should update tournament details successfully by an authorized manager', async () => {
    const updateData = { name: 'Updated Tournament Name', description: 'Updated description.' };
    const result = await updateTournamentDetailsByManagerUseCase.execute(managerUser.id, tournamentToUpdate.id, updateData);

    expect(mockUserRepository.findById).toHaveBeenCalledWith(managerUser.id);
    expect(mockTournamentRepository.findById).toHaveBeenCalledWith(tournamentToUpdate.id);
    expect(mockTournamentRepository.update).toHaveBeenCalledTimes(1);

    const updatedFields = mockTournamentRepository.update.mock.calls[0][1];
    expect(updatedFields.name).toBe(updateData.name);
    expect(updatedFields.description).toBe(updateData.description);

    expect(result.name).toBe(updateData.name);
    expect(result.description).toBe(updateData.description);
  });

  it('should throw ApiError if managerUserId is not provided', async () => {
    await expect(updateTournamentDetailsByManagerUseCase.execute(null, tournamentToUpdate.id, {}))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Manager User ID is required.'));
  });

  it('should throw ApiError if tournamentId is not provided', async () => {
    await expect(updateTournamentDetailsByManagerUseCase.execute(managerUser.id, null, {}))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Tournament ID is required.'));
  });

  it('should throw ApiError if updateData is not provided or empty', async () => {
    await expect(updateTournamentDetailsByManagerUseCase.execute(managerUser.id, tournamentToUpdate.id, null))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Update data is required.'));
    await expect(updateTournamentDetailsByManagerUseCase.execute(managerUser.id, tournamentToUpdate.id, {}))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Update data is required.'));
  });

  it('should throw ApiError if manager user is not found', async () => {
    mockUserRepository.findById.mockResolvedValue(null);
    await expect(updateTournamentDetailsByManagerUseCase.execute('non-existent-manager', tournamentToUpdate.id, { name: 'New Name' }))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, 'Manager user with ID non-existent-manager not found.'));
  });

  it('should throw ApiError if user is not a TOURNAMENT_MANAGER', async () => {
    managerUser.roles = [User.UserRoles.PLAYER]; // Not a manager
    mockUserRepository.findById.mockResolvedValue(managerUser);
    await expect(updateTournamentDetailsByManagerUseCase.execute(managerUser.id, tournamentToUpdate.id, { name: 'New Name' }))
      .rejects.toThrow(new ApiError(httpStatusCodes.FORBIDDEN, `User ${managerUser.id} is not authorized as a Tournament Manager.`));
  });

  it('should throw ApiError if tournament is not found', async () => {
    mockTournamentRepository.findById.mockResolvedValue(null);
    await expect(updateTournamentDetailsByManagerUseCase.execute(managerUser.id, 'non-existent-tour', { name: 'New Name' }))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, 'Tournament with ID non-existent-tour not found.'));
  });

  it('should throw ApiError if manager is not in tournament.managed_by', async () => {
    tournamentToUpdate.managed_by = ['another-manager-id']; // Current manager not in the list
    mockTournamentRepository.findById.mockResolvedValue(tournamentToUpdate);
    await expect(updateTournamentDetailsByManagerUseCase.execute(managerUser.id, tournamentToUpdate.id, { name: 'New Name' }))
      .rejects.toThrow(new ApiError(httpStatusCodes.FORBIDDEN, `User ${managerUser.id} is not authorized to manage this specific tournament.`));
  });

  it('should validate new gameId if provided and game not found', async () => {
    const newGameId = faker.string.uuid();
    mockGameRepository.findById.mockResolvedValueOnce(null); // Simulate new game not found

    await expect(updateTournamentDetailsByManagerUseCase.execute(managerUser.id, tournamentToUpdate.id, { gameId: newGameId }))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `Game with ID ${newGameId} not found.`));
  });

  it('should successfully update gameId if new game exists', async () => {
    const newGameId = faker.string.uuid();
    const newGame = new Game(newGameId, 'New Test Game', 'new-game-slug');
    mockGameRepository.findById.mockResolvedValueOnce(newGame); // Simulate new game found

    const updateData = { gameId: newGameId };
    const result = await updateTournamentDetailsByManagerUseCase.execute(managerUser.id, tournamentToUpdate.id, updateData);

    expect(mockGameRepository.findById).toHaveBeenCalledWith(newGameId);
    expect(result.gameId).toBe(newGameId);
  });


  it('should throw ApiError if entity.updateDetails throws validation error', async () => {
    const invalidUpdateData = { maxParticipants: 1 }; // This should be caught by entity's updateDetails
    // No need to mock updateDetails on the entity instance itself, as we want the real method to run

    await expect(updateTournamentDetailsByManagerUseCase.execute(managerUser.id, tournamentToUpdate.id, invalidUpdateData))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Max participants must be greater than 1.'));
  });

  it('should throw ApiError if tournamentRepository.update fails', async () => {
    mockTournamentRepository.update.mockResolvedValue(null); // Simulate repository failure
    await expect(updateTournamentDetailsByManagerUseCase.execute(managerUser.id, tournamentToUpdate.id, { name: 'New Name' }))
      .rejects.toThrow(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to update tournament details.'));
  });
});
