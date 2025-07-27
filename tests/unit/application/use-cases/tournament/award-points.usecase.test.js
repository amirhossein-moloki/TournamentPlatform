const { AwardPointsUseCase } = require('../../../../../src/application/use-cases/tournament/award-points.usecase');
const { Tournament } = require('../../../../../src/domain/tournament/tournament.entity');
const { User } = require('../../../../../src/domain/user/user.entity');

describe('AwardPointsUseCase', () => {
  let userRepository;
  let tournamentRepository;
  let rankService;
  let awardPointsUseCase;

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    tournamentRepository = {
      findById: jest.fn(),
    };
    rankService = {
      addPoints: jest.fn(),
    };
    awardPointsUseCase = new AwardPointsUseCase(userRepository, tournamentRepository, rankService);
  });

  it('should award points to the top players', async () => {
    const tournament = new Tournament('1', 'Test Tournament', 'game1', 'description', 'rules', 'COMPLETED', 0, 'FREE', 0, 'NONE', null, 8, 8, new Date());
    tournamentRepository.findById.mockResolvedValue(tournament);

    const results = [
      { userId: '1', points: 10 },
      { userId: '2', points: 5 },
    ];

    await awardPointsUseCase.execute('1', results);

    expect(rankService.addPoints).toHaveBeenCalledWith('1', 10);
    expect(rankService.addPoints).toHaveBeenCalledWith('2', 5);
  });
});
