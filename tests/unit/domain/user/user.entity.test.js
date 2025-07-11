const { User } = require('../../../../src/domain/user/user.entity');
const { v4: uuidv4 } = require('uuid');

// Helper function to introduce a slight delay for time-sensitive tests
const tick = (ms = 1) => new Promise(resolve => setTimeout(resolve, ms));

describe('User Entity', () => {
  let baseUserId;
  let now;

  beforeEach(() => {
    baseUserId = uuidv4();
    now = new Date();
  });

  const createBaseUser = (overrides = {}) => {
    const defaults = {
      id: baseUserId,
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      roles: [User.UserRoles.PLAYER],
      refreshToken: null,
      isVerified: false,
      lastLogin: null,
      createdAt: now, // Use 'now' from beforeEach
      updatedAt: now, // Use 'now' from beforeEach
      verificationToken: null,
      tokenVersion: 0,
    };
    const data = { ...defaults, ...overrides };
    return new User(
      data.id,
      data.username,
      data.email,
      data.passwordHash,
      data.roles,
      data.refreshToken,
      data.isVerified,
      data.lastLogin,
      data.createdAt,
      data.updatedAt,
      data.verificationToken,
      data.tokenVersion
    );
  };


  describe('Constructor', () => {
    it('should create a user instance with required fields and defaults', () => {
      const user = new User(
        baseUserId,
        'testuser',
        'test@example.com',
        'hashedpassword'
      );
      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe(baseUserId);
      expect(user.roles).toEqual([User.UserRoles.PLAYER]);
      // ... other assertions from previous version
    });

    it('should allow overriding default fields', () => {
      const specificRoles = [User.UserRoles.ADMIN, User.UserRoles.TOURNAMENT_MANAGER];
      const lastLoginDate = new Date();
      const creationDate = new Date(Date.now() - 100000);
      const user = new User(
        baseUserId,
        'specificuser',
        'specific@example.com',
        'specificHash',
        specificRoles,
        'sometoken',
        true,
        lastLoginDate,
        creationDate,
        creationDate,
        'verifyMe',
        1
      );
      expect(user.roles).toEqual(specificRoles);
      // ... other assertions
    });

    const requiredFieldsForConstructor = ['id', 'username', 'email', 'passwordHash'];
    requiredFieldsForConstructor.forEach(field => {
      it(`should throw an error if ${field} is missing from constructor`, () => {
        const data = {
          id: baseUserId, username: 'testuser', email: 'test@example.com', passwordHash: 'hashedpassword',
        };
        data[field] = null;
        let expectedMessage = `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`;
        if (field === 'id') expectedMessage = 'User ID is required.';
        if (field === 'passwordHash') expectedMessage = 'Password hash is required.';
        expect(() => new User(data.id, data.username, data.email, data.passwordHash)).toThrow(expectedMessage);
      });
    });

    it('should throw an error if roles is null or an empty array in constructor', () => {
      expect(() => new User(baseUserId, 'u', 'e@e.com', 'p', null))
        .toThrow('User roles are required and must be a non-empty array.');
      expect(() => new User(baseUserId, 'u', 'e@e.com', 'p', []))
        .toThrow('User roles are required and must be a non-empty array.');
    });

    it('should throw an error if roles array contains invalid roles in constructor', () => {
      expect(() => new User(baseUserId, 'u', 'e@e.com', 'p', [User.UserRoles.PLAYER, 'INVALID_ROLE']))
        .toThrow(`Invalid role(s) provided: INVALID_ROLE. Must be one of ${Object.values(User.UserRoles).join(', ')}.`);
    });
  });

  describe('verifyEmail', () => {
    let user;
    beforeEach(() => {
      user = createBaseUser({ isVerified: false, verificationToken: 'initialToken' });
    });

    it('should set isVerified to true, clear verificationToken and update updatedAt', async () => {
      const initialUpdatedAt = user.updatedAt;
      await tick();
      user.verifyEmail();
      expect(user.isVerified).toBe(true);
      expect(user.verificationToken).toBeNull();
      expect(user.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    it('should not change updatedAt if already verified', () => {
      user.isVerified = true;
      user.verificationToken = null;
      const initialUpdatedAt = user.updatedAt;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      user.verifyEmail();
      expect(user.updatedAt.getTime()).toEqual(initialUpdatedAt.getTime());
      expect(consoleWarnSpy).toHaveBeenCalledWith(`User ${user.email} is already verified.`);
      consoleWarnSpy.mockRestore();
    });
  });

  describe('updatePassword', () => {
    let user;
    beforeEach(() => {
      user = createBaseUser();
    });

    it('should update passwordHash, increment tokenVersion, and update updatedAt', async () => {
      const newPasswordHash = 'newHashedPassword';
      const initialUpdatedAt = user.updatedAt;
      const initialTokenVersion = user.tokenVersion;
      await tick();
      user.updatePassword(newPasswordHash);
      expect(user.passwordHash).toBe(newPasswordHash);
      expect(user.tokenVersion).toBe(initialTokenVersion + 1);
      expect(user.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    it('should throw an error if newPasswordHash is not provided', () => {
      expect(() => user.updatePassword(null)).toThrow('New password hash is required.');
    });
  });

  describe('updateRoles', () => {
    let user;
    const allRoles = Object.values(User.UserRoles);
    beforeEach(() => {
      user = createBaseUser({ roles: [User.UserRoles.PLAYER] });
    });

    it('should update roles and updatedAt for valid new roles', async () => {
      const newRoles = [User.UserRoles.ADMIN, User.UserRoles.TOURNAMENT_MANAGER];
      const initialUpdatedAt = user.updatedAt;
      await tick();
      user.updateRoles(newRoles, allRoles);
      expect(user.roles).toEqual(expect.arrayContaining(newRoles));
      expect(user.roles.length).toBe(newRoles.length);
      expect(user.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });
    // ... other updateRoles tests
     it('should throw an error for invalid roles in newRoles array', () => {
      const invalidNewRoles = [User.UserRoles.PLAYER, 'INVALID_ROLE'];
      expect(() => user.updateRoles(invalidNewRoles, allRoles))
        .toThrow(`Invalid role(s): INVALID_ROLE. Must be one of ${allRoles.join(', ')}.`);
    });

    it('should throw an error if newRoles is empty or not provided', () => {
      expect(() => user.updateRoles(null, allRoles)).toThrow('New roles are required and must be a non-empty array.');
      expect(() => user.updateRoles([], allRoles)).toThrow('New roles are required and must be a non-empty array.');
    });
  });

  describe('addRole and removeRole', () => {
    let user;
    beforeEach(() => {
      user = createBaseUser({ roles: [User.UserRoles.PLAYER] });
    });

    it('addRole should add a new role and update updatedAt if not present', async () => {
      const initialUpdatedAt = user.updatedAt;
      await tick();
      user.addRole(User.UserRoles.ADMIN);
      expect(user.roles).toContain(User.UserRoles.ADMIN);
      expect(user.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    it('addRole should not add a role or update updatedAt if already present', () => {
      user.addRole(User.UserRoles.PLAYER); // Role already present by default
      const initialUpdatedAt = user.updatedAt;
      user.addRole(User.UserRoles.PLAYER); // Try adding again
      expect(user.roles).toEqual([User.UserRoles.PLAYER]);
      expect(user.updatedAt.getTime()).toEqual(initialUpdatedAt.getTime());
    });

    it('addRole should throw for an invalid role', () => {
      expect(() => user.addRole('FAKE_ROLE')).toThrow('Invalid role: FAKE_ROLE');
    });

    it('removeRole should remove an existing role and update updatedAt', async () => {
      user.addRole(User.UserRoles.ADMIN); // Now roles: [PLAYER, ADMIN]
      await tick(); // Ensure addRole's updatedAt is processed
      const initialUpdatedAt = user.updatedAt;
      await tick();
      user.removeRole(User.UserRoles.ADMIN);
      expect(user.roles).toEqual([User.UserRoles.PLAYER]);
      expect(user.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    it('removeRole should not change roles or updatedAt if role to remove is not present', () => {
      const initialUpdatedAt = user.updatedAt;
      user.removeRole(User.UserRoles.ADMIN); // ADMIN is not there
      expect(user.roles).toEqual([User.UserRoles.PLAYER]);
      expect(user.updatedAt.getTime()).toEqual(initialUpdatedAt.getTime());
    });
    // ... other addRole/removeRole tests
    it('removeRole should throw if trying to remove the last PLAYER role', () => {
      expect(() => user.removeRole(User.UserRoles.PLAYER))
        .toThrow(`Cannot remove the last role '${User.UserRoles.PLAYER}'. User must have at least one role.`);
    });
     it('removeRole should ensure PLAYER role if all other roles are removed', async () => {
      user.updateRoles([User.UserRoles.PLAYER, User.UserRoles.ADMIN, User.UserRoles.MODERATOR]);
      await tick();
      user.removeRole(User.UserRoles.ADMIN);
      await tick();
      user.removeRole(User.UserRoles.MODERATOR);
      expect(user.roles).toEqual([User.UserRoles.PLAYER]);
      expect(() => user.removeRole(User.UserRoles.PLAYER))
        .toThrow(`Cannot remove the last role '${User.UserRoles.PLAYER}'. User must have at least one role.`);
    });
  });

  describe('hasRole', () => {
    it('should return true if user has the specified role', () => {
      const userWithRoles = createBaseUser({ roles: [User.UserRoles.ADMIN, User.UserRoles.PLAYER] });
      expect(userWithRoles.hasRole(User.UserRoles.ADMIN)).toBe(true);
      expect(userWithRoles.hasRole(User.UserRoles.PLAYER)).toBe(true);
    });
    it('should return false if user does not have the specified role', () => {
      const userWithRoles = createBaseUser({ roles: [User.UserRoles.ADMIN, User.UserRoles.PLAYER] });
      expect(userWithRoles.hasRole(User.UserRoles.MODERATOR)).toBe(false);
    });
  });

  describe('toPublicProfile', () => {
    // ... toPublicProfile tests remain the same
     it('should return a public representation of the user with roles array', () => {
      const specificTime = new Date();
      const userRoles = [User.UserRoles.PLAYER, User.UserRoles.TOURNAMENT_SUPPORT];
      const user = createBaseUser({
        roles: userRoles,
        isVerified: true,
        lastLogin: specificTime,
      });
      const publicProfile = user.toPublicProfile();
      expect(publicProfile.roles).toEqual(userRoles);
      expect(publicProfile.lastLogin).toEqual(specificTime);
    });
  });

  describe('updateRefreshToken', () => {
    it('should update refreshToken and updatedAt', async () => {
      const user = createBaseUser();
      const newRefreshToken = 'new-refresh-token';
      const initialUpdatedAt = user.updatedAt;
      await tick();
      user.updateRefreshToken(newRefreshToken);
      expect(user.refreshToken).toBe(newRefreshToken);
      expect(user.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });
  });

  describe('recordLogin', () => {
    it('should update lastLogin and updatedAt', async () => {
      const user = createBaseUser({ lastLogin: new Date(Date.now() - 20000) }); // ensure lastLogin is different
      const initialUpdatedAt = user.updatedAt;
      const initialLastLogin = user.lastLogin;
      await tick(20); // Ensure enough time passes for a distinct Date object
      user.recordLogin();
      expect(user.lastLogin.getTime()).toBeGreaterThan(initialLastLogin.getTime());
      expect(user.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });
  });

  describe('incrementTokenVersion', () => {
    it('should increment tokenVersion and update updatedAt', async () => {
      const user = createBaseUser({ tokenVersion: 5 });
      const initialTokenVersion = user.tokenVersion;
      const initialUpdatedAt = user.updatedAt;
      await tick();
      user.incrementTokenVersion();
      expect(user.tokenVersion).toBe(initialTokenVersion + 1);
      expect(user.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });
  });

  describe('generateNewVerificationToken', () => {
    it('should set a new token, set isVerified to false, and update updatedAt', async () => {
      const user = createBaseUser({ isVerified: true });
      const mockTokenGenerator = jest.fn().mockReturnValue('newToken123');
      const initialUpdatedAt = user.updatedAt;
      await tick();
      user.generateNewVerificationToken(mockTokenGenerator);
      expect(user.verificationToken).toBe('newToken123');
      expect(user.isVerified).toBe(false);
      expect(user.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    it('should throw an error if tokenGenerator is not a function', () => {
      const user = createBaseUser();
      expect(() => user.generateNewVerificationToken('not-a-function'))
        .toThrow('A token generator function must be provided.');
    });
  });
});
