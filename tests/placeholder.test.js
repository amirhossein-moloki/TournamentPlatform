const { Tournament } = require('../src/domain/tournament/tournament.entity');

describe('Tournament Entity', () => {
  it('should create a tournament with valid data', () => {
    const tournament = new Tournament(
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      'Test Tournament',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      null,
      null,
      'PENDING',
      0,
      'FREE',
      0,
      'NONE',
      null,
      16,
      0,
      new Date(),
    );

    expect(tournament).toBeInstanceOf(Tournament);
  });

  it('should throw an error if id is missing', () => {
    expect(() => {
      new Tournament(
        null,
        'Test Tournament',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        null,
        null,
        'PENDING',
        0,
        'FREE',
        0,
        'NONE',
        null,
        16,
        0,
        new Date(),
      );
    }).toThrow('Tournament ID is required.');
  });
});
