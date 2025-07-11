class Team {
  constructor(id, name, description, logoUrl, ownerId, createdAt, updatedAt) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.logoUrl = logoUrl;
    this.ownerId = ownerId; // شناسه کاربری که مالک تیم است
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Team;
