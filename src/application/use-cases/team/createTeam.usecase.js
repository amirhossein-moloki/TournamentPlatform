const Team = require('../../../domain/team/team.entity');
const TeamMember = require('../../../domain/team/teamMember.entity');
const { TeamRoles } = require('../../../domain/team/teamRole.enums');
const { BadRequestError, NotFoundError, ConflictError } = require('../../../utils/errors');

class CreateTeamUseCase {
  constructor({ teamRepository, teamMemberRepository, userRepository }) {
    if (!teamRepository) throw new Error('teamRepository is required');
    if (!teamMemberRepository) throw new Error('teamMemberRepository is required');
    if (!userRepository) throw new Error('userRepository is required');

    this.teamRepository = teamRepository;
    this.teamMemberRepository = teamMemberRepository;
    this.userRepository = userRepository;
  }

  async execute({ name, description, tag, ownerId }) {
    if (!name || !ownerId) {
      throw new BadRequestError('Team name and owner ID are required.');
    }

    const owner = await this.userRepository.findById(ownerId);
    if (!owner) {
      throw new NotFoundError('Owner not found.');
    }

    const existingTeam = await this.teamRepository.findByName(name);
    if (existingTeam) {
      throw new ConflictError('A team with this name already exists.');
    }

    const team = new Team({ name, description, tag, ownerId });
    const createdTeam = await this.teamRepository.create(team);

    const ownerMember = new TeamMember({
      teamId: createdTeam.id,
      userId: ownerId,
      role: TeamRoles.OWNER,
      status: 'active',
    });
    await this.teamMemberRepository.create(ownerMember);

    // It's useful to return the created team with its owner member
    const teamWithMembers = await this.teamRepository.findById(createdTeam.id, { includeMembers: true });
    return teamWithMembers;
  }
}

module.exports = CreateTeamUseCase;
