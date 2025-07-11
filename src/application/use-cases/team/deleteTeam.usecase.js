const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');
const TeamRole = require('../../../domain/team/teamRole.enums');

class DeleteTeamUseCase {
  constructor({ teamRepository, teamMemberRepository, logger }) { // Added logger and teamMemberRepository
    this.teamRepository = teamRepository;
    this.teamMemberRepository = teamMemberRepository; // Used for auth check and potentially cleanup if not cascaded
    this.logger = logger;
  }

  async execute(teamId, requestingUserId) {
    this.logger.info(`Attempting to delete team ID: ${teamId} by user ID: ${requestingUserId}`);

    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      this.logger.warn(`Team not found for ID: ${teamId} during delete attempt.`);
      throw new ApiError(httpStatus.NOT_FOUND, 'Team not found.');
    }

    // Authorization: Only team owner should delete the team
    // This check should ideally be done via teamMemberRepository to ensure the user is current owner AND active.
    const memberInfo = await this.teamMemberRepository.findByTeamAndUser(teamId, requestingUserId);
    if (!memberInfo || memberInfo.role !== TeamRole.OWNER || memberInfo.status !== 'active') {
       this.logger.warn(`User ID: ${requestingUserId} is not authorized to delete team ID: ${teamId}. Expected owner. Role: ${memberInfo?.role}, Status: ${memberInfo?.status}`);
       throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to delete this team. Only the owner can delete.');
    }
    // An alternative or additional check: if (team.ownerId !== requestingUserId) { ... }
    // However, using TeamMember is more robust as it checks current role and status.

    try {
      // The repository's delete method should handle deletion of the team.
      // Associated TeamMembers should be deleted via CASCADE constraint in DB.
      // If not using CASCADE, or if other cleanup is needed:
      // await this.teamMemberRepository.removeAllByTeamId(teamId); // (This method would need to be created)

      const deletedCount = await this.teamRepository.delete(teamId);
      if (deletedCount === 0) {
        // This case should ideally not be reached if team was found above,
        // unless there's a race condition or error in the repo delete logic.
        this.logger.error(`Failed to delete team ID: ${teamId}, repository reported 0 deleted rows.`);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete team.');
      }

      this.logger.info(`Team ID: ${teamId} deleted successfully by user ID: ${requestingUserId}.`);
      return { message: 'Team deleted successfully.' };
    } catch (error) {
      this.logger.error(`Error deleting team ID: ${teamId}: ${error.message}`, { error });
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to delete team: ${error.message}`);
    }
  }
}

module.exports = DeleteTeamUseCase;
