const { Game } = require('../../../../src/domain/game/game.entity');
const { v4: uuidv4 } = require('uuid');

// Helper function to introduce a slight delay for time-sensitive tests
const tick = (ms = 1) => new Promise(resolve => setTimeout(resolve, ms));

describe('Game Entity', () => {
  let now; // Will be set in beforeEach for fresh dates

  beforeEach(() => {
    now = new Date();
  });

  const getBaseGameData = () => ({
    id: uuidv4(),
    name: 'Awesome Game',
    shortName: 'AG',
    description: 'The most awesome game ever.',
    iconUrl: 'http://example.com/icon.png',
    bannerUrl: 'http://example.com/banner.jpg',
    platforms: ['PC', 'PlayStation'],
    supportedModes: ['1v1', 'Team Deathmatch'],
    isActive: true,
    winCondition: 'higher_score_wins',
    tournament_managers: [uuidv4()],
    tournament_supports: [uuidv4(), uuidv4()],
    createdAt: now,
    updatedAt: now,
  });

  describe('Constructor', () => {
    it('should create a Game instance with all provided fields', () => {
      const baseData = getBaseGameData();
      const game = new Game(baseData);

      expect(game).toBeInstanceOf(Game);
      expect(game.id).toBe(baseData.id);
      expect(game.name).toBe(baseData.name);
      // ... (other fields)
      expect(game.tournament_managers).toEqual(baseData.tournament_managers);
      expect(game.tournament_supports).toEqual(baseData.tournament_supports);
      expect(game.createdAt.getTime()).toBeCloseTo(baseData.createdAt.getTime());
      expect(game.updatedAt.getTime()).toBeCloseTo(baseData.updatedAt.getTime());
    });

    it('should handle optional or missing fields gracefully with defaults', () => {
      const minimalData = {
        id: uuidv4(),
        name: 'Minimal Game',
      };
      const game = new Game(minimalData);
      expect(game.platforms).toEqual([]);
      expect(game.supportedModes).toEqual([]);
      expect(game.isActive).toBe(true);
      expect(game.tournament_managers).toEqual([]);
      expect(game.tournament_supports).toEqual([]);
      expect(game.createdAt).toBeInstanceOf(Date);
      expect(game.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw an error if id is missing', () => {
      expect(() => new Game({ name: 'No ID Game' })).toThrow('Game ID is required.');
    });

    it('should throw an error if name is missing', () => {
      expect(() => new Game({ id: uuidv4() })).toThrow('Game name is required.');
    });
  });

  describe('Static Factory Method: fromPersistence', () => {
    it('should create a Game instance from persistence data', () => {
      const baseData = getBaseGameData();
      const persistedData = {
        ...baseData,
        id: uuidv4(),
        createdAt: new Date(now.getTime() - 100000).toISOString(), // Use ISO string for created_at
        updatedAt: new Date(now.getTime() - 50000).toISOString(), // Use ISO string for updated_at
        tournament_managers: [uuidv4()],
        tournament_supports: [],
      };
      const game = Game.fromPersistence(persistedData);

      expect(game).toBeInstanceOf(Game);
      expect(game.id).toBe(persistedData.id);
      expect(game.name).toBe(persistedData.name);
      expect(game.tournament_managers).toEqual(persistedData.tournament_managers);
      expect(game.tournament_supports).toEqual(persistedData.tournament_supports);
      expect(game.createdAt.toISOString()).toEqual(persistedData.createdAt); // Compare ISO strings
      expect(game.updatedAt.toISOString()).toEqual(persistedData.updatedAt); // Compare ISO strings
    });
  });

  describe('toPlainObject', () => {
    it('should return a plain object representation of the game including new fields', () => {
      const baseData = getBaseGameData();
      const game = new Game(baseData);
      const plainObject = game.toPlainObject();
      const expectedPlainObject = {
        ...baseData,
        platforms: [...baseData.platforms],
        supportedModes: [...baseData.supportedModes],
        tournament_managers: [...baseData.tournament_managers],
        tournament_supports: [...baseData.tournament_supports],
        createdAt: baseData.createdAt,
        updatedAt: baseData.updatedAt,
      };
      expect(plainObject).toEqual(expectedPlainObject);
    });

    it('should include default fields in plain object for minimal construction', () => {
      const minimalData = { id: uuidv4(), name: 'Minimal Game' };
      const game = new Game(minimalData);
      const plainObject = game.toPlainObject();
      expect(plainObject).toEqual({
        id: minimalData.id,
        name: minimalData.name,
        shortName: undefined,
        description: undefined,
        iconUrl: undefined,
        bannerUrl: undefined,
        platforms: [],
        supportedModes: [],
        isActive: true,
        winCondition: undefined,
        tournament_managers: [],
        tournament_supports: [],
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
      });
    });
  });

  describe('Tournament Manager/Support Management', () => {
    let game;
    const managerId1 = uuidv4();
    const managerId2 = uuidv4();
    const supportId1 = uuidv4();
    const supportId2 = uuidv4();

    beforeEach(() => {
      game = new Game({ id: uuidv4(), name: 'Test Game for Roles' });
    });

    it('addTournamentManager should add a manager ID and update updatedAt', async () => {
      const initialUpdatedAt = game.updatedAt;
      await tick(); // Ensure time progresses
      game.addTournamentManager(managerId1);
      expect(game.tournament_managers).toContain(managerId1);
      expect(game.isTournamentManager(managerId1)).toBe(true);
      expect(game.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    it('addTournamentManager should not add duplicate manager ID or update updatedAt', () => {
      game.addTournamentManager(managerId1);
      const firstUpdatedAt = game.updatedAt;
      game.addTournamentManager(managerId1);
      expect(game.tournament_managers).toEqual([managerId1]);
      expect(game.updatedAt.getTime()).toEqual(firstUpdatedAt.getTime());
    });

    it('removeTournamentManager should remove an existing manager ID and update updatedAt', async () => {
      game.addTournamentManager(managerId1);
      game.addTournamentManager(managerId2);
      await tick();
      const initialUpdatedAt = game.updatedAt;
      await tick();
      game.removeTournamentManager(managerId1);
      expect(game.tournament_managers).not.toContain(managerId1);
      expect(game.tournament_managers).toContain(managerId2);
      expect(game.isTournamentManager(managerId1)).toBe(false);
      expect(game.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    it('removeTournamentManager should do nothing and not update updatedAt if manager ID not found', () => {
      game.addTournamentManager(managerId1);
      const initialUpdatedAt = game.updatedAt;
      game.removeTournamentManager(managerId2);
      expect(game.tournament_managers).toEqual([managerId1]);
      expect(game.updatedAt.getTime()).toEqual(initialUpdatedAt.getTime());
    });

    it('addTournamentSupport should add a support ID and update updatedAt', async () => {
      const initialUpdatedAt = game.updatedAt;
      await tick();
      game.addTournamentSupport(supportId1);
      expect(game.tournament_supports).toContain(supportId1);
      expect(game.isTournamentSupport(supportId1)).toBe(true);
      expect(game.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    it('addTournamentSupport should not add duplicate support ID or update updatedAt', () => {
      game.addTournamentSupport(supportId1);
      const firstUpdatedAt = game.updatedAt;
      game.addTournamentSupport(supportId1);
      expect(game.tournament_supports).toEqual([supportId1]);
      expect(game.updatedAt.getTime()).toEqual(firstUpdatedAt.getTime());
    });

    it('removeTournamentSupport should remove an existing support ID and update updatedAt', async () => {
      game.addTournamentSupport(supportId1);
      game.addTournamentSupport(supportId2);
      await tick();
      const initialUpdatedAt = game.updatedAt;
      await tick();
      game.removeTournamentSupport(supportId1);
      expect(game.tournament_supports).not.toContain(supportId1);
      expect(game.tournament_supports).toContain(supportId2);
      expect(game.isTournamentSupport(supportId1)).toBe(false);
      expect(game.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    it('removeTournamentSupport should do nothing and not update updatedAt if support ID not found', () => {
      game.addTournamentSupport(supportId1);
      const initialUpdatedAt = game.updatedAt;
      game.removeTournamentSupport(supportId2);
      expect(game.tournament_supports).toEqual([supportId1]);
      expect(game.updatedAt.getTime()).toEqual(initialUpdatedAt.getTime());
    });
  });

  describe('updateDetails', () => {
    let game;
    beforeEach(() => {
      game = new Game({ id: uuidv4(), name: 'Initial Game Name', platforms: ['OldPlatform'] });
    });

    it('should update basic details and updatedAt', async () => {
      const initialUpdatedAt = game.updatedAt;
      const updates = {
        name: 'Updated Game Name',
        description: 'New description',
        isActive: false,
      };
      await tick();
      game.updateDetails(updates);
      expect(game.name).toBe(updates.name);
      expect(game.description).toBe(updates.description);
      expect(game.isActive).toBe(updates.isActive);
      expect(game.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    it('should update array details like platforms and supportedModes, ensuring uniqueness and update updatedAt', async () => {
        const initialUpdatedAt = game.updatedAt;
        await tick();
        game.updateDetails({ platforms: ['PC', 'PC', 'Xbox']});
        expect(game.platforms).toEqual(['PC', 'Xbox']);
        expect(game.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());

        const secondUpdateAt = game.updatedAt;
        await tick();
        game.updateDetails({ supportedModes: ['1v1', '2v2', '1v1']});
        expect(game.supportedModes).toEqual(['1v1', '2v2']);
        expect(game.updatedAt.getTime()).toBeGreaterThan(secondUpdateAt.getTime());
    });

    it('should not update tournament_managers or tournament_supports via updateDetails by default', async () => {
        const initialManagers = [...game.tournament_managers];
        const initialSupports = [...game.tournament_supports];
        const initialUpdatedAt = game.updatedAt;
        await tick();
        game.updateDetails({ tournament_managers: [uuidv4()], tournament_supports: [uuidv4()], name: 'Another Name' });
        expect(game.tournament_managers).toEqual(initialManagers);
        expect(game.tournament_supports).toEqual(initialSupports);
        expect(game.name).toBe('Another Name');
        expect(game.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });
  });
});
