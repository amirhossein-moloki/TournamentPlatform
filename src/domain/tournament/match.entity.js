/**
 * Represents a Match within a Tournament.
 */
class Match {
  /**
   * @param {string} id - The unique identifier for the match (UUID).
   * @param {string} tournamentId - ID of the tournament this match belongs to.
   * @param {number} roundNumber - The round number within the tournament.
   * @param {number} matchNumberInRound - The number of this match within its round.
   * @param {string|null} participant1Id - ID of the first participant (User or Team). Null if BYE or TBD.
   * @param {string|null} participant2Id - ID of the second participant (User or Team). Null if BYE or TBD.
   * @param {string} status - Current status of the match (e.g., 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED').
   * @param {Date|null} scheduledTime - The scheduled start time of the match.
   * @param {Date|null} actualStartTime - The actual start time of the match.
   * @param {Date|null} actualEndTime - The actual end time of the match.
   * @param {string|null} winnerId - ID of the winning participant. Null if not yet determined or a draw (if draws allowed).
   * @param {number|null} scoreParticipant1 - Score of the first participant.
   * @param {number|null} scoreParticipant2 - Score of the second participant.
   * @param {string|null} resultScreenshotUrl - URL of the uploaded result screenshot.
   * @param {boolean} isConfirmed - Whether the result is confirmed (e.g., by opponent or admin).
   * @param {string|null} nextMatchId - ID of the match that the winner of this match advances to.
   * @param {Date} [createdAt] - Timestamp of when the match was created.
   * @param {Date} [updatedAt] - Timestamp of when the match was last updated.
   */
  constructor(
    id,
    tournamentId,
    roundNumber,
    matchNumberInRound,
    participant1Id = null,
    participant2Id = null,
    status = 'SCHEDULED',
    scheduledTime = null,
    actualStartTime = null,
    actualEndTime = null,
    winnerId = null,
    scoreParticipant1 = null,
    scoreParticipant2 = null,
    resultScreenshotUrl = null,
    isConfirmed = false,
    nextMatchId = null,
    createdAt = new Date(),
    updatedAt = new Date()
  ) {
    if (!id) throw new Error('Match ID is required.');
    if (!tournamentId) throw new Error('Tournament ID for match is required.');
    if (roundNumber == null || roundNumber < 0) throw new Error('Valid round number is required.');
    if (matchNumberInRound == null || matchNumberInRound < 0) throw new Error('Valid match number in round is required.');

    this.id = id;
    this.tournamentId = tournamentId;
    this.roundNumber = roundNumber;
    this.matchNumberInRound = matchNumberInRound;
    this.participant1Id = participant1Id;
    this.participant2Id = participant2Id;
    this.status = status;
    this.scheduledTime = scheduledTime ? new Date(scheduledTime) : null;
    this.actualStartTime = actualStartTime ? new Date(actualStartTime) : null;
    this.actualEndTime = actualEndTime ? new Date(actualEndTime) : null;
    this.winnerId = winnerId;
    this.scoreParticipant1 = scoreParticipant1 != null ? parseInt(scoreParticipant1, 10) : null;
    this.scoreParticipant2 = scoreParticipant2 != null ? parseInt(scoreParticipant2, 10) : null;
    this.resultScreenshotUrl = resultScreenshotUrl;
    this.isConfirmed = isConfirmed;
    this.nextMatchId = nextMatchId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'AWAITING_SCORES', 'AWAITING_CONFIRMATION', 'DISPUTED', 'COMPLETED', 'CANCELED', 'BYE'];

  updateStatus(newStatus) {
    if (!Match.validStatuses.includes(newStatus)) {
      throw new Error(`Invalid match status: ${newStatus}.`);
    }
    // Add business logic for valid status transitions if needed
    this.status = newStatus;
    this.updatedAt = new Date();
  }

  startMatch() {
    if (this.status !== 'SCHEDULED') {
      throw new Error('Match can only be started if it is SCHEDULED.');
    }
    if (!this.participant1Id || !this.participant2Id) {
        // Allow starting if one is null (BYE scenario, though status might be BYE directly)
        // Or if it's a placeholder match waiting for participants from previous rounds.
        // For now, let's assume a typical match requires both participants.
        // This rule might be relaxed by a bracket generation logic.
        // throw new Error('Match cannot start without two participants assigned.');
    }
    this.updateStatus('IN_PROGRESS');
    this.actualStartTime = new Date();
  }

