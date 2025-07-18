const Team = require('../../../../src/domain/team/team.entity');
const { v4: uuidv4 } = require('uuid');

describe('Team Entity', () => {
  const ownerId = uuidv4();

  describe('Constructor', () => {
    it('should create a team instance with required fields', () => {
      const team = new Team({ name: 'The Winners', ownerId });
      expect(team.id).toBeDefined();
      expect(team.name).toBe('The Winners');
      expect(team.ownerId).toBe(ownerId);
      expect(team.description).toBeNull();
      expect(team.logoUrl).toBeNull();
      expect(team.createdAt).toBeInstanceOf(Date);
      expect(team.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a team instance with all fields', () => {
      const teamData = {
        id: uuidv4(),
        name: 'All Stars',
        description: 'A team of all stars.',
        logoUrl: 'http://example.com/logo.png',
        ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const team = new Team(teamData);
      expect(team).toEqual(teamData);
    });

    it('should throw an error if name is not provided', () => {
      expect(() => new Team({ ownerId })).toThrow('Team name is required.');
    });

    it('should throw an error if ownerId is not provided', () => {
      expect(() => new Team({ name: 'No Owner Team' })).toThrow('Team owner ID is required.');
    });
  });

  describe('updateDetails', () => {
    let team;
    beforeEach(() => {
      team = new Team({ name: 'Original Name', ownerId, description: 'Original Description' });
    });

    it('should update the name', () => {
      const oldUpdatedAt = team.updatedAt;
      team.updateDetails({ name: 'New Name' });
      expect(team.name).toBe('New Name');
    });

    it('should update the description', () => {
      team.updateDetails({ description: 'New Description' });
      expect(team.description).toBe('New Description');
    });

    it('should update the logoUrl', () => {
      team.updateDetails({ logoUrl: 'http://new.logo/url.png' });
      expect(team.logoUrl).toBe('http://new.logo/url.png');
    });

    it('should update multiple fields at once', () => {
      const updates = { name: 'Updated Name', description: 'Updated Desc' };
      team.updateDetails(updates);
      expect(team.name).toBe('Updated Name');
      expect(team.description).toBe('Updated Desc');
    });

    it('should not update fields that are not provided', () => {
      const originalName = team.name;
      team.updateDetails({ description: 'Only Desc' });
      expect(team.name).toBe(originalName);
      expect(team.description).toBe('Only Desc');
    });
  });

  describe('changeOwner', () => {
    it('should change the ownerId', async () => {
      const team = new Team({ name: 'Test Team', ownerId });
      const newOwnerId = uuidv4();
      const oldUpdatedAt = team.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 1));

      team.changeOwner(newOwnerId);

      expect(team.ownerId).toBe(newOwnerId);
      expect(team.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
    });

    it('should throw an error if newOwnerId is not provided', () => {
      const team = new Team({ name: 'Test Team', ownerId });
      expect(() => team.changeOwner(null)).toThrow('New owner ID is required.');
    });
  });
});
