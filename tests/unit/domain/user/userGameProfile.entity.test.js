const { UserGameProfile } = require('../../../../src/domain/user/userGameProfile.entity');
const { v4: uuidv4 } = require('uuid');

describe('UserGameProfile Entity', () => {
  const now = new Date();
  const baseProfileData = {
    id: uuidv4(),
    userId: uuidv4(),
    gameId: uuidv4(),
    inGameName: 'PlayerOne',
    createdAt: now,
    updatedAt: now,
  };

  // The method updateInGameName is now part of the actual entity.

  describe('Constructor', () => {
    it('should create a UserGameProfile instance with all provided fields', () => {
      const profile = new UserGameProfile(baseProfileData);

      expect(profile).toBeInstanceOf(UserGameProfile);
      expect(profile.id).toBe(baseProfileData.id);
      expect(profile.userId).toBe(baseProfileData.userId);
      expect(profile.gameId).toBe(baseProfileData.gameId);
      expect(profile.inGameName).toBe(baseProfileData.inGameName);
      expect(profile.createdAt).toEqual(baseProfileData.createdAt);
      expect(profile.updatedAt).toEqual(baseProfileData.updatedAt);
    });

    it('should handle optional or missing fields gracefully (assigning undefined)', () => {
      const minimalData = {
        id: uuidv4(),
        userId: uuidv4(),
        gameId: uuidv4(),
        // inGameName, createdAt, updatedAt are optional for constructor if not provided
      };
      const profile = new UserGameProfile(minimalData);
      expect(profile.id).toBe(minimalData.id);
      expect(profile.userId).toBe(minimalData.userId);
      expect(profile.gameId).toBe(minimalData.gameId);
      expect(profile.inGameName).toBeUndefined();
      expect(profile.createdAt).toBeUndefined();
      expect(profile.updatedAt).toBeUndefined();
    });
  });

  describe('Static Factory Method: fromPersistence', () => {
    it('should create a UserGameProfile instance from persistence data', () => {
      const persistedData = {
        ...baseProfileData,
        id: uuidv4(),
        createdAt: new Date(now.getTime() - 100000),
        updatedAt: new Date(now.getTime() - 50000),
      };
      const profile = UserGameProfile.fromPersistence(persistedData);

      expect(profile).toBeInstanceOf(UserGameProfile);
      expect(profile.id).toBe(persistedData.id);
      expect(profile.userId).toBe(persistedData.userId);
      expect(profile.gameId).toBe(persistedData.gameId);
      expect(profile.inGameName).toBe(persistedData.inGameName);
      expect(profile.createdAt).toEqual(persistedData.createdAt);
      expect(profile.updatedAt).toEqual(persistedData.updatedAt);
    });
  });

  describe('toPlainObject', () => {
    it('should return a plain object representation of the profile', () => {
      const profile = new UserGameProfile(baseProfileData);
      const plainObject = profile.toPlainObject();

      expect(plainObject).toEqual({
        id: baseProfileData.id,
        userId: baseProfileData.userId,
        gameId: baseProfileData.gameId,
        inGameName: baseProfileData.inGameName,
        createdAt: baseProfileData.createdAt,
        updatedAt: baseProfileData.updatedAt,
      });
    });

    it('should include undefined fields in plain object if they were undefined in entity', () => {
      const minimalData = { id: uuidv4(), userId: uuidv4(), gameId: uuidv4() };
      const profile = new UserGameProfile(minimalData);
      const plainObject = profile.toPlainObject();

      expect(plainObject).toEqual({
        id: minimalData.id,
        userId: minimalData.userId,
        gameId: minimalData.gameId,
        inGameName: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      });
    });
  });

  describe('updateInGameName', () => {
    let profile;
    beforeEach(() => {
      profile = new UserGameProfile(baseProfileData);
    });

    it('should update inGameName and updatedAt', () => {
      const newName = 'PlayerTwo';
      const initialUpdatedAt = profile.updatedAt;

      // Ensure a slight delay for updatedAt comparison if tests run too fast
      return new Promise(resolve => setTimeout(() => {
        profile.updateInGameName(newName);
        expect(profile.inGameName).toBe(newName);
        expect(profile.updatedAt).not.toBe(initialUpdatedAt);
        expect(profile.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
        resolve();
      }, 5));
    });

    it('should throw an error if newName is empty', () => {
      expect(() => profile.updateInGameName('')).toThrow('In-game name cannot be empty.');
      expect(() => profile.updateInGameName('   ')).toThrow('In-game name cannot be empty.');
    });

    it('should throw an error if newName is null or undefined', () => {
      expect(() => profile.updateInGameName(null)).toThrow('In-game name cannot be empty.');
      expect(() => profile.updateInGameName(undefined)).toThrow('In-game name cannot be empty.');
    });

    it('should throw an error if newName is too long (over 100 characters)', () => {
      const longName = 'a'.repeat(101);
      expect(() => profile.updateInGameName(longName)).toThrow('In-game name is too long.');
    });

    it('should allow names up to 100 characters', () => {
      const validLongName = 'b'.repeat(100);
      expect(() => profile.updateInGameName(validLongName)).not.toThrow();
      expect(profile.inGameName).toBe(validLongName);
    });
  });
});
