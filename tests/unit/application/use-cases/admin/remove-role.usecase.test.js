const RemoveRoleUseCase = require('../../../../../src/application/use-cases/admin/remove-role.usecase');
const { User, UserRoles } = require('../../../../../src/domain/user/user.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { faker } = require('@faker-js/faker');

describe('RemoveRoleUseCase', () => {
  let mockUserRepository;
  let removeRoleUseCase;
  let targetUser;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    removeRoleUseCase = new RemoveRoleUseCase(mockUserRepository);

    targetUser = new User(
      faker.string.uuid(),
      'testuser',
      'test@example.com',
      'hashedpassword',
      [User.UserRoles.PLAYER, User.UserRoles.TOURNAMENT_MANAGER] // Initial roles
    );
    // Spy on User entity methods - removing these to see if it resolves stack size error
    // jest.spyOn(targetUser, 'hasRole').mockImplementation(targetUser.hasRole.bind(targetUser));
    // jest.spyOn(targetUser, 'removeRole').mockImplementation(targetUser.removeRole.bind(targetUser));
  });

  it('should remove a role from a user successfully', async () => {
    mockUserRepository.findById.mockResolvedValue(targetUser);
    // Simulate the update method returning the user with the role removed
    mockUserRepository.update.mockImplementation(async (id, data) => {
       const updatedUserInstance = new User(targetUser.id, targetUser.username, targetUser.email, targetUser.passwordHash, data.roles, targetUser.refreshToken, targetUser.isVerified, targetUser.lastLogin, targetUser.createdAt, data.updatedAt, targetUser.verificationToken, targetUser.tokenVersion);
      return updatedUserInstance;
    });

    const initialRoles = [...targetUser.roles];
    const roleToRemove = User.UserRoles.TOURNAMENT_MANAGER;

    const updatedUser = await removeRoleUseCase.execute(targetUser.id, roleToRemove);

    expect(mockUserRepository.findById).toHaveBeenCalledWith(targetUser.id);
    // Check against the roles of the *returned* (and theoretically updated) user
    expect(updatedUser.roles).not.toContain(roleToRemove);
    expect(updatedUser.roles).toContain(User.UserRoles.PLAYER);
    expect(mockUserRepository.update).toHaveBeenCalledWith(targetUser.id, {
      roles: expect.not.arrayContaining([roleToRemove]), // Check that the roles array passed to update does not contain the removed role
      updatedAt: expect.any(Date),
    });
  });

  it('should throw ApiError if targetUserId is not provided', async () => {
    await expect(removeRoleUseCase.execute(null, User.UserRoles.ADMIN))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Target User ID is required.'));
  });

  it('should throw ApiError if roleToRemove is not provided', async () => {
    await expect(removeRoleUseCase.execute(targetUser.id, null))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Role to remove is required.'));
  });

  it('should throw ApiError if roleToRemove is invalid', async () => {
    const invalidRole = 'INVALID_ROLE';
    await expect(removeRoleUseCase.execute(targetUser.id, invalidRole))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `Invalid role specified: ${invalidRole}.`));
  });

  it('should throw ApiError if target user is not found', async () => {
    mockUserRepository.findById.mockResolvedValue(null);
    await expect(removeRoleUseCase.execute('non-existent-user-id', User.UserRoles.ADMIN))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, 'Target user with ID non-existent-user-id not found.'));
  });

  it('should throw ApiError if user does not have the role to remove', async () => {
    mockUserRepository.findById.mockResolvedValue(targetUser); // User has PLAYER, TOURNAMENT_MANAGER

    await expect(removeRoleUseCase.execute(targetUser.id, User.UserRoles.ADMIN)) // Trying to remove ADMIN
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `User does not have the role: ${User.UserRoles.ADMIN}.`));
  });

  it('should throw ApiError if trying to remove the last PLAYER role (entity throws error)', async () => {
    // Setup user with only PLAYER role
    targetUser.roles = [User.UserRoles.PLAYER];
    // Reset the mock to ensure it's fresh for this specific test condition
    // The spy might not be needed if we trust the entity's method.
    // jest.spyOn(targetUser, 'removeRole').mockImplementation(targetUser.removeRole.bind(targetUser));

    mockUserRepository.findById.mockResolvedValue(targetUser);

    // removeRole on entity should throw an error for this case
    await expect(removeRoleUseCase.execute(targetUser.id, User.UserRoles.PLAYER))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `Cannot remove the last role '${User.UserRoles.PLAYER}'. User must have at least one role.`));

    // Verify repository update was not called because the entity method threw
    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ApiError if userRepository.update fails', async () => {
    mockUserRepository.findById.mockResolvedValue(targetUser);
    mockUserRepository.update.mockResolvedValue(null); // Simulate update failure

    await expect(removeRoleUseCase.execute(targetUser.id, User.UserRoles.TOURNAMENT_MANAGER))
      .rejects.toThrow(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, `Failed to remove role '${User.UserRoles.TOURNAMENT_MANAGER}' from user ${targetUser.id}.`));
  });

  it('should call user.removeRole and persist the change', async () => {
    // For this test, we want to ensure removeRole is called on the instance fetched by findById
    const freshUserInstance = new User( targetUser.id, targetUser.username, targetUser.email, targetUser.passwordHash, [User.UserRoles.PLAYER, User.UserRoles.TOURNAMENT_MANAGER]);
    mockUserRepository.findById.mockResolvedValue(freshUserInstance);
    const removeRoleSpy = jest.spyOn(freshUserInstance, 'removeRole');

    mockUserRepository.update.mockImplementation(async (id, data) => {
      // Simulate the updated user being returned
      return new User(id, freshUserInstance.username, freshUserInstance.email, freshUserInstance.passwordHash, data.roles, freshUserInstance.refreshToken, freshUserInstance.isVerified, freshUserInstance.lastLogin, freshUserInstance.createdAt, data.updatedAt);
    });


    await removeRoleUseCase.execute(targetUser.id, User.UserRoles.TOURNAMENT_MANAGER);

    expect(removeRoleSpy).toHaveBeenCalledWith(User.UserRoles.TOURNAMENT_MANAGER);
    expect(mockUserRepository.update).toHaveBeenCalledWith(
      targetUser.id,
      expect.objectContaining({ roles: expect.arrayContaining([User.UserRoles.PLAYER]) })
    );
    // Check roles on the instance that had removeRole called
    expect(freshUserInstance.roles).not.toContain(User.UserRoles.TOURNAMENT_MANAGER);
  });
});
