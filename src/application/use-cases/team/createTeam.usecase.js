const Team = require('../../../domain/team/team.entity'); // Not strictly needed if not mapping to domain entity here
const TeamRole = require('../../../domain/team/teamRole.enums');
const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');

class CreateTeamUseCase {
  constructor({ teamRepository, userRepository, teamMemberRepository, logger }) { // Added logger
    this.teamRepository = teamRepository;
    this.userRepository = userRepository;
    // teamMemberRepository might not be directly needed if teamRepository.create handles owner membership
    this.logger = logger;
  }

  async execute({ name, description, logoUrl, ownerId }) {
    this.logger.info(`Attempting to create team with name: ${name} by owner ID: ${ownerId}`);

    const owner = await this.userRepository.findById(ownerId);
    if (!owner) {
      this.logger.warn(`Owner (User) not found for ID: ${ownerId} during team creation.`);
      throw new ApiError(httpStatus.NOT_FOUND, 'Owner (User) not found.');
    }

    const existingTeam = await this.teamRepository.findByName(name);
    if (existingTeam) {
      this.logger.warn(`Team name "${name}" already taken. Conflict during creation.`);
      throw new ApiError(httpStatus.CONFLICT, 'Team name already taken.');
    }

    const teamData = { name, description, logoUrl };

    try {
      const newTeam = await this.teamRepository.create(teamData, ownerId);
      this.logger.info(`Team "${name}" (ID: ${newTeam.id}) created successfully by owner ID: ${ownerId}.`);
      return newTeam.get({ plain: true });
    } catch (error) {
      this.logger.error(`Error creating team "${name}": ${error.message}`, { error });
      // Check if it's a known DB constraint error vs other errors
      if (error.name === 'SequelizeUniqueConstraintError') {
         throw new ApiError(httpStatus.CONFLICT, 'Team name already exists or another unique constraint failed.');
      }
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to create team: ${error.message}`);
    }
  }
}

module.exports = CreateTeamUseCase;
