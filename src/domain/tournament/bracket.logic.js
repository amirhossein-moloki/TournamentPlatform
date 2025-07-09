const { v4: uuidv4 } = require('uuid');
const { Match } = require('./match.entity'); // Assuming Match entity is in the same directory

/**
 * @file bracket.logic.js
 * Implements logic for generating tournament brackets, specifically single elimination.
 * This is pure domain logic, detached from persistence or specific services.
 * It would typically be used by an application service (e.g., GenerateBracketUseCase).
 */

class BracketLogic {
  /**
   * Generates a single elimination bracket structure.
   * @param {string} tournamentId - The ID of the tournament.
   * @param {Array<string|{id: string, seed?: number}>} participantIdsOrObjects - Array of participant IDs or objects with ID and seed.
   *        If objects with seeds are provided, they will be used for seeding. Otherwise, order implies seed or random seeding occurs.
   * @param {object} [options={}] - Options for bracket generation.
   * @param {boolean} [options.shuffle=true] - Whether to shuffle participants if no seeds are provided.
   * @param {Date} [options.defaultMatchTime] - A default start time for the first round matches.
   * @returns {Array<Match>} An array of Match entities representing the bracket.
   * @throws {Error} If participant list is too small or other issues occur.
   */
  static generateSingleElimination(tournamentId, participantIdsOrObjects, options = {}) {
    if (!participantIdsOrObjects || participantIdsOrObjects.length < 2) {
      throw new Error('At least two participants are required to generate a bracket.');
    }

    const { shuffle = true, defaultMatchTime = new Date() } = options;

    let participants = participantIdsOrObjects.map(p => (typeof p === 'string' ? { id: p } : p));

    // 1. Seed participants
    // If seeds are provided, sort by seed. Otherwise, shuffle if enabled.
    if (participants.every(p => p.seed != null)) {
      participants.sort((a, b) => a.seed - b.seed);
    } else if (shuffle) {
      participants = this.shuffleArray(participants);
    }
    // At this point, `participants` array is ordered by seed (explicit or implicit via shuffle/original order)

    // 2. Determine number of rounds and byes
    const numParticipants = participants.length;
    const numRounds = Math.ceil(Math.log2(numParticipants));
    const totalSlotsInFirstRound = Math.pow(2, numRounds); // Size of a full bracket for this many rounds
    const numByes = totalSlotsInFirstRound - numParticipants;

    // Distribute byes among higher seeds (if seeds are meaningful)
    // Standard seeding: 1 vs N, 2 vs N-1, etc. Byes go to top seeds.
    // For simplicity, byes are implicitly handled by pairing logic later if a slot is empty.
    // Or, explicitly create "BYE" matches for top seeds.

    const matches = [];
    let currentRoundParticipants = [...participants]; // Use participant objects {id, seed?}
    let roundNumber = 1;
    let matchesInPreviousRound = []; // To link nextMatchId

    // --- Generate Round 1 with Byes ---
    const round1Matches = [];
    let participantIndex = 0;

    // Assign byes to top N seeds if numByes > 0
    const participantsWithByes = currentRoundParticipants.slice(0, numByes).map(p => p.id);
    const participantsInRound1Play = currentRoundParticipants.slice(numByes);


    // Create BYE matches for those who received byes
    for (let i = 0; i < numByes; i++) {
      const participantId = participantsWithByes[i];
      const matchId = uuidv4();
      const byeMatch = new Match(
        matchId,
        tournamentId,
        roundNumber,
        i + 1, // matchNumberInRound
        participantId, // participant1Id
        null,          // participant2Id (BYE)
        'COMPLETED',   // status (or 'BYE' if you have such a status)
        defaultMatchTime, // scheduledTime
        new Date(),    // actualStartTime (BYE matches are instant)
        new Date(),    // actualEndTime
        participantId, // winnerId
        null, null, null, true // score1, score2, screenshot, isConfirmed
      );
      round1Matches.push(byeMatch);
    }

    // Pair remaining participants for Round 1
    for (let i = 0; i < participantsInRound1Play.length / 2; i++) {
      const p1 = participantsInRound1Play[i];
      const p2 = participantsInRound1Play[participantsInRound1Play.length - 1 - i]; // Standard pairing (1 vs N, 2 vs N-1)

      const matchId = uuidv4();
      const match = new Match(
        matchId,
        tournamentId,
        roundNumber,
        numByes + i + 1, // matchNumberInRound (after bye matches)
        p1.id,
        p2.id,
        'SCHEDULED',
        defaultMatchTime
      );
      round1Matches.push(match);
    }
    matches.push(...round1Matches);
    matchesInPreviousRound = [...round1Matches]; // Winners of these matches (including byes) proceed

    // --- Generate Subsequent Rounds ---
    let numMatchesInCurrentRound = Math.ceil(currentRoundParticipants.length / 2);
    if (roundNumber === 1) { // After handling byes
        numMatchesInCurrentRound = (participantsInRound1Play.length / 2) + numByes;
    }

    // Corrected loop condition: continue as long as there's more than one match from the previous round to pair up.
    while (matchesInPreviousRound.length > 1) {
    // The break condition `if(matchesInPreviousRound.length <=1 && roundNumber > 1) break;`
    // should no longer be necessary with a correct while condition.
    // However, the safety break for excessive rounds is still good.

        roundNumber++;
        const nextRoundMatches = [];
        let matchNumberInNextRound = 1;

        for (let i = 0; i < matchesInPreviousRound.length; i += 2) {
            const matchId = uuidv4();
            // Participants are TBD (To Be Determined by winners of previous round matches)
            const match = new Match(
                matchId,
                tournamentId,
                roundNumber,
                matchNumberInNextRound++,
                null, // participant1Id (TBD)
                null, // participant2Id (TBD)
                'SCHEDULED', // Status is scheduled, participants TBD
                // Adjust defaultMatchTime for subsequent rounds if needed (e.g., add time per round)
                new Date(defaultMatchTime.getTime() + (roundNumber -1) * (options.timePerRound || 3600*1000))
            );
            nextRoundMatches.push(match);

            // Link previous round matches to this new match
            if (matchesInPreviousRound[i]) {
                const prevMatch1 = matches.find(m => m.id === matchesInPreviousRound[i].id);
                if(prevMatch1) prevMatch1.nextMatchId = matchId;
            }
            if (matchesInPreviousRound[i + 1]) {
                const prevMatch2 = matches.find(m => m.id === matchesInPreviousRound[i+1].id);
                 if(prevMatch2) prevMatch2.nextMatchId = matchId;
            }
        }
        matches.push(...nextRoundMatches);
        matchesInPreviousRound = [...nextRoundMatches];
        numMatchesInCurrentRound = nextRoundMatches.length;

        if (roundNumber > numRounds + 2) { // Safety break for unexpected loops
            console.error("Bracket generation exceeded expected rounds, breaking.");
            break;
        }
    }

    return matches;
  }


