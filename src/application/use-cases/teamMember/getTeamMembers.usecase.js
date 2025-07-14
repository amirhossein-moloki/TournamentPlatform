const { NotFoundError, ForbiddenError } = require('../../../utils/errors');
const TeamRole = require('../../../domain/team/teamRole.enums'); // For role filtering if needed

class GetTeamMembersUseCase {
  constructor({ teamMemberRepository, teamRepository, logger }) {
    this.teamMemberRepository = teamMemberRepository;
    this.teamRepository = teamRepository;
    this.logger = logger;
  }

  async execute(teamId, queryOptions = {}, requestingUserId = null) { // requestingUserId for auth if needed
    this.logger.info(`Fetching members for team ID: ${teamId} with options:`, queryOptions);

    const team = await this.teamRepository.findById(teamId);
    if (!team) {
        this.logger.warn(`Team not found for ID: ${teamId} when fetching members.`);
        throw new NotFoundError('Team not found.');
    }

    // Optional: Authorization check if only team members can view the member list
    // if (requestingUserId) {
    //   const requesterMembership = await this.teamMemberRepository.findByTeamAndUser(teamId, requestingUserId);
    //   if (!requesterMembership || requesterMembership.status !== 'active') {
    //     this.logger.warn(`User ID: ${requestingUserId} is not an active member of team ID: ${teamId}, cannot view members.`);
    //     throw new ForbiddenError('You must be an active member of the team to view its members.');
    //   }
    // }


    const { page = 1, pageSize = 10, status, role, sortBy = 'createdAt', sortOrder = 'ASC' } = queryOptions;

    const filterCriteria = {};
    if (status) filterCriteria.status = status;
    if (role) filterCriteria.role = role;

    const repoOptions = {
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
        status, // Pass directly if repo handles it
        role,   // Pass directly if repo handles it
        sortBy,
        sortOrder,
        includeUserDetails: true
    };

    // Assuming findAllByTeamId can handle pagination options and filters
    const members = await this.teamMemberRepository.findAllByTeamId(teamId, repoOptions);
    // The count should also respect the filters
    const totalCount = await this.teamMemberRepository.countByTeamId(teamId, filterCriteria);

    this.logger.info(`Found ${members.length} members for team ID: ${teamId}. Total matching criteria: ${totalCount}.`);

    return {
        members: members.map(m => {
            const memberData = m.get({ plain: true });
            // Ensure sensitive user data is not exposed if 'user' object is included
            if (memberData.user) {
                delete memberData.user.passwordHash; // Example: remove sensitive fields
                delete memberData.user.refreshToken;
                delete memberData.user.verificationToken;
            }
            return memberData;
        }),
        currentPage: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
        totalCount,
        totalPages: totalCount > 0 ? Math.ceil(totalCount / parseInt(pageSize, 10)) : 0,
    };
  }
}

module.exports = GetTeamMembersUseCase;
