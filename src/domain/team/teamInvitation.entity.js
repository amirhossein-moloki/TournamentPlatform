const { v4: uuidv4 } = require('uuid');

class TeamInvitation {
  constructor({ id, teamId, userId, inviterId, status, createdAt, updatedAt }) {
    this.id = id || uuidv4();
    this.teamId = teamId;
    this.userId = userId;
    this.inviterId = inviterId;
    this.status = status || 'PENDING';
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }
}

module.exports = TeamInvitation;
