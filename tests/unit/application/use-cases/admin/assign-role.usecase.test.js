const AssignRoleUseCase = require('../../../../../src/application/use-cases/admin/assign-role.usecase');
const { User, UserRoles } = require('../../../../../src/domain/user/user.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { faker } = require('@faker-js/faker');

describe('AssignRoleUseCase', () => {
  let mockUserRepository;
  let assignRoleUseCase;
  let targetUser;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    assignRoleUseCase = new AssignRoleUseCase(mockUserRepository);

    targetUser = new User(
      faker.string.uuid(),
      'testuser',
      'test@example.com',
      'hashedpassword',
      [User.UserRoles.PLAYER] // Initial role - Corrected to User.UserRoles
    );
    // Mock User entity methods that might be called if not using direct property access in use case
    // No need to spy on entity methods if we trust User entity's own tests.
    // The use case test should focus on the use case's logic:
    // - calling repository methods correctly
    // - calling entity methods correctly
    // - handling errors from repository or entity
    // jest.spyOn(targetUser, 'hasRole').mockImplementation(targetUser.hasRole.bind(targetUser));
    // jest.spyOn(targetUser, 'addRole').mockImplementation(targetUser.addRole.bind(targetUser));
  });

  it('should assign a new role to a user successfully', async () => {
    mockUserRepository.findById.mockResolvedValue(targetUser);
    // Simulate the update method returning the user with the new role
    mockUserRepository.update.mockImplementation(async (id, data) => {
      const updatedUserInstance = new User(targetUser.id, targetUser.username, targetUser.email, targetUser.passwordHash, data.roles, targetUser.refreshToken, targetUser.isVerified, targetUser.lastLogin, targetUser.createdAt, data.updatedAt, targetUser.verificationToken, targetUser.tokenVersion);
      return updatedUserInstance;
    });

    const roleToAssign = User.UserRoles.TOURNAMENT_MANAGER;
    const updatedUser = await assignRoleUseCase.execute(targetUser.id, roleToAssign);

    expect(mockUserRepository.findById).toHaveBeenCalledWith(targetUser.id);
    expect(mockUserRepository.update).toHaveBeenCalledWith(targetUser.id, {
      roles: expect.arrayContaining([User.UserRoles.PLAYER, roleToAssign]),
      updatedAt: expect.any(Date), // targetUser.updatedAt would have been updated by addRole
    });
    expect(updatedUser.roles).toContain(roleToAssign);
    expect(updatedUser.roles).toContain(User.UserRoles.PLAYER);
  });

  it('should throw ApiError if targetUserId is not provided', async () => {
    await expect(assignRoleUseCase.execute(null, User.UserRoles.ADMIN))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Target User ID is required.'));
  });

  it('should throw ApiError if roleToAssign is not provided', async () => {
    await expect(assignRoleUseCase.execute(targetUser.id, null))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Role to assign is required.'));
  });

  it('should throw ApiError if roleToAssign is invalid', async () => {
    const invalidRole = 'INVALID_ROLE';
    await expect(assignRoleUseCase.execute(targetUser.id, invalidRole))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, `Invalid role specified: ${invalidRole}.`));
  });

  it('should throw ApiError if target user is not found', async () => {
    mockUserRepository.findById.mockResolvedValue(null);
    await expect(assignRoleUseCase.execute('non-existent-user-id', User.UserRoles.ADMIN))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, 'Target user with ID non-existent-user-id not found.'));
  });

  it('should throw ApiError if user already has the role', async () => {
    // Ensure targetUser has the role for this test
    const userWithRole = new User(targetUser.id, targetUser.username, targetUser.email, targetUser.passwordHash, [User.UserRoles.PLAYER, User.UserRoles.ADMIN]);
    mockUserRepository.findById.mockResolvedValue(userWithRole);

    await expect(assignRoleUseCase.execute(targetUser.id, User.UserRoles.ADMIN))
      .rejects.toThrow(new ApiError(httpStatusCodes.CONFLICT, `User already has the role: ${User.UserRoles.ADMIN}.`));
  });

  it('should throw ApiError if userRepository.update fails', async () => {
    mockUserRepository.findById.mockResolvedValue(targetUser);
    mockUserRepository.update.mockResolvedValue(null); // Simulate update failure

    await expect(assignRoleUseCase.execute(targetUser.id, User.UserRoles.TOURNAMENT_MANAGER))
      .rejects.toThrow(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, `Failed to assign role '${User.UserRoles.TOURNAMENT_MANAGER}' to user ${targetUser.id}.`));
  });

  it('should call user.addRole and persist the change', async () => {
    // For this test, we want to ensure addRole is called on the instance fetched by findById
    const freshUserInstance = new User( targetUser.id, targetUser.username, targetUser.email, targetUser.passwordHash, [User.UserRoles.PLAYER]);
    mockUserRepository.findById.mockResolvedValue(freshUserInstance);
    const addRoleSpy = jest.spyOn(freshUserInstance, 'addRole');

    mockUserRepository.update.mockImplementation(async (id, data) => {
      // Simulate the updated user being returned
      return new User(id, freshUserInstance.username, freshUserInstance.email, freshUserInstance.passwordHash, data.roles, freshUserInstance.refreshToken, freshUserInstance.isVerified, freshUserInstance.lastLogin, freshUserInstance.createdAt, data.updatedAt);
    });


    await assignRoleUseCase.execute(targetUser.id, User.UserRoles.GENERAL_SUPPORT);

    expect(addRoleSpy).toHaveBeenCalledWith(User.UserRoles.GENERAL_SUPPORT);
    expect(mockUserRepository.update).toHaveBeenCalledWith(
      targetUser.id,
      expect.objectContaining({ roles: expect.arrayContaining([User.UserRoles.PLAYER, User.UserRoles.GENERAL_SUPPORT]) })
    );
  });

});
