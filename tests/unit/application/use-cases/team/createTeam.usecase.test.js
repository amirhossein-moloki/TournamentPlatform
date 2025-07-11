const CreateTeamUseCase = require('../../../../../src/application/use-cases/team/createTeam.usecase');
const TeamRole = require('../../../../../src/domain/team/teamRole.enums');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatus = require('http-status');

describe('CreateTeamUseCase', () => {
  let createTeamUseCase;
  let mockTeamRepository;
  let mockUserRepository;
  // let mockTeamMemberRepository; // Not directly used if repo.create handles owner membership
  let mockLogger;

  beforeEach(() => {
    mockTeamRepository = {
      create: jest.fn(),
      findByName: jest.fn(),
    };
    mockUserRepository = {
      findById: jest.fn(),
    };
    // mockTeamMemberRepository = {
    //   add: jest.fn()
    // };
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    createTeamUseCase = new CreateTeamUseCase({
      teamRepository: mockTeamRepository,
      userRepository: mockUserRepository,
      // teamMemberRepository: mockTeamMemberRepository,
      logger: mockLogger,
    });
  });

  it('should create a team and add owner as member successfully', async () => {
    const teamData = { name: 'Test Team', description: 'A test team', logoUrl: null };
    const ownerId = 'user-uuid-123';
    const mockUser = { id: ownerId, username: 'owner' };
    // The repository's `create` method is expected to handle the transaction
    // and return the created team (Sequelize model instance)
    const createdTeamMock = {
      id: 'team-uuid-456',
      ...teamData,
      ownerId,
      // Mock the .get({ plain: true }) method used in the use case
      get: jest.fn().mockReturnValue({ id: 'team-uuid-456', ...teamData, ownerId })
    };

    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockTeamRepository.findByName.mockResolvedValue(null);
    mockTeamRepository.create.mockResolvedValue(createdTeamMock);

    const result = await createTeamUseCase.execute({ ...teamData, ownerId });

    expect(mockUserRepository.findById).toHaveBeenCalledWith(ownerId);
    expect(mockTeamRepository.findByName).toHaveBeenCalledWith(teamData.name);
    // Expect teamRepository.create to be called with team data and ownerId
    expect(mockTeamRepository.create).toHaveBeenCalledWith(
      { name: teamData.name, description: teamData.description, logoUrl: teamData.logoUrl },
      ownerId
    );
    // The result should be the plain object from createdTeamMock.get()
    expect(result).toEqual({ id: 'team-uuid-456', ...teamData, ownerId });
    expect(mockLogger.info).toHaveBeenCalled();
    expect(createdTeamMock.get).toHaveBeenCalledWith({ plain: true });
  });

  it('should throw ApiError if owner (user) not found', async () => {
    const teamData = { name: 'Test Team', description: 'A test team' };
    const ownerId = 'non-existent-user-uuid';

    mockUserRepository.findById.mockResolvedValue(null);

    await expect(createTeamUseCase.execute({ ...teamData, ownerId }))
      .rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'Owner (User) not found.'));

    expect(mockTeamRepository.create).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(`Owner (User) not found for ID: ${ownerId} during team creation.`);
  });

  it('should throw ApiError if team name already taken', async () => {
    const teamData = { name: 'Existing Team', description: 'A team' };
    const ownerId = 'user-uuid-123';
    const mockUser = { id: ownerId, username: 'owner' };
    const existingTeam = { id: 'team-uuid-prev', name: 'Existing Team' };

    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockTeamRepository.findByName.mockResolvedValue(existingTeam);

    await expect(createTeamUseCase.execute({ ...teamData, ownerId }))
      .rejects.toThrow(new ApiError(httpStatus.CONFLICT, 'Team name already taken.'));

    expect(mockTeamRepository.create).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(`Team name "${teamData.name}" already taken. Conflict during creation.`);
  });

  it('should handle errors from repository.create during team creation', async () => {
    const teamData = { name: 'Error Team', description: 'A team' };
    const ownerId = 'user-uuid-123';
    const mockUser = { id: ownerId, username: 'owner' };
    const dbError = new Error('Database connection error');

    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockTeamRepository.findByName.mockResolvedValue(null);
    mockTeamRepository.create.mockRejectedValue(dbError);

    await expect(createTeamUseCase.execute({ ...teamData, ownerId }))
      .rejects.toThrow(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to create team: ${dbError.message}`));
    expect(mockLogger.error).toHaveBeenCalledWith(`Error creating team "${teamData.name}": ${dbError.message}`, { error: dbError });
  });

  it('should throw conflict error if repository.create throws SequelizeUniqueConstraintError', async () => {
    const teamData = { name: 'Unique Error Team', description: 'A team' };
    const ownerId = 'user-uuid-123';
    const mockUser = { id: ownerId, username: 'owner' };
    const uniqueError = new Error('Unique constraint failed');
    uniqueError.name = 'SequelizeUniqueConstraintError';


    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockTeamRepository.findByName.mockResolvedValue(null);
    mockTeamRepository.create.mockRejectedValue(uniqueError);

    await expect(createTeamUseCase.execute({ ...teamData, ownerId }))
      .rejects.toThrow(new ApiError(httpStatus.CONFLICT, 'Team name already exists or another unique constraint failed.'));
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
