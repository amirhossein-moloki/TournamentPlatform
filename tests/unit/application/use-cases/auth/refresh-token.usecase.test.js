const RefreshTokenUseCase = require('../../../../../src/application/use-cases/auth/refresh-token.usecase');
const { User } = require('../../../../../src/domain/user/user.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const jwt = require('jsonwebtoken');
const { appConfig } = require('../../../../../config/config');

describe('RefreshTokenUseCase', () => {
  let refreshTokenUseCase;
  let mockUserRepository;

  beforeEach(() => {
    mockUserRepository = {
      findByRefreshToken: jest.fn(),
    };
    refreshTokenUseCase = new RefreshTokenUseCase(mockUserRepository);
  });

  it('should return a new access token for a valid refresh token', async () => {
    const user = new User('1', 'testuser', 'test@example.com', 'hashedpassword', ['PLAYER'], 'valid-refresh-token');
    const refreshToken = 'valid-refresh-token';
    mockUserRepository.findByRefreshToken.mockResolvedValue(user);

    const result = await refreshTokenUseCase.execute(refreshToken);

    expect(mockUserRepository.findByRefreshToken).toHaveBeenCalledWith(refreshToken);
    expect(result).toHaveProperty('accessToken');
    const decoded = jwt.verify(result.accessToken, appConfig.jwt.secret);
    expect(decoded.sub).toBe(user.id);
  });

  it('should throw an ApiError if the refresh token is not provided', async () => {
    await expect(refreshTokenUseCase.execute(null)).rejects.toThrow(new ApiError(httpStatusCodes.UNAUTHORIZED, 'Refresh token is required.'));
  });

  it('should throw an ApiError if the refresh token is invalid', async () => {
    const refreshToken = 'invalid-refresh-token';
    mockUserRepository.findByRefreshToken.mockResolvedValue(null);

    await expect(refreshTokenUseCase.execute(refreshToken)).rejects.toThrow(new ApiError(httpStatusCodes.UNAUTHORIZED, 'Refresh token not recognized or has been invalidated.'));
  });

  it('should throw an ApiError if the refresh token is expired', async () => {
    const refreshToken = jwt.sign({ sub: '1' }, appConfig.jwt.secret, { expiresIn: '0s' });

    await new Promise(resolve => setTimeout(resolve, 10));

    await expect(refreshTokenUseCase.execute(refreshToken)).rejects.toThrow(new ApiError(httpStatusCodes.UNAUTHORIZED, 'Refresh token expired.'));
  });
});
