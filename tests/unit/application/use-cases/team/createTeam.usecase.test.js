const CreateTeamUseCase = require('../../../../../src/application/use-cases/team/createTeam.usecase');
const Team = require('../../../../../src/domain/team/team.entity');
const TeamMember = require('../../../../../src/domain/team/teamMember.entity');
const TeamRole = require('../../../../../src/domain/team/teamRole.enums');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { v4: uuidv4 } = require('uuid');

describe('CreateTeamUseCase', () => {
  let mockTeamRepository;
  let mockTeamMemberRepository;
  let mockUserRepository;
  let createTeamUseCase;

  beforeEach(() => {
    mockTeamRepository = {
      findByName: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };
    mockTeamMemberRepository = {
      create: jest.fn(),
    };
    mockUserRepository = {
      findById: jest.fn(),
    };
    createTeamUseCase = new CreateTeamUseCase({
      teamRepository: mockTeamRepository,
      teamMemberRepository: mockTeamMemberRepository,
      userRepository: mockUserRepository,
    });
  });

  it('should create a team and add owner as a member successfully', async () => {
    const ownerId = uuidv4();
    const teamData = { name: 'New Team', description: 'A great team', ownerId };
    const owner = { id: ownerId, name: 'Test User' };
    const createdTeam = new Team({ ...teamData, id: uuidv4() });

    mockUserRepository.findById.mockResolvedValue(owner);
    mockTeamRepository.findByName.mockResolvedValue(null);
    mockTeamRepository.create.mockResolvedValue(createdTeam);
    mockTeamRepository.findById.mockResolvedValue({ ...createdTeam, members: [new TeamMember({ userId: ownerId, role: TeamRole.OWNER, status: 'active' })] });

    const result = await createTeamUseCase.execute(teamData);

    expect(mockUserRepository.findById).toHaveBeenCalledWith(ownerId);
    expect(mockTeamRepository.findByName).toHaveBeenCalledWith(teamData.name);
    expect(mockTeamRepository.create).toHaveBeenCalledWith(expect.any(Team));
    expect(mockTeamMemberRepository.create).toHaveBeenCalledWith(expect.any(TeamMember));
    expect(mockTeamMemberRepository.create.mock.calls[0][0].role).toBe(TeamRole.OWNER);
    expect(result.name).toBe(teamData.name);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].role).toBe(TeamRole.OWNER);
  });

  it('should throw a NOT_FOUND error if owner is not found', async () => {
    const ownerId = uuidv4();
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(createTeamUseCase.execute({ name: 'Test', ownerId }))
      .rejects.toThrow(new ApiError(httpStatusCodes.NOT_FOUND, 'Owner not found.'));
  });

  it('should throw a CONFLICT error if team name already exists', async () => {
    const ownerId = uuidv4();
    const owner = { id: ownerId, name: 'Test User' };

    mockUserRepository.findById.mockResolvedValue(owner);
    mockTeamRepository.findByName.mockResolvedValue(new Team({ name: 'Existing Team', ownerId }));

    await expect(createTeamUseCase.execute({ name: 'Existing Team', ownerId }))
      .rejects.toThrow(new ApiError(httpStatusCodes.CONFLICT, 'A team with this name already exists.'));
  });

  it('should throw a BAD_REQUEST error if name is missing', async () => {
    await expect(createTeamUseCase.execute({ ownerId: uuidv4() }))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Team name and owner ID are required.'));
  });

  it('should throw a BAD_REQUEST error if ownerId is missing', async () => {
    await expect(createTeamUseCase.execute({ name: 'Test' }))
      .rejects.toThrow(new ApiError(httpStatusCodes.BAD_REQUEST, 'Team name and owner ID are required.'));
  });

  it('should throw an error if teamRepository is not provided', () => {
    expect(() => new CreateTeamUseCase({ teamMemberRepository: {}, userRepository: {} }))
      .toThrow('teamRepository is required');
  });
});
