const GetTournamentUseCase = require('../../../../../src/application/use-cases/tournament/get-tournament.usecase');
const { Tournament } = require('../../../../../src/domain/tournament/tournament.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { createTournament, faker } = require('../../../../utils/factories');

// Mock TournamentRepository
const mockTournamentRepository = {
  findById: jest.fn(),
  // If the use case also fetches related entities like participants or matches,
  // those methods would need to be mocked here too.
  // For now, assuming it only fetches the tournament itself.
};

describe('GetTournamentUseCase', () => {
  let getTournamentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    getTournamentUseCase = new GetTournamentUseCase(mockTournamentRepository);
  });

  it('should return tournament data if found', async () => {
    const tournamentId = faker.string.uuid();
    const expectedTournament = createTournament({ id: tournamentId });
    // Assuming repository returns a full domain entity or data that the use case can return directly
    mockTournamentRepository.findById.mockResolvedValue(expectedTournament);

    const result = await getTournamentUseCase.execute({ id: tournamentId });

    expect(mockTournamentRepository.findById).toHaveBeenCalledWith(tournamentId, { includeGame: true, includeParticipants: undefined });
    expect(result).toEqual(expectedTournament);
  });

  it('should return tournament data with specific includes if provided', async () => {
    const tournamentId = faker.string.uuid();
    const expectedTournament = createTournament({ id: tournamentId });
    const options = { include: ['participants'] };
    mockTournamentRepository.findById.mockResolvedValue(expectedTournament);

    const result = await getTournamentUseCase.execute({ id: tournamentId, include: options.include });

    expect(mockTournamentRepository.findById).toHaveBeenCalledWith(tournamentId, { includeGame: true, includeParticipants: true });
    expect(result).toEqual(expectedTournament);
  });


  it('should throw ApiError if tournamentId is not provided', async () => {
    await expect(getTournamentUseCase.execute({}))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Tournament ID is required.'));
  });

  it('should throw ApiError if tournament not found', async () => {
    const tournamentId = faker.string.uuid();
    mockTournamentRepository.findById.mockResolvedValue(null); // Simulate tournament not found

    await expect(getTournamentUseCase.execute({ id: tournamentId }))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, `Tournament with ID ${tournamentId} not found.`));
  });

  it('should throw ApiError if repository throws an unexpected error', async () => {
    const tournamentId = faker.string.uuid();
    const errorMessage = 'Database error';
    mockTournamentRepository.findById.mockRejectedValue(new Error(errorMessage));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
        await getTournamentUseCase.execute({ id: tournamentId });
        fail('Expected getTournamentUseCase.execute to throw an error');
    } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.message).toBe('Failed to retrieve tournament.');
        expect(error.statusCode).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching tournament by ID:', expect.any(Error));
    }
    consoleErrorSpy.mockRestore();
  });
});
