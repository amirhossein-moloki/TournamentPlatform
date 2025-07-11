// tests/unit/application/use-cases/admin/change-tournament-status.usecase.test.js
const ChangeTournamentStatusUseCase = require('../../../../../src/application/use-cases/admin/change-tournament-status.usecase');
const { Tournament, TournamentStatus } = require('../../../../../src/domain/tournament/tournament.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');

describe('ChangeTournamentStatusUseCase', () => {
  let mockTournamentRepository;
  let changeTournamentStatusUseCase;

  beforeEach(() => {
    mockTournamentRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    changeTournamentStatusUseCase = new ChangeTournamentStatusUseCase(mockTournamentRepository);
  });

  const createMockTournament = (id, status, startDate = new Date(Date.now() + 86400000)) => {
    // Ensure all required parameters for the Tournament constructor are provided
    const tournament = new Tournament(
      id, // id
      'Test Tournament', // name
      'game-uuid', // gameId
      'Test Description', // description
      'Test Rules', // rules
      status, // status
      0, // entryFee
      0, // prizePool
      8, // maxParticipants
      startDate, // startDate
      null, // endDate
      // currentParticipants was missing here in the previous version, now it's correctly placed
      0, // currentParticipants
      'organizer-uuid', // organizerId
      null, // bannerImageUrl
      'SINGLE_ELIMINATION', // type / bracketType
      {}, // settings
      new Date(), // createdAt
      new Date() // updatedAt
    );
    // Spy on entity methods
    jest.spyOn(tournament, 'openRegistration').mockImplementation(() => { tournament.status = TournamentStatus.REGISTRATION_OPEN; });
    jest.spyOn(tournament, 'closeRegistration').mockImplementation(() => { tournament.status = TournamentStatus.REGISTRATION_CLOSED; });
    jest.spyOn(tournament, 'startTournament').mockImplementation(() => { tournament.status = TournamentStatus.ONGOING; });
    jest.spyOn(tournament, 'completeTournament').mockImplementation(() => { tournament.status = TournamentStatus.COMPLETED; });
    jest.spyOn(tournament, 'cancelTournament').mockImplementation((reason) => { tournament.status = TournamentStatus.CANCELED; tournament.description = reason; });
    jest.spyOn(tournament, 'updateStatus').mockImplementation((newStatus) => { tournament.status = newStatus; });
    return tournament;
  };

  it('should change tournament status to REGISTRATION_OPEN successfully', async () => {
    const tournamentId = 'tour-uuid-1';
    const mockTournamentInstance = createMockTournament(tournamentId, TournamentStatus.PENDING);
    mockTournamentRepository.findById.mockResolvedValue(mockTournamentInstance);
    mockTournamentRepository.update.mockResolvedValue({ ...mockTournamentInstance, status: TournamentStatus.REGISTRATION_OPEN });

    const result = await changeTournamentStatusUseCase.execute(tournamentId, TournamentStatus.REGISTRATION_OPEN);

    expect(mockTournamentRepository.findById).toHaveBeenCalledWith(tournamentId);
    expect(mockTournamentInstance.openRegistration).toHaveBeenCalled();
    expect(mockTournamentRepository.update).toHaveBeenCalledWith(tournamentId, expect.objectContaining({ status: TournamentStatus.REGISTRATION_OPEN }));
    expect(result.status).toBe(TournamentStatus.REGISTRATION_OPEN);
  });

  it('should change tournament status to CANCELED successfully with reason', async () => {
    const tournamentId = 'tour-uuid-2';
    const cancelReason = 'Cancelled due to admin decision.';
    const mockTournamentInstance = createMockTournament(tournamentId, TournamentStatus.REGISTRATION_OPEN);
    mockTournamentRepository.findById.mockResolvedValue(mockTournamentInstance);
    mockTournamentRepository.update.mockResolvedValue({ ...mockTournamentInstance, status: TournamentStatus.CANCELED, description: cancelReason });

    const result = await changeTournamentStatusUseCase.execute(tournamentId, TournamentStatus.CANCELED, cancelReason);

    expect(mockTournamentInstance.cancelTournament).toHaveBeenCalledWith(cancelReason);
    expect(mockTournamentRepository.update).toHaveBeenCalledWith(tournamentId, expect.objectContaining({ status: TournamentStatus.CANCELED, description: cancelReason }));
    expect(result.status).toBe(TournamentStatus.CANCELED);
    expect(result.description).toBe(cancelReason);
  });

  it('should throw ApiError if tournament not found', async () => {
    mockTournamentRepository.findById.mockResolvedValue(null);
    const tournamentId = 'non-existent-uuid';

    await expect(changeTournamentStatusUseCase.execute(tournamentId, TournamentStatus.ONGOING))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, `Tournament with ID ${tournamentId} not found.`));
  });

  it('should throw ApiError for invalid new status', async () => {
    const tournamentId = 'tour-uuid-3';
    const invalidStatus = 'INVALID_STATUS';

    await expect(changeTournamentStatusUseCase.execute(tournamentId, invalidStatus))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `Invalid new status: ${invalidStatus}.`));
  });

  it('should throw ApiError if entity method throws error (e.g., invalid transition)', async () => {
    const tournamentId = 'tour-uuid-4';
    // Attempting to open registration for an already ONGOING tournament
    const mockTournamentInstance = createMockTournament(tournamentId, TournamentStatus.ONGOING);
    // Make the entity method throw an error for this specific scenario
    jest.spyOn(mockTournamentInstance, 'openRegistration').mockImplementation(() => { throw new Error('Cannot open registration for an ongoing tournament.'); });

    mockTournamentRepository.findById.mockResolvedValue(mockTournamentInstance);

    await expect(changeTournamentStatusUseCase.execute(tournamentId, TournamentStatus.REGISTRATION_OPEN))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Cannot open registration for an ongoing tournament.'));
  });

   it('should throw ApiError for unsupported direct status change (e.g., to PENDING from ONGOING)', async () => {
    const tournamentId = 'tour-uuid-5';
    const mockTournamentInstance = createMockTournament(tournamentId, TournamentStatus.ONGOING);
    mockTournamentRepository.findById.mockResolvedValue(mockTournamentInstance);

    await expect(changeTournamentStatusUseCase.execute(tournamentId, TournamentStatus.PENDING))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `Direct change to status '${TournamentStatus.PENDING}' from '${TournamentStatus.ONGOING}' is not supported via this action. Use specific actions or ensure valid transition.`));
  });


  // Add more tests for each status transition and error cases.
});
