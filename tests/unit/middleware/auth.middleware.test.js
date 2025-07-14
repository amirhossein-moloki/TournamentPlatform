const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRole, authenticateSocketToken } = require('../../../src/middleware/auth.middleware');
const ApiError = require('../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');

const { appConfig } = require('../../../config/config'); // For JWT secret

jest.mock('../../../config/config', () => ({
  appConfig: {
    jwt: {
      secret: 'test-secret', // Use a fixed secret for tests
      expiresIn: '1h',
    },
  },
}));

const mockUserModel = {
  toDomainEntity: jest.fn((user) => user),
};

jest.mock('../../../src/infrastructure/database/repositories/postgres.user.repository', () => {
  return jest.fn().mockImplementation(() => {
    return {
      findByPk: jest.fn().mockResolvedValue({ id: 'user123', roles: ['PLAYER', 'ADMIN'] }),
    };
  });
});

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let nextSpy;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: null, // Ensure it's reset
    };
    mockRes = {}; // Not typically used by these middlewares directly for responses
    nextSpy = jest.fn();
  });

  describe('authenticateToken', () => {
    it('should call next() and set req.user if token is valid (with roles array)', async () => {
      const userPayload = { sub: 'user123', email: 'test@example.com', username: 'testuser', roles: ['PLAYER', 'ADMIN'] };
      const token = jwt.sign(userPayload, appConfig.jwt.secret, { expiresIn: '1h' });
      mockReq.headers['authorization'] = `Bearer ${token}`;

      await authenticateToken(mockReq, mockRes, nextSpy);

      expect(nextSpy).toHaveBeenCalledWith(); // No error
      expect(nextSpy).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe(userPayload.sub);
      expect(mockReq.user.roles).toEqual(userPayload.roles);
      expect(mockReq.user.username).toBe(userPayload.username);
    });

    it('should correctly convert single role string from old token to roles array in req.user', async () => {
        const userPayloadOldToken = { sub: 'user456', email: 'old@example.com', username: 'olduser', role: 'ADMIN' };
        const token = jwt.sign(userPayloadOldToken, appConfig.jwt.secret, { expiresIn: '1h' });
        mockReq.headers['authorization'] = `Bearer ${token}`;

        await authenticateToken(mockReq, mockRes, nextSpy);
        expect(nextSpy).toHaveBeenCalledWith();
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user.id).toBe(userPayloadOldToken.sub);
        expect(mockReq.user.roles).toEqual([userPayloadOldToken.role]); // Should be converted to array
    });

    it('should set req.user.roles to empty array if no roles or role field in token', async () => {
        const userPayloadNoRoles = { sub: 'user789', email: 'norole@example.com', username: 'noroleuser' };
        const token = jwt.sign(userPayloadNoRoles, appConfig.jwt.secret, { expiresIn: '1h' });
        mockReq.headers['authorization'] = `Bearer ${token}`;

        await authenticateToken(mockReq, mockRes, nextSpy);
        expect(nextSpy).toHaveBeenCalledWith();
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user.roles).toEqual([]);
    });


    it('should call next with ApiError if no token is provided', async () => {
      await authenticateToken(mockReq, mockRes, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith(expect.any(ApiError));
      expect(nextSpy.mock.calls[0][0].statusCode).toBe(httpStatusCodes.UNAUTHORIZED);
      expect(nextSpy.mock.calls[0][0].message).toBe('Access token is required.');
    });

    it('should call next with ApiError if token is expired', async () => {
      const userPayload = { sub: 'user123', roles: ['PLAYER'] };
      const expiredToken = jwt.sign(userPayload, appConfig.jwt.secret, { expiresIn: '0s' }); // Expires immediately
      mockReq.headers['authorization'] = `Bearer ${expiredToken}`;

      // Allow time for token to actually expire
      await new Promise(resolve => setTimeout(resolve, 50));

      await authenticateToken(mockReq, mockRes, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith(expect.any(ApiError));
      expect(nextSpy.mock.calls[0][0].statusCode).toBe(httpStatusCodes.UNAUTHORIZED);
      expect(nextSpy.mock.calls[0][0].message).toBe('Access token expired.');
    });

    it('should call next with ApiError if token is invalid', async () => {
      mockReq.headers['authorization'] = 'Bearer invalidtoken123';
      await authenticateToken(mockReq, mockRes, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith(expect.any(ApiError));
      expect(nextSpy.mock.calls[0][0].statusCode).toBe(httpStatusCodes.UNAUTHORIZED);
      expect(nextSpy.mock.calls[0][0].message).toBe('Invalid access token.');
    });
  });

  describe('authorizeRole', () => {
    it('should call next() if user has one of the allowed roles', () => {
      mockReq.user = { id: 'user123', roles: ['USER', 'EDITOR'] };
      const authorize = authorizeRole(['EDITOR', 'ADMIN']);
      authorize(mockReq, mockRes, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith();
      expect(nextSpy).toHaveBeenCalledTimes(1);
    });

    it('should call next() if user has multiple roles and one matches allowed roles', () => {
      mockReq.user = { id: 'user123', roles: ['PLAYER', 'TOURNAMENT_MANAGER'] };
      const authorize = authorizeRole(['ADMIN', 'TOURNAMENT_MANAGER']);
      authorize(mockReq, mockRes, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith();
    });

    it('should call next with ApiError if user roles do not include any allowed roles', () => {
      mockReq.user = { id: 'user123', roles: ['USER'] };
      const authorize = authorizeRole(['ADMIN', 'EDITOR']);
      authorize(mockReq, mockRes, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith(expect.any(ApiError));
      expect(nextSpy.mock.calls[0][0].statusCode).toBe(httpStatusCodes.FORBIDDEN);
      expect(nextSpy.mock.calls[0][0].message).toContain('Access denied.');
    });

    it('should call next with ApiError if req.user.roles is missing or empty', () => {
      mockReq.user = { id: 'user123', roles: [] }; // Empty roles
      const authorize = authorizeRole(['ADMIN']);
      authorize(mockReq, mockRes, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith(expect.any(ApiError));
      expect(nextSpy.mock.calls[0][0].statusCode).toBe(httpStatusCodes.FORBIDDEN);
      expect(nextSpy.mock.calls[0][0].message).toBe('User roles not available for authorization.');

      nextSpy.mockClear();
      mockReq.user = { id: 'user123' }; // Roles property missing
      authorize(mockReq, mockRes, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith(expect.any(ApiError));
      expect(nextSpy.mock.calls[0][0].statusCode).toBe(httpStatusCodes.FORBIDDEN);
      expect(nextSpy.mock.calls[0][0].message).toBe('User roles not available for authorization.');
    });
  });

  describe('authenticateSocketToken', () => {
    let mockSocket;

    beforeEach(() => {
      mockSocket = {
        handshake: {
          auth: {},
          headers: {}
        },
        user: null,
      };
      nextSpy.mockClear();
    });

    it('should call next() and set socket.user if token in auth is valid', async () => {
      const userPayload = { sub: 'socketuser1', email: 'socket@example.com', username: 'socketuser', roles: ['PLAYER'] };
      const token = jwt.sign(userPayload, appConfig.jwt.secret);
      mockSocket.handshake.auth.token = token;

      await authenticateSocketToken(mockSocket, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith();
      expect(mockSocket.user).toBeDefined();
      expect(mockSocket.user.id).toBe(userPayload.sub);
      expect(mockSocket.user.roles).toEqual(userPayload.roles);
    });

    it('should call next() and set socket.user if token in headers is valid', async () => {
      const userPayload = { sub: 'socketuser2', email: 'socket2@example.com', username: 'socketuser2', roles: ['PLAYER'] };
      const token = jwt.sign(userPayload, appConfig.jwt.secret);
      mockSocket.handshake.headers['x-access-token'] = token;

      await authenticateSocketToken(mockSocket, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith();
      expect(mockSocket.user).toBeDefined();
      expect(mockSocket.user.id).toBe(userPayload.sub);
      expect(mockSocket.user.roles).toEqual(userPayload.roles);
    });


    it('should convert single role string from old socket token to roles array', async () => {
        const userPayloadOldToken = { sub: 'socketuserOld', role: 'ADMIN' };
        const token = jwt.sign(userPayloadOldToken, appConfig.jwt.secret);
        mockSocket.handshake.auth.token = token;

        await authenticateSocketToken(mockSocket, nextSpy);
        expect(nextSpy).toHaveBeenCalledWith();
        expect(mockSocket.user).toBeDefined();
        expect(mockSocket.user.roles).toEqual(['ADMIN']);
    });

    it('should call next with Error if no token is provided for socket', async () => {
      await authenticateSocketToken(mockSocket, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(nextSpy.mock.calls[0][0].message).toBe('Authentication error: No token provided.');
    });

    it('should call next with Error if socket token is expired', async () => {
      const userPayload = { sub: 'socketuserExpired', roles: ['PLAYER'] };
      const expiredToken = jwt.sign(userPayload, appConfig.jwt.secret, { expiresIn: '0s' });
      mockSocket.handshake.auth.token = expiredToken;
      await new Promise(resolve => setTimeout(resolve, 50));

      await authenticateSocketToken(mockSocket, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(nextSpy.mock.calls[0][0].message).toBe('Authentication error: Token expired.');
    });

    it('should call next with Error if socket token is invalid', async () => {
      mockSocket.handshake.auth.token = 'invalidtoken';
      await authenticateSocketToken(mockSocket, nextSpy);
      expect(nextSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(nextSpy.mock.calls[0][0].message).toBe('Authentication error: Invalid token.');
    });
  });
});
