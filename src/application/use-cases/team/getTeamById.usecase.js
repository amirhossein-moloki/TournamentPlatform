const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');

class GetTeamByIdUseCase {
  constructor({ teamRepository, logger }) { // Added logger
    this.teamRepository = teamRepository;
    this.logger = logger;
  }

  async execute(teamId) {
    this.logger.info(`Fetching team by ID: ${teamId}`);
    const team = await this.teamRepository.findById(teamId);

    if (!team) {
      this.logger.warn(`Team not found for ID: ${teamId}`);
      throw new ApiError(httpStatus.NOT_FOUND, 'Team not found.');
    }

    this.logger.info(`Team found for ID: ${teamId}, Name: ${team.name}`);
    // team is a Sequelize model instance.
    return team.get({ plain: true });
  }
}

module.exports = GetTeamByIdUseCase;
