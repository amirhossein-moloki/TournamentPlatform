/**
 * Represents a Tournament in the system.
 * This class encapsulates the properties and behavior of a tournament.
 */
class Tournament {
  /**
   * @param {string} id - The unique identifier for the tournament (UUID).
   * @param {string} name - Name of the tournament.
   * @param {string} gameId - ID of the game for the tournament.
   * @param {string|null} description - Optional description of the tournament.
   * @param {string|null} rules - Optional rules for the tournament.
   * @param {string} status - Current status of the tournament.
   * @param {number} entryFee - Entry fee for the tournament.
   * @param {string} entryFeeType - Type of entry fee.
   * @param {number} prizePool - Total prize pool for the tournament.
   * @param {string} prizeType - Type of prize.
   * @param {string|object|null} prizeDetails - Details of non-cash prizes.
   * @param {number} maxParticipants - Maximum number of participants allowed.
   * @param {number} currentParticipants - Current number of registered participants.
   * @param {Date} startDate - Start date and time of the tournament.
   * @param {Date|null} endDate - Optional end date and time of the tournament.
   * @param {string|null} organizerId - Optional ID of the user or entity organizing the tournament.
   * @param {string[]} managed_by - Array of User IDs managing the tournament.
   * @param {string[]} supported_by - Array of User IDs supporting the tournament.
   * @param {string|object|null} entryConditions - Conditions for entering the tournament.
   * @param {Date} [createdAt] - Timestamp of when the tournament was created.
   * @param {Date} [updatedAt] - Timestamp of when the tournament was last updated.
   * @param {string|null} bannerImageUrl - URL for the tournament banner.
   * @param {string} bracketType - Type of bracket for the tournament.
   * @param {object} settings - Additional settings for the tournament.
   */
  constructor(
    id,
    name,
    gameId,
    description,
    rules,
    status = Tournament.Status.PENDING,
    entryFee = 0,
    entryFeeType = Tournament.EntryFeeType.FREE,
    prizePool = 0,
    prizeType = Tournament.PrizeType.NONE,
    prizeDetails = null,
    maxParticipants,
    currentParticipants = 0,
    startDate,
    endDate = null,
    organizerId = null,
    managed_by = [],
    supported_by = [],
    entryConditions = {},
    createdAt = new Date(),
    updatedAt = new Date(),
    // participants = [], // Simplified, managed by service
    // matches = [],       // Simplified, managed by service
    bannerImageUrl = null,
    bracketType = Tournament.BracketType.SINGLE_ELIMINATION,
    settings = {}
  ) {
    if (!id) throw new Error('Tournament ID is required.');
    if (!name) throw new Error('Tournament name is required.');
    if (!gameId) throw new Error('Game ID is required.');
    if (entryFee < 0) throw new Error('Entry fee must be non-negative.');
    if (!Object.values(Tournament.EntryFeeType).includes(entryFeeType)) {
      throw new Error(`Invalid entry fee type: ${entryFeeType}.`);
    }
    if (prizePool < 0) throw new Error('Prize pool must be non-negative.');
    if (!Object.values(Tournament.PrizeType).includes(prizeType)) {
      throw new Error(`Invalid prize type: ${prizeType}.`);
    }
    if (!maxParticipants || maxParticipants <= 1) throw new Error('Max participants must be greater than 1.');
    if (!startDate) throw new Error('Start date is required.');
    if (endDate && new Date(endDate) < new Date(startDate)) throw new Error('End date cannot be before start date.');
    if (currentParticipants < 0 || currentParticipants > maxParticipants) {
      throw new Error('Current participants count is invalid.');
    }
    if (!Array.isArray(managed_by)) throw new Error('managed_by must be an array of User IDs.');
    if (!Array.isArray(supported_by)) throw new Error('supported_by must be an array of User IDs.');


    this.id = id;
    this.name = name;
    this.gameId = gameId;
    this.description = description;
    this.rules = rules;
    this.status = status;
    this.entryFee = parseFloat(entryFee);
    this.entryFeeType = entryFeeType;
    this.prizePool = parseFloat(prizePool);
    this.prizeType = prizeType;
    this.prizeDetails = prizeDetails;
    this.maxParticipants = parseInt(maxParticipants, 10);
    this.currentParticipants = parseInt(currentParticipants, 10);
    this.startDate = new Date(startDate);
    this.endDate = endDate ? new Date(endDate) : null;
    this.organizerId = organizerId; // Could be one of the managers or a separate entity
    this.managed_by = managed_by;
    this.supported_by = supported_by;
    this.entryConditions = entryConditions;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    this.bannerImageUrl = bannerImageUrl;
    this.bracketType = bracketType;
    this.settings = settings;

    this.participants = []; // Initialized as empty, populated from persistence
    // this._matches = matches;           // Store as internal, manage via methods
  }

