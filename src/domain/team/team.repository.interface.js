class ITeamRepository {
  async create(teamData, ownerId) { // ownerId for initial member creation
    throw new Error("Method 'create()' must be implemented.");
  }

  async findById(teamId) {
    throw new Error("Method 'findById()' must be implemented.");
  }

  async findByName(name) {
    throw new Error("Method 'findByName()' must be implemented.");
  }

  async findAll(criteria = {}, options = {}) {
    // options can include pagination, sorting
    throw new Error("Method 'findAll()' must be implemented.");
  }

  async update(teamId, updateData) {
    throw new Error("Method 'update()' must be implemented.");
  }

  async delete(teamId) {
    // This should also handle related entities like TeamMembers (cascade or check)
    throw new Error("Method 'delete()' must be implemented.");
  }

  async count(criteria = {}) {
    throw new Error("Method 'count()' must be implemented.");
  }

  // Consider if this is needed, or if team's owner is just a property
  async changeOwner(teamId, newOwnerId) {
    throw new Error("Method 'changeOwner()' must be implemented.");
  }
}

module.exports = ITeamRepository;
