const { v4: uuidv4 } = require('uuid');

class Team {
  constructor({ id = uuidv4(), name, description = null, logoUrl = null, ownerId, createdAt = new Date(), updatedAt = new Date() }) {
    if (!id) throw new Error('Team ID is required.');
    if (!name) throw new Error('Team name is required.');
    if (!ownerId) throw new Error('Team owner ID is required.');

    this.id = id;
    this.name = name;
    this.description = description;
    this.logoUrl = logoUrl;
    this.ownerId = ownerId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  updateDetails({ name, description, logoUrl }) {
    if (name) {
      this.name = name;
    }
    if (description !== undefined) {
      this.description = description;
    }
    if (logoUrl !== undefined) {
      this.logoUrl = logoUrl;
    }
    this.updatedAt = new Date();
  }

  changeOwner(newOwnerId) {
    if (!newOwnerId) throw new Error('New owner ID is required.');
    this.ownerId = newOwnerId;
    this.updatedAt = new Date();
  }
}

module.exports = Team;
