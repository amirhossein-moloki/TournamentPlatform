// tests/unit/application/use-cases/admin/list-tournament-participants.usecase.test.js
const ListTournamentParticipantsUseCase = require('../../../../../src/application/use-cases/admin/list-tournament-participants.usecase');
const { Tournament } = require('../../../../../src/domain/tournament/tournament.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');

describe('ListTournamentParticipantsUseCase', () => {
  let mockTournamentRepository;
  let listTournamentParticipantsUseCase;

  beforeEach(() => {
    mockTournamentRepository = {
      findById: jest.fn(),
      findParticipantsByTournamentId: jest.fn(), // Assuming this is the method name in repo
    };
    listTournamentParticipantsUseCase = new ListTournamentParticipantsUseCase(mockTournamentRepository);
  });

  it('should list participants successfully with manual pagination', async () => {
    const tournamentId = 'tour-uuid-1';
    const mockTournament = new Tournament(
      tournamentId, 'Test Tour', 'game-id', 'description', 'rules', Tournament.Status.REGISTRATION_OPEN,
      0, Tournament.EntryFeeType.FREE, 0, Tournament.PrizeType.NONE, null, 8, 0, new Date(Date.now() + 3600000)
      // Assuming other fields like organizerId, managed_by, etc., can take defaults or are not critical for this test
    );
    const allParticipants = [
      { id: 'p1', userId: 'u1', registeredAt: new Date() }, { id: 'p2', userId: 'u2', registeredAt: new Date() },
      { id: 'p3', userId: 'u3', registeredAt: new Date() }, { id: 'p4', userId: 'u4', registeredAt: new Date() },
      { id: 'p5', userId: 'u5', registeredAt: new Date() },
    ];

    mockTournamentRepository.findById.mockResolvedValue(mockTournament);
    mockTournamentRepository.findParticipantsByTournamentId.mockResolvedValue(allParticipants);

    const resultPage1 = await listTournamentParticipantsUseCase.execute(tournamentId, { page: 1, limit: 2 });
    expect(mockTournamentRepository.findById).toHaveBeenCalledWith(tournamentId);
    expect(mockTournamentRepository.findParticipantsByTournamentId).toHaveBeenCalledWith(tournamentId, {});
    expect(resultPage1.participants.length).toBe(2);
    expect(resultPage1.participants[0].id).toBe('p1');
    expect(resultPage1.totalItems).toBe(5);
    expect(resultPage1.totalPages).toBe(3);
    expect(resultPage1.currentPage).toBe(1);
    expect(resultPage1.pageSize).toBe(2);

    const resultPage2 = await listTournamentParticipantsUseCase.execute(tournamentId, { page: 2, limit: 2 });
    expect(resultPage2.participants.length).toBe(2);
    expect(resultPage2.participants[0].id).toBe('p3');

    const resultPage3 = await listTournamentParticipantsUseCase.execute(tournamentId, { page: 3, limit: 2 });
    expect(resultPage3.participants.length).toBe(1);
    expect(resultPage3.participants[0].id).toBe('p5');
  });

  it('should return empty participants list if tournament has no participants', async () => {
    const tournamentId = 'tour-uuid-empty';
    const mockTournament = new Tournament(
      tournamentId, 'Empty Tour', 'game-id', 'description', 'rules', Tournament.Status.REGISTRATION_OPEN,
      0, Tournament.EntryFeeType.FREE, 0, Tournament.PrizeType.NONE, null, 8, 0, new Date(Date.now() + 3600000)
    );
    mockTournamentRepository.findById.mockResolvedValue(mockTournament);
    mockTournamentRepository.findParticipantsByTournamentId.mockResolvedValue([]);

    const result = await listTournamentParticipantsUseCase.execute(tournamentId, { page: 1, limit: 10 });
    expect(result.participants.length).toBe(0);
    expect(result.totalItems).toBe(0);
    expect(result.totalPages).toBe(0); // or 1 depending on convention for 0 items
  });

  it('should throw ApiError if tournament not found', async () => {
    mockTournamentRepository.findById.mockResolvedValue(null);
    await expect(listTournamentParticipantsUseCase.execute('non-existent-tour', { page: 1, limit: 10 }))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, 'Tournament with ID non-existent-tour not found.'));
  });

  it('should handle default pagination if not provided', async () => {
    const tournamentId = 'tour-uuid-defaults';
    const mockTournament = new Tournament(
      tournamentId, 'Test Tour', 'game-id', 'description', 'rules', Tournament.Status.REGISTRATION_OPEN,
      0, Tournament.EntryFeeType.FREE, 0, Tournament.PrizeType.NONE, null, 20, 0, new Date(Date.now() + 3600000)
    ); // Max participants set to 20 to accommodate 15 test participants
    const participantsArray = Array.from({ length: 15 }, (_, i) => ({ id: `p${i}`, userId: `u${i}` }));
    mockTournamentRepository.findById.mockResolvedValue(mockTournament);
    mockTournamentRepository.findParticipantsByTournamentId.mockResolvedValue(participantsArray);

    const result = await listTournamentParticipantsUseCase.execute(tournamentId, {}); // Empty options
    expect(result.participants.length).toBe(10); // Default limit
    expect(result.currentPage).toBe(1); // Default page
    expect(result.totalItems).toBe(15);
    expect(result.totalPages).toBe(2);
  });

  // Note: These tests assume manual pagination in the use case.
  // If repository handles pagination, tests would mock `findAllParticipants` to return paginated results directly.
});
