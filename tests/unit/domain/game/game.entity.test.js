const { Game } = require('../../../../src/domain/game/game.entity');
const { v4: uuidv4 } = require('uuid');

describe('Game Entity', () => {
  const now = new Date();
  const baseGameData = {
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
    createdAt: now,
    updatedAt: now,
  };

  describe('Constructor', () => {
    it('should create a Game instance with all provided fields', () => {
      const game = new Game(baseGameData);

      expect(game).toBeInstanceOf(Game);
      expect(game.id).toBe(baseGameData.id);
      expect(game.name).toBe(baseGameData.name);
      expect(game.shortName).toBe(baseGameData.shortName);
      expect(game.description).toBe(baseGameData.description);
      expect(game.iconUrl).toBe(baseGameData.iconUrl);
      expect(game.bannerUrl).toBe(baseGameData.bannerUrl);
      expect(game.platforms).toEqual(baseGameData.platforms);
      expect(game.supportedModes).toEqual(baseGameData.supportedModes);
      expect(game.isActive).toBe(baseGameData.isActive);
      expect(game.winCondition).toBe(baseGameData.winCondition);
      expect(game.createdAt).toEqual(baseGameData.createdAt);
      expect(game.updatedAt).toEqual(baseGameData.updatedAt);
    });

    it('should handle optional or missing fields gracefully (assigning undefined)', () => {
      const minimalData = {
        id: uuidv4(),
        name: 'Minimal Game',
        // Other fields are optional and might be undefined if not provided
      };
      const game = new Game(minimalData);
      expect(game.id).toBe(minimalData.id);
      expect(game.name).toBe(minimalData.name);
      expect(game.shortName).toBeUndefined();
      expect(game.description).toBeUndefined();
      expect(game.platforms).toBeUndefined(); // Arrays will be undefined
      expect(game.isActive).toBeUndefined(); // Booleans will be undefined
    });
  });

  describe('Static Factory Method: fromPersistence', () => {
    it('should create a Game instance from persistence data', () => {
      const persistedData = {
        ...baseGameData,
        id: uuidv4(), // Ensure different ID for this test data
        createdAt: new Date(now.getTime() - 100000), // Different date
        updatedAt: new Date(now.getTime() - 50000),  // Different date
      };
      const game = Game.fromPersistence(persistedData);

      expect(game).toBeInstanceOf(Game);
      expect(game.id).toBe(persistedData.id);
      expect(game.name).toBe(persistedData.name);
      expect(game.shortName).toBe(persistedData.shortName);
      expect(game.description).toBe(persistedData.description);
      expect(game.iconUrl).toBe(persistedData.iconUrl);
      expect(game.bannerUrl).toBe(persistedData.bannerUrl);
      expect(game.platforms).toEqual(persistedData.platforms);
      expect(game.supportedModes).toEqual(persistedData.supportedModes);
      expect(game.isActive).toBe(persistedData.isActive);
      expect(game.winCondition).toBe(persistedData.winCondition);
      expect(game.createdAt).toEqual(persistedData.createdAt);
      expect(game.updatedAt).toEqual(persistedData.updatedAt);
    });
  });

  describe('toPlainObject', () => {
    it('should return a plain object representation of the game', () => {
      const game = new Game(baseGameData);
      const plainObject = game.toPlainObject();

      expect(plainObject).toEqual({
        id: baseGameData.id,
        name: baseGameData.name,
        shortName: baseGameData.shortName,
        description: baseGameData.description,
        iconUrl: baseGameData.iconUrl,
        bannerUrl: baseGameData.bannerUrl,
        platforms: baseGameData.platforms,
        supportedModes: baseGameData.supportedModes,
        isActive: baseGameData.isActive,
        winCondition: baseGameData.winCondition,
        createdAt: baseGameData.createdAt,
        updatedAt: baseGameData.updatedAt,
      });
    });

    it('should include undefined fields in plain object if they were undefined in entity', () => {
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
        platforms: undefined,
        supportedModes: undefined,
        isActive: undefined,
        winCondition: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      });
    });
  });
});
