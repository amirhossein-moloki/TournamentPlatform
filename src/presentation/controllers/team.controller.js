const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync'); // Assuming catchAsync utility
const ApiError = require('../../utils/ApiError'); // For direct error throwing if needed

class TeamController {
  constructor({ createTeamUseCase, getTeamByIdUseCase, getAllTeamsUseCase, updateTeamUseCase, deleteTeamUseCase, changeTeamOwnerUseCase, logger }) {
    this.createTeamUseCase = createTeamUseCase;
    this.getTeamByIdUseCase = getTeamByIdUseCase;
    this.getAllTeamsUseCase = getAllTeamsUseCase;
    this.updateTeamUseCase = updateTeamUseCase;
    this.deleteTeamUseCase = deleteTeamUseCase;
    this.changeTeamOwnerUseCase = changeTeamOwnerUseCase;
    this.logger = logger;

    // Bind methods to ensure 'this' context is correct and wrap with catchAsync
    this.createTeam = catchAsync(this.createTeam.bind(this));
    this.getTeamById = catchAsync(this.getTeamById.bind(this));
    this.getAllTeams = catchAsync(this.getAllTeams.bind(this));
    this.updateTeam = catchAsync(this.updateTeam.bind(this));
    this.deleteTeam = catchAsync(this.deleteTeam.bind(this));
    this.changeTeamOwner = catchAsync(this.changeTeamOwner.bind(this));
  }

  async createTeam(req, res) {
    if (!req.user || !req.user.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User authentication required.');
    }
    const ownerId = req.user.id;
    const { name, description, logoUrl } = req.body;

    if (!name) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Team name is required.');
    }

    this.logger.info(`TeamController: User ${ownerId} attempting to create team with name: ${name}`);
    const team = await this.createTeamUseCase.execute({ name, description, logoUrl, ownerId });
    res.status(httpStatus.CREATED).send(team);
  }

  async getTeamById(req, res) {
    const { teamId } = req.params;
    this.logger.info(`TeamController: Fetching team by ID: ${teamId}`);
    const team = await this.getTeamByIdUseCase.execute(teamId);
    res.status(httpStatus.OK).send(team);
  }

  async getAllTeams(req, res) {
    const queryOptions = req.query;
    this.logger.info('TeamController: Fetching all teams with query options:', queryOptions);
    const result = await this.getAllTeamsUseCase.execute(queryOptions);
    res.status(httpStatus.OK).send(result);
  }

  async updateTeam(req, res) {
    if (!req.user || !req.user.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User authentication required.');
    }
    const { teamId } = req.params;
    const updatePayload = req.body;
    const requestingUserId = req.user.id;

    if (Object.keys(updatePayload).length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'No update data provided.');
    }

    this.logger.info(`TeamController: User ${requestingUserId} attempting to update team ID: ${teamId}`);
    const team = await this.updateTeamUseCase.execute(teamId, updatePayload, requestingUserId);
    res.status(httpStatus.OK).send(team);
  }

  async deleteTeam(req, res) {
    if (!req.user || !req.user.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User authentication required.');
    }
    const { teamId } = req.params;
    const requestingUserId = req.user.id;
    this.logger.info(`TeamController: User ${requestingUserId} attempting to delete team ID: ${teamId}`);
    await this.deleteTeamUseCase.execute(teamId, requestingUserId);
    res.status(httpStatus.NO_CONTENT).send();
  }

  async changeTeamOwner(req, res) {
    if (!req.user || !req.user.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User authentication required.');
    }
    const { teamId } = req.params;
    const { newOwnerId } = req.body;
    const currentUserId = req.user.id;

    if (!newOwnerId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'New owner ID is required.');
    }

    this.logger.info(`TeamController: User ${currentUserId} attempting to change owner of team ID: ${teamId} to ${newOwnerId}`);
    const team = await this.changeTeamOwnerUseCase.execute(teamId, newOwnerId, currentUserId);
    res.status(httpStatus.OK).send(team);
  }
}

module.exports = TeamController;
