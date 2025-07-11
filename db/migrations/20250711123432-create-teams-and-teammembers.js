'use strict';
// Import TeamRole enum correctly if its path is different or it's not directly accessible
// For simplicity, assuming it might be copied or defined here if direct import is complex
// const TeamRole = require('../../src/domain/team/teamRole.enums'); // Adjust path as necessary

// If the direct import of TeamRole from src/domain is problematic in migrations
// (e.g., due to Babel/ESM issues not handled by Sequelize CLI's execution context),
// you might need to define it statically here or ensure your .sequelizerc or equivalent
// correctly handles transpilation for migrations.
// For now, let's define it statically for robustness in migration context.
const TeamRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Teams', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
      },
      logoUrl: {
        type: Sequelize.STRING,
      },
      ownerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users', // Name of the Users table
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL', // Or 'CASCADE' depending on requirements
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.createTable('TeamMembers', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Teams', // Name of the Teams table
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users', // Name of the Users table
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      role: {
        type: Sequelize.ENUM,
        values: Object.values(TeamRole),
        allowNull: false,
        defaultValue: TeamRole.MEMBER,
      },
      status: {
        // Possible statuses: 'invited', 'active', 'rejected', 'left', 'kicked'
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'invited',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add a composite unique key for teamId and userId in TeamMembers
    await queryInterface.addIndex('TeamMembers', ['teamId', 'userId'], {
      unique: true,
      name: 'team_user_unique_constraint',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop in reverse order of creation due to foreign key constraints
    await queryInterface.removeIndex('TeamMembers', 'team_user_unique_constraint');
    await queryInterface.dropTable('TeamMembers');
    await queryInterface.dropTable('Teams');
  },
};
