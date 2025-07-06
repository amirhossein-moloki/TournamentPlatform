/**
 * Represents a Tournament in the system.
 * This class encapsulates the properties and behavior of a tournament.
 */
class Tournament {
  /**
   * @param {string} id - The unique identifier for the tournament (UUID).
   * @param {string} name - Name of the tournament.
   * @param {string} gameId - ID of the game for the tournament.
   * @param {import('../game/game.entity').default} [game] - Optional Game entity associated with the tournament.
   * @param {string|null} description - Optional description of the tournament.
   * @param {string|null} rules - Optional rules for the tournament.
   * @param {string} status - Current status of the tournament (e.g., 'PENDING', 'REGISTRATION_OPEN', 'ONGOING', 'COMPLETED').
   * @param {number} entryFee - Entry fee for the tournament.
   * @param {number} prizePool - Total prize pool for the tournament.
   * @param {number} maxParticipants - Maximum number of participants allowed.
   * @param {number} currentParticipants - Current number of registered participants.
   * @param {Date} startDate - Start date and time of the tournament.
   * @param {Date|null} endDate - Optional end date and time of the tournament.
   * @param {string|null} organizerId - Optional ID of the user or entity organizing the tournament.
   * @param {Date} [createdAt] - Timestamp of when the tournament was created.
   * @param {Date} [updatedAt] - Timestamp of when the tournament was last updated.
   * @param {Array<Object>} [participants] - Array of participant objects/IDs (simplified for entity, might be managed by a service).
   * @param {Array<Object>} [matches] - Array of match objects/IDs (simplified for entity).
   */
  constructor(
    id,
    name,
    gameId, // Changed from gameName
    description,
    rules,
    status = 'PENDING',
    entryFee,
    prizePool,
    maxParticipants,
    currentParticipants = 0,
    startDate,
    endDate = null,
    organizerId = null,
    createdAt = new Date(),
    updatedAt = new Date(),
    participants = [], // Should primarily be IDs or simplified representations in domain entity
    matches = [],       // Same as participants
    // New fields added for alignment with model
    bannerImageUrl = null,
    bracketType = Tournament.BracketType.SINGLE_ELIMINATION,
    settings = {}
  ) {
    if (!id) throw new Error('Tournament ID is required.');
    if (!name) throw new Error('Tournament name is required.');
    if (!gameId) throw new Error('Game ID is required.'); // Changed from gameName
    if (entryFee == null || entryFee < 0) throw new Error('Valid entry fee is required and must be non-negative.');
    if (prizePool == null || prizePool < 0) throw new Error('Valid prize pool is required and must be non-negative.');
    if (!maxParticipants || maxParticipants <= 1) throw new Error('Max participants must be greater than 1.');
    if (!startDate) throw new Error('Start date is required.');
    if (endDate && new Date(endDate) < new Date(startDate)) throw new Error('End date cannot be before start date.');
    if (currentParticipants < 0 || currentParticipants > maxParticipants) {
      throw new Error('Current participants count is invalid.');
    }

    this.id = id;
    this.name = name;
    this.gameId = gameId; // Changed from gameName
    // this.game = game; // Store the associated Game entity if provided/fetched
    this.description = description;
    this.rules = rules;
    this.status = status;
    this.entryFee = parseFloat(entryFee);
    this.prizePool = parseFloat(prizePool);
    this.maxParticipants = parseInt(maxParticipants, 10);
    this.currentParticipants = parseInt(currentParticipants, 10);
    this.startDate = new Date(startDate);
    this.endDate = endDate ? new Date(endDate) : null;
    this.organizerId = organizerId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    // These are more complex relationships, often handled by services or repositories
    // rather than being directly part of the core entity's constructor in full detail.
    // For a pure domain entity, these might be managed via methods or separate aggregate roots.
    this._participants = participants; // Store as internal, manage via methods
    this._matches = matches;           // Store as internal, manage via methods

    // Assign new properties from constructor parameters
    this.bannerImageUrl = bannerImageUrl;
    this.bracketType = bracketType;
    this.settings = settings;
  }

