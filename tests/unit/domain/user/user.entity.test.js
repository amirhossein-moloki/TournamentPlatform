const { User } = require('../../../../src/domain/user/user.entity');
const { v4: uuidv4 } = require('uuid');

describe('User Entity', () => {
  const baseUserData = {
    id: uuidv4(),
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
  };

  describe('Constructor', () => {
    it('should create a user instance with required fields and defaults', () => {
      const user = new User(
        baseUserData.id,
        baseUserData.username,
        baseUserData.email,
        baseUserData.passwordHash
      );
      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe(baseUserData.id);
      expect(user.username).toBe(baseUserData.username);
      expect(user.email).toBe(baseUserData.email);
      expect(user.passwordHash).toBe(baseUserData.passwordHash);
      expect(user.role).toBe('User');
      expect(user.refreshToken).toBeNull();
      expect(user.isVerified).toBe(false);
      expect(user.lastLogin).toBeNull();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.verificationToken).toBeNull();
      expect(user.tokenVersion).toBe(0);
    });

    it('should allow overriding default fields', () => {
      const specificData = {
        ...baseUserData,
        role: 'Admin',
        isVerified: true,
        tokenVersion: 1,
      };
      const user = new User(
        specificData.id,
        specificData.username,
        specificData.email,
        specificData.passwordHash,
        specificData.role,
        'sometoken',
        specificData.isVerified,
        new Date(),
        new Date(),
        new Date(),
        'verifyMe',
        specificData.tokenVersion
      );
      expect(user.role).toBe('Admin');
      expect(user.isVerified).toBe(true);
      expect(user.refreshToken).toBe('sometoken');
      expect(user.verificationToken).toBe('verifyMe');
      expect(user.tokenVersion).toBe(1);
    });

    const requiredFields = ['id', 'username', 'email', 'passwordHash', 'role'];
    requiredFields.forEach(field => {
      it(`should throw an error if ${field} is missing`, () => {
        const data = { ...baseUserData };
        if (field === 'role') { // role has a default, so test providing null/empty
          expect(() => new User(data.id, data.username, data.email, data.passwordHash, null))
            .toThrow('User role is required.');
        } else {
          data[field] = null;
          const args = [data.id, data.username, data.email, data.passwordHash];
          if (field === 'id') args[0] = null;
          if (field === 'username') args[1] = null;
          if (field === 'email') args[2] = null;
          if (field === 'passwordHash') args[3] = null;

          let expectedMessage = `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`;
          if (field === 'id') {
            expectedMessage = 'User ID is required.';
          } else if (field === 'passwordHash') {
            expectedMessage = 'Password hash is required.';
          }
          expect(() => new User(...args)).toThrow(expectedMessage);
        }
      });
    });
  });

  describe('verifyEmail', () => {
    let user;
    beforeEach(() => {
      user = new User(
        baseUserData.id,
        baseUserData.username,
        baseUserData.email,
        baseUserData.passwordHash,
        'User', null, false, null, new Date(), new Date(), 'initialToken'
      );
    });

    it('should set isVerified to true and clear verificationToken', () => {
      const initialUpdatedAt = user.updatedAt;
      user.verifyEmail();
      expect(user.isVerified).toBe(true);
      expect(user.verificationToken).toBeNull();
      expect(user.updatedAt).not.toBe(initialUpdatedAt);
    });

    it('should not change updatedAt if already verified (and log warning)', () => {
      user.isVerified = true;
      user.verificationToken = null; // already verified state
      const initialUpdatedAt = user.updatedAt;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      user.verifyEmail();

      expect(user.isVerified).toBe(true); // Stays true
      expect(user.updatedAt).toBe(initialUpdatedAt); // Should not update time if no change
      expect(consoleWarnSpy).toHaveBeenCalledWith(`User ${user.email} is already verified.`);
      consoleWarnSpy.mockRestore();
    });
  });

  describe('updatePassword', () => {
    let user;
    beforeEach(() => {
      user = new User(baseUserData.id, baseUserData.username, baseUserData.email, baseUserData.passwordHash);
    });

    it('should update passwordHash, increment tokenVersion, and update updatedAt', () => {
      const newPasswordHash = 'newHashedPassword';
      const initialUpdatedAt = user.updatedAt;
      const initialTokenVersion = user.tokenVersion;

      user.updatePassword(newPasswordHash);

      expect(user.passwordHash).toBe(newPasswordHash);
      expect(user.tokenVersion).toBe(initialTokenVersion + 1);
      expect(user.updatedAt).not.toBe(initialUpdatedAt);
    });

    it('should throw an error if newPasswordHash is not provided', () => {
      expect(() => user.updatePassword(null)).toThrow('New password hash is required.');
      expect(() => user.updatePassword('')).toThrow('New password hash is required.');
    });
  });

  describe('updateRole', () => {
    let user;
    const allowedRoles = ['User', 'Admin', 'DisputeModerator', 'FinanceManager'];
    beforeEach(() => {
      user = new User(baseUserData.id, baseUserData.username, baseUserData.email, baseUserData.passwordHash);
    });

    it('should update role and updatedAt for a valid role', () => {
      const newRole = 'Admin';
      const initialUpdatedAt = user.updatedAt;
      user.updateRole(newRole, allowedRoles);
      expect(user.role).toBe(newRole);
      expect(user.updatedAt).not.toBe(initialUpdatedAt);
    });

    it('should throw an error for an invalid role', () => {
      const invalidRole = 'SuperUser';
      expect(() => user.updateRole(invalidRole, allowedRoles))
        .toThrow(`Invalid role: ${invalidRole}. Must be one of ${allowedRoles.join(', ')}.`);
    });

    it('should throw an error if newRole is not provided', () => {
      expect(() => user.updateRole(null, allowedRoles)).toThrow('Invalid role: null');
    });
  });

  describe('updateRefreshToken', () => {
    it('should update refreshToken and updatedAt', () => {
      const user = new User(baseUserData.id, baseUserData.username, baseUserData.email, baseUserData.passwordHash);
      const newRefreshToken = 'new-refresh-token';
      const initialUpdatedAt = user.updatedAt;

      user.updateRefreshToken(newRefreshToken);

      expect(user.refreshToken).toBe(newRefreshToken);
      expect(user.updatedAt).not.toBe(initialUpdatedAt);
    });

     it('should allow setting refreshToken to null', () => {
      const user = new User(baseUserData.id, baseUserData.username, baseUserData.email, baseUserData.passwordHash, 'User', 'old-token');
      const initialUpdatedAt = user.updatedAt;

      user.updateRefreshToken(null);

      expect(user.refreshToken).toBeNull();
      expect(user.updatedAt).not.toBe(initialUpdatedAt);
    });
  });

  describe('recordLogin', () => {
    it('should update lastLogin and updatedAt', () => {
      const user = new User(baseUserData.id, baseUserData.username, baseUserData.email, baseUserData.passwordHash);
      const initialUpdatedAt = user.updatedAt;
      const initialLastLogin = user.lastLogin;

      // Ensure time progresses for the test
      return new Promise(resolve => setTimeout(() => {
        user.recordLogin();
        expect(user.lastLogin).not.toBe(initialLastLogin);
        expect(user.lastLogin).toBeInstanceOf(Date);
        expect(user.updatedAt).not.toBe(initialUpdatedAt);
        expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
        expect(user.lastLogin.getTime()).toBeGreaterThanOrEqual(initialLastLogin ? initialLastLogin.getTime() : 0);
        resolve();
      }, 10));
    });
  });

  describe('incrementTokenVersion', () => {
    it('should increment tokenVersion and update updatedAt', () => {
      const user = new User(baseUserData.id, baseUserData.username, baseUserData.email, baseUserData.passwordHash);
      const initialTokenVersion = user.tokenVersion;
      const initialUpdatedAt = user.updatedAt;

      user.incrementTokenVersion();

      expect(user.tokenVersion).toBe(initialTokenVersion + 1);
      expect(user.updatedAt).not.toBe(initialUpdatedAt);
    });

     it('should increment tokenVersion from a non-zero starting point', () => {
      const user = new User(baseUserData.id, baseUserData.username, baseUserData.email, baseUserData.passwordHash, 'User', null, false, null, new Date(), new Date(), null, 5);
      expect(user.tokenVersion).toBe(5);
      user.incrementTokenVersion();
      expect(user.tokenVersion).toBe(6);
    });
  });

  describe('generateNewVerificationToken', () => {
    let user;
    const mockTokenGenerator = jest.fn();

    beforeEach(() => {
      user = new User(
        baseUserData.id,
        baseUserData.username,
        baseUserData.email,
        baseUserData.passwordHash,
        'User', null, true // Start as verified
      );
      mockTokenGenerator.mockClear();
    });

    it('should set a new verificationToken, set isVerified to false, and update updatedAt', () => {
      const newToken = 'newGeneratedToken';
      mockTokenGenerator.mockReturnValue(newToken);
      const initialUpdatedAt = user.updatedAt;

      const generatedToken = user.generateNewVerificationToken(mockTokenGenerator);

      expect(generatedToken).toBe(newToken);
      expect(user.verificationToken).toBe(newToken);
      expect(user.isVerified).toBe(false);
      expect(user.updatedAt).not.toBe(initialUpdatedAt);
      expect(mockTokenGenerator).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if tokenGenerator is not a function', () => {
      expect(() => user.generateNewVerificationToken('not-a-function'))
        .toThrow('A token generator function must be provided.');
    });
  });

  describe('hasRole', () => {
    const user = new User(baseUserData.id, baseUserData.username, baseUserData.email, baseUserData.passwordHash, 'Admin');

    it('should return true if user has the specified role', () => {
      expect(user.hasRole('Admin')).toBe(true);
    });

    it('should return false if user does not have the specified role', () => {
      expect(user.hasRole('User')).toBe(false);
    });
     it('should be case-sensitive', () => {
      expect(user.hasRole('admin')).toBe(false);
    });
  });

  describe('toPublicProfile', () => {
    it('should return a public representation of the user without sensitive fields', () => {
      const now = new Date();
      const user = new User(
        baseUserData.id,
        baseUserData.username,
        baseUserData.email,
        baseUserData.passwordHash,
        'User',
        'some-refresh-token',
        true,
        now,
        now,
        now,
        'some-verification-token',
        1
      );

      const publicProfile = user.toPublicProfile();

      expect(publicProfile).toEqual({
        id: baseUserData.id,
        username: baseUserData.username,
        email: baseUserData.email,
        role: 'User',
        isVerified: true,
        lastLogin: now,
      });

      expect(publicProfile.passwordHash).toBeUndefined();
      expect(publicProfile.refreshToken).toBeUndefined();
      expect(publicProfile.verificationToken).toBeUndefined();
      expect(publicProfile.tokenVersion).toBeUndefined();
    });
  });
});
