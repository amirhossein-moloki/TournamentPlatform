const ITeamRepository = require('../../../domain/team/team.repository.interface');
// const { Team: TeamEntity } = require('../../../domain/team/team.entity'); // Map to domain if needed
const TeamRole = require('../../../domain/team/teamRole.enums');
const { Op } = require('sequelize');

class SequelizeTeamRepository extends ITeamRepository {
  constructor({ TeamModel, TeamMemberModel, UserModel, sequelize }) {
    super();
    this.TeamModel = TeamModel;
    this.TeamMemberModel = TeamMemberModel;
    this.UserModel = UserModel;
    this.sequelize = sequelize;
  }

  async create(teamData, ownerId) {
    const transaction = await this.sequelize.transaction();
    try {
      const team = await this.TeamModel.create({
        ...teamData,
        ownerId: ownerId,
      }, { transaction });

      await this.TeamMemberModel.create({
        teamId: team.id,
        userId: ownerId,
        role: TeamRole.OWNER,
        status: 'active',
      }, { transaction });

      await transaction.commit();
      // Return a plain object or map to domain entity. For now, returning Sequelize model instance.
      // To get a plain object: return team.get({ plain: true });
      return team;
    } catch (error) {
      await transaction.rollback();
      // Log error: console.error('Error creating team:', error);
      throw error;
    }
  }

  async findById(teamId) {
    const team = await this.TeamModel.findByPk(teamId, {
      include: [
        { model: this.UserModel, as: 'owner', attributes: ['id', 'username', 'email'] },
        // Example: Include members count
        // [this.sequelize.literal('(SELECT COUNT(*) FROM "TeamMembers" WHERE "TeamMembers"."teamId" = "TeamModel"."id")'), 'membersCount']
      ],
    });
    return team; // Consider mapping to domain entity
  }

  async findByName(name) {
    const team = await this.TeamModel.findOne({
      where: { name },
      include: [{ model: this.UserModel, as: 'owner', attributes: ['id', 'username', 'email'] }],
    });
    return team;
  }

  async findAll(criteria = {}, options = {}) {
    const { limit, offset, sortBy, sortOrder = 'ASC' } = options;
    const queryOptions = {
      where: criteria,
      include: [{ model: this.UserModel, as: 'owner', attributes: ['id', 'username', 'email'] }],
      distinct: true, // Important if joins cause duplicates, though less likely here
    };
    if (limit) queryOptions.limit = parseInt(limit, 10);
    if (offset) queryOptions.offset = parseInt(offset, 10);
    if (sortBy) queryOptions.order = [[sortBy, sortOrder.toUpperCase()]];

    // Using findAndCountAll for pagination if needed by use case
    // const { count, rows } = await this.TeamModel.findAndCountAll(queryOptions);
    // return { teams: rows, totalCount: count };
    const teams = await this.TeamModel.findAll(queryOptions);
    return teams;
  }

  async update(teamId, updateData) {
    // Ensure ownerId is not updated directly through this generic method
    // if (updateData.ownerId) delete updateData.ownerId; // Or throw error

    const [numberOfAffectedRows, affectedRows] = await this.TeamModel.update(updateData, {
      where: { id: teamId },
      returning: true, // Get the updated rows
      plain: true // Get a single record if multiple not expected
    });
    // For findByPk and save:
    // const team = await this.TeamModel.findByPk(teamId);
    // if (!team) return null;
    // const updatedTeam = await team.update(updateData);
    // return updatedTeam;
    return numberOfAffectedRows > 0 ? affectedRows : null; // affectedRows will be the updated team instance if plain:true
  }

  async delete(teamId) {
    const transaction = await this.sequelize.transaction();
    try {
      // Ensure TeamMembers are deleted first if not handled by DB cascade
      // await this.TeamMemberModel.destroy({ where: { teamId }, transaction });

      const result = await this.TeamModel.destroy({
        where: { id: teamId },
        transaction,
      });
      await transaction.commit();
      return result; // Number of rows deleted
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async count(criteria = {}) {
    return this.TeamModel.count({ where: criteria });
  }

  async changeOwner(teamId, newOwnerId) {
    const transaction = await this.sequelize.transaction();
    try {
      const team = await this.TeamModel.findByPk(teamId, { transaction });
      if (!team) {
        throw new Error('Team not found');
      }

      const newOwnerUser = await this.UserModel.findByPk(newOwnerId, { transaction });
      if (!newOwnerUser) {
        throw new Error('New owner (user) not found');
      }

      const currentOwnerId = team.ownerId;
      if (currentOwnerId === newOwnerId) {
        // No change needed for team.ownerId, but ensure role is OWNER
         const ensureOwnerRole = await this.TeamMemberModel.findOne({ where: { teamId, userId: newOwnerId }, transaction });
         if(ensureOwnerRole && ensureOwnerRole.role !== TeamRole.OWNER) {
            await ensureOwnerRole.update({ role: TeamRole.OWNER, status: 'active' }, { transaction });
         } else if (!ensureOwnerRole) {
            await this.TeamMemberModel.create({
                teamId, userId: newOwnerId, role: TeamRole.OWNER, status: 'active',
            }, { transaction });
         }
        await transaction.commit();
        return team; // or this.findById(teamId) if you want fresh data with includes
      }

      // Update team's ownerId
      await team.update({ ownerId: newOwnerId }, { transaction });

      // New owner gets/updates to OWNER role
      let newOwnerMembership = await this.TeamMemberModel.findOne({ where: { teamId, userId: newOwnerId }, transaction });
      if (newOwnerMembership) {
        await newOwnerMembership.update({ role: TeamRole.OWNER, status: 'active' }, { transaction });
      } else {
        await this.TeamMemberModel.create({
          teamId,
          userId: newOwnerId,
          role: TeamRole.OWNER,
          status: 'active',
        }, { transaction });
      }

      // Old owner (if different) is demoted (e.g., to ADMIN)
      // It's crucial the old owner was a member. If not, it implies data inconsistency.
      const oldOwnerMembership = await this.TeamMemberModel.findOne({ where: { teamId, userId: currentOwnerId }, transaction });
      if (oldOwnerMembership) {
        await oldOwnerMembership.update({ role: TeamRole.ADMIN }, { transaction }); // Or specific demotion role
      }
      // If oldOwnerMembership is null, it means the previous owner wasn't in TeamMembers table.
      // This state should ideally not occur. If it does, it's a data integrity issue.
      // Consider logging this or throwing an error.

      await transaction.commit();
      // Fetch and return the updated team, including the new owner details
      return this.findById(teamId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = SequelizeTeamRepository;
