const GetUserProfileUseCase = require('../../../../../src/application/use-cases/user/get-user-profile.usecase');
const { User } = require('../../../../../src/domain/user/user.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { createUser, faker } = require('../../../../utils/factories');

// Mock UserRepository
const mockUserRepository = {
  findById: jest.fn(),
};

describe('GetUserProfileUseCase', () => {
  let getUserProfileUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    getUserProfileUseCase = new GetUserProfileUseCase(mockUserRepository);
  });

  it('should return user public profile if user found', async () => {
    const userId = faker.string.uuid();
    // Create a full user entity instance using the factory
    const userEntity = createUser({
      id: userId,
      passwordHash: 'hashedpassword',
    });
    mockUserRepository.findById.mockResolvedValue(userEntity);

    const result = await getUserProfileUseCase.execute(userId);

    expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    // Expect the use case to return the full user entity
    expect(result).toBe(userEntity);

    // Verify that calling toPublicProfile on the result excludes sensitive data
    const publicProfile = result.toPublicProfile();
    expect(publicProfile.id).toBe(userId);
    expect(publicProfile.username).toBe(userEntity.username);
    expect(publicProfile.passwordHash).toBeUndefined();
    expect(publicProfile.refreshToken).toBeUndefined(); // Assuming these are sensitive
    expect(publicProfile.verificationToken).toBeUndefined();
    expect(publicProfile.tokenVersion).toBeUndefined();
  });

  it('should throw ApiError if userId is not provided', async () => {
    await expect(getUserProfileUseCase.execute(null))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID is required.'));
  });

  it('should throw ApiError if user not found', async () => {
    const userId = faker.string.uuid();
    mockUserRepository.findById.mockResolvedValue(null); // Simulate user not found

    await expect(getUserProfileUseCase.execute(userId))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, `User with ID ${userId} not found.`));
  });

  it('should throw ApiError if repository throws an unexpected error', async () => {
    const userId = faker.string.uuid();
    const errorMessage = 'Database error';
    mockUserRepository.findById.mockRejectedValue(new Error(errorMessage));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await getUserProfileUseCase.execute(userId);
      // eslint-disable-next-line no-undef
      fail('Expected GetUserProfileUseCase.execute to throw an error');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('Failed to retrieve user profile.');
      expect(error.statusCode).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching user profile by ID:', expect.any(Error));
    }
    consoleErrorSpy.mockRestore();
  });

  it('should throw an error if UserRepository is not provided or invalid', () => {
    expect(() => new GetUserProfileUseCase(null))
      .toThrow('GetUserProfileUseCase requires a valid userRepository with a findById method.');
    expect(() => new GetUserProfileUseCase({})) // No findById method
      .toThrow('GetUserProfileUseCase requires a valid userRepository with a findById method.');
  });
});
