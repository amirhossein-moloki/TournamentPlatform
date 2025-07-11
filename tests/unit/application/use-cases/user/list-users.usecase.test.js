const ListUsersUseCase = require('../../../../../src/application/use-cases/user/list-users.usecase');
const { User } = require('../../../../../src/domain/user/user.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { createUser, faker } = require('../../../../utils/factories');

// Mock UserRepository
const mockUserRepository = {
  findAll: jest.fn(),
  // countAll: jest.fn(), // Assuming findAll returns total count like in ListTournamentsUseCase
};

describe('ListUsersUseCase', () => {
  let listUsersUseCase;
  const defaultPage = 1;
  const defaultLimit = 10;
  const defaultSortBy = 'createdAt';
  const defaultSortOrder = 'DESC';

  beforeEach(() => {
    jest.clearAllMocks();
    listUsersUseCase = new ListUsersUseCase(mockUserRepository);
  });

  it('should list users with default options if none provided', async () => {
    const userEntities = [createUser(), createUser()];
    // Simulate what toPublicProfile would return for each entity
    const publicProfiles = userEntities.map(u => ({ id: u.id, username: u.username /* other public fields */ }));

    mockUserRepository.findAll.mockResolvedValue({
      users: userEntities, // Assuming repository returns full entities
      total: userEntities.length,
      page: defaultPage,
      limit: defaultLimit,
    });

    // Spy on toPublicProfile for each instance
    userEntities.forEach(entity => jest.spyOn(entity, 'toPublicProfile').mockReturnValueOnce({ id: entity.id, username: entity.username }));


    const result = await listUsersUseCase.execute({});

    expect(mockUserRepository.findAll).toHaveBeenCalledWith({
      page: defaultPage,
      limit: defaultLimit,
      filters: {},
      sortBy: defaultSortBy,
      sortOrder: defaultSortOrder,
      // includeGame is not relevant for users, so it's not passed by default
    });
    expect(result.users).toEqual(publicProfiles); // Should return public profiles
    expect(result.users.length).toBe(userEntities.length);
    userEntities.forEach(entity => expect(entity.toPublicProfile).toHaveBeenCalledTimes(1));
    expect(result.totalItems).toBe(userEntities.length);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(defaultPage);
  });

  it('should list users with provided filters', async () => {
    const roleFilter = 'ADMIN';
    const filters = { role: roleFilter };
    const userEntities = [createUser({ role: roleFilter })];
    const publicProfiles = userEntities.map(u => ({ id: u.id, username: u.username, role: u.role }));
    mockUserRepository.findAll.mockResolvedValue({ users: userEntities, total: userEntities.length, page: defaultPage, limit: defaultLimit });
    userEntities.forEach(entity => jest.spyOn(entity, 'toPublicProfile').mockReturnValueOnce({ id: entity.id, username: entity.username, role: entity.role }));


    const result = await listUsersUseCase.execute({ filters });

    expect(mockUserRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({
      filters,
      page: defaultPage,
      limit: defaultLimit,
      sortBy: defaultSortBy,
      sortOrder: defaultSortOrder
    }));
    expect(result.users).toEqual(publicProfiles);
  });

  it('should list users with pagination', async () => {
    const page = 2;
    const limit = 3;
    const userEntities = [createUser(), createUser(), createUser()];
    const publicProfiles = userEntities.map(u => ({ id: u.id, username: u.username }));
    const totalItems = 7; // 3 pages total
    mockUserRepository.findAll.mockResolvedValue({ users: userEntities, total: totalItems, page, limit });
    userEntities.forEach(entity => jest.spyOn(entity, 'toPublicProfile').mockReturnValueOnce({ id: entity.id, username: entity.username }));


    const result = await listUsersUseCase.execute({ page, limit });

    expect(mockUserRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({
      page,
      limit,
      filters: {},
      sortBy: defaultSortBy,
      sortOrder: defaultSortOrder
    }));
    expect(result.users.length).toBe(limit);
    expect(result.totalItems).toBe(totalItems);
    expect(result.totalPages).toBe(Math.ceil(totalItems / limit));
    expect(result.currentPage).toBe(page);
  });

  it('should list users with sorting', async () => {
    const sortBy = 'username';
    const sortOrder = 'ASC';
    const userEntities = [createUser({username: 'Alice'}), createUser({username: 'Bob'})]; // Assume repo returns them sorted
    const publicProfiles = userEntities.map(u => ({ id: u.id, username: u.username }));
    mockUserRepository.findAll.mockResolvedValue({ users: userEntities, total: userEntities.length, page: defaultPage, limit: defaultLimit });
    userEntities.forEach(entity => jest.spyOn(entity, 'toPublicProfile').mockReturnValueOnce({ id: entity.id, username: entity.username }));

    const result = await listUsersUseCase.execute({ sortBy, sortOrder });

    expect(mockUserRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({
      sortBy,
      sortOrder,
      page: defaultPage,
      limit: defaultLimit,
      filters: {}
    }));
    expect(result.users).toEqual(publicProfiles);
  });

  it('should handle empty result correctly', async () => {
    mockUserRepository.findAll.mockResolvedValue({ users: [], total: 0, page: 1, limit: 10 });

    const result = await listUsersUseCase.execute({});

    expect(result.users).toEqual([]);
    expect(result.totalItems).toBe(0);
    expect(result.totalPages).toBe(0); // Correct for 0 items
  });


  it('should throw ApiError if repository throws an error', async () => {
    mockUserRepository.findAll.mockRejectedValue(new Error('DB Error'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(listUsersUseCase.execute({}))
      .rejects.toThrow(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to retrieve users.'));
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error listing users:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('should throw an error if UserRepository is not provided or invalid', () => {
    expect(() => new ListUsersUseCase(null))
      .toThrow('ListUsersUseCase requires a valid userRepository with a findAll method.');
    expect(() => new ListUsersUseCase({})) // No findAll method
      .toThrow('ListUsersUseCase requires a valid userRepository with a findAll method.');
  });

  it('should correctly map users to public profiles even if some entities lack toPublicProfile (and log error)', async () => {
    const userWithMethod = createUser({ id: 'user1' });
    const userWithoutMethod = { id: 'user2', username: 'UserTwo' }; // Plain object
    const userEntities = [userWithMethod, userWithoutMethod];

    jest.spyOn(userWithMethod, 'toPublicProfile').mockReturnValue({ id: 'user1', username: userWithMethod.username });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});


    mockUserRepository.findAll.mockResolvedValue({
        users: userEntities,
        total: userEntities.length,
        page: defaultPage,
        limit: defaultLimit,
    });

    const result = await listUsersUseCase.execute({});
    expect(result.users.length).toBe(1); // Only the user with toPublicProfile should be included
    expect(result.users[0].id).toBe('user1');
    expect(consoleErrorSpy).toHaveBeenCalledWith("User entity (ID: user2) is missing 'toPublicProfile' method or is not a valid User instance. Skipping.");
    consoleErrorSpy.mockRestore();
  });

});
