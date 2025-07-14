const { NotFoundError, ForbiddenError, BadRequestError, InternalServerError } = require('../../../utils/errors');
const TeamRole = require('../../../domain/team/teamRole.enums');

class ChangeTeamOwnerUseCase {
  constructor({ teamRepository, userRepository, teamMemberRepository, logger }) { // Added logger
    this.teamRepository = teamRepository;
    this.userRepository = userRepository;
    this.teamMemberRepository = teamMemberRepository; // Used for auth and role checks
    this.logger = logger;
  }

  async execute(teamId, newOwnerId, currentUserId) {
    this.logger.info(`Attempting to change owner for team ID: ${teamId} to new owner ID: ${newOwnerId} by current user ID: ${currentUserId}`);

    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      this.logger.warn(`Team not found for ID: ${teamId} during ownership change.`);
      throw new NotFoundError('Team not found.');
    }

    // Authorization: Only current owner can change ownership
    // Check using team.ownerId (from Team model) and also verify with TeamMember entry for robustness.
    const currentOwnerMemberInfo = await this.teamMemberRepository.findByTeamAndUser(teamId, currentUserId);
    if (team.ownerId !== currentUserId || !currentOwnerMemberInfo || currentOwnerMemberInfo.role !== TeamRole.OWNER || currentOwnerMemberInfo.status !== 'active') {
      this.logger.warn(`User ID: ${currentUserId} is not authorized to change ownership for team ID: ${teamId}. Expected current owner. Team's ownerId: ${team.ownerId}, User's role: ${currentOwnerMemberInfo?.role}`);
      throw new ForbiddenError('Only the current team owner can change ownership.');
    }

    if (team.ownerId === newOwnerId) {
      this.logger.info(`New owner ID: ${newOwnerId} is the same as the current owner for team ID: ${teamId}. No change needed.`);
      throw new BadRequestError('New owner is the same as the current owner.');
    }

    const newOwnerUser = await this.userRepository.findById(newOwnerId);
    if (!newOwnerUser) {
      this.logger.warn(`Prospective new owner (User ID: ${newOwnerId}) not found.`);
      throw new NotFoundError('New owner (User) not found.');
    }

    try {
      // The repository method `changeOwner` handles the transaction for:
      // 1. Updating Team.ownerId
      // 2. Changing old owner's role (e.g., to ADMIN)
      // 3. Setting new owner's role to OWNER (and adding/activating them as member if needed)
      const updatedTeam = await this.teamRepository.changeOwner(teamId, newOwnerId); // currentUserId is implicitly validated above

      this.logger.info(`Ownership of team ID: ${teamId} successfully changed from user ID: ${currentUserId} to user ID: ${newOwnerId}.`);
      return updatedTeam.get({ plain: true });
    } catch (error) {
      this.logger.error(`Error changing ownership for team ID: ${teamId} to new owner ID: ${newOwnerId}: ${error.message}`, { error });
      // Specific errors like 'New owner not a member and failed to add' could be handled in repo or here
      throw new InternalServerError(`Failed to change team ownership: ${error.message}`);
    }
  }
}

module.exports = ChangeTeamOwnerUseCase;