  // --- Factory Method ---
  static fromPersistence(data) {
    if (!data) return null;
    // Ensure Game entity is also correctly imported if needed here
    // import Game from '../game/game.entity';

    return new Tournament(
      data.id,
      data.name,
      data.gameId, // Changed from gameName
      data.description,
      data.rules,
      data.status,
      data.entryFee,
      data.prizePool,
      data.maxParticipants || data.capacity, // Handle potential name difference
      data.currentParticipants,
      data.startDate,
      data.endDate,
      data.organizerId || data.createdBy, // Handle potential name difference
      data.createdAt,
      data.updatedAt,
      [], // participants - typically not hydrated from simple persistence
      [], // matches - typically not hydrated from simple persistence
      data.bannerImageUrl,
      data.bracketType,
      data.settings
    );
  }

  // --- Enums ---
  static Status = {
    PENDING: 'PENDING',
    UPCOMING: 'UPCOMING', // Added to match model's usage
    REGISTRATION_OPEN: 'REGISTRATION_OPEN',
    REGISTRATION_CLOSED: 'REGISTRATION_CLOSED',
    ONGOING: 'ONGOING',
    COMPLETED: 'COMPLETED',
    CANCELED: 'CANCELED',
  };
  static validStatuses = Object.values(Tournament.Status);

  static BracketType = {
    SINGLE_ELIMINATION: 'SINGLE_ELIMINATION',
    DOUBLE_ELIMINATION: 'DOUBLE_ELIMINATION',
    ROUND_ROBIN: 'ROUND_ROBIN',
    SWISS: 'SWISS',
    // Add other common bracket types
  };
  static validBracketTypes = Object.values(Tournament.BracketType);


  // --- Status Management ---
  updateStatus(newStatus) {
    if (!Tournament.validStatuses.includes(newStatus)) {
      throw new Error(`Invalid tournament status: ${newStatus}.`);
    }
    // Add business logic for valid status transitions if needed
    // e.g., cannot go from COMPLETED to PENDING
    this.status = newStatus;
    this.updatedAt = new Date();
  }

  openRegistration() {
    if (this.status !== 'PENDING') {
      throw new Error('Tournament registration can only be opened if status is PENDING.');
    }
    this.updateStatus('REGISTRATION_OPEN');
  }

  closeRegistration() {
    if (this.status !== 'REGISTRATION_OPEN') {
      throw new Error('Tournament registration can only be closed if it is currently open.');
    }
    this.updateStatus('REGISTRATION_CLOSED');
  }

  startTournament() {
    if (this.status !== 'REGISTRATION_CLOSED' && this.status !== 'REGISTRATION_OPEN') { // Some might start from OPEN
      throw new Error('Tournament can only be started if registration is closed or open (and criteria met).');
    }
    // Add checks: e.g., minimum participants reached? Start date is current?
    if (new Date() < this.startDate) {
      // throw new Error(`Tournament cannot start before its scheduled start date: ${this.startDate}`);
      // This might be a soft rule, or handled by a scheduler. For now, allow manual start.
    }
    this.updateStatus('ONGOING');
  }

  completeTournament() {
    if (this.status !== 'ONGOING') {
      throw new Error('Tournament can only be completed if it is ONGOING.');
    }
    this.updateStatus('COMPLETED');
    this.endDate = this.endDate || new Date(); // Set end date if not already set
  }

  cancelTournament(reason = 'Tournament canceled.') {
    // Cannot cancel if already COMPLETED or CANCELED
    if (this.status === 'COMPLETED' || this.status === 'CANCELED') {
      throw new Error(`Tournament is already ${this.status} and cannot be canceled.`);
    }
    // Logic for refunds or notifications would be handled by application services
    this.updateStatus('CANCELED');
    // Add a reason field to the entity or log this reason if important
    this.description = this.description ? `${this.description}\nCanceled: ${reason}` : `Canceled: ${reason}`;
    this.updatedAt = new Date();
  }

  // --- Participant Management ---
  canRegister() {
    return this.status === 'REGISTRATION_OPEN' && this.currentParticipants < this.maxParticipants;
  }

