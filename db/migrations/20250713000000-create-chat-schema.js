'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create ChatSessions Table
    await queryInterface.createTable('ChatSessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users', // Assumes your users table is named 'Users'
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL', // Or 'CASCADE' if you want to delete sessions on user deletion
      },
      support_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users', // Support agents are also users
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'OPEN',
      },
      tournament_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Tournaments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      user_last_seen_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      support_last_seen_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
    });

    // Create ChatMessages Table
    await queryInterface.createTable('ChatMessages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      session_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ChatSessions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sender_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      sender_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      message_content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      message_type: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'TEXT',
      },
      timestamp: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
    });

    // Add Indexes for performance
    await queryInterface.addIndex('ChatSessions', ['user_id']);
    await queryInterface.addIndex('ChatSessions', ['support_id']);
    await queryInterface.addIndex('ChatSessions', ['status']);
    await queryInterface.addIndex('ChatMessages', ['session_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ChatMessages');
    await queryInterface.dropTable('ChatSessions');
  },
};