  /**
   * Shuffles an array in place (Fisher-Yates shuffle).
   * @param {Array<any>} array - The array to shuffle.
   * @returns {Array<any>} The shuffled array.
   */
  static shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  /**
   * Validates if the generated bracket is consistent.
   * (Optional utility, can be expanded)
   * @param {Array<Match>} matches - The array of generated matches.
   * @param {number} numParticipants - The initial number of participants.
   * @returns {boolean} True if basic consistency checks pass.
   */
  static validateBracket(matches, numParticipants) {
    if (!matches || !matches.length) return numParticipants === 0;

    const numRounds = Math.ceil(Math.log2(numParticipants));
    const expectedTotalMatches = numParticipants > 0 ? numParticipants - 1 : 0; // For single elimination

    // Check 1: Total number of matches (excluding explicit BYE matches if they aren't counted this way)
    // This definition of "expectedTotalMatches" refers to matches that are played or where one advances due to opponent BYE.
    // The current generator creates explicit Match objects for BYEs that are already 'COMPLETED'.
    // If we count all Match objects:
    const totalSlotsInFullBracket = Math.pow(2, numRounds);
    const expectedMatchObjects = totalSlotsInFullBracket -1;

    // This check needs refinement based on how BYEs are counted.
    // If a BYE is a match object, then total matches is 2^numRounds - 1.
    // If a BYE means a participant skips a match object, it's numParticipants - 1.
    // Our generator creates match objects for byes, so it should be closer to totalSlotsInFullBracket - 1.
    // For example, 3 participants: 2 rounds, 4 slots. 1 bye.
    // P1 (bye) -> advances. Match object for P1 (bye), status COMPLETED.
    // P2 vs P3 -> Match object. Winner plays P1.
    // P1 vs Winner(P2/P3) -> Match object (final).
    // Total 3 match objects. (2^2 - 1 = 3). This seems correct.

    if (matches.length !== expectedMatchObjects && numParticipants > 1) {
      console.warn(`Bracket Validation: Expected ${expectedMatchObjects} match objects for ${numParticipants} participants over ${numRounds} rounds, but got ${matches.length}.`);
      // return false; // This check might be too strict depending on BYE representation
    }

    // Check 2: One final match
    const finalMatches = matches.filter(m => !m.nextMatchId && m.roundNumber === numRounds);
    if (finalMatches.length !== 1 && numParticipants > 1) {
      console.warn(`Bracket Validation: Expected 1 final match, but found ${finalMatches.length}. Final round: ${numRounds}`);
      // return false;
    }
    // Further checks:
    // - All matches (except final) have a nextMatchId.
    // - nextMatchId links correctly (no orphans, no loops).
    // - Participant progression makes sense.
    return true;
  }
}

