const { BracketLogic } = require('../../../../src/domain/tournament/bracket.logic');
const { Match } = require('../../../../src/domain/tournament/match.entity'); // Needed for type checks
const { v4: uuidv4 } = require('uuid');

describe('BracketLogic', () => {
  describe('shuffleArray', () => {
    it('should return an array of the same length', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = BracketLogic.shuffleArray(arr);
      expect(shuffled.length).toBe(arr.length);
    });

    it('should contain the same elements as the original array', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = BracketLogic.shuffleArray(arr);
      expect(shuffled.sort()).toEqual(arr.sort()); // Sort both to compare elements
    });

    it('should produce a different order (statistically, not guaranteed for small arrays)', () => {
      const arr = Array.from({ length: 20 }, (_, i) => i + 1); // Larger array
      const shuffled = BracketLogic.shuffleArray(arr);
      // This isn't a perfect test for randomness but checks if it's not the exact same array.
      // For very small arrays, it might occasionally return the same order.
      expect(shuffled).not.toEqual(arr);
    });
     it('should handle empty or single-element arrays', () => {
      expect(BracketLogic.shuffleArray([])).toEqual([]);
      expect(BracketLogic.shuffleArray([1])).toEqual([1]);
    });
  });

  describe('generateSingleElimination', () => {
    const tournamentId = uuidv4();
    const defaultMatchTime = new Date('2024-01-01T10:00:00.000Z');
    const options = { defaultMatchTime, shuffle: false }; // Disable shuffle for predictable tests

    it('should throw an error if less than two participants are provided', () => {
      expect(() => BracketLogic.generateSingleElimination(tournamentId, ['p1'])).toThrow('At least two participants are required to generate a bracket.');
      expect(() => BracketLogic.generateSingleElimination(tournamentId, [])).toThrow('At least two participants are required to generate a bracket.');
    });

    // Helper to count matches per round
    const countMatchesByRound = (matches) => {
        const rounds = {};
        matches.forEach(match => {
            rounds[match.roundNumber] = (rounds[match.roundNumber] || 0) + 1;
        });
        return rounds;
    };

    // Helper to check nextMatchId linkage
    const checkNextMatchLinks = (matches) => {
        const matchMap = new Map(matches.map(m => [m.id, m]));
        for (const match of matches) {
            if (match.nextMatchId) {
                expect(matchMap.has(match.nextMatchId)).toBe(true); // Next match should exist
                const nextMatch = matchMap.get(match.nextMatchId);
                expect(nextMatch.roundNumber).toBe(match.roundNumber + 1); // Next match is in the next round
            }
        }
    };

    describe('Power of 2 participants (no byes)', () => {
      it('should generate correct bracket for 2 participants', () => {
        const participants = [{ id: 'p1', seed: 1 }, { id: 'p2', seed: 2 }];
        const matches = BracketLogic.generateSingleElimination(tournamentId, participants, options);

        expect(matches.length).toBe(1); // 1 final match
        const finalMatch = matches[0];
        expect(finalMatch).toBeInstanceOf(Match);
        expect(finalMatch.roundNumber).toBe(1);
        expect(finalMatch.participant1Id).toBe('p1');
        expect(finalMatch.participant2Id).toBe('p2');
        expect(finalMatch.status).toBe('SCHEDULED');
        expect(finalMatch.nextMatchId).toBeNull();
        checkNextMatchLinks(matches);
      });

      it('should generate correct bracket for 4 participants', () => {
        const participants = [
          { id: 'p1', seed: 1 }, { id: 'p2', seed: 2 },
          { id: 'p3', seed: 3 }, { id: 'p4', seed: 4 }
        ];
        const matches = BracketLogic.generateSingleElimination(tournamentId, participants, options);

        // Expected: 2 R1 matches, 1 R2 match (final) = 3 total matches
        expect(matches.length).toBe(3);
        const rounds = countMatchesByRound(matches);
        expect(rounds[1]).toBe(2); // 2 matches in Round 1
        expect(rounds[2]).toBe(1); // 1 match in Round 2 (Final)

        const r1m1 = matches.find(m => m.roundNumber === 1 && m.participant1Id === 'p1'); // P1 vs P4
        const r1m2 = matches.find(m => m.roundNumber === 1 && m.participant1Id === 'p2'); // P2 vs P3
        const r2m1 = matches.find(m => m.roundNumber === 2);

        expect(r1m1.participant2Id).toBe('p4');
        expect(r1m2.participant2Id).toBe('p3');

        expect(r1m1.nextMatchId).toBe(r2m1.id);
        expect(r1m2.nextMatchId).toBe(r2m1.id);
        expect(r2m1.nextMatchId).toBeNull();
        checkNextMatchLinks(matches);
      });

      it('should generate correct bracket for 8 participants', () => {
        const participants = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, seed: i + 1 }));
        const matches = BracketLogic.generateSingleElimination(tournamentId, participants, options);
        // Expected: 4 R1, 2 R2, 1 R3 (final) = 7 total matches
        expect(matches.length).toBe(7);
        const rounds = countMatchesByRound(matches);
        expect(rounds[1]).toBe(4);
        expect(rounds[2]).toBe(2);
        expect(rounds[3]).toBe(1);
        checkNextMatchLinks(matches);
      });
    });

    describe('Non-power of 2 participants (with byes)', () => {
      it('should generate correct bracket for 3 participants (1 bye)', () => {
        const participants = [
          { id: 'p1', seed: 1 }, { id: 'p2', seed: 2 }, { id: 'p3', seed: 3 }
        ];
        const matches = BracketLogic.generateSingleElimination(tournamentId, participants, options);
        // Expected: 1 bye match (R1), 1 play-in match (R1), 1 final match (R2) = 3 total match objects
        expect(matches.length).toBe(3);

        const rounds = countMatchesByRound(matches);
        expect(rounds[1]).toBe(2); // 1 bye (completed), 1 scheduled
        expect(rounds[2]).toBe(1); // 1 final (scheduled)

        const byeMatch = matches.find(m => m.roundNumber === 1 && m.participant2Id === null);
        const r1PlayMatch = matches.find(m => m.roundNumber === 1 && m.participant2Id !== null);
        const finalMatch = matches.find(m => m.roundNumber === 2);

        expect(byeMatch).toBeDefined();
        expect(byeMatch.participant1Id).toBe('p1'); // Top seed gets bye
        expect(byeMatch.status).toBe('COMPLETED');
        expect(byeMatch.winnerId).toBe('p1');

        expect(r1PlayMatch).toBeDefined();
        expect(r1PlayMatch.participant1Id).toBe('p2'); // Seed 2
        expect(r1PlayMatch.participant2Id).toBe('p3'); // Seed 3
        expect(r1PlayMatch.status).toBe('SCHEDULED');

        expect(finalMatch).toBeDefined();
        expect(byeMatch.nextMatchId).toBe(finalMatch.id);
        expect(r1PlayMatch.nextMatchId).toBe(finalMatch.id);
        expect(finalMatch.nextMatchId).toBeNull();
        checkNextMatchLinks(matches);
      });

      it('should generate correct bracket for 5 participants (3 byes)', () => {
        const participants = Array.from({ length: 5 }, (_, i) => ({ id: `p${i + 1}`, seed: i + 1 }));
        const matches = BracketLogic.generateSingleElimination(tournamentId, participants, options);
        // Expected: 3 R1 byes, 1 R1 play match. 2 R2 matches. 1 R3 final. Total = 4+2+1 = 7 matches
        expect(matches.length).toBe(7);
        const rounds = countMatchesByRound(matches);
        expect(rounds[1]).toBe(4); // 3 byes (completed), 1 scheduled
        expect(rounds[2]).toBe(2); // 2 scheduled
        expect(rounds[3]).toBe(1); // 1 final (scheduled)

        const r1ByeMatches = matches.filter(m => m.roundNumber === 1 && m.status === 'COMPLETED');
        expect(r1ByeMatches.length).toBe(3);
        expect(r1ByeMatches.map(m => m.participant1Id).sort()).toEqual(['p1', 'p2', 'p3']);

        const r1PlayMatch = matches.find(m => m.roundNumber === 1 && m.status === 'SCHEDULED');
        expect(r1PlayMatch).toBeDefined();
        expect(r1PlayMatch.participant1Id).toBe('p4');
        expect(r1PlayMatch.participant2Id).toBe('p5');

        checkNextMatchLinks(matches);
      });

      it('should generate correct bracket for 6 participants (2 byes)', () => {
        const participants = Array.from({ length: 6 }, (_, i) => ({ id: `p${i + 1}`, seed: i + 1 }));
        const matches = BracketLogic.generateSingleElimination(tournamentId, participants, options);
        // Expected: 2 R1 byes, 2 R1 play matches. 2 R2 matches. 1 R3 final. Total = 4+2+1 = 7 matches
        expect(matches.length).toBe(7);
        const rounds = countMatchesByRound(matches);
        expect(rounds[1]).toBe(4); // 2 byes (completed), 2 scheduled
        expect(rounds[2]).toBe(2); // 2 scheduled
        expect(rounds[3]).toBe(1); // 1 final (scheduled)

        const r1ByeMatches = matches.filter(m => m.roundNumber === 1 && m.status === 'COMPLETED');
        expect(r1ByeMatches.length).toBe(2);
        expect(r1ByeMatches.map(m => m.participant1Id).sort()).toEqual(['p1', 'p2']);

        const r1PlayMatches = matches.filter(m => m.roundNumber === 1 && m.status === 'SCHEDULED');
        expect(r1PlayMatches.length).toBe(2);
        // P3 vs P6, P4 vs P5
        expect(r1PlayMatches.find(m => m.participant1Id === 'p3').participant2Id).toBe('p6');
        expect(r1PlayMatches.find(m => m.participant1Id === 'p4').participant2Id).toBe('p5');

        checkNextMatchLinks(matches);
      });
    });

    it('should use participant IDs directly if strings are provided (and shuffle if enabled)', () => {
        const participantIds = ['userA', 'userB', 'userC'];
        // Enable shuffle for this test to ensure it doesn't rely on order for non-seeded
        const matches = BracketLogic.generateSingleElimination(tournamentId, participantIds, { ...options, shuffle: true });
        // For 3 players: 1 bye match (R1), 1 play-in match (R1), 1 final match (R2) = 3 total match objects
        expect(matches.length).toBe(3);

        const allParticipantIdsInMatches = new Set();
        matches.forEach(m => {
            if(m.participant1Id) allParticipantIdsInMatches.add(m.participant1Id);
            if(m.participant2Id) allParticipantIdsInMatches.add(m.participant2Id);
        });
        expect(participantIds.every(id => allParticipantIdsInMatches.has(id))).toBe(true);
    });

    it('should handle options.timePerRound for subsequent rounds', () => {
        const participants = [{id: 'p1'}, {id: 'p2'}, {id: 'p3'}, {id: 'p4'}];
        const timePerRoundMs = 60 * 60 * 1000; // 1 hour
        const matches = BracketLogic.generateSingleElimination(tournamentId, participants, { ...options, timePerRound: timePerRoundMs });

        const r1Matches = matches.filter(m => m.roundNumber === 1);
        const r2Matches = matches.filter(m => m.roundNumber === 2);

        r1Matches.forEach(m => expect(m.scheduledTime.getTime()).toBe(defaultMatchTime.getTime()));
        r2Matches.forEach(m => expect(m.scheduledTime.getTime()).toBe(defaultMatchTime.getTime() + timePerRoundMs));
    });
  });

  describe('validateBracket (Conceptual Tests - current validateBracket has console.warns)', () => {
    // Note: The current `validateBracket` has console.warns and commented returns.
    // These tests are more conceptual for what a validator might check.
    let consoleWarnSpy;
    beforeEach(() => {
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        consoleWarnSpy.mockRestore();
    });

    it('should return true for a valid bracket (e.g., 4 participants)', () => {
      const localTournamentId = uuidv4(); // Define locally for this test
      const participants = [{id:'p1'},{id:'p2'},{id:'p3'},{id:'p4'}];
      const matches = BracketLogic.generateSingleElimination(localTournamentId, participants, {shuffle:false});
      expect(BracketLogic.validateBracket(matches, participants.length)).toBe(true);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should return true for 0 participants (empty bracket)', () => {
        expect(BracketLogic.validateBracket([], 0)).toBe(true);
    });

    // If validateBracket was stricter, these would test false conditions:
    // it('should identify incorrect number of matches', () => { ... });
    // it('should identify incorrect number of final matches', () => { ... });
  });
});
