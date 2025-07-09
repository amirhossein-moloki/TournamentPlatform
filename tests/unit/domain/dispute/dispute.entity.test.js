const { DisputeTicket } = require('../../../../src/domain/dispute/dispute.entity');
const { v4: uuidv4 } = require('uuid');

describe('DisputeTicket Entity', () => {
  const now = new Date();
  const baseDisputeData = {
    id: uuidv4(),
    matchId: uuidv4(),
    reporterId: uuidv4(),
    reason: 'Opponent cheated.',
    status: DisputeTicket.Status.OPEN,
    resolutionDetails: null,
    moderatorId: null,
    createdAt: now,
    updatedAt: now,
  };

  describe('Constructor', () => {
    it('should create a DisputeTicket instance with all provided fields', () => {
      const dispute = new DisputeTicket(baseDisputeData);

      expect(dispute).toBeInstanceOf(DisputeTicket);
      expect(dispute.id).toBe(baseDisputeData.id);
      expect(dispute.matchId).toBe(baseDisputeData.matchId);
      expect(dispute.reporterId).toBe(baseDisputeData.reporterId);
      expect(dispute.reason).toBe(baseDisputeData.reason);
      expect(dispute.status).toBe(DisputeTicket.Status.OPEN);
      expect(dispute.resolutionDetails).toBeNull();
      expect(dispute.moderatorId).toBeNull();
      expect(dispute.createdAt).toEqual(now);
      expect(dispute.updatedAt).toEqual(now);
    });

    it('should throw an error for an invalid status', () => {
      const invalidData = { ...baseDisputeData, status: 'INVALID_STATUS' };
      expect(() => new DisputeTicket(invalidData)).toThrow('Invalid status: INVALID_STATUS');
    });

    it('should throw an error if reason is empty or whitespace', () => {
      const invalidData1 = { ...baseDisputeData, reason: '' };
      expect(() => new DisputeTicket(invalidData1)).toThrow('Reason cannot be empty.');
      const invalidData2 = { ...baseDisputeData, reason: '   ' };
      expect(() => new DisputeTicket(invalidData2)).toThrow('Reason cannot be empty.');
    });

    it('should throw an error if reason is null or undefined', () => {
        const invalidData1 = { ...baseDisputeData, reason: null };
        expect(() => new DisputeTicket(invalidData1)).toThrow('Reason cannot be empty.');
        const invalidData2 = { ...baseDisputeData, reason: undefined };
        expect(() => new DisputeTicket(invalidData2)).toThrow('Reason cannot be empty.');
    });
  });

  describe('Static Properties', () => {
    it('should have a static Status object', () => {
      expect(DisputeTicket.Status).toBeDefined();
      expect(DisputeTicket.Status.OPEN).toBe('OPEN');
      expect(DisputeTicket.Status.RESOLVED).toBe('RESOLVED');
    });
    it('should have a static getter validStatuses', () => {
      expect(DisputeTicket.validStatuses).toBeInstanceOf(Array);
      expect(DisputeTicket.validStatuses).toContain(DisputeTicket.Status.OPEN);
      expect(DisputeTicket.validStatuses.length).toEqual(Object.keys(DisputeTicket.Status).length);
    });
  });

  describe('Static Factory Method: fromPersistence', () => {
    it('should create a DisputeTicket instance from persistence data', () => {
      const persistedData = {
        ...baseDisputeData,
        id: uuidv4(),
        status: DisputeTicket.Status.UNDER_REVIEW,
        moderatorId: uuidv4(),
      };
      const dispute = DisputeTicket.fromPersistence(persistedData);

      expect(dispute).toBeInstanceOf(DisputeTicket);
      expect(dispute.id).toBe(persistedData.id);
      expect(dispute.status).toBe(DisputeTicket.Status.UNDER_REVIEW);
      expect(dispute.moderatorId).toBe(persistedData.moderatorId);
    });

    it('should return null if no data provided to fromPersistence', () => {
      expect(DisputeTicket.fromPersistence(null)).toBeNull();
      expect(DisputeTicket.fromPersistence(undefined)).toBeNull();
    });
  });

  describe('resolve', () => {
    let dispute;
    const moderatorId = uuidv4();
    beforeEach(() => {
      dispute = new DisputeTicket(baseDisputeData);
    });

    it('should set status to RESOLVED, update resolutionDetails, moderatorId, and updatedAt', () => {
      const details = 'Resolved in favor of reporter.';
      const initialUpdatedAt = dispute.updatedAt;

      // Ensure a slight delay for updatedAt comparison
      return new Promise(resolve => setTimeout(() => {
        dispute.resolve(details, moderatorId);
        expect(dispute.status).toBe(DisputeTicket.Status.RESOLVED);
        expect(dispute.resolutionDetails).toBe(details);
        expect(dispute.moderatorId).toBe(moderatorId);
        expect(dispute.updatedAt).not.toBe(initialUpdatedAt);
        resolve();
      }, 5));
    });

    it('should throw an error if dispute is already RESOLVED', () => {
      dispute.status = DisputeTicket.Status.RESOLVED;
      expect(() => dispute.resolve('details', moderatorId)).toThrow('Dispute is already finalized.');
    });
    it('should throw an error if dispute is already CLOSED', () => {
      dispute.status = DisputeTicket.Status.CLOSED;
      expect(() => dispute.resolve('details', moderatorId)).toThrow('Dispute is already finalized.');
    });
  });

  describe('close', () => {
    let dispute;
    const closingModeratorId = uuidv4();
    beforeEach(() => {
      dispute = new DisputeTicket(baseDisputeData);
    });

    it('should set status to CLOSED and update moderatorId (if provided) and updatedAt', () => {
      dispute.status = DisputeTicket.Status.RESOLVED; // Must be resolved first as per current logic
      const initialUpdatedAt = dispute.updatedAt;

      return new Promise(resolve => setTimeout(() => {
        dispute.close(closingModeratorId);
        expect(dispute.status).toBe(DisputeTicket.Status.CLOSED);
        expect(dispute.moderatorId).toBe(closingModeratorId);
        expect(dispute.updatedAt).not.toBe(initialUpdatedAt);
        resolve();
      }, 5));
    });

    it('should allow closing without a moderatorId (moderatorId remains as is or null)', () => {
        dispute.status = DisputeTicket.Status.RESOLVED;
        dispute.moderatorId = uuidv4(); // Some initial moderator
        const initialModId = dispute.moderatorId;

        dispute.close(null); // Close without passing a new moderatorId
        expect(dispute.status).toBe(DisputeTicket.Status.CLOSED);
        expect(dispute.moderatorId).toBe(initialModId); // Should not change if null is passed
    });

    // The check for 'must be resolved first' is commented out in the entity, so this test reflects current behavior
    it('should allow closing from OPEN status (as per current entity logic)', () => {
        dispute.status = DisputeTicket.Status.OPEN;
        expect(() => dispute.close(closingModeratorId)).not.toThrow();
        expect(dispute.status).toBe(DisputeTicket.Status.CLOSED);
    });
     it('should allow closing from UNDER_REVIEW status (as per current entity logic)', () => {
        dispute.status = DisputeTicket.Status.UNDER_REVIEW;
        expect(() => dispute.close(closingModeratorId)).not.toThrow();
        expect(dispute.status).toBe(DisputeTicket.Status.CLOSED);
    });
  });

  describe('startReview', () => {
    let dispute;
    const reviewingModeratorId = uuidv4();
    beforeEach(() => {
      dispute = new DisputeTicket(baseDisputeData); // Status is OPEN by default
    });

    it('should set status to UNDER_REVIEW, set moderatorId, and update updatedAt', () => {
      const initialUpdatedAt = dispute.updatedAt;

      return new Promise(resolve => setTimeout(() => {
        dispute.startReview(reviewingModeratorId);
        expect(dispute.status).toBe(DisputeTicket.Status.UNDER_REVIEW);
        expect(dispute.moderatorId).toBe(reviewingModeratorId);
        expect(dispute.updatedAt).not.toBe(initialUpdatedAt);
        resolve();
      }, 5));
    });

    it('should throw an error if dispute is not OPEN', () => {
      dispute.status = DisputeTicket.Status.RESOLVED;
      expect(() => dispute.startReview(reviewingModeratorId)).toThrow('Dispute is not open for review.');
    });
  });
});