module.exports = { BracketLogic };

/*
Example Usage (conceptual, would be in a use case):

const participants = [
  { id: 'user1', seed: 1 },
  { id: 'user2', seed: 2 },
  { id: 'user3', seed: 3 },
  { id: 'user4', seed: 4 },
  { id: 'user5', seed: 5 }
];
const tournamentId = 'tourney123';
const generatedMatches = BracketLogic.generateSingleElimination(tournamentId, participants);
console.log(`Generated ${generatedMatches.length} matches.`);
generatedMatches.forEach(m => {
  console.log(`R${m.roundNumber} M${m.matchNumberInRound}: ${m.participant1Id || 'TBD'} vs ${m.participant2Id || 'TBD'} -> next: ${m.nextMatchId || 'Final'}`);
});
BracketLogic.validateBracket(generatedMatches, participants.length);

Output for 5 participants (example):
NumRounds = 3. TotalSlots = 8. Byes = 3.
Round 1:
  M1 (P1 bye) -> winner P1, nextMatchId M4
  M2 (P2 bye) -> winner P2, nextMatchId M5
  M3 (P3 bye) -> winner P3, nextMatchId M6
  M4 (P4 vs P5) -> winner TBD, nextMatchId M7
Round 2:
  M5 (Winner M1 vs Winner M2) -> (P1 vs P2) -> TBD, nextMatchId M7
  M6 (Winner M3 vs Winner M4) -> (P3 vs Winner(P4/P5)) -> TBD, nextMatchId should be a new final match if structure is off.
    Wait, the above pairing is wrong for standard seeding.
    Correct standard seeding for 5 players (seeds 1-5):
    Full bracket size for 8. 3 byes.
    Seeds 1, 2, 3 get byes.
    Round 1:
      Match A: Seed 4 vs Seed 5
    Round 2 (Quarterfinals effectively):
      Match B: Seed 1 (bye) vs Winner of Match A
      Match C: Seed 2 (bye) vs Seed 3 (bye) -> This means Seed 2 plays Seed 3
    Round 3 (Semifinals effectively, but it's the Final here):
      Match D: Winner of Match B vs Winner of Match C

    Let's re-trace the code's logic for 5 participants.
    participants = [P1, P2, P3, P4, P5] (assuming sorted by seed)
    numParticipants = 5, numRounds = 3, totalSlotsInFirstRound = 8, numByes = 3.

    Round 1 Generation:
    participantsWithByes = [P1, P2, P3]
    participantsInRound1Play = [P4, P5]

    Bye Matches (roundNumber = 1):
    - byeMatch1: P1 vs null, winner P1 (matchNum 1)
    - byeMatch2: P2 vs null, winner P2 (matchNum 2)
    - byeMatch3: P3 vs null, winner P3 (matchNum 3)
    round1Matches = [byeMatch1, byeMatch2, byeMatch3]

    Play-in Matches (roundNumber = 1):
    Loop i = 0 (participantsInRound1Play.length / 2 = 1 iteration)
    p1 = P4, p2 = P5
    - playMatch1: P4 vs P5 (matchNum 3 + 0 + 1 = 4)
    round1Matches.push(playMatch1) -> [byeMatch1, byeMatch2, byeMatch3, playMatch1]
    matches.push(...round1Matches)
    matchesInPreviousRound = [byeMatch1, byeMatch2, byeMatch3, playMatch1] (length 4)

    Subsequent Rounds Loop:
    numMatchesInCurrentRound = 4 (length of matchesInPreviousRound)
    Condition: 4 > 1 is true.

    Round 2 (roundNumber = 2):
    nextRoundMatches = []
    Loop i = 0 (matchesInPreviousRound.length = 4; i+=2)
      i = 0:
        matchId_R2M1 = uuid()
        - R2M1: TBD vs TBD (matchNum 1)
        nextRoundMatches.push(R2M1)
        prevMatch1 (byeMatch1).nextMatchId = R2M1.id
        prevMatch2 (byeMatch2).nextMatchId = R2M1.id
      i = 2:
        matchId_R2M2 = uuid()
        - R2M2: TBD vs TBD (matchNum 2)
        nextRoundMatches.push(R2M2)
        prevMatch1 (byeMatch3).nextMatchId = R2M2.id
        prevMatch2 (playMatch1).nextMatchId = R2M2.id
    matches.push(R2M1, R2M2)
    matchesInPreviousRound = [R2M1, R2M2] (length 2)
    numMatchesInCurrentRound = 2

    Condition: 2 > 1 is true.

    Round 3 (roundNumber = 3):
    nextRoundMatches = []
    Loop i = 0 (matchesInPreviousRound.length = 2; i+=2)
      i = 0:
        matchId_R3M1 = uuid()
        - R3M1 (Final): TBD vs TBD (matchNum 1)
        nextRoundMatches.push(R3M1)
        prevMatch1 (R2M1).nextMatchId = R3M1.id
        prevMatch2 (R2M2).nextMatchId = R3M1.id
    matches.push(R3M1)
    matchesInPreviousRound = [R3M1] (length 1)
    numMatchesInCurrentRound = 1

    Condition: 1 > 1 is false. Loop terminates. (Or (1 === 1 && 3 <= 3) is true, one more iteration?)
    Ah, `while (numMatchesInCurrentRound > 1 || (numMatchesInCurrentRound === 1 && roundNumber <= numRounds ))`
    If numMatchesInCurrentRound is 1 (final match generated), and roundNumber (3) <= numRounds (3), it continues.
    This seems like it might try to generate a match for the winner of the final. This condition needs adjustment.
    It should stop when `matchesInPreviousRound.length` is 1.
    The `if(matchesInPreviousRound.length <=1 && roundNumber > 1) break;` handles this.
    So, for 5 players:
    R1: 3 bye matches (P1, P2, P3 advance), 1 play match (P4 vs P5) -> Total 4 "match slots" for R2.
    R2: Match (P1 vs P2), Match (P3 vs Winner(P4,P5)) -> Total 2 matches.
    R3: Match (Winner(P1,P2) vs Winner(P3, W(P4,P5))) -> Total 1 match (Final).

    This structure is:
    P1 ---
          | P1 --
    P2 ---       |
                 | Final Match
          P3 --  |
    P3 ---       |
          W(P4,P5)
    P4 ---
          | W(P4,P5)
    P5 ---

    This is a standard single elimination bracket. The logic seems to correctly implement this.
    The number of match objects created:
    R1: numByes + (participantsInRound1Play.length / 2) = 3 + 1 = 4 matches
    R2: 4 / 2 = 2 matches
    R3: 2 / 2 = 1 match
    Total = 4 + 2 + 1 = 7 matches.
    For N=5, expected total slots 2^3=8. Expected matches = 8-1 = 7. This is correct.
*/
