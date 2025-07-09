const { Tournament, TournamentStatus, BracketType } = require('../../../../src/domain/tournament/tournament.entity');
const { v4: uuidv4 } = require('uuid');

describe('Tournament Entity', () => {
  const gameId = uuidv4();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const baseTournamentData = {
    id: uuidv4(),
    name: 'Test Tournament',
    gameId: gameId,
    description: 'A test tournament',
    rules: 'Standard rules apply',
    entryFee: 10,
    prizePool: 1000,
    maxParticipants: 32,
    startDate: tomorrow.toISOString(),
  };

  describe('Constructor', () => {
    it('should create a tournament instance with required fields and defaults', () => {
      const tournament = new Tournament(
        baseTournamentData.id,
        baseTournamentData.name,
        baseTournamentData.gameId,
        baseTournamentData.description,
        baseTournamentData.rules,
        TournamentStatus.PENDING, // status
        baseTournamentData.entryFee,
        baseTournamentData.prizePool,
        baseTournamentData.maxParticipants,
        0, // currentParticipants
        baseTournamentData.startDate
      );

      expect(tournament).toBeInstanceOf(Tournament);
      expect(tournament.id).toBe(baseTournamentData.id);
      expect(tournament.name).toBe(baseTournamentData.name);
      expect(tournament.gameId).toBe(baseTournamentData.gameId);
      expect(tournament.description).toBe(baseTournamentData.description);
      expect(tournament.rules).toBe(baseTournamentData.rules);
      expect(tournament.status).toBe(TournamentStatus.PENDING);
      expect(tournament.entryFee).toBe(10);
      expect(tournament.prizePool).toBe(1000);
      expect(tournament.maxParticipants).toBe(32);
      expect(tournament.currentParticipants).toBe(0);
      expect(tournament.startDate).toEqual(new Date(baseTournamentData.startDate));
      expect(tournament.endDate).toBeNull();
      expect(tournament.organizerId).toBeNull();
      expect(tournament.createdAt).toBeInstanceOf(Date);
      expect(tournament.updatedAt).toBeInstanceOf(Date);
      expect(tournament.bannerImageUrl).toBeNull();
      expect(tournament.bracketType).toBe(BracketType.SINGLE_ELIMINATION);
      expect(tournament.settings).toEqual({});
      expect(tournament._participants).toEqual([]);
      expect(tournament._matches).toEqual([]);
    });

    it('should allow overriding default and optional fields', () => {
        const specificData = {
            ...baseTournamentData,
            status: TournamentStatus.REGISTRATION_OPEN,
            currentParticipants: 5,
            endDate: dayAfterTomorrow.toISOString(),
            organizerId: uuidv4(),
            bannerImageUrl: 'http://example.com/banner.jpg',
            bracketType: BracketType.DOUBLE_ELIMINATION,
            settings: { teamSize: 2 }
        };
        const tournament = new Tournament(
            specificData.id, specificData.name, specificData.gameId, specificData.description, specificData.rules,
            specificData.status, specificData.entryFee, specificData.prizePool, specificData.maxParticipants,
            specificData.currentParticipants, specificData.startDate, specificData.endDate, specificData.organizerId,
            new Date(), new Date(), [{id: 'p1'}], [{id: 'm1'}], // participants, matches
            specificData.bannerImageUrl, specificData.bracketType, specificData.settings
        );
        expect(tournament.status).toBe(specificData.status);
        expect(tournament.currentParticipants).toBe(5);
        expect(tournament.endDate).toEqual(new Date(specificData.endDate));
        expect(tournament.organizerId).toBe(specificData.organizerId);
        expect(tournament.bannerImageUrl).toBe(specificData.bannerImageUrl);
        expect(tournament.bracketType).toBe(specificData.bracketType);
        expect(tournament.settings).toEqual(specificData.settings);
        expect(tournament._participants).toEqual([{id: 'p1'}]);
        expect(tournament._matches).toEqual([{id: 'm1'}]);
    });

    const requiredFieldsValidation = [
        { field: 'id', mod: {[ 'id']: null}, message: 'Tournament ID is required.' },
        { field: 'name', mod: {[ 'name']: ''}, message: 'Tournament name is required.' },
        { field: 'gameId', mod: {[ 'gameId']: null}, message: 'Game ID is required.' },
        { field: 'entryFee', mod: {[ 'entryFee']: -1}, message: 'Valid entry fee is required and must be non-negative.' },
        { field: 'prizePool', mod: {[ 'prizePool']: null}, message: 'Valid prize pool is required and must be non-negative.' },
        { field: 'maxParticipants', mod: {[ 'maxParticipants']: 1}, message: 'Max participants must be greater than 1.' },
        { field: 'maxParticipants', mod: {[ 'maxParticipants']: 0}, message: 'Max participants must be greater than 1.' },
        { field: 'startDate', mod: {[ 'startDate']: null}, message: 'Start date is required.' },
        { field: 'endDate', mod: {[ 'endDate']: new Date(new Date(tomorrow).setDate(tomorrow.getDate() - 2)).toISOString()}, message: 'End date cannot be before start date.' }, // End date before start
        { field: 'currentParticipants', mod: {[ 'currentParticipants']: -1}, message: 'Current participants count is invalid.' },
        { field: 'currentParticipants', mod: {[ 'currentParticipants']: 33, maxParticipants: 32 }, message: 'Current participants count is invalid.' },
    ];

    requiredFieldsValidation.forEach(tc => {
        it(`should throw an error if ${tc.field} is invalid`, () => {
            const data = { ...baseTournamentData, ...tc.mod };
            expect(() => new Tournament(
                data.id, data.name, data.gameId, data.description, data.rules,
                data.status || TournamentStatus.PENDING, data.entryFee, data.prizePool, data.maxParticipants,
                data.currentParticipants || 0, data.startDate, data.endDate, data.organizerId
            )).toThrow(tc.message);
        });
    });
  });

  describe('Static Factory Method: fromPersistence', () => {
    it('should create a Tournament instance from persistence data', () => {
        const createdByUuid = uuidv4();
        const persistenceData = {
            id: uuidv4(), name: 'Persistent Tournament', gameId: uuidv4(), description: 'Loaded from DB', rules: 'DB Rules',
            status: TournamentStatus.ONGOING, entryFee: 20, prizePool: 2000, currentParticipants: 10,
            startDate: tomorrow.toISOString(), endDate: dayAfterTomorrow.toISOString(), /* organizerId is omitted here to test createdBy */ createdAt: new Date(), updatedAt: new Date(),
            bannerImageUrl: 'http://db.com/banner.png', bracketType: BracketType.ROUND_ROBIN, settings: { pointsPerWin: 3 },
            capacity: 16, // testing alias for maxParticipants
            createdBy: createdByUuid // testing alias for organizerId
        };
        const tournament = Tournament.fromPersistence(persistenceData);
        expect(tournament).toBeInstanceOf(Tournament);
        expect(tournament.id).toBe(persistenceData.id);
        expect(tournament.name).toBe(persistenceData.name);
        expect(tournament.gameId).toBe(persistenceData.gameId);
        expect(tournament.status).toBe(TournamentStatus.ONGOING);
        expect(tournament.maxParticipants).toBe(16); // checks capacity alias
        expect(tournament.organizerId).toBe(createdByUuid); // checks createdBy alias was used
        expect(tournament.bannerImageUrl).toBe(persistenceData.bannerImageUrl);
        expect(tournament.bracketType).toBe(BracketType.ROUND_ROBIN);
        expect(tournament.settings).toEqual(persistenceData.settings);
        expect(tournament._participants).toEqual([]); // Should be empty from this factory
        expect(tournament._matches).toEqual([]);     // Should be empty
    });

    it('should handle aliases for maxParticipants (capacity) and organizerId (createdBy)', () => {
        const persistenceData = {
            id: uuidv4(), name: 'Alias Test', gameId: uuidv4(), entryFee: 5, prizePool: 50,
            capacity: 8, startDate: tomorrow.toISOString(), createdBy: uuidv4()
        };
        const tournament = Tournament.fromPersistence(persistenceData);
        expect(tournament.maxParticipants).toBe(8);
        expect(tournament.organizerId).toBe(persistenceData.createdBy);
    });

    it('should return null if no data provided to fromPersistence', () => {
        expect(Tournament.fromPersistence(null)).toBeNull();
        expect(Tournament.fromPersistence(undefined)).toBeNull();
    });
  });

  describe('Static Enums', () => {
    it('should expose Status enum correctly', () => {
        expect(Tournament.Status).toBeDefined();
        expect(Tournament.Status.PENDING).toBe('PENDING');
        expect(TournamentStatus.COMPLETED).toBe('COMPLETED'); // Also check exported one
    });
    it('should expose BracketType enum correctly', () => {
        expect(Tournament.BracketType).toBeDefined();
        expect(Tournament.BracketType.SINGLE_ELIMINATION).toBe('SINGLE_ELIMINATION');
        expect(BracketType.DOUBLE_ELIMINATION).toBe('DOUBLE_ELIMINATION'); // Also check exported one
    });
     it('should have validStatuses array', () => {
      expect(Tournament.validStatuses).toEqual(Object.values(Tournament.Status));
    });
    it('should have validBracketTypes array', () => {
      expect(Tournament.validBracketTypes).toEqual(Object.values(Tournament.BracketType));
    });
  });

  describe('Status Management', () => {
    let tournament;
    beforeEach(() => {
      tournament = new Tournament(
        baseTournamentData.id, baseTournamentData.name, baseTournamentData.gameId, baseTournamentData.description,
        baseTournamentData.rules, TournamentStatus.PENDING, baseTournamentData.entryFee, baseTournamentData.prizePool,
        baseTournamentData.maxParticipants, 0, baseTournamentData.startDate
      );
    });

    it('updateStatus: should update status and updatedAt', () => {
      const initialUpdatedAt = tournament.updatedAt;
      tournament.updateStatus(TournamentStatus.REGISTRATION_OPEN);
      expect(tournament.status).toBe(TournamentStatus.REGISTRATION_OPEN);
      expect(tournament.updatedAt).not.toBe(initialUpdatedAt);
    });

    it('updateStatus: should throw for invalid status', () => {
      expect(() => tournament.updateStatus('INVALID')).toThrow('Invalid tournament status: INVALID.');
    });

    it('openRegistration: should change status from PENDING to REGISTRATION_OPEN', () => {
      tournament.openRegistration();
      expect(tournament.status).toBe(TournamentStatus.REGISTRATION_OPEN);
    });
    it('openRegistration: should throw if not PENDING', () => {
      tournament.status = TournamentStatus.ONGOING;
      expect(() => tournament.openRegistration()).toThrow('Tournament registration can only be opened if status is PENDING.');
    });

    it('closeRegistration: should change status from REGISTRATION_OPEN to REGISTRATION_CLOSED', () => {
      tournament.status = TournamentStatus.REGISTRATION_OPEN;
      tournament.closeRegistration();
      expect(tournament.status).toBe(TournamentStatus.REGISTRATION_CLOSED);
    });
    it('closeRegistration: should throw if not REGISTRATION_OPEN', () => {
      expect(() => tournament.closeRegistration()).toThrow('Tournament registration can only be closed if it is currently open.');
    });

    it('startTournament: should change status to ONGOING from REGISTRATION_CLOSED', () => {
      tournament.status = TournamentStatus.REGISTRATION_CLOSED;
      tournament.startTournament();
      expect(tournament.status).toBe(TournamentStatus.ONGOING);
    });
     it('startTournament: should change status to ONGOING from REGISTRATION_OPEN', () => {
      tournament.status = TournamentStatus.REGISTRATION_OPEN;
      tournament.startTournament();
      expect(tournament.status).toBe(TournamentStatus.ONGOING);
    });
    it('startTournament: should throw if not REGISTRATION_CLOSED or REGISTRATION_OPEN', () => {
      tournament.status = TournamentStatus.PENDING;
      expect(() => tournament.startTournament()).toThrow('Tournament can only be started if registration is closed or open (and criteria met).');
    });

    it('startTournament: should allow starting even if startDate is in the future (as per current commented-out check)', () => {
      const futureStartDate = new Date();
      futureStartDate.setDate(futureStartDate.getDate() + 3); // 3 days in future
      tournament.startDate = futureStartDate;
      tournament.status = TournamentStatus.REGISTRATION_CLOSED;
      expect(() => tournament.startTournament()).not.toThrow();
      expect(tournament.status).toBe(TournamentStatus.ONGOING);
    });

    it('completeTournament: should change status to COMPLETED from ONGOING and set endDate if null', () => {
      tournament.status = TournamentStatus.ONGOING;
      const initialEndDate = tournament.endDate;
      tournament.completeTournament();
      expect(tournament.status).toBe(TournamentStatus.COMPLETED);
      expect(tournament.endDate).not.toBe(initialEndDate);
      expect(tournament.endDate).toBeInstanceOf(Date);
    });
     it('completeTournament: should not overwrite existing endDate', () => {
      tournament.status = TournamentStatus.ONGOING;
      const specificEndDate = new Date(dayAfterTomorrow);
      tournament.endDate = specificEndDate;
      tournament.completeTournament();
      expect(tournament.status).toBe(TournamentStatus.COMPLETED);
      expect(tournament.endDate).toEqual(specificEndDate);
    });
    it('completeTournament: should throw if not ONGOING', () => {
      expect(() => tournament.completeTournament()).toThrow('Tournament can only be completed if it is ONGOING.');
    });

    it('cancelTournament: should change status to CANCELED and update description', () => {
        tournament.status = TournamentStatus.REGISTRATION_OPEN;
        const reason = "Lack of interest";
        tournament.cancelTournament(reason);
        expect(tournament.status).toBe(TournamentStatus.CANCELED);
        expect(tournament.description).toContain(reason);
    });
    it('cancelTournament: should use default reason if none provided', () => {
        tournament.status = TournamentStatus.PENDING;
        tournament.cancelTournament();
        expect(tournament.status).toBe(TournamentStatus.CANCELED);
        expect(tournament.description).toContain('Tournament canceled.');
    });
    it('cancelTournament: should throw if already COMPLETED or CANCELED', () => {
        tournament.status = TournamentStatus.COMPLETED;
        expect(() => tournament.cancelTournament()).toThrow(`Tournament is already ${TournamentStatus.COMPLETED} and cannot be canceled.`);
        tournament.status = TournamentStatus.CANCELED; // Reset for next check
        expect(() => tournament.cancelTournament()).toThrow(`Tournament is already ${TournamentStatus.CANCELED} and cannot be canceled.`);
    });
  });

  describe('Participant Management', () => {
    let tournament;
    beforeEach(() => {
        tournament = new Tournament(
            baseTournamentData.id, baseTournamentData.name, baseTournamentData.gameId, baseTournamentData.description,
            baseTournamentData.rules, TournamentStatus.REGISTRATION_OPEN, baseTournamentData.entryFee, baseTournamentData.prizePool,
            2, 0, baseTournamentData.startDate // maxParticipants set to 2 for easier testing
        );
    });

    it('canRegister: should return true if REGISTRATION_OPEN and not full', () => {
        expect(tournament.canRegister()).toBe(true);
    });
    it('canRegister: should return false if not REGISTRATION_OPEN', () => {
        tournament.status = TournamentStatus.PENDING;
        expect(tournament.canRegister()).toBe(false);
    });
    it('canRegister: should return false if full', () => {
        tournament.currentParticipants = 2;
        expect(tournament.canRegister()).toBe(false);
    });

    it('addParticipant: should increment currentParticipants if can register', () => {
        tournament.addParticipant('user1');
        expect(tournament.currentParticipants).toBe(1);
    });
    it('addParticipant: should throw if cannot register', () => {
        tournament.status = TournamentStatus.PENDING;
        expect(() => tournament.addParticipant('user1')).toThrow('Cannot register participant: Registration not open or tournament is full.');
        tournament.status = TournamentStatus.REGISTRATION_OPEN; // reset status
        tournament.currentParticipants = 2; // make it full
        expect(() => tournament.addParticipant('user2')).toThrow('Cannot register participant: Registration not open or tournament is full.');
    });

    it('removeParticipant: should decrement currentParticipants', () => {
        tournament.currentParticipants = 1;
        tournament.removeParticipant('user1'); // Assuming user1 was the participant
        expect(tournament.currentParticipants).toBe(0);
    });
    it('removeParticipant: should not go below zero', () => {
        tournament.removeParticipant('user1');
        expect(tournament.currentParticipants).toBe(0);
    });

    it('isFull: should return true if currentParticipants equals maxParticipants', () => {
        tournament.currentParticipants = 2;
        expect(tournament.isFull()).toBe(true);
    });
    it('isFull: should return false if currentParticipants is less than maxParticipants', () => {
        tournament.currentParticipants = 1;
        expect(tournament.isFull()).toBe(false);
    });
  });

  describe('updateDetails', () => {
    let tournament;
    let localTomorrow;
    let localDayAfterTomorrow;

     beforeEach(() => {
        localTomorrow = new Date();
        localTomorrow.setDate(localTomorrow.getDate() + 1);
        localDayAfterTomorrow = new Date();
        localDayAfterTomorrow.setDate(localDayAfterTomorrow.getDate() + 2);

        // Use a fresh baseTournamentData with local dates for this suite
        const localBaseTournamentData = {
            ...baseTournamentData,
            startDate: localTomorrow.toISOString(),
        };

        tournament = new Tournament(
            localBaseTournamentData.id, localBaseTournamentData.name, localBaseTournamentData.gameId, localBaseTournamentData.description,
            localBaseTournamentData.rules, TournamentStatus.PENDING, localBaseTournamentData.entryFee, localBaseTournamentData.prizePool,
            localBaseTournamentData.maxParticipants, 0, localBaseTournamentData.startDate
        );
    });

    it('should update allowed fields and updatedAt', () => {
        const initialUpdatedAt = tournament.updatedAt;
        // Ensure date for startDate update is also fresh and correctly offset
        const newStartDateForUpdate = new Date();
        newStartDateForUpdate.setDate(newStartDateForUpdate.getDate() + 3);
        const newEndDateForUpdate = new Date(newStartDateForUpdate);
        newEndDateForUpdate.setDate(newStartDateForUpdate.getDate() + 1);


        const detailsToUpdate = {
            name: 'New Tournament Name',
            description: 'Updated description',
            rules: 'Updated rules',
            entryFee: 20,
            prizePool: 1500,
            maxParticipants: 64,
            startDate: newStartDateForUpdate.toISOString(),
            endDate: newEndDateForUpdate.toISOString(),
            gameId: uuidv4()
        };
        tournament.updateDetails(detailsToUpdate);

        expect(tournament.name).toBe(detailsToUpdate.name);
        expect(tournament.description).toBe(detailsToUpdate.description);
        expect(tournament.rules).toBe(detailsToUpdate.rules);
        expect(tournament.entryFee).toBe(detailsToUpdate.entryFee);
        expect(tournament.prizePool).toBe(detailsToUpdate.prizePool);
        expect(tournament.maxParticipants).toBe(detailsToUpdate.maxParticipants);
        expect(tournament.startDate).toEqual(new Date(detailsToUpdate.startDate));
        expect(tournament.endDate).toEqual(new Date(detailsToUpdate.endDate));
        expect(tournament.gameId).toBe(detailsToUpdate.gameId);
        expect(tournament.updatedAt).not.toBe(initialUpdatedAt);
    });

    it('should throw if trying to update details when ONGOING, COMPLETED, or CANCELED', () => {
        [TournamentStatus.ONGOING, TournamentStatus.COMPLETED, TournamentStatus.CANCELED].forEach(status => {
            tournament.status = status;
            expect(() => tournament.updateDetails({ name: 'New Name' }))
                .toThrow(`Cannot update details for a tournament that is ${status}.`);
        });
    });

    it('should throw if new maxParticipants is less than currentParticipants', () => {
        tournament.currentParticipants = 10;
        expect(() => tournament.updateDetails({ maxParticipants: 5 }))
            .toThrow('New max participants cannot be less than current number of participants.');
    });

    it('should throw if new endDate is before new startDate', () => {
        const newStartDateForUpdate = new Date();
        newStartDateForUpdate.setDate(newStartDateForUpdate.getDate() + 5); // Further in future
        const newInvalidEndDate = new Date(newStartDateForUpdate);
        newInvalidEndDate.setDate(newStartDateForUpdate.getDate() -1); // One day before the new start date

        expect(() => tournament.updateDetails({ startDate: newStartDateForUpdate.toISOString(), endDate: newInvalidEndDate.toISOString()}))
            .toThrow('End date cannot be before start date.');
    });

    it('should correctly handle null for optional fields being cleared', (done) => {
        tournament.description = "Initial Description";
        // Ensure startDate is set and won't cause issues with endDate being null
        tournament.startDate = new Date(localTomorrow); // Use the local, clean date
        tournament.endDate = new Date(localDayAfterTomorrow); // Set an initial endDate

        const initialUpdatedAt = tournament.updatedAt;

        // Wait a tick to ensure updatedAt changes
        setTimeout(() => {
            try {
                tournament.updateDetails({ description: null, endDate: null }); // Pass null to clear
                expect(tournament.description).toBeNull();
                expect(tournament.endDate).toBeNull();
                expect(tournament.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
                done();
            } catch (error) {
                done(error);
            }
        }, 10);
    });

    it('should allow updating startDate to a past date if status is PENDING (and not throw)', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1); // Yesterday

        tournament.status = TournamentStatus.PENDING;

        expect(() => tournament.updateDetails({ startDate: pastDate.toISOString() })).not.toThrow();
        expect(tournament.startDate).toEqual(pastDate);
    });

  });

});
