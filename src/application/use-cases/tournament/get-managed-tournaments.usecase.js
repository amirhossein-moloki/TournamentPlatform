const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { User, UserRoles } = require('../../../domain/user/user.entity');

class GetManagedTournamentsUseCase {
  /**
   * @param {import('../../../domain/tournament/tournament.repository.interface')} tournamentRepository
   * @param {import('../../../domain/user/user.repository.interface')} userRepository
   */
  constructor(tournamentRepository, userRepository) {
    this.tournamentRepository = tournamentRepository;
    this.userRepository = userRepository;
  }

  /**
   * Retrieves a paginated list of tournaments managed by a specific user.
   * @param {string} managerUserId - The ID of the Tournament Manager.
   * @param {object} [options={}] - Pagination, filtering, and sorting options.
   * @param {number} [options.page=1] - Current page number.
   * @param {number} [options.limit=10] - Number of items per page.
   * @param {string} [options.status] - Filter by tournament status.
   * @param {string} [options.gameId] - Filter by game ID.
   * @param {string} [options.sortBy] - Sort criteria (e.g., 'startDate:asc', 'name:desc').
   * @returns {Promise<{tournaments: Tournament[], totalItems: number, totalPages: number, currentPage: number, pageSize: number}>}
   */
  async execute(managerUserId, options = {}) {
    if (!managerUserId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Manager User ID is required.');
    }

    const manager = await this.userRepository.findById(managerUserId);
    if (!manager) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, `Manager with ID ${managerUserId} not found.`);
    }
    if (!manager.hasRole(UserRoles.TOURNAMENT_MANAGER)) {
      throw new ApiError(httpStatusCodes.FORBIDDEN, `User ${managerUserId} is not authorized (missing TOURNAMENT_MANAGER role).`);
    }

    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const filters = {
      managedBy: managerUserId, // Specific filter criteria for the repository
    };
    if (options.status) {
      filters.status = options.status;
    }
    if (options.gameId) {
      filters.gameId = options.gameId;
    }

    const sort = {};
    if (options.sortBy) {
        const parts = options.sortBy.split(':');
        sort.field = parts[0];
        sort.order = parts[1] && parts[1].toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    } else {
        sort.field = 'startDate'; // Default sort
        sort.order = 'ASC';
    }

    // The repository's findAll (or a dedicated method like findAndCountManagedBy)
    // needs to handle filtering by managedBy array containment and other filters,
    // along with pagination and sorting.
    const { tournaments, totalItems } = await this.tournamentRepository.findAndCountAll({
        filters,
        limit,
        offset,
        sortBy: sort.field,
        sortOrder: sort.order
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      tournaments,
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: limit,
    };
  }
}

module.exports = GetManagedTournamentsUseCase;
