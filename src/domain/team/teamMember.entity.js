const TeamRole = require('./teamRole.enums');

class TeamMember {
  constructor(id, teamId, userId, role, status, createdAt, updatedAt) {
    this.id = id;
    this.teamId = teamId;
    this.userId = userId;
    this.role = role; // از TeamRole enum
    this.status = status; // مثلا: 'invited', 'active', 'inactive', 'rejected', 'left', 'kicked'
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = TeamMember;
