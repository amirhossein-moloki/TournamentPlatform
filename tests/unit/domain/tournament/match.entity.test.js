const { Match, MatchStatus } = require('../../../../src/domain/tournament/match.entity');
const { v4: uuidv4 } = require('uuid');

describe('Match Entity', () => {
  const tournamentId = uuidv4();
  const p1Id = uuidv4();
  const p2Id = uuidv4();
  const futureTime = new Date();
  futureTime.setDate(futureTime.getDate() + 1);

  const baseMatchData = {
    id: uuidv4(),
    tournamentId: tournamentId,
    roundNumber: 1,
    matchNumberInRound: 1,
  };

  describe('Constructor', () => {
    it('should create a match instance with required fields and defaults', () => {
      const match = new Match(
        baseMatchData.id,
        baseMatchData.tournamentId,
        baseMatchData.roundNumber,
        baseMatchData.matchNumberInRound
      );
      expect(match).toBeInstanceOf(Match);
      expect(match.id).toBe(baseMatchData.id);
      expect(match.tournamentId).toBe(tournamentId);
      expect(match.roundNumber).toBe(1);
      expect(match.matchNumberInRound).toBe(1);
      expect(match.participant1Id).toBeNull();
      expect(match.participant2Id).toBeNull();
      expect(match.status).toBe(MatchStatus.SCHEDULED);
      expect(match.scheduledTime).toBeNull();
      expect(match.winnerId).toBeNull();
      expect(match.participant1Score).toBeNull();
      expect(match.participant2Score).toBeNull();
      expect(match.isConfirmed).toBe(false);
      expect(match.metadata).toEqual({});
      expect(match.createdAt).toBeInstanceOf(Date);
      expect(match.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow overriding default and optional fields', () => {
      const specificData = {
        ...baseMatchData,
        participant1Id: p1Id,
        participant2Id: p2Id,
        status: MatchStatus.IN_PROGRESS,
        scheduledTime: futureTime.toISOString(),
        participant1Score: 10,
        participant2Score: 5,
        winnerId: p1Id,
        isConfirmed: true,
        metadata: { streamUrl: 'http://twitch.tv/stream' },
        resultProofUrlP1: 'url1',
        resultProofUrlP2: 'url2',
        nextMatchLoserId: uuidv4(),
        participant1Type: 'USER',
        participant2Type: 'TEAM',
        winnerType: 'USER',
        moderatorNotes: 'Good game',
      };
      const match = new Match(
        specificData.id, specificData.tournamentId, specificData.roundNumber, specificData.matchNumberInRound,
        specificData.participant1Id, specificData.participant2Id, specificData.status, specificData.scheduledTime,
        new Date(), new Date(), specificData.winnerId, specificData.participant1Score, specificData.participant2Score,
        specificData.resultProofUrlP1, specificData.resultProofUrlP2, specificData.isConfirmed, uuidv4(),
        specificData.nextMatchLoserId, specificData.participant1Type, specificData.participant2Type,
        specificData.winnerType, specificData.moderatorNotes, specificData.metadata
      );

      expect(match.participant1Id).toBe(p1Id);
      expect(match.status).toBe(MatchStatus.IN_PROGRESS);
      expect(match.scheduledTime).toEqual(new Date(futureTime.toISOString()));
      expect(match.participant1Score).toBe(10);
      expect(match.winnerId).toBe(p1Id);
      expect(match.isConfirmed).toBe(true);
      expect(match.metadata).toEqual(specificData.metadata);
      expect(match.resultProofUrlP2).toBe('url2');
      expect(match.nextMatchLoserId).toBe(specificData.nextMatchLoserId);
      expect(match.participant1Type).toBe('USER');
      expect(match.moderatorNotes).toBe('Good game');
    });

    const requiredFieldsValidation = [
      { field: 'id', mod: { id: null }, message: 'Match ID is required.' },
      { field: 'tournamentId', mod: { tournamentId: null }, message: 'Tournament ID for match is required.' },
      { field: 'roundNumber', mod: { roundNumber: -1 }, message: 'Valid round number is required.' },
      { field: 'roundNumber', mod: { roundNumber: null }, message: 'Valid round number is required.' },
      { field: 'matchNumberInRound', mod: { matchNumberInRound: -1 }, message: 'Valid match number in round is required.' },
      { field: 'matchNumberInRound', mod: { matchNumberInRound: null }, message: 'Valid match number in round is required.' },
    ];

    requiredFieldsValidation.forEach(tc => {
      it(`should throw an error if ${tc.field} is invalid`, () => {
        const data = { ...baseMatchData, ...tc.mod };
        expect(() => new Match(data.id, data.tournamentId, data.roundNumber, data.matchNumberInRound))
          .toThrow(tc.message);
      });
    });

    it('should parse scores to integers or null', () => {
        const match1 = new Match(baseMatchData.id, tournamentId, 1, 1, p1Id, p2Id, MatchStatus.SCHEDULED, null, null, null, null, '15', '10');
        expect(match1.participant1Score).toBe(15);
        expect(match1.participant2Score).toBe(10);

        const match2 = new Match(baseMatchData.id, tournamentId, 1, 1, p1Id, p2Id, MatchStatus.SCHEDULED, null, null, null, null, null, '5');
        expect(match2.participant1Score).toBeNull();
        expect(match2.participant2Score).toBe(5);
    });
  });

  describe('Static Factory Method: fromPersistence', () => {
    it('should create a Match instance from persistence data', () => {
        const persistenceData = {
            id: uuidv4(), tournamentId, round: 2, matchNumberInRound: 3, participant1Id: p1Id, status: MatchStatus.COMPLETED,
            winnerId: p1Id, participant1Score: 2, participant2Score: 0, isConfirmed: true, resultProofUrlP1: 'proof.png'
        };
        const match = Match.fromPersistence(persistenceData);
        expect(match).toBeInstanceOf(Match);
        expect(match.id).toBe(persistenceData.id);
        expect(match.roundNumber).toBe(2); // testing alias for round
        expect(match.status).toBe(MatchStatus.COMPLETED);
        expect(match.winnerId).toBe(p1Id);
        expect(match.isConfirmed).toBe(true);
    });
     it('should handle missing isConfirmed by defaulting to false', () => {
        const persistenceData = { id: uuidv4(), tournamentId, round: 1, matchNumberInRound: 1 };
        delete persistenceData.isConfirmed; // ensure it's undefined
        const match = Match.fromPersistence(persistenceData);
        expect(match.isConfirmed).toBe(false);
    });
    it('should return null if no data provided to fromPersistence', () => {
        expect(Match.fromPersistence(null)).toBeNull();
    });
  });

  describe('Static Enums', () => {
    it('should expose Status enum correctly', () => {
        expect(Match.Status).toBeDefined();
        expect(Match.Status.SCHEDULED).toBe('SCHEDULED');
        expect(MatchStatus.COMPLETED).toBe('COMPLETED');
    });
    it('should have validStatuses array', () => {
      expect(Match.validStatuses).toEqual(Object.values(Match.Status));
    });
  });

  describe('updateStatus', () => {
    let match;
    beforeEach(() => { match = new Match(baseMatchData.id, tournamentId, 1, 1); });

    it('should update status and updatedAt', () => {
      const initialUpdatedAt = match.updatedAt;
      match.updateStatus(MatchStatus.IN_PROGRESS);
      expect(match.status).toBe(MatchStatus.IN_PROGRESS);
      expect(match.updatedAt).not.toBe(initialUpdatedAt);
    });
    it('should throw for invalid status', () => {
      expect(() => match.updateStatus('INVALID')).toThrow('Invalid match status: INVALID.');
    });
  });

  describe('startMatch', () => {
    let match;
    beforeEach(() => {
        match = new Match(baseMatchData.id, tournamentId, 1, 1, p1Id, p2Id, MatchStatus.SCHEDULED);
    });

    it('should set status to IN_PROGRESS and actualStartTime', () => {
      match.startMatch();
      expect(match.status).toBe(MatchStatus.IN_PROGRESS);
      expect(match.actualStartTime).toBeInstanceOf(Date);
    });
    it('should throw if not SCHEDULED', () => {
      match.status = MatchStatus.PENDING;
      expect(() => match.startMatch()).toThrow('Match can only be started if it is SCHEDULED.');
    });
    // Test for starting without two participants is commented out in entity, so skipping for now.
    // it('should throw if participants not set', () => { ... });
  });

  describe('recordResult', () => {
    let match;
    beforeEach(() => {
        match = new Match(baseMatchData.id, tournamentId, 1, 1, p1Id, p2Id, MatchStatus.IN_PROGRESS);
        match.participant1Type = 'USER';
        match.participant2Type = 'USER';
    });

    it('should set winner, scores, proof, endTime, isConfirmed=false, and status=AWAITING_CONFIRMATION', () => {
        match.recordResult(p1Id, 2, 1, 'proof1.jpg', 'proof2.jpg');
        expect(match.winnerId).toBe(p1Id);
        expect(match.winnerType).toBe('USER');
        expect(match.participant1Score).toBe(2);
        expect(match.participant2Score).toBe(1);
        expect(match.resultProofUrlP1).toBe('proof1.jpg');
        expect(match.resultProofUrlP2).toBe('proof2.jpg');
        expect(match.actualEndTime).toBeInstanceOf(Date);
        expect(match.isConfirmed).toBe(false);
        expect(match.status).toBe(MatchStatus.AWAITING_CONFIRMATION);
    });

    it('should throw if status is not IN_PROGRESS or AWAITING_SCORES', () => {
        match.status = MatchStatus.SCHEDULED;
        expect(() => match.recordResult(p1Id, 2,1)).toThrow('Cannot record result for match with status: SCHEDULED.');
    });
    it('should throw if winnerId is not one of the participants', () => {
        const otherId = uuidv4();
        expect(() => match.recordResult(otherId, 2,1)).toThrow('Winner ID does not match any participant in this match.');
    });
     it('should handle null winnerId (e.g. reporting scores for a draw or pending decision)', () => {
        match.recordResult(null, 1, 1);
        expect(match.winnerId).toBeNull();
        expect(match.winnerType).toBeNull();
        expect(match.status).toBe(MatchStatus.AWAITING_CONFIRMATION);
    });
     it('should handle null proof URLs', () => {
        match.recordResult(p1Id, 3, 0, null, null);
        expect(match.resultProofUrlP1).toBeNull();
        expect(match.resultProofUrlP2).toBeNull();
    });
  });

  describe('confirmResult', () => {
    let match;
    beforeEach(() => {
        match = new Match(baseMatchData.id, tournamentId, 1, 1, p1Id, p2Id, MatchStatus.AWAITING_CONFIRMATION);
        match.winnerId = p1Id; // Assume result was recorded
    });

    it('should set isConfirmed=true and status=COMPLETED', () => {
        match.confirmResult(p2Id); // Confirmed by opponent
        expect(match.isConfirmed).toBe(true);
        expect(match.status).toBe(MatchStatus.COMPLETED);
    });
    it('should allow confirming from DISPUTED status', () => {
        match.status = MatchStatus.DISPUTED;
        match.confirmResult(uuidv4()); // Admin confirms
        expect(match.isConfirmed).toBe(true);
        expect(match.status).toBe(MatchStatus.COMPLETED);
    });
    it('should throw if status is not AWAITING_CONFIRMATION or DISPUTED', () => {
        match.status = MatchStatus.IN_PROGRESS;
        expect(() => match.confirmResult(p2Id)).toThrow('Result cannot be confirmed for match with status: IN_PROGRESS.');
    });
    // Skipping self-confirmation check as it's commented out in entity
  });

  describe('disputeResult', () => {
    let match;
    beforeEach(() => {
        match = new Match(baseMatchData.id, tournamentId, 1, 1, p1Id, p2Id, MatchStatus.AWAITING_CONFIRMATION);
        match.winnerId = p1Id;
    });

    it('should set status=DISPUTED and isConfirmed=false', () => {
        match.disputeResult(p2Id, 'Incorrect score reported');
        expect(match.status).toBe(MatchStatus.DISPUTED);
        expect(match.isConfirmed).toBe(false);
    });
    it('should allow disputing a COMPLETED (but perhaps wrongly confirmed) match', () => {
        match.status = MatchStatus.COMPLETED; // e.g. auto-confirmed or admin confirmed too early
        match.isConfirmed = true;
        match.disputeResult(p2Id, "Result was confirmed in error");
        expect(match.status).toBe(MatchStatus.DISPUTED);
        expect(match.isConfirmed).toBe(false);
    });
    it('should throw if status is not AWAITING_CONFIRMATION or COMPLETED', () => {
        match.status = MatchStatus.IN_PROGRESS;
        expect(() => match.disputeResult(p2Id, 'reason')).toThrow('Result cannot be disputed for match with status: IN_PROGRESS.');
    });
    it('should throw if reporterId or reason is missing', () => {
        expect(() => match.disputeResult(null, 'reason')).toThrow('Reporter ID and reason are required to dispute a result.');
        expect(() => match.disputeResult(p2Id, null)).toThrow('Reporter ID and reason are required to dispute a result.');
    });
  });

  describe('resolveDispute', () => {
    let match;
    beforeEach(() => {
        match = new Match(baseMatchData.id, tournamentId, 1, 1, p1Id, p2Id, MatchStatus.DISPUTED);
        match.participant1Type = 'USER';
        match.participant2Type = 'USER';
    });

    it('should set winner, isConfirmed=true, moderatorNotes, and status (default COMPLETED)', () => {
        match.resolveDispute(p2Id, 'Admin reviewed, P2 is winner.');
        expect(match.winnerId).toBe(p2Id);
        expect(match.winnerType).toBe('USER');
        expect(match.isConfirmed).toBe(true);
        expect(match.moderatorNotes).toBe('Admin reviewed, P2 is winner.');
        expect(match.status).toBe(MatchStatus.COMPLETED);
    });
    it('should allow setting a different resolved status (e.g., CANCELED)', () => {
        match.resolveDispute(null, 'Match void due to issues.', MatchStatus.CANCELED);
        expect(match.winnerId).toBeNull();
        expect(match.status).toBe(MatchStatus.CANCELED);
    });
    it('should throw if not in DISPUTED status', () => {
        match.status = MatchStatus.COMPLETED;
        expect(() => match.resolveDispute(p1Id, 'notes')).toThrow('Cannot resolve dispute for a match not in DISPUTED status.');
    });
  });

  describe('setParticipants', () => {
    let match;
    beforeEach(() => { match = new Match(baseMatchData.id, tournamentId, 1, 1, null, null, MatchStatus.PENDING); });

    it('should set participant IDs and types', () => {
        match.setParticipants(p1Id, 'USER', p2Id, 'TEAM');
        expect(match.participant1Id).toBe(p1Id);
        expect(match.participant1Type).toBe('USER');
        expect(match.participant2Id).toBe(p2Id);
        expect(match.participant2Type).toBe('TEAM');
        expect(match.updatedAt).toBeInstanceOf(Date); // Check if updatedAt is touched
    });

    it('should set match to BYE if one participant is set and status was SCHEDULED/PENDING', () => {
        match.status = MatchStatus.SCHEDULED;
        match.setParticipants(p1Id, 'USER', null, null);
        expect(match.status).toBe(MatchStatus.BYE);
        expect(match.winnerId).toBe(p1Id);
        expect(match.isConfirmed).toBe(true); // isConfirmed is still true for a BYE
    });

    it('should change status to SCHEDULED if it was BYE and now has two participants', () => {
        match.setAsBye(p1Id, 'USER'); // Make it a BYE match first
        expect(match.status).toBe(MatchStatus.BYE); // Status is BYE after setAsBye

        match.setParticipants(p1Id, 'USER', p2Id, 'TEAM'); // Now add opponent
        expect(match.status).toBe(MatchStatus.SCHEDULED); // Should transition from BYE to SCHEDULED
    });

    it('should change status to PENDING if both participants become null and status was not PENDING', () => {
        match.setParticipants(p1Id, 'USER', p2Id, 'TEAM');
        match.status = MatchStatus.SCHEDULED; // Assume it was scheduled
        match.setParticipants(null, null, null, null);
        expect(match.status).toBe(MatchStatus.PENDING);
    });
    // Skipping status check for setParticipants for now as it's commented out in entity
  });

  describe('setAsBye', () => {
    let match;
    beforeEach(() => {
        match = new Match(baseMatchData.id, tournamentId, 1, 1, null, null, MatchStatus.SCHEDULED);
    });

    it('should set winner, status to BYE, isConfirmed=true, and participant slots', () => {
        match.setAsBye(p1Id, 'USER');
        expect(match.winnerId).toBe(p1Id);
        expect(match.winnerType).toBe('USER');
        expect(match.status).toBe(MatchStatus.BYE);
        expect(match.isConfirmed).toBe(true); // BYE implies confirmation of winner
        expect(match.participant1Id).toBe(p1Id);
        expect(match.participant1Type).toBe('USER');
        expect(match.participant2Id).toBeNull();
        expect(match.actualStartTime).toBeInstanceOf(Date);
        expect(match.actualEndTime).toBeInstanceOf(Date);
    });

    it('should place BYE winner in P1 if P1 was occupied by someone else (and P2 was empty)', () => {
        const otherP1 = uuidv4();
        match.participant1Id = otherP1; // P1 is 'occupied'
        match.participant2Id = null;    // P2 is empty

        match.setAsBye(p2Id, 'TEAM'); // p2Id is the BYE winner

        expect(match.participant1Id).toBe(p2Id); // p2Id (winner) takes P1 slot
        expect(match.participant1Type).toBe('TEAM');
        expect(match.participant2Id).toBeNull();   // P2 remains null
        expect(match.participant2Type).toBeNull();
        expect(match.winnerId).toBe(p2Id);
    });

    it('should throw if winningParticipantId is not provided', () => {
        expect(() => match.setAsBye(null, 'USER')).toThrow('A winning participant ID is required for a BYE.');
    });
  });

  describe('cancelMatch', () => {
    let match;
    beforeEach(() => { match = new Match(baseMatchData.id, tournamentId, 1, 1, p1Id, p2Id, MatchStatus.SCHEDULED); });

    it('should set status to CANCELED and update moderatorNotes', () => {
        match.cancelMatch('Admin decision.');
        expect(match.status).toBe(MatchStatus.CANCELED);
        expect(match.moderatorNotes).toContain('Admin decision.');
    });
    it('should throw if already COMPLETED or CANCELED', () => {
        match.status = MatchStatus.COMPLETED;
        expect(() => match.cancelMatch()).toThrow(`Match is already ${MatchStatus.COMPLETED} and cannot be canceled.`);
        match.status = MatchStatus.CANCELED;
        expect(() => match.cancelMatch()).toThrow(`Match is already ${MatchStatus.CANCELED} and cannot be canceled.`);
    });
  });

  describe('updateScheduledTime', () => {
    let match;
    beforeEach(() => { match = new Match(baseMatchData.id, tournamentId, 1, 1, p1Id, p2Id, MatchStatus.SCHEDULED); });

    it('should update scheduledTime and updatedAt', () => {
        const newTime = new Date(futureTime.getTime() + 3600 * 1000); // One hour later
        match.updateScheduledTime(newTime.toISOString());
        expect(match.scheduledTime).toEqual(newTime);
        expect(match.updatedAt).toBeInstanceOf(Date); // Check if date was updated
    });
    it('should throw if status is not SCHEDULED or PENDING', () => {
        match.status = MatchStatus.IN_PROGRESS;
        expect(() => match.updateScheduledTime(futureTime.toISOString())).toThrow('Can only reschedule a match that is currently SCHEDULED or PENDING.');
    });
    it('should throw if newTime is not in the future', () => {
        const pastTime = new Date();
        pastTime.setDate(pastTime.getDate() -1);
        expect(() => match.updateScheduledTime(pastTime.toISOString())).toThrow('Scheduled time must be in the future.');
    });
  });

});
