const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');

class GetUserTeamsUseCase {
  constructor({ teamMemberRepository, userRepository, logger }) {
    this.teamMemberRepository = teamMemberRepository;
    this.userRepository = userRepository;
    this.logger = logger;
  }

  async execute(userId, queryOptions = {}, requestingUserId = null) {
    this.logger.info(`Fetching teams for user ID: ${userId} with options:`, queryOptions);

    // Authorization: User can only fetch their own teams, or admin can fetch for any user.
    // This example assumes user is fetching their own, or an admin check happens in controller.
    if (requestingUserId && requestingUserId !== userId /* && !isRequestingUserAdmin */) {
        this.logger.warn(`User ID: ${requestingUserId} attempting to fetch teams for another user ID: ${userId} without admin rights.`);
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to view another user's teams.");
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
        this.logger.warn(`User not found for ID: ${userId} when fetching their teams.`);
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found.');
    }

    const { page = 1, pageSize = 10, status, sortBy = 'createdAt', sortOrder = 'DESC' } = queryOptions;

    const filterCriteria = {};
    if (status) filterCriteria.status = status; // Membership status

    const repoOptions = {
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
        status,
        sortBy, // Sort by fields in TeamMember table, or joined Team table (e.g. 'Team.name')
        sortOrder,
        includeTeamDetails: true
    };

    // Assuming findAllByUserId can handle pagination options and filters
    const memberships = await this.teamMemberRepository.findAllByUserId(userId, repoOptions);
    const totalCount = await this.teamMemberRepository.countByUserId(userId, filterCriteria);

    this.logger.info(`Found ${memberships.length} team memberships for user ID: ${userId}. Total matching criteria: ${totalCount}.`);

    return {
        memberships: memberships.map(m => {
            const membershipData = m.get({ plain: true });
            // Ensure sensitive team data is handled if 'team' object is included
            // e.g. if team had private fields, filter them here.
            if (membershipData.team && membershipData.team.owner && membershipData.team.owner.User) { // Example of nested sensitive data
                 delete membershipData.team.owner.User.passwordHash;
            }
            return membershipData;
        }),
        currentPage: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
        totalCount,
        totalPages: totalCount > 0 ? Math.ceil(totalCount / parseInt(pageSize, 10)) : 0,
    };
  }
}

module.exports = GetUserTeamsUseCase;
