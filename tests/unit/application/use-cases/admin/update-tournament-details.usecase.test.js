// tests/unit/application/use-cases/admin/update-tournament-details.usecase.test.js
const UpdateTournamentDetailsUseCase = require('../../../../../src/application/use-cases/admin/update-tournament-details.usecase');
const { Tournament } = require('../../../../../src/domain/tournament/tournament.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');

describe('UpdateTournamentDetailsUseCase', () => {
  let mockTournamentRepository;
  let mockGameRepository;
  let updateTournamentDetailsUseCase;

  beforeEach(() => {
    mockTournamentRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    mockGameRepository = {
      findById: jest.fn(),
    };
    updateTournamentDetailsUseCase = new UpdateTournamentDetailsUseCase(mockTournamentRepository, mockGameRepository);
  });

  it('should update tournament details successfully', async () => {
    const tournamentId = 'tournament-uuid-1';
    const updateData = { name: 'New Tournament Name', entryFee: 100 };
    const mockTournament = new Tournament(
      tournamentId, 'Old Name', 'game-uuid-1', 'Desc', 'Rules',
      Tournament.Status.PENDING, // status
      50, // entryFee
      Tournament.EntryFeeType.PAID_CASH, // entryFeeType
      500, // prizePool
      Tournament.PrizeType.CASH, // prizeType
      null, // prizeDetails
      32, // maxParticipants
      0, // currentParticipants
      new Date(Date.now() + 86400000) // startDate
    );
    jest.spyOn(mockTournament, 'updateDetails').mockImplementation(() => {}); // Mock entity method

    mockTournamentRepository.findById.mockResolvedValue(mockTournament);
    mockTournamentRepository.update.mockResolvedValue({ ...mockTournament, ...updateData });

    const result = await updateTournamentDetailsUseCase.execute(tournamentId, updateData);

    expect(mockTournamentRepository.findById).toHaveBeenCalledWith(tournamentId);
    expect(mockTournament.updateDetails).toHaveBeenCalledWith(updateData);
    expect(mockTournamentRepository.update).toHaveBeenCalledWith(tournamentId, expect.any(Object));
    expect(result.name).toBe('New Tournament Name');
    expect(result.entryFee).toBe(100);
  });

  it('should throw ApiError if tournament not found', async () => {
    mockTournamentRepository.findById.mockResolvedValue(null);
    const tournamentId = 'non-existent-uuid';
    const updateData = { name: 'New Name' };

    await expect(updateTournamentDetailsUseCase.execute(tournamentId, updateData))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, `Tournament with ID ${tournamentId} not found.`));
  });

  it('should throw ApiError if gameId in updateData is not found', async () => {
    const tournamentId = 'tournament-uuid-1';
    const updateData = { gameId: 'non-existent-game-uuid' };
    const mockTournament = new Tournament(
      tournamentId, 'Old Name', 'game-uuid-1', 'Desc', 'Rules',
      Tournament.Status.PENDING, // status
      50, // entryFee
      Tournament.EntryFeeType.PAID_CASH, // entryFeeType
      500, // prizePool
      Tournament.PrizeType.CASH, // prizeType
      null, // prizeDetails
      32, // maxParticipants
      0, // currentParticipants
      new Date(Date.now() + 86400000) // startDate
    );

    mockTournamentRepository.findById.mockResolvedValue(mockTournament);
    mockGameRepository.findById.mockResolvedValue(null); // Game not found

    await expect(updateTournamentDetailsUseCase.execute(tournamentId, updateData))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `Game with ID ${updateData.gameId} not found.`));
  });

  it('should throw ApiError if tournament entity updateDetails throws error', async () => {
    const tournamentId = 'tournament-uuid-1';
    const updateData = { maxParticipants: 1 }; // Invalid data that entity might reject
     const mockTournament = new Tournament(
      tournamentId, 'Old Name', 'game-uuid-1', 'Desc', 'Rules',
      Tournament.Status.PENDING, // status
      50, // entryFee
      Tournament.EntryFeeType.PAID_CASH, // entryFeeType
      500, // prizePool
      Tournament.PrizeType.CASH, // prizeType
      null, // prizeDetails
      32, // maxParticipants
      10, // currentParticipants
      new Date(Date.now() + 86400000) // startDate
    );
    jest.spyOn(mockTournament, 'updateDetails').mockImplementation(() => {
        throw new Error('New max participants cannot be less than current number of participants.');
    });

    mockTournamentRepository.findById.mockResolvedValue(mockTournament);

    await expect(updateTournamentDetailsUseCase.execute(tournamentId, updateData))
        .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'New max participants cannot be less than current number of participants.'));
  });

  // Add more tests for other validation errors and edge cases
});
