class GetAllTeamsUseCase {
  constructor({ teamRepository, logger }) { // Added logger
    this.teamRepository = teamRepository;
    this.logger = logger;
  }

  async execute(queryOptions = {}) {
    this.logger.info('Fetching all teams with query options:', queryOptions);
    const { page = 1, pageSize = 10, sortBy = 'createdAt', sortOrder = 'DESC', ...filterCriteria } = queryOptions;

    const options = {
        criteria: filterCriteria, // These are WHERE clauses
        limit: parseInt(pageSize, 10),
        offset: (parseInt(page, 10) - 1) * parseInt(pageSize, 10),
        sortBy: sortBy,
        sortOrder: sortOrder
    };

    // Assuming teamRepository.findAll can take criteria and options separately
    // Or merge them if it expects a single object
    const teams = await this.teamRepository.findAll(options.criteria, options);
    const totalCount = await this.teamRepository.count(options.criteria);

    this.logger.info(`Found ${teams.length} teams, total count matching criteria: ${totalCount}.`);

    return {
        teams: teams.map(t => t.get({ plain: true })),
        currentPage: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(pageSize, 10)),
    };
  }
}

module.exports = GetAllTeamsUseCase;
