const UpdateUserProfileUseCase = require('../../../../../src/application/use-cases/user/update-user-profile.usecase');
const { User } = require('../../../../../src/domain/user/user.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { createUser, faker } = require('../../../../utils/factories');

// Mock UserRepository
const mockUserRepository = {
  findById: jest.fn(),
  update: jest.fn(), // Assuming an update method in the repository
};

describe('UpdateUserProfileUseCase', () => {
  let updateUserProfileUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    updateUserProfileUseCase = new UpdateUserProfileUseCase(mockUserRepository);
  });

  const userId = faker.string.uuid();
  const updateData = {
    firstName: 'John_Updated',
    lastName: 'Doe_Updated',
    bio: 'An updated bio.',
    avatarUrl: faker.image.avatar(),
    socialLinks: { twitter: 'johndoe_updated', linkedin: 'johndoe_linkedin' },
    country: 'CA'
  };

  it('should update user profile successfully and return public profile', async () => {
    const existingUserEntity = createUser({ id: userId, profile: { firstName: 'John', country: 'US' } });
    mockUserRepository.findById.mockResolvedValue(existingUserEntity);

    // Spy on the entity's updateProfile method
    const updateProfileSpy = jest.spyOn(existingUserEntity, 'updateProfile');

    // When repository.update is called, it should return the user entity with updated profile
    // For the purpose of this test, we can assume the update was successful and the entity
    // passed to 'update' (which is existingUserEntity) is what's effectively "persisted"
    // and then its public profile is returned.
    // The use case now calls toPublicProfile on the *result* of repository.update.
    // So, mock repository.update to return the (modified) existingUserEntity.
    const updatedEntityFromRepo = {
        ...existingUserEntity,
        profile: { ...existingUserEntity.profile, ...updateData },
        // Ensure it has toPublicProfile for the use case to call
        toPublicProfile: () => ({
            id: userId,
            username: existingUserEntity.username,
            profile: { ...existingUserEntity.profile, ...updateData },
            // other public fields...
        })
    };
    mockUserRepository.update.mockResolvedValue(updatedEntityFromRepo);


    const result = await updateUserProfileUseCase.execute(userId, updateData);

    expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    expect(updateProfileSpy).toHaveBeenCalledWith(updateData);
    // Use case calls repository.update with userId and the updated profile data from the entity
    expect(mockUserRepository.update).toHaveBeenCalledWith(userId, existingUserEntity.profile);
    // The result should be the public profile of the entity returned by repository.update
    expect(result.profile.firstName).toBe(updateData.firstName);
    expect(result.profile.country).toBe(updateData.country);
    expect(result.profile.socialLinks.twitter).toBe(updateData.socialLinks.twitter);
  });

  it('should throw ApiError if userId is not provided', async () => {
    await expect(updateUserProfileUseCase.execute(null, updateData))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID is required.'));
  });

  it('should throw ApiError if updateData is not provided or empty', async () => {
    await expect(updateUserProfileUseCase.execute(userId, null))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Update data is required.')); // Message changed in use case
    await expect(updateUserProfileUseCase.execute(userId, {}))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Update data is required.')); // Message changed in use case
  });

  it('should throw ApiError if user not found', async () => {
    mockUserRepository.findById.mockResolvedValue(null);
    await expect(updateUserProfileUseCase.execute(userId, updateData))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, `User with ID ${userId} not found.`)); // Message changed in use case
  });

  it('should throw ApiError if repository.update fails to return an entity', async () => {
    const existingUserEntity = createUser({ id: userId });
    mockUserRepository.findById.mockResolvedValue(existingUserEntity);
    mockUserRepository.update.mockResolvedValue(null); // Simulate repository update returning null
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(updateUserProfileUseCase.execute(userId, updateData))
      .rejects.toThrow(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to confirm user profile update.'));
    expect(consoleErrorSpy).toHaveBeenCalledWith(`Update operation for user ${userId} did not return an updated entity.`);
    consoleErrorSpy.mockRestore();
  });


  it('should throw ApiError if repository.update itself throws an error', async () => {
    const existingUserEntity = createUser({ id: userId });
    mockUserRepository.findById.mockResolvedValue(existingUserEntity);
    const updateError = new Error('DB update failed');
    mockUserRepository.update.mockRejectedValue(updateError);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(updateUserProfileUseCase.execute(userId, updateData))
      .rejects.toThrow(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to update user profile.'));
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating user profile:', updateError);
    consoleErrorSpy.mockRestore();
  });


  it('should throw error if user entity does not have updateProfile method', async () => {
    const plainUserObject = { id: userId, username: 'test', profile: {} }; // No updateProfile method
    mockUserRepository.findById.mockResolvedValue(plainUserObject);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(updateUserProfileUseCase.execute(userId, updateData))
        .rejects.toThrow(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to process user profile for update.'));
    expect(consoleErrorSpy).toHaveBeenCalledWith('User entity is missing updateProfile method.', expect.any(TypeError));
    consoleErrorSpy.mockRestore();
  });

  it('should throw error if updated user entity does not have toPublicProfile method', async () => {
    const existingUserEntity = createUser({ id: userId });
    mockUserRepository.findById.mockResolvedValue(existingUserEntity);
    // Simulate repository.update returning an object without toPublicProfile
    const updatedEntityFromRepoWithoutMethod = { ...existingUserEntity.profile }; // Just the profile, no methods
    mockUserRepository.update.mockResolvedValue(updatedEntityFromRepoWithoutMethod);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(updateUserProfileUseCase.execute(userId, updateData))
        .rejects.toThrow(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to process updated user profile.'));
    expect(consoleErrorSpy).toHaveBeenCalledWith('Updated user entity is missing toPublicProfile method.');
    consoleErrorSpy.mockRestore();
  });

  it('should throw an error if UserRepository is not provided or invalid', () => {
    expect(() => new UpdateUserProfileUseCase(null))
      .toThrow('UpdateUserProfileUseCase requires a valid userRepository with findById and update methods.');
    expect(() => new UpdateUserProfileUseCase({ findById: jest.fn() })) // Missing update
      .toThrow('UpdateUserProfileUseCase requires a valid userRepository with findById and update methods.');
    expect(() => new UpdateUserProfileUseCase({ update: jest.fn() })) // Missing findById
      .toThrow('UpdateUserProfileUseCase requires a valid userRepository with findById and update methods.');
  });
});
