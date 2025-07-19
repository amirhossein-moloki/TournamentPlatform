const { v4: uuidv4 } = require('uuid');

class TournamentImage {
  constructor({ id, tournamentId, url, description, isPrimary, createdAt, updatedAt }) {
    this.id = id || uuidv4();
    this.tournamentId = tournamentId;
    this.url = url;
    this.description = description;
    this.isPrimary = isPrimary || false;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }
}

module.exports = TournamentImage;
