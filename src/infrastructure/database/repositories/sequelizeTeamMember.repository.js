const ITeamMemberRepository = require('../../../domain/team/teamMember.repository.interface');
// const { TeamMember: TeamMemberEntity } = require('../../../domain/team/teamMember.entity'); // Map if needed
const TeamRole = require('../../../domain/team/teamRole.enums');
const { Op } = require('sequelize');

class SequelizeTeamMemberRepository extends ITeamMemberRepository {
  constructor({ TeamMemberModel, UserModel, TeamModel, sequelize }) {
    super();
    this.TeamMemberModel = TeamMemberModel;
    this.UserModel = UserModel;
    this.TeamModel = TeamModel;
    this.sequelize = sequelize; // For transactions if complex operations need them
  }

  async create(memberData, options = {}) {
    const member = await this.TeamMemberModel.create(memberData, { transaction: options.transaction });
    return member;
  }

  async add(teamId, userId, role, status = 'invited', invitedByUserId = null) {
    // invitedByUserId is for application logic/auditing, not stored in TeamMemberModel by default
    const existingMember = await this.findByTeamAndUser(teamId, userId);
    if (existingMember) {
      // If user exists and status is 'left', 'kicked', or 'rejected', allow re-adding/inviting by updating.
      if (['left', 'kicked', 'rejected'].includes(existingMember.status)) {
        return this.updateByTeamAndUser(teamId, userId, { role: role || TeamRole.MEMBER, status });
      }
      throw new Error('User is already an active member or has a pending invitation.');
    }

    const member = await this.TeamMemberModel.create({
      teamId,
      userId,
      role: role || TeamRole.MEMBER,
      status,
    });
    return member; // mapToDomainEntity(member);
  }

  async findById(memberId) {
    const member = await this.TeamMemberModel.findByPk(memberId, {
      include: [
        { model: this.UserModel, as: 'user', attributes: ['id', 'username', 'email'] },
        { model: this.TeamModel, as: 'team', attributes: ['id', 'name'] }
      ]
    });
    return member;
  }

  async findByTeamAndUser(teamId, userId) {
    const member = await this.TeamMemberModel.findOne({
      where: { teamId, userId },
      include: [
        { model: this.UserModel, as: 'user', attributes: ['id', 'username', 'email'] },
        // { model: this.TeamModel, as: 'team', attributes: ['id', 'name'] } // Usually not needed here
      ]
    });
    return member;
  }

  async update(memberId, { role, status }) {
    const member = await this.TeamMemberModel.findByPk(memberId);
    if (!member) {
      throw new Error('Team member not found.');
    }

    // Prevent direct update to OWNER role unless through changeOwner use case
    if (role === TeamRole.OWNER && member.role !== TeamRole.OWNER) {
        throw new Error(`Cannot directly change role to OWNER. Use change team ownership operation.`);
    }
    // Prevent owner from changing their own role away from OWNER
    if (member.role === TeamRole.OWNER && role && role !== TeamRole.OWNER) {
        throw new Error(`Team owner's role cannot be changed from OWNER directly. Use change team ownership operation.`);
    }

    const dataToUpdate = {};
    if (role) dataToUpdate.role = role;
    if (status) dataToUpdate.status = status;

    if (Object.keys(dataToUpdate).length === 0) return member;

    const updatedMember = await member.update(dataToUpdate);
    return updatedMember;
  }

  async updateByTeamAndUser(teamId, userId, { role, status }) {
    const member = await this.TeamMemberModel.findOne({ where: { teamId, userId } });
    if (!member) {
      throw new Error('Team member not found for the given team and user.');
    }
    return this.update(member.id, { role, status });
  }

  async remove(memberId) {
    const member = await this.TeamMemberModel.findByPk(memberId);
    if (member) {
      if (member.role === TeamRole.OWNER) {
        throw new Error('Cannot remove the team owner. Change ownership first.');
      }
      await member.destroy();
      return 1; // Rows deleted
    }
    return 0;
  }

  async removeByTeamAndUser(teamId, userId) {
    const member = await this.findByTeamAndUser(teamId, userId);
    if (member) {
      if (member.role === TeamRole.OWNER) {
        throw new Error('Cannot remove the team owner. Change ownership first.');
      }
      await member.destroy();
      return 1;
    }
    return 0;
  }

  async findAllByTeamId(teamId, options = {}) {
    const { limit, offset, status, role, includeUserDetails = true, page, pageSize } = options;
    const queryOptions = {
      where: { teamId },
      include: [],
      distinct: true,
    };

    if (status) queryOptions.where.status = status;
    if (role) queryOptions.where.role = role;

    if (pageSize && page) {
        queryOptions.limit = parseInt(pageSize, 10);
        queryOptions.offset = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
    } else {
        if (limit) queryOptions.limit = parseInt(limit, 10);
        if (offset) queryOptions.offset = parseInt(offset, 10);
    }

    if (includeUserDetails) {
      queryOptions.include.push({
        model: this.UserModel,
        as: 'user',
        attributes: ['id', 'username', 'email'] // Specify needed attributes
      });
    }

    // For pagination, use findAndCountAll
    // const { count, rows } = await this.TeamMemberModel.findAndCountAll(queryOptions);
    // return { members: rows, totalCount: count };
    const members = await this.TeamMemberModel.findAll(queryOptions);
    return members;
  }

  async findAllByUserId(userId, options = {}) {
    const { limit, offset, status, includeTeamDetails = true, page, pageSize } = options;
    const queryOptions = {
      where: { userId },
      include: [],
      distinct: true,
    };

    if (status) queryOptions.where.status = status; // Status of the membership

    if (pageSize && page) {
        queryOptions.limit = parseInt(pageSize, 10);
        queryOptions.offset = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
    } else {
        if (limit) queryOptions.limit = parseInt(limit, 10);
        if (offset) queryOptions.offset = parseInt(offset, 10);
    }

    if (includeTeamDetails) {
      queryOptions.include.push({
        model: this.TeamModel,
        as: 'team',
        attributes: ['id', 'name', 'logoUrl'] // Specify needed attributes
      });
    }

    // const { count, rows } = await this.TeamMemberModel.findAndCountAll(queryOptions);
    // return { memberships: rows, totalCount: count };
    const memberships = await this.TeamMemberModel.findAll(queryOptions);
    return memberships;
  }

  async countByTeamId(teamId, criteria = {}) {
    return this.TeamMemberModel.count({ where: { teamId, ...criteria } });
  }

  async countByUserId(userId, criteria = {}) {
    return this.TeamMemberModel.count({ where: { userId, ...criteria } });
  }
}

module.exports = SequelizeTeamMemberRepository;
