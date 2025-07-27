const { GetTournamentHistoryUseCase } = require('../../../../../src/application/use-cases/tournament/get-tournament-history.usecase');
const { Tournament } = require('../../../../../src/domain/tournament/tournament.entity');

describe('GetTournamentHistoryUseCase', () => {
  let tournamentRepository;
  let getTournamentHistoryUseCase;

  beforeEach(() => {
    tournamentRepository = {
      findTournamentsByParticipantId: jest.fn(),
    };
    getTournamentHistoryUseCase = new GetTournamentHistoryUseCase(tournamentRepository);
  });

  it('should return the tournament history for a user', async () => {
    const tournaments = [
      new Tournament('1', 'Test Tournament 1', 'game1', 'description', 'rules', 'COMPLETED', 0, 'FREE', 0, 'NONE', null, 8, 8, new Date()),
      new Tournament('2', 'Test Tournament 2', 'game1', 'description', 'rules', 'COMPLETED', 0, 'FREE', 0, 'NONE', null, 8, 8, new Date()),
    ];
    tournamentRepository.findTournamentsByParticipantId.mockResolvedValue(tournaments);

    const result = await getTournamentHistoryUseCase.execute('user1');

    expect(result).toEqual(tournaments);
    expect(tournamentRepository.findTournamentsByParticipantId).toHaveBeenCalledWith('user1', undefined);
  });
});
