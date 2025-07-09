const { TournamentParticipant } = require('../../../../src/domain/tournament/tournamentParticipant.entity');
const { v4: uuidv4 } = require('uuid');

describe('TournamentParticipant Entity', () => {
  const tournamentId = uuidv4();
  const participantIdUser = uuidv4();
  // const participantIdTeam = uuidv4();
  const now = new Date();

  const baseParticipantData = {
    id: uuidv4(),
    tournamentId: tournamentId,
    participantId: participantIdUser,
    participantType: 'user',
    registeredAt: now.toISOString(),
  };

  describe('Constructor', () => {
    it('should create a TournamentParticipant instance with required fields and defaults', () => {
      const tp = new TournamentParticipant(
        baseParticipantData.id,
        baseParticipantData.tournamentId,
        baseParticipantData.participantId,
        baseParticipantData.participantType,
        baseParticipantData.registeredAt
      );
      expect(tp).toBeInstanceOf(TournamentParticipant);
      expect(tp.id).toBe(baseParticipantData.id);
      expect(tp.tournamentId).toBe(tournamentId);
      expect(tp.participantId).toBe(participantIdUser);
      expect(tp.participantType).toBe('user');
      expect(tp.registeredAt).toEqual(new Date(now.toISOString()));
      expect(tp.checkInStatus).toBe(false);
      expect(tp.seed).toBeNull();
      expect(tp.createdAt).toBeInstanceOf(Date);
      expect(tp.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow overriding default fields (checkInStatus, seed)', () => {
      const specificData = {
        ...baseParticipantData,
        checkInStatus: true,
        seed: 1,
      };
      const tp = new TournamentParticipant(
        specificData.id, specificData.tournamentId, specificData.participantId, specificData.participantType,
        specificData.registeredAt, specificData.checkInStatus, specificData.seed
      );
      expect(tp.checkInStatus).toBe(true);
      expect(tp.seed).toBe(1);
    });

    it('should parse seed to integer or null', () => {
        const tp1 = new TournamentParticipant(uuidv4(), tournamentId, participantIdUser, 'user', now, false, '10');
        expect(tp1.seed).toBe(10);
        const tp2 = new TournamentParticipant(uuidv4(), tournamentId, participantIdUser, 'user', now, false, null);
        expect(tp2.seed).toBeNull();
    });

    const requiredFieldsValidation = [
      { field: 'id', mod: { id: null }, message: 'TournamentParticipant ID is required.' },
      { field: 'tournamentId', mod: { tournamentId: null }, message: 'Tournament ID is required.' },
      { field: 'participantId', mod: { participantId: null }, message: 'Participant ID is required.' },
      { field: 'participantType', mod: { participantType: '' }, message: 'Participant type is required.' },
      { field: 'registeredAt', mod: { registeredAt: null }, message: 'Registration timestamp is required.' },
    ];

    requiredFieldsValidation.forEach(tc => {
      it(`should throw an error if ${tc.field} is invalid`, () => {
        const data = { ...baseParticipantData, ...tc.mod };
        expect(() => new TournamentParticipant(
          data.id, data.tournamentId, data.participantId, data.participantType, data.registeredAt
        )).toThrow(tc.message);
      });
    });
  });

  describe('Static Factory Method: fromPersistence', () => {
    it('should create a TournamentParticipant instance from persistence data', () => {
        const persistenceData = {
            id: uuidv4(), tournamentId, participantId: participantIdUser, participantType: 'user',
            registeredAt: now.toISOString(), checkInStatus: true, seed: 5, createdAt: new Date(), updatedAt: new Date()
        };
        const tp = TournamentParticipant.fromPersistence(persistenceData);
        expect(tp).toBeInstanceOf(TournamentParticipant);
        expect(tp.id).toBe(persistenceData.id);
        expect(tp.tournamentId).toBe(tournamentId);
        expect(tp.checkInStatus).toBe(true);
        expect(tp.seed).toBe(5);
    });
    it('should return null if no data provided to fromPersistence', () => {
        expect(TournamentParticipant.fromPersistence(null)).toBeNull();
    });
  });

  describe('checkIn', () => {
    let tp;
    beforeEach(() => {
        tp = new TournamentParticipant(baseParticipantData.id, tournamentId, participantIdUser, 'user', now);
    });

    it('should set checkInStatus to true and update updatedAt', () => {
      const initialUpdatedAt = tp.updatedAt;
      tp.checkIn();
      expect(tp.checkInStatus).toBe(true);
      expect(tp.updatedAt).not.toBe(initialUpdatedAt);
    });
    it('should not change updatedAt if already checked in (and not throw/log for now)', () => {
      tp.checkInStatus = true;
      const initialUpdatedAt = tp.updatedAt;
      // const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      tp.checkIn();
      expect(tp.checkInStatus).toBe(true);
      expect(tp.updatedAt).toBe(initialUpdatedAt); // No change, so updatedAt shouldn't change
      // expect(consoleWarnSpy).toHaveBeenCalledWith('Participant already checked in.');
      // consoleWarnSpy.mockRestore();
    });
  });

  describe('undoCheckIn', () => {
    let tp;
    beforeEach(() => {
        tp = new TournamentParticipant(baseParticipantData.id, tournamentId, participantIdUser, 'user', now, true); // Start as checked in
    });

    it('should set checkInStatus to false and update updatedAt', () => {
      const initialUpdatedAt = tp.updatedAt;
      tp.undoCheckIn();
      expect(tp.checkInStatus).toBe(false);
      expect(tp.updatedAt).not.toBe(initialUpdatedAt);
    });
    it('should not change updatedAt if not checked in (and not throw/log for now)', () => {
      tp.checkInStatus = false; // Ensure not checked in
      const initialUpdatedAt = tp.updatedAt;
      // const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      tp.undoCheckIn();
      expect(tp.checkInStatus).toBe(false);
      expect(tp.updatedAt).toBe(initialUpdatedAt);
      // expect(consoleWarnSpy).toHaveBeenCalledWith('Participant not checked in yet.');
      // consoleWarnSpy.mockRestore();
    });
  });

  describe('assignSeed', () => {
    let tp;
    beforeEach(() => {
        tp = new TournamentParticipant(baseParticipantData.id, tournamentId, participantIdUser, 'user', now);
    });

    it('should set seed and update updatedAt for a valid positive integer seed', () => {
      const initialUpdatedAt = tp.updatedAt;
      tp.assignSeed(10);
      expect(tp.seed).toBe(10);
      expect(tp.updatedAt).not.toBe(initialUpdatedAt);
    });
    it('should allow setting seed to null', () => {
      tp.seed = 5; // Initial seed
      tp.assignSeed(null);
      expect(tp.seed).toBeNull();
    });
    const invalidSeeds = [0, -5, 'abc', 3.14];
    invalidSeeds.forEach(seed => {
      it(`should throw an error for invalid seed: ${seed}`, () => {
        expect(() => tp.assignSeed(seed)).toThrow('Seed must be a positive integer or null.');
      });
    });
  });
});
