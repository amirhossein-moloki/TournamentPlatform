class ITeamMemberRepository {
  async add(teamId, userId, role, status = 'invited', invitedByUserId = null) {
    // invitedByUserId can be null if system invites or owner adds directly
    throw new Error("Method 'add()' must be implemented.");
  }

  async findById(memberId) {
    throw new Error("Method 'findById()' must be implemented.");
  }

  async findByTeamAndUser(teamId, userId) {
    throw new Error("Method 'findByTeamAndUser()' must be implemented.");
  }

  async update(memberId, { role, status }) {
    throw new Error("Method 'update()' must be implemented.");
  }

  async updateByTeamAndUser(teamId, userId, { role, status }) {
    throw new Error("Method 'updateByTeamAndUser()' must be implemented.");
  }

  async remove(memberId) {
    throw new Error("Method 'remove()' must be implemented.");
  }

  async removeByTeamAndUser(teamId, userId) {
    throw new Error("Method 'removeByTeamAndUser()' must be implemented.");
  }

  async findAllByTeamId(teamId, options = {}) {
    // options can include pagination, status filter, role filter, includeUserDetails
    throw new Error("Method 'findAllByTeamId()' must be implemented.");
  }

  async findAllByUserId(userId, options = {}) {
    // options can include pagination, status filter, includeTeamDetails
    throw new Error("Method 'findAllByUserId()' must be implemented.");
  }

  async countByTeamId(teamId, criteria = {}) {
    // criteria for filtering members (e.g., by status)
    throw new Error("Method 'countByTeamId()' must be implemented.");
  }

  async countByUserId(userId, criteria = {}) {
    // criteria for filtering teams a user is part of (e.g., by status in team)
    throw new Error("Method 'countByUserId()' must be implemented.");
  }
}

module.exports = ITeamMemberRepository;
