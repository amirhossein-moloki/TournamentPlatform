'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Games table
    await queryInterface.createTable('Games', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      shortName: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      iconUrl: {
        type: Sequelize.STRING,
        allowNull: false,
        // Validation isUrl is handled at model/application level, not typically in migration for standard DBs
      },
      bannerUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      platforms: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      supportedModes: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      winCondition: {
        type: Sequelize.ENUM('higher_score_wins', 'lower_score_wins'),
        allowNull: false,
        defaultValue: 'higher_score_wins',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add gameId column to Tournaments table
    await queryInterface.addColumn('Tournaments', 'gameId', {
      type: Sequelize.UUID,
      allowNull: true, // Start as nullable if there's existing data
      references: {
        model: 'Games',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // Or CASCADE/RESTRICT depending on how you want to handle game deletion
    });

    // TODO: Add a step here to populate gameId for existing tournaments if necessary,
    // then change allowNull to false if gameId is mandatory for all tournaments.
    // For now, assuming new tournaments will require it and old ones might be updated manually or via another script.


    // Remove gameName column from Tournaments table
    // Consider data migration strategy before removing. If gameName needs to be mapped to a Game entity,
    // that should happen before this column is dropped.
    // For now, proceeding with removal as per plan.
    try {
      await queryInterface.removeColumn('Tournaments', 'gameName');
    } catch (error) {
      // If the column doesn't exist (e.g., in a fresh setup), this might throw an error.
      // It's safer to check if the column exists first or catch the error.
      console.warn("Could not remove gameName from Tournaments, it might not exist:", error.message);
    }


    // Create UserGameProfiles table
    await queryInterface.createTable('UserGameProfiles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      gameId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Games',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      inGameName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add unique constraint for userId and gameId in UserGameProfiles
    await queryInterface.addConstraint('UserGameProfiles', {
      fields: ['userId', 'gameId'],
      type: 'unique',
      name: 'unique_user_game_profile_constraint', // Optional: specify a name for the constraint
    });

    await queryInterface.addColumn('Tournaments', 'images', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove unique constraint from UserGameProfiles
    await queryInterface.removeConstraint('UserGameProfiles', 'unique_user_game_profile_constraint');

    // Drop UserGameProfiles table
    await queryInterface.dropTable('UserGameProfiles');

    // Add gameName column back to Tournaments table
    await queryInterface.addColumn('Tournaments', 'gameName', {
      type: Sequelize.STRING,
      allowNull: true, // Assuming it could have been null or needs to be repopulated
    });

    // Remove gameId column from Tournaments table
    // Note: If gameId was made NOT NULL and there's data, this might fail without further steps.
    await queryInterface.removeColumn('Tournaments', 'gameId');

    // Drop Games table
    await queryInterface.dropTable('Games');

    await queryInterface.removeColumn('Tournaments', 'images');
  }
};