  /**
   * Records the result of the match.
   * @param {string} winningParticipantId - ID of the winner.
   * @param {number|null} p1Score - Score for participant 1.
   * @param {number|null} p2Score - Score for participant 2.
   * @param {string|null} screenshotUrl - URL of the result proof.
   */
  recordResult(winningParticipantId, p1Score, p2Score, screenshotUrl = null) {
    if (this.status !== 'IN_PROGRESS' && this.status !== 'AWAITING_SCORES') {
      // Allow reporting if AWAITING_SCORES (e.g. if participants report after match ends)
      throw new Error(`Cannot record result for match with status: ${this.status}.`);
    }
    if (winningParticipantId !== this.participant1Id && winningParticipantId !== this.participant2Id) {
      // Allow null winnerId if it's a draw and draws are handled, or if it's just score reporting stage
      // For now, assume a winner is declared.
      if (winningParticipantId) { // Only throw if a winnerId is provided and it's not one of the participants
        throw new Error('Winner ID does not match any participant in this match.');
      }
    }

    this.winnerId = winningParticipantId;
    this.scoreParticipant1 = p1Score != null ? parseInt(p1Score, 10) : null;
    this.scoreParticipant2 = p2Score != null ? parseInt(p2Score, 10) : null;
    if (screenshotUrl) this.resultScreenshotUrl = screenshotUrl;

    this.actualEndTime = new Date();
    this.isConfirmed = false; // Result recorded, but needs confirmation
    this.updateStatus('AWAITING_CONFIRMATION'); // Or directly to COMPLETED if auto-confirmed
  }

  confirmResult(byUserId) { // byUserId is the ID of user/admin confirming
    if (this.status !== 'AWAITING_CONFIRMATION' && this.status !== 'DISPUTED') {
      throw new Error(`Result cannot be confirmed for match with status: ${this.status}.`);
    }
    // Add logic: e.g., only opponent or admin can confirm.
    // if (this.winnerId === byUserId) throw new Error('Winner cannot self-confirm the result.');

    this.isConfirmed = true;
    this.updateStatus('COMPLETED');
    // Application service would then handle advancing winner to nextMatchId if it exists.
  }

  disputeResult(reporterId, reason) {
    if (this.status !== 'AWAITING_CONFIRMATION' && this.status !== 'COMPLETED') {
      // Allow disputing even if briefly 'COMPLETED' before dispute window closes.
      // Or strictly only from AWAITING_CONFIRMATION.
      throw new Error(`Result cannot be disputed for match with status: ${this.status}.`);
    }
    if (!reporterId || !reason) {
        throw new Error('Reporter ID and reason are required to dispute a result.');
    }
    // Application service would create a DisputeTicket entity.
    this.updateStatus('DISPUTED');
    this.isConfirmed = false; // Disputed results are not confirmed
  }

  resolveDispute(resolvedWinnerId, adminNotes, newStatus = 'COMPLETED') {
    if (this.status !== 'DISPUTED') {
      throw new Error('Cannot resolve dispute for a match not in DISPUTED status.');
    }
    this.winnerId = resolvedWinnerId; // Can be null if match is replayed or voided
    // Scores might also be adjusted by admin.
    this.isConfirmed = true; // Admin resolution implies confirmation
    this.updateStatus(newStatus); // Could be COMPLETED, or CANCELED, or back to SCHEDULED for replay
    // Admin notes would likely be stored on the DisputeTicket, not directly on Match entity.
    this.updatedAt = new Date();
  }

  setParticipants(p1Id, p2Id) {
    // Typically set by bracket logic or admin.
    // Can only set if match is SCHEDULED and participants are not yet set, or if being modified.
    if (this.status !== 'SCHEDULED' && this.status !== 'BYE') { // Allow updating if it was a BYE that now has an opponent
        // Consider if participants can be changed if already set.
        // For now, assume it's for initial setup or filling TBD slots.
    }
    this.participant1Id = p1Id;
    this.participant2Id = p2Id;

    // If one participant is null and the other is not, it could be a BYE.
    if ((p1Id && !p2Id) || (!p1Id && p2Id)) {
        if (this.status === 'SCHEDULED') this.setAsBye(p1Id || p2Id);
    } else if (p1Id && p2Id && this.status === 'BYE') { // Was a bye, now has opponent
        this.updateStatus('SCHEDULED');
    }

    this.updatedAt = new Date();
  }

  setAsBye(winningParticipantId) {
    if (!winningParticipantId) throw new Error('A winning participant ID is required for a BYE.');
    this.participant1Id = winningParticipantId; // Convention: participant1 is the advancing one
    this.participant2Id = null;
    this.winnerId = winningParticipantId;
    this.status = 'COMPLETED'; // Or a specific 'BYE' status that's treated as completed
    this.isConfirmed = true;
    this.actualStartTime = this.actualStartTime || new Date(); // Mark as "started"
    this.actualEndTime = this.actualEndTime || new Date();   // and "ended"
    this.updatedAt = new Date();
  }

  cancelMatch(reason = 'Match canceled.') {
    if (this.status === 'COMPLETED' || this.status === 'CANCELED') {
      throw new Error(`Match is already ${this.status} and cannot be canceled.`);
    }
    this.updateStatus('CANCELED');
    // Add reason to a log or a description field if the entity had one for matches.
    this.updatedAt = new Date();
  }

  updateScheduledTime(newTime) {
    if (this.status !== 'SCHEDULED') {
      throw new Error('Can only reschedule a match that is currently SCHEDULED.');
    }
    if (newTime <= new Date()) {
      throw new Error('Scheduled time must be in the future.');
    }
    this.scheduledTime = new Date(newTime);
    this.updatedAt = new Date();
  }
}

module.exports = { Match };
