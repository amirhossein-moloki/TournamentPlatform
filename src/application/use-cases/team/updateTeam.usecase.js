const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');
const TeamRole = require('../../../domain/team/teamRole.enums'); // For authorization checks

class UpdateTeamUseCase {
  constructor({ teamRepository, teamMemberRepository, logger }) { // Added logger and teamMemberRepository for auth
    this.teamRepository = teamRepository;
    this.teamMemberRepository = teamMemberRepository;
    this.logger = logger;
  }

  // requestingUserId and userRoleInTeam (or a more comprehensive claimsPrincipal) would be passed from controller
  async execute(teamId, updatePayload, requestingUserId) {
    this.logger.info(`Attempting to update team ID: ${teamId} by user ID: ${requestingUserId} with payload:`, updatePayload);
    const { name, description, logoUrl } = updatePayload;

    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      this.logger.warn(`Team not found for ID: ${teamId} during update attempt.`);
      throw new ApiError(httpStatus.NOT_FOUND, 'Team not found.');
    }

    // Authorization Check: User must be owner or admin of the team
    // This is a simplified check. A more robust system might use a permissions service or check roles from teamMemberRepository.
    const memberInfo = await this.teamMemberRepository.findByTeamAndUser(teamId, requestingUserId);
    if (!memberInfo || (memberInfo.role !== TeamRole.OWNER && memberInfo.role !== TeamRole.ADMIN) || memberInfo.status !== 'active') {
        this.logger.warn(`User ID: ${requestingUserId} is not authorized to update team ID: ${teamId}. Role: ${memberInfo?.role}, Status: ${memberInfo?.status}`);
        throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to update this team.');
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;

    if (Object.keys(updateData).length === 0) {
        this.logger.info(`No actual data to update for team ID: ${teamId}. Returning current team data.`);
        return team.get({ plain: true }); // Or throw bad request if an update was expected
    }

    if (updateData.name && updateData.name !== team.name) {
        const existingTeam = await this.teamRepository.findByName(updateData.name);
        if (existingTeam && existingTeam.id !== teamId) {
          this.logger.warn(`Team name "${updateData.name}" already taken. Conflict during update of team ID: ${teamId}.`);
          throw new ApiError(httpStatus.CONFLICT, 'Team name already taken.');
        }
    }

    try {
      const updatedTeamInstance = await this.teamRepository.update(teamId, updateData);
      if (!updatedTeamInstance) {
          this.logger.error(`Team ID: ${teamId} update returned no instance, though it should exist.`);
          throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update team, team might not have been found post-update.');
      }
      this.logger.info(`Team ID: ${teamId} updated successfully by user ID: ${requestingUserId}.`);
      // The 'update' method in Sequelize repository for `returning: true, plain: true` returns the updated object.
      return updatedTeamInstance.get ? updatedTeamInstance.get({ plain: true }) : updatedTeamInstance;
    } catch (error) {
      this.logger.error(`Error updating team ID: ${teamId}: ${error.message}`, { error });
      if (error.name === 'SequelizeUniqueConstraintError') {
         throw new ApiError(httpStatus.CONFLICT, 'Team name already exists or another unique constraint failed.');
      }
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to update team: ${error.message}`);
    }
  }
}

module.exports = UpdateTeamUseCase;