  // --- Factory Method ---
  static fromPersistence(data) {
    if (!data) return null;

    return new Tournament(
      data.id,
      data.name,
      data.gameId,
      data.description,
      data.rules,
      data.status,
      data.entryFee,
      data.entryFeeType,
      data.prizePool,
      data.prizeType,
      data.prizeDetails,
      data.maxParticipants || data.capacity, // Handle potential name difference
      data.currentParticipants,
      data.startDate,
      data.endDate,
      data.organizerId || data.createdBy, // Handle potential name difference
      data.managed_by || [],
      data.supported_by || [],
      data.entryConditions || {},
      data.createdAt,
      data.updatedAt,
      data.bannerImageUrl,
      data.bracketType,
      data.settings
    );
  }

  // --- Enums ---
  static Status = {
    PENDING: 'PENDING',
    UPCOMING: 'UPCOMING',
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
  };
  static validBracketTypes = Object.values(Tournament.BracketType);

  static EntryFeeType = {
    FREE: 'FREE',
    PAID_CASH: 'PAID_CASH',
    PAID_INGAME_CURRENCY: 'PAID_INGAME_CURRENCY',
  };
  static validEntryFeeTypes = Object.values(Tournament.EntryFeeType);

  static PrizeType = {
    NONE: 'NONE', // No prize
    CASH: 'CASH',
    PHYSICAL_ITEM: 'PHYSICAL_ITEM',
    INGAME_ITEM: 'INGAME_ITEM',
    MIXED: 'MIXED', // Combination of prizes, details in prizeDetails
  };
  static validPrizeTypes = Object.values(Tournament.PrizeType);


  // --- Status Management ---
  updateStatus(newStatus) {
    if (!Tournament.validStatuses.includes(newStatus)) {
      throw new Error(`Invalid tournament status: ${newStatus}.`);
    }
    this.status = newStatus;
    this.updatedAt = new Date();
  }

  openRegistration() {
    if (this.status !== Tournament.Status.PENDING && this.status !== Tournament.Status.UPCOMING) {
      throw new Error(`Tournament registration can only be opened if status is PENDING or UPCOMING. Current: ${this.status}`);
    }
    this.updateStatus(Tournament.Status.REGISTRATION_OPEN);
  }

  closeRegistration() {
    if (this.status !== Tournament.Status.REGISTRATION_OPEN) {
      throw new Error('Tournament registration can only be closed if it is currently open.');
    }
    this.updateStatus(Tournament.Status.REGISTRATION_CLOSED);
  }

  startTournament() {
    if (this.status !== Tournament.Status.REGISTRATION_CLOSED && this.status !== Tournament.Status.REGISTRATION_OPEN) {
      throw new Error('Tournament can only be started if registration is closed or open (and criteria met).');
    }
    if (new Date() < this.startDate && this.status !== Tournament.Status.ONGOING) { // Allow manual start even if date is past for ONGOING
        // This might be relaxed depending on operational needs
        // console.warn(`Tournament '${this.name}' starting before its scheduled start date: ${this.startDate}`);
    }
    this.updateStatus(Tournament.Status.ONGOING);
  }

  completeTournament() {
    if (this.status !== Tournament.Status.ONGOING) {
      throw new Error('Tournament can only be completed if it is ONGOING.');
    }
    this.updateStatus(Tournament.Status.COMPLETED);
    this.endDate = this.endDate || new Date(); // Set end date if not already set
  }

  cancelTournament(reason = 'Tournament canceled.') {
    if (this.status === Tournament.Status.COMPLETED || this.status === Tournament.Status.CANCELED) {
      throw new Error(`Tournament is already ${this.status} and cannot be canceled.`);
    }
    this.updateStatus(Tournament.Status.CANCELED);
    this.description = this.description ? `${this.description}\nCanceled: ${reason}` : `Canceled: ${reason}`;
    this.updatedAt = new Date();
  }

