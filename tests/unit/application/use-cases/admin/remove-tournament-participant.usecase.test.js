// tests/unit/application/use-cases/admin/remove-tournament-participant.usecase.test.js
const RemoveTournamentParticipantUseCase = require('../../../../../src/application/use-cases/admin/remove-tournament-participant.usecase');
const { Tournament, TournamentStatus } = require('../../../../../src/domain/tournament/tournament.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');

describe('RemoveTournamentParticipantUseCase', () => {
  let mockTournamentRepository;
  let mockUserRepository;
  let removeTournamentParticipantUseCase;

  beforeEach(() => {
    mockTournamentRepository = {
      findById: jest.fn(),
      findParticipant: jest.fn(),
      removeParticipant: jest.fn(),
      decrementParticipantCount: jest.fn(),
    };
    mockUserRepository = {
      findById: jest.fn(),
    };
    removeTournamentParticipantUseCase = new RemoveTournamentParticipantUseCase(mockTournamentRepository, mockUserRepository);
  });

  it('should remove a participant successfully', async () => {
    const tournamentId = 'tour-uuid-1';
    const userIdToRemove = 'user-uuid-1';
    const participantEntryId = 'participant-entry-uuid-1';

    const mockTournament = new Tournament(
      tournamentId, 'Test Tour', 'game-id', 'description', 'rules', TournamentStatus.REGISTRATION_OPEN,
      0, Tournament.EntryFeeType.FREE, 0, Tournament.PrizeType.NONE, null, 8, 0, new Date(Date.now() + 3600000)
    );
    const mockUser = { id: userIdToRemove, username: 'testuser' };
    const mockParticipantEntry = { id: participantEntryId, tournamentId, userId: userIdToRemove, participantType: 'user' };

    mockTournamentRepository.findById.mockResolvedValue(mockTournament);
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockTournamentRepository.findParticipant.mockResolvedValue(mockParticipantEntry);
    mockTournamentRepository.removeParticipant.mockResolvedValue(true);
    mockTournamentRepository.decrementParticipantCount.mockResolvedValue(true);

    await expect(removeTournamentParticipantUseCase.execute(tournamentId, userIdToRemove)).resolves.toBeUndefined();

    expect(mockTournamentRepository.findById).toHaveBeenCalledWith(tournamentId);
    expect(mockUserRepository.findById).toHaveBeenCalledWith(userIdToRemove);
    expect(mockTournamentRepository.findParticipant).toHaveBeenCalledWith(tournamentId, userIdToRemove, 'user');
    expect(mockTournamentRepository.removeParticipant).toHaveBeenCalledWith(tournamentId, participantEntryId);
    // The use case now assumes removeParticipant also handles decrementing count.
    // expect(mockTournamentRepository.decrementParticipantCount).toHaveBeenCalledWith(tournamentId);
  });

  it('should throw ApiError if tournament not found', async () => {
    mockTournamentRepository.findById.mockResolvedValue(null);
    await expect(removeTournamentParticipantUseCase.execute('non-existent-tour', 'user-uuid-1'))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, 'Tournament with ID non-existent-tour not found.'));
  });

  it('should throw ApiError if user to remove not found', async () => {
    const mockTournament = new Tournament(
      'tour-uuid-1', 'Test Tour', 'game-id', 'description', 'rules', TournamentStatus.REGISTRATION_OPEN,
      0, Tournament.EntryFeeType.FREE, 0, Tournament.PrizeType.NONE, null, 8, 0, new Date(Date.now() + 3600000)
    );
    mockTournamentRepository.findById.mockResolvedValue(mockTournament);
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(removeTournamentParticipantUseCase.execute('tour-uuid-1', 'non-existent-user'))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, 'User with ID non-existent-user not found.'));
  });

  it('should throw ApiError if participant entry not found', async () => {
    const mockTournament = new Tournament(
      'tour-uuid-1', 'Test Tour', 'game-id', 'description', 'rules', TournamentStatus.REGISTRATION_OPEN,
      0, Tournament.EntryFeeType.FREE, 0, Tournament.PrizeType.NONE, null, 8, 0, new Date(Date.now() + 3600000)
    );
    const mockUser = { id: 'user-uuid-1', username: 'testuser' };
    mockTournamentRepository.findById.mockResolvedValue(mockTournament);
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockTournamentRepository.findParticipant.mockResolvedValue(null); // Participant not in tournament

    await expect(removeTournamentParticipantUseCase.execute('tour-uuid-1', 'user-uuid-1'))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, 'User user-uuid-1 is not registered in tournament tour-uuid-1.'));
  });

  it('should throw ApiError if trying to remove from ONGOING tournament', async () => {
    const tournamentId = 'tour-uuid-ongoing';
    const userIdToRemove = 'user-uuid-1';
    const mockTournament = new Tournament(
      tournamentId, 'Ongoing Tour', 'game-id', 'description', 'rules', TournamentStatus.ONGOING,
      0, Tournament.EntryFeeType.FREE, 0, Tournament.PrizeType.NONE, null, 8, 0, new Date(Date.now() + 3600000)
    );
    const mockUser = { id: userIdToRemove, username: 'testuser' };
    const mockParticipantEntry = { id: 'entry-id', tournamentId, userId: userIdToRemove, participantType: 'user' };

    mockTournamentRepository.findById.mockResolvedValue(mockTournament);
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockTournamentRepository.findParticipant.mockResolvedValue(mockParticipantEntry);

    await expect(removeTournamentParticipantUseCase.execute(tournamentId, userIdToRemove))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `Cannot remove participant from a tournament that is ${TournamentStatus.ONGOING}.`));
  });

  it('should throw ApiError if repository fails to remove participant', async () => {
    const tournamentId = 'tour-uuid-1';
    const userIdToRemove = 'user-uuid-1';
    const participantEntryId = 'participant-entry-uuid-1';

    const mockTournament = new Tournament(
      tournamentId, 'Test Tour', 'game-id', 'description', 'rules', TournamentStatus.REGISTRATION_OPEN,
      0, Tournament.EntryFeeType.FREE, 0, Tournament.PrizeType.NONE, null, 8, 0, new Date(Date.now() + 3600000)
    );
    const mockUser = { id: userIdToRemove, username: 'testuser' };
    const mockParticipantEntry = { id: participantEntryId, tournamentId, userId: userIdToRemove, participantType: 'user' };

    mockTournamentRepository.findById.mockResolvedValue(mockTournament);
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockTournamentRepository.findParticipant.mockResolvedValue(mockParticipantEntry);
    mockTournamentRepository.removeParticipant.mockResolvedValue(false); // Simulate failure

    await expect(removeTournamentParticipantUseCase.execute(tournamentId, userIdToRemove))
      .rejects.toThrow(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to remove participant from tournament.'));
  });

  // Add more tests for other edge cases
});
