const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');

class TeamMemberController {
  constructor({ addTeamMemberUseCase, removeTeamMemberUseCase, updateTeamMemberRoleUseCase, updateTeamMemberStatusUseCase, getTeamMembersUseCase, getUserTeamsUseCase, logger }) {
    this.addTeamMemberUseCase = addTeamMemberUseCase;
    this.removeTeamMemberUseCase = removeTeamMemberUseCase;
    this.updateTeamMemberRoleUseCase = updateTeamMemberRoleUseCase;
    this.updateTeamMemberStatusUseCase = updateTeamMemberStatusUseCase;
    this.getTeamMembersUseCase = getTeamMembersUseCase;
    this.getUserTeamsUseCase = getUserTeamsUseCase;
    this.logger = logger;

    this.addMember = catchAsync(this.addMember.bind(this));
    this.removeMember = catchAsync(this.removeMember.bind(this));
    this.updateMemberRole = catchAsync(this.updateMemberRole.bind(this));
    this.updateMemberStatus = catchAsync(this.updateMemberStatus.bind(this));
    this.getTeamMembers = catchAsync(this.getTeamMembers.bind(this));
    this.getUserTeams = catchAsync(this.getUserTeams.bind(this));
    this.getCurrentUserTeams = catchAsync(this.getCurrentUserTeams.bind(this));
  }

  async addMember(req, res) {
    if (!req.user || !req.user.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User authentication required.');
    }
    const { teamId } = req.params;
    const { userId: targetUserId, role } = req.body; // role is the role to assign
    const invitedByUserId = req.user.id;

    if (!targetUserId || !role) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Target user ID and role are required.');
    }
    this.logger.info(`TeamMemberController: User ${invitedByUserId} attempting to add user ${targetUserId} to team ${teamId} with role ${role}`);
    const member = await this.addTeamMemberUseCase.execute(teamId, targetUserId, role, invitedByUserId);
    res.status(httpStatus.CREATED).send(member);
  }

  async removeMember(req, res) {
    if (!req.user || !req.user.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User authentication required.');
    }
    const { teamId, userId: targetUserId } = req.params;
    const performingUserId = req.user.id;
    this.logger.info(`TeamMemberController: User ${performingUserId} attempting to remove user ${targetUserId} from team ${teamId}`);
    await this.removeTeamMemberUseCase.execute(teamId, targetUserId, performingUserId);
    res.status(httpStatus.NO_CONTENT).send();
  }

  async updateMemberRole(req, res) {
    if (!req.user || !req.user.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User authentication required.');
    }
    const { teamId, userId: targetUserId } = req.params;
    const { role: newRole } = req.body;
    const performingUserId = req.user.id;

    if (!newRole) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'New role is required.');
    }
    this.logger.info(`TeamMemberController: User ${performingUserId} attempting to update role of user ${targetUserId} in team ${teamId} to ${newRole}`);
    const member = await this.updateTeamMemberRoleUseCase.execute(teamId, targetUserId, newRole, performingUserId);
    res.status(httpStatus.OK).send(member);
  }

  async updateMemberStatus(req, res) {
    if (!req.user || !req.user.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User authentication required.');
    }
    const { teamId } = req.params;
    const { status } = req.body;
    const performingUserId = req.user.id;
    const context = req.body.context || {};

    if (!status) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'New status is required.');
    }
    this.logger.info(`TeamMemberController: User ${performingUserId} attempting to update their status in team ${teamId} to ${status}`);
    const member = await this.updateTeamMemberStatusUseCase.execute(teamId, performingUserId, status, context);
    res.status(httpStatus.OK).send(member);
  }

  async getTeamMembers(req, res) {
     if (!req.user || !req.user.id) { // Basic auth check, further checks might be in use case
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User authentication required.');
    }
    const { teamId } = req.params;
    const queryOptions = req.query;
    const requestingUserId = req.user.id;
    this.logger.info(`TeamMemberController: User ${requestingUserId} fetching members for team ${teamId}`);
    const result = await this.getTeamMembersUseCase.execute(teamId, queryOptions, requestingUserId);
    res.status(httpStatus.OK).send(result);
  }

  async getUserTeams(req, res) {
    if (!req.user || !req.user.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User authentication required.');
    }
    const { userId } = req.params; // User whose teams are being fetched
    const queryOptions = req.query;
    const requestingUserId = req.user.id; // User making the request
    this.logger.info(`TeamMemberController: User ${requestingUserId} fetching teams for user ${userId}`);
    const result = await this.getUserTeamsUseCase.execute(userId, queryOptions, requestingUserId);
    res.status(httpStatus.OK).send(result);
  }

  async getCurrentUserTeams(req, res) {
    if (!req.user || !req.user.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User authentication required.');
    }
    const userId = req.user.id;
    const queryOptions = req.query;
    this.logger.info(`TeamMemberController: User ${userId} fetching their own teams`);
    // For GetUserTeamsUseCase, requestingUserId is the same as userId when fetching own teams
    const result = await this.getUserTeamsUseCase.execute(userId, queryOptions, userId);
    res.status(httpStatus.OK).send(result);
  }
}

module.exports = TeamMemberController;