  // --- Participant Management ---
  canRegister() {
    return this.status === Tournament.Status.REGISTRATION_OPEN && this.currentParticipants < this.maxParticipants;
  }

  addParticipant(/* participantId */) {
    if (!this.canRegister()) {
      throw new Error('Cannot register participant: Registration not open or tournament is full.');
    }
    this.currentParticipants += 1;
    this.updatedAt = new Date();
  }

  removeParticipant(/* participantId */) {
    if (this.currentParticipants > 0) {
        this.currentParticipants -=1;
        this.updatedAt = new Date();
    }
  }

  isFull() {
    return this.currentParticipants >= this.maxParticipants;
  }

  // --- Other Properties Update ---
  updateDetails(details) {
    if (this.status === Tournament.Status.ONGOING || this.status === Tournament.Status.COMPLETED || this.status === Tournament.Status.CANCELED) {
      // Allow some updates for ongoing tournaments if necessary, e.g., description, rules, banner.
      // For now, strict approach.
      // throw new Error(`Cannot update details for a tournament that is ${this.status}.`);
    }

    if (details.name !== undefined) this.name = details.name;
    if (details.gameId !== undefined) this.gameId = details.gameId;
    if (details.description !== undefined) this.description = details.description;
    if (details.rules !== undefined) this.rules = details.rules;

    if (details.entryFee !== undefined) {
        const newEntryFee = parseFloat(details.entryFee);
        if (newEntryFee < 0) throw new Error('Entry fee must be non-negative.');
        this.entryFee = newEntryFee;
    }
    if (details.entryFeeType !== undefined) {
        if (!Tournament.validEntryFeeTypes.includes(details.entryFeeType)) {
            throw new Error(`Invalid entry fee type: ${details.entryFeeType}.`);
        }
        this.entryFeeType = details.entryFeeType;
    }

    if (details.prizePool !== undefined) {
        const newPrizePool = parseFloat(details.prizePool);
        if (newPrizePool < 0) throw new Error('Prize pool must be non-negative.');
        this.prizePool = newPrizePool;
    }
    if (details.prizeType !== undefined) {
        if (!Tournament.validPrizeTypes.includes(details.prizeType)) {
            throw new Error(`Invalid prize type: ${details.prizeType}.`);
        }
        this.prizeType = details.prizeType;
    }
    if (details.prizeDetails !== undefined) this.prizeDetails = details.prizeDetails;


    if (details.maxParticipants !== undefined) {
        const newMaxParticipants = parseInt(details.maxParticipants, 10);
        if (newMaxParticipants <= 1) throw new Error('Max participants must be greater than 1.');
        if (newMaxParticipants < this.currentParticipants) {
            throw new Error('New max participants cannot be less than current number of participants.');
        }
        this.maxParticipants = newMaxParticipants;
    }
    if (details.startDate !== undefined) {
        this.startDate = new Date(details.startDate);
    }
    if (details.endDate !== undefined) { // Allow setting endDate to null
        this.endDate = details.endDate ? new Date(details.endDate) : null;
    }
    if (this.endDate && this.endDate < this.startDate) {
        throw new Error('End date cannot be before start date.');
    }

    if (details.organizerId !== undefined) this.organizerId = details.organizerId;
    if (details.managed_by !== undefined) {
        if (!Array.isArray(details.managed_by)) throw new Error('managed_by must be an array.');
        this.managed_by = [...new Set(details.managed_by)]; // Ensure unique IDs
    }
    if (details.supported_by !== undefined) {
        if (!Array.isArray(details.supported_by)) throw new Error('supported_by must be an array.');
        this.supported_by = [...new Set(details.supported_by)]; // Ensure unique IDs
    }
    if (details.entryConditions !== undefined) this.entryConditions = details.entryConditions;
    if (details.bannerImageUrl !== undefined) this.bannerImageUrl = details.bannerImageUrl;
    if (details.bracketType !== undefined) {
        if (!Tournament.validBracketTypes.includes(details.bracketType)) {
            throw new Error(`Invalid bracket type: ${details.bracketType}.`);
        }
        this.bracketType = details.bracketType;
    }
    if (details.settings !== undefined) this.settings = details.settings;

    this.updatedAt = new Date();
  }
}

module.exports = {
  Tournament,
  TournamentStatus: Tournament.Status,
  BracketType: Tournament.BracketType,
  EntryFeeType: Tournament.EntryFeeType,
  PrizeType: Tournament.PrizeType,
};
