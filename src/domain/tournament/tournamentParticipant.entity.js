// src/domain/tournament/tournamentParticipant.entity.js

class TournamentParticipant {
  /**
   * @param {string} id - The unique identifier for the participation record.
   * @param {string} tournamentId - ID of the tournament.
   * @param {string} participantId - ID of the participant (User or Team).
   * @param {string} participantType - Type of participant ('user' or 'team').
   * @param {Date} registeredAt - Timestamp of registration.
   * @param {boolean} checkInStatus - Whether the participant has checked in.
   * @param {number|null} seed - The participant's seed in the tournament.
   * @param {Date} [createdAt] - Timestamp of when the record was created (if different from registeredAt).
   * @param {Date} [updatedAt] - Timestamp of when the record was last updated.
   */
  constructor(
    id,
    tournamentId,
    participantId,
    participantType,
    registeredAt,
    checkInStatus = false,
    seed = null,
    createdAt = new Date(), // Defaulting, persistence layer might override
    updatedAt = new Date()  // Defaulting, persistence layer might override
  ) {
    if (!id) throw new Error('TournamentParticipant ID is required.');
    if (!tournamentId) throw new Error('Tournament ID is required.');
    if (!participantId) throw new Error('Participant ID is required.');
    if (!participantType) throw new Error('Participant type is required.'); // Could add validation e.g., ['user', 'team']
    if (!registeredAt) throw new Error('Registration timestamp is required.');

    this.id = id;
    this.tournamentId = tournamentId;
    this.participantId = participantId;
    this.participantType = participantType;
    this.registeredAt = new Date(registeredAt);
    this.checkInStatus = checkInStatus;
    this.seed = seed !== null ? parseInt(seed, 10) : null;
    this.createdAt = createdAt; // Usually managed by DB timestamps
    this.updatedAt = updatedAt; // Usually managed by DB timestamps
  }

  static fromPersistence(data) {
    if (!data) return null;
    return new TournamentParticipant(
      data.id,
      data.tournamentId,
      data.participantId,
      data.participantType,
      data.registeredAt,
      data.checkInStatus,
      data.seed,
      data.createdAt,
      data.updatedAt
    );
  }

  checkIn() {
    if (this.checkInStatus) {
      // console.warn('Participant already checked in.');
      return;
    }
    this.checkInStatus = true;
    this.updatedAt = new Date();
  }

  undoCheckIn() {
    if (!this.checkInStatus) {
      // console.warn('Participant not checked in yet.');
      return;
    }
    this.checkInStatus = false;
    this.updatedAt = new Date();
  }

  assignSeed(newSeed) {
    if (newSeed !== null && (isNaN(parseInt(newSeed, 10)) || parseInt(newSeed, 10) <= 0)) {
      throw new Error('Seed must be a positive integer or null.');
    }
    this.seed = newSeed !== null ? parseInt(newSeed, 10) : null;
    this.updatedAt = new Date();
  }
}

module.exports = { TournamentParticipant };