  addParticipant(participantId) { // participantId could be a User ID or a Team ID
    if (!this.canRegister()) {
      throw new Error('Cannot register participant: Registration not open or tournament is full.');
    }
    // In a real scenario, participant details would be more complex (e.g., a Participant entity)
    // For simplicity, we might just increment count here. Actual participant list is often a separate table.
    // This entity method should focus on the state change of the tournament itself.
    // The actual linking of a user/team to a tournament is an application service concern,
    // which then calls this method or a method on a Participant aggregate.
    this.currentParticipants += 1;
    if (this.currentParticipants === this.maxParticipants) {
      // Optionally auto-close registration if full, or leave it for manual closing.
      // this.closeRegistration(); // This might be too aggressive here.
    }
    this.updatedAt = new Date();
    // Note: Managing the `_participants` array directly here can make the entity heavy.
    // It's often better if `_participants` is a list of IDs and the full objects are fetched by a service.
    // For now, let's assume `participantId` is added to an internal list if needed by other domain logic within Tournament.
    // if (!this._participants.find(p => p.id === participantId)) {
    //   this._participants.push({ id: participantId, joinedAt: new Date() });
    // }
  }

  removeParticipant(participantId) {
    // Business logic for removing a participant
    // e.g., only if registration is open, or if specific conditions are met.
    // This also affects `currentParticipants`.
    // Similar to addParticipant, detailed list management might be outside the core entity's direct responsibility.
    const initialCount = this.currentParticipants;
    // Example: this._participants = this._participants.filter(p => p.id !== participantId);
    // this.currentParticipants = this._participants.length;
    if (this.currentParticipants > 0) { // Placeholder for actual logic
        this.currentParticipants -=1;
    }
    if (initialCount !== this.currentParticipants) {
        this.updatedAt = new Date();
    }
  }

  isFull() {
    return this.currentParticipants >= this.maxParticipants;
  }

  // --- Other Properties Update ---
  updateDetails(details) {
    // Only allow updating certain fields, and perhaps only in certain statuses
    if (this.status === 'ONGOING' || this.status === 'COMPLETED' || this.status === 'CANCELED') {
      throw new Error(`Cannot update details for a tournament that is ${this.status}.`);
    }
    if (details.name) this.name = details.name;
    // if (details.gameName) this.gameName = details.gameName; // Keep gameId instead
    if (details.gameId) this.gameId = details.gameId; // Allow updating gameId
    if (details.description !== undefined) this.description = details.description;
    if (details.rules !== undefined) this.rules = details.rules;
    if (details.entryFee !== undefined && parseFloat(details.entryFee) >= 0) this.entryFee = parseFloat(details.entryFee);
    if (details.prizePool !== undefined && parseFloat(details.prizePool) >= 0) this.prizePool = parseFloat(details.prizePool);
    if (details.maxParticipants !== undefined && parseInt(details.maxParticipants, 10) > 1) {
      if (parseInt(details.maxParticipants, 10) < this.currentParticipants) {
        throw new Error('New max participants cannot be less than current number of participants.');
      }
      this.maxParticipants = parseInt(details.maxParticipants, 10);
    }
    if (details.startDate) {
        const newStartDate = new Date(details.startDate);
        if (newStartDate <= new Date() && this.status === 'PENDING') { // Or some other logic for date changes
            // throw new Error('New start date must be in the future.');
        }
        this.startDate = newStartDate;
    }
    if (details.endDate !== undefined) this.endDate = details.endDate ? new Date(details.endDate) : null;
    if (this.endDate && this.endDate < this.startDate) {
        throw new Error('End date cannot be before start date.');
    }

    this.updatedAt = new Date();
  }

  // Accessors for participants and matches if needed for domain logic within Tournament
  // getParticipants() { return [...this._participants]; }
  // getMatches() { return [...this._matches]; }
  // addMatch(match) { this._matches.push(match); this.updatedAt = new Date(); }
}

module.exports = {
  Tournament,
  TournamentStatus: Tournament.Status, // Exporting the Status enum
  BracketType: Tournament.BracketType, // Exporting the BracketType enum
};
// Similar to User.entity.js, using a named export for potential future additions from this file.
