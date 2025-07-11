const { Tournament, TournamentStatus, BracketType, EntryFeeType, PrizeType } = require('../../../../src/domain/tournament/tournament.entity');
const { v4: uuidv4 } = require('uuid');

const tick = (ms = 1) => new Promise(resolve => setTimeout(resolve, ms));

describe('Tournament Entity', () => {
  let gameId; // Can still be set in beforeEach if dynamic per test run for some tests
  let outerBaseTournamentData;

  // Define static dates for use in test case generation loop
  const staticNow = new Date();
  const staticTomorrow = new Date(staticNow);
  staticTomorrow.setDate(staticNow.getDate() + 1);
  const staticDayAfterTomorrow = new Date(staticNow);
  staticDayAfterTomorrow.setDate(staticNow.getDate() + 2);

  // Variables for beforeEach, can be reset for each test
  let outerNow;
  let outerTomorrow;
  let outerDayAfterTomorrow;


  beforeEach(() => {
    outerNow = new Date(); // Fresh 'now' for each test if needed for other parts of the test
    gameId = uuidv4();
    outerTomorrow = new Date(outerNow);
    outerTomorrow.setDate(outerNow.getDate() + 1);
    outerDayAfterTomorrow = new Date(outerNow);
    outerDayAfterTomorrow.setDate(outerNow.getDate() + 2);

    // outerBaseTournamentData is primarily for individual 'it' blocks that run after beforeEach
    // For the validation loop, we will use a base derived from static dates or ensure
    // the loop's base data is self-contained or uses static dates.
    outerBaseTournamentData = {
      id: uuidv4(),
      name: 'Test Tournament',
      // Use outerTomorrow for startDate in tests that rely on beforeEach-specific dates
      // For the validation loop, use staticTomorrow.
      gameId: gameId,
      description: 'A test tournament',
      rules: 'Standard rules apply',
      status: TournamentStatus.PENDING,
      entryFee: 10,
      entryFeeType: EntryFeeType.PAID_CASH,
      prizePool: 1000,
      prizeType: PrizeType.CASH,
      prizeDetails: 'Top 3 get a share',
      maxParticipants: 32,
      currentParticipants: 0,
      startDate: new Date(outerTomorrow), // This specific instance uses the dynamic outerTomorrow
      endDate: null,
      organizerId: null,
      managed_by: [uuidv4()],
      supported_by: [uuidv4()],
      entryConditions: { minLevel: 5 },
      createdAt: new Date(outerNow),
      updatedAt: new Date(outerNow),
      bannerImageUrl: null,
      bracketType: BracketType.SINGLE_ELIMINATION,
      settings: {},
    };
  });

  const createTournamentInstanceWithOverrides = (constructorArgs) => {
    // Ensure dates are Date objects or null
    const startDate = constructorArgs.startDate ? (constructorArgs.startDate instanceof Date ? constructorArgs.startDate : new Date(constructorArgs.startDate)) : null;
    const endDate = constructorArgs.endDate ? (constructorArgs.endDate instanceof Date ? constructorArgs.endDate : new Date(constructorArgs.endDate)) : null;
    const createdAt = constructorArgs.createdAt ? (constructorArgs.createdAt instanceof Date ? constructorArgs.createdAt : new Date(constructorArgs.createdAt)) : new Date();
    const updatedAt = constructorArgs.updatedAt ? (constructorArgs.updatedAt instanceof Date ? constructorArgs.updatedAt : new Date(constructorArgs.updatedAt)) : new Date();

    return new Tournament(
      constructorArgs.id, constructorArgs.name, constructorArgs.gameId, constructorArgs.description, constructorArgs.rules,
      constructorArgs.status, constructorArgs.entryFee, constructorArgs.entryFeeType, constructorArgs.prizePool, constructorArgs.prizeType, constructorArgs.prizeDetails,
      constructorArgs.maxParticipants, constructorArgs.currentParticipants, startDate, endDate, constructorArgs.organizerId,
      constructorArgs.managed_by, constructorArgs.supported_by, constructorArgs.entryConditions, createdAt, updatedAt,
      constructorArgs.bannerImageUrl, constructorArgs.bracketType, constructorArgs.settings
    );
  };

  describe('Constructor', () => {
    it('should create a tournament instance with all provided fields and defaults', () => {
      const tournament = createTournamentInstanceWithOverrides(outerBaseTournamentData);
      expect(tournament).toBeInstanceOf(Tournament);
      expect(tournament.id).toBe(outerBaseTournamentData.id);
      expect(tournament.startDate).toEqual(outerBaseTournamentData.startDate);
    });

    it('should use default EntryFeeType, PrizeType, entryFee, and prizePool if not provided', () => {
      const dataForDefaults = { ...outerBaseTournamentData };
      delete dataForDefaults.entryFeeType;
      delete dataForDefaults.prizeType;
      delete dataForDefaults.entryFee;
      delete dataForDefaults.prizePool;

      const tournament = new Tournament(
        dataForDefaults.id, dataForDefaults.name, dataForDefaults.gameId, dataForDefaults.description, dataForDefaults.rules,
        dataForDefaults.status,
        undefined, undefined, undefined, undefined,
        dataForDefaults.prizeDetails,
        dataForDefaults.maxParticipants, dataForDefaults.currentParticipants, dataForDefaults.startDate, dataForDefaults.endDate, dataForDefaults.organizerId,
        dataForDefaults.managed_by, dataForDefaults.supported_by, dataForDefaults.entryConditions,
        dataForDefaults.createdAt, dataForDefaults.updatedAt,
        dataForDefaults.bannerImageUrl, dataForDefaults.bracketType, dataForDefaults.settings
      );
      expect(tournament.entryFeeType).toBe(EntryFeeType.FREE);
      expect(tournament.entryFee).toBe(0);
      expect(tournament.prizeType).toBe(PrizeType.NONE);
      expect(tournament.prizePool).toBe(0);
    });

    describe('Constructor Validation Cases', () => {
        const getValidationTestCases = (currentNow, currentTomorrow) => [
            { field: 'id', mod: { id: null }, message: 'Tournament ID is required.' },
            { field: 'name', mod: { name: '' }, message: 'Tournament name is required.' },
            { field: 'gameId', mod: { gameId: null }, message: 'Game ID is required.' },
            { field: 'entryFeeNegative', mod: { entryFee: -1 }, message: 'Entry fee must be non-negative.' },
            { field: 'invalidEntryFeeType', mod: { entryFeeType: 'INVALID_TYPE' }, message: 'Invalid entry fee type: INVALID_TYPE.' },
            { field: 'prizePoolNegative', mod: { prizePool: -1 }, message: 'Prize pool must be non-negative.' },
            { field: 'invalidPrizeType', mod: { prizeType: 'BAD_PRIZE' }, message: 'Invalid prize type: BAD_PRIZE.' },
            { field: 'maxParticipantsTooLow1', mod: { maxParticipants: 1 }, message: 'Max participants must be greater than 1.' },
            { field: 'startDateNull', mod: { startDate: null }, message: 'Start date is required.' },
            { field: 'endDateBeforeStartDate', mod: { startDate: new Date(currentTomorrow), endDate: new Date(currentNow) }, message: 'End date cannot be before start date.' },
            { field: 'currentParticipantsNegative', mod: { currentParticipants: -1 }, message: 'Current participants count is invalid.' },
            { field: 'currentParticipantsExceedsMax', mod: { currentParticipants: 33, maxParticipants: 32 }, message: 'Current participants count is invalid.' },
        ];

        // Loop through test cases
        // Pass the statically defined dates to getValidationTestCases
        getValidationTestCases(staticNow, staticTomorrow).forEach(tc => {
            it(`should throw an error if ${tc.field} is invalid`, () => {
                // Construct dataForTest using a base that's also consistent with static dates for validation
                // or ensure tc.mod provides all necessary date fields if they are part of the test.
                // For simplicity, let's ensure outerBaseTournamentData used here is based on static dates
                // if tc.mod doesn't override dates.
                // A better approach: create a specific base for validation tests.
                const validationTestBaseData = {
                  id: uuidv4(), name: 'Validation Base', gameId: uuidv4(),
                  description: 'Validation desc', rules: 'Validation rules', status: TournamentStatus.PENDING,
                  entryFee: 10, entryFeeType: EntryFeeType.PAID_CASH, prizePool: 100, prizeType: PrizeType.CASH,
                  prizeDetails: 'Details', maxParticipants: 32, currentParticipants: 0,
                  startDate: new Date(staticTomorrow), // Use static date
                  endDate: null, organizerId: null, managed_by: [uuidv4()], supported_by: [uuidv4()],
                  entryConditions: {}, createdAt: new Date(staticNow), updatedAt: new Date(staticNow),
                  bannerImageUrl: null, bracketType: BracketType.SINGLE_ELIMINATION, settings: {},
                };
                const dataForTest = { ...validationTestBaseData, ...tc.mod };
                expect(() => createTournamentInstanceWithOverrides(dataForTest)).toThrow(tc.message);
            });
        });
    });
  });

  describe('Static Factory Method: fromPersistence', () => {
    it('should create a Tournament instance from persistence data', () => {
      const createdByUuid = uuidv4();
      const persistenceInput = {
        id: uuidv4(), name: 'Persistent Tournament', gameId: uuidv4(), description: 'Loaded from DB',
        rules: 'DB Rules', status: TournamentStatus.ONGOING, entryFee: 20, entryFeeType: EntryFeeType.PAID_CASH,
        prizePool: 2000, prizeType: PrizeType.CASH, prizeDetails: "Cash prizes", currentParticipants: 10,
        startDate: staticTomorrow.toISOString(), // Use static date
        endDate: staticDayAfterTomorrow.toISOString(), // Use static date
        createdAt: staticNow.toISOString(), // Use static date
        updatedAt: staticNow.toISOString(), // Use static date
        bannerImageUrl: 'http://db.com/banner.png',
        bracketType: BracketType.ROUND_ROBIN, settings: { pointsPerWin: 3 },
        capacity: 16,
        createdBy: createdByUuid,
        managed_by: [uuidv4()], supported_by: [uuidv4(), uuidv4()], entryConditions: { minRank: 'Gold' }
      };

      const tournament = Tournament.fromPersistence(persistenceInput);
      expect(tournament).toBeInstanceOf(Tournament);
      expect(tournament.id).toBe(persistenceInput.id);
      expect(tournament.maxParticipants).toBe(16);
      expect(tournament.organizerId).toBe(createdByUuid);
    });
  });

  describe('Static Enums', () => {
    it('should expose Status enum correctly', () => expect(Tournament.Status.PENDING).toBe('PENDING'));
    it('should expose BracketType enum correctly', () => expect(Tournament.BracketType.SINGLE_ELIMINATION).toBe('SINGLE_ELIMINATION'));
    it('should expose EntryFeeType enum correctly', () => expect(Tournament.EntryFeeType.FREE).toBe('FREE'));
    it('should expose PrizeType enum correctly', () => expect(Tournament.PrizeType.NONE).toBe('NONE'));
  });

  describe('Status Management', () => {
    let tournament;
    beforeEach(async () => { // This beforeEach uses the dynamic outerNow, outerTomorrow
      tournament = createTournamentInstanceWithOverrides({
        ...outerBaseTournamentData, // Uses dynamic dates from outerBeforeEach
        status: TournamentStatus.PENDING
      });
      await tick();
    });

    it('updateStatus: should update status and updatedAt', async () => {
      const initialUpdatedAt = tournament.updatedAt;
      await tick(); // Ensure time progresses
      tournament.updateStatus(TournamentStatus.REGISTRATION_OPEN);
      expect(tournament.status).toBe(TournamentStatus.REGISTRATION_OPEN);
      expect(tournament.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });
  });

  describe('Participant Management', () => {
    let tournament;
    beforeEach(async () => { // This beforeEach uses the dynamic outerNow, outerTomorrow
      tournament = createTournamentInstanceWithOverrides({
        ...outerBaseTournamentData, // Uses dynamic dates from outerBeforeEach
        status: TournamentStatus.REGISTRATION_OPEN,
        maxParticipants: 2,
        currentParticipants: 0
      });
      await tick();
    });
    it('canRegister: should return true if REGISTRATION_OPEN and not full', () => {
        expect(tournament.canRegister()).toBe(true);
    });
    // Placeholder for other participant tests
    it('is a placeholder test to prevent Jest errors for beforeEach', () => {
        expect(true).toBe(true);
    });
  });

  describe('updateDetails', () => {
    let tournament;
    beforeEach(async () => { // This beforeEach uses the dynamic outerNow, outerTomorrow
      tournament = createTournamentInstanceWithOverrides({
        ...outerBaseTournamentData, // Uses dynamic dates from outerBeforeEach
        status: TournamentStatus.PENDING
      });
      await tick();
    });

    it('should update all new and existing fields correctly and update updatedAt', async () => {
      const initialUpdatedAt = tournament.updatedAt;
      // Use outerNow for dynamic date calculations in this specific test, not staticNow
      const newStartDate = new Date(outerNow.getTime() + 3 * 24 * 60 * 60 * 1000);
      const newEndDate = new Date(outerNow.getTime() + 4 * 24 * 60 * 60 * 1000);
      const detailsToUpdate = {
        name: 'Updated Grand Championship', entryFeeType: EntryFeeType.PAID_INGAME_CURRENCY,
        startDate: newStartDate, endDate: newEndDate, // Use dynamically calculated dates
      };
      await tick();
      tournament.updateDetails(detailsToUpdate);
      expect(tournament.name).toBe(detailsToUpdate.name);
      expect(tournament.entryFeeType).toBe(detailsToUpdate.entryFeeType);
      expect(tournament.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });
  });
});
