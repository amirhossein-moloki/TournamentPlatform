'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Step 1: Populate gameId using the existing gameType column in Tournaments
      // It's assumed 'gameType' column exists from the initial migration and holds the string name of the game.
      // The migration '20250706182654-add-games-usergameprofiles-update-tournaments.js'
      // added 'gameId' (nullable) and attempted to remove 'gameName'.
      // We are assuming 'gameType' is the correct source column for game names.

      const tournamentsToUpdate = await queryInterface.sequelize.query(
        `SELECT id, "gameType" FROM "Tournaments" WHERE "gameId" IS NULL AND "gameType" IS NOT NULL;`,
        { type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
      );

      console.log(`Found ${tournamentsToUpdate.length} tournaments to potentially update with gameId.`);

      for (const tournament of tournamentsToUpdate) {
        if (!tournament.gameType) {
          console.warn(`Tournament ID ${tournament.id} has NULL gameType, skipping.`);
          continue;
        }
        const games = await queryInterface.sequelize.query(
          `SELECT id FROM "Games" WHERE name = :gameName LIMIT 1;`,
          {
            replacements: { gameName: tournament.gameType },
            type: queryInterface.sequelize.QueryTypes.SELECT,
            transaction
          }
        );

        if (games.length > 0) {
          const gameId = games[0].id;
          await queryInterface.sequelize.query(
            `UPDATE "Tournaments" SET "gameId" = :gameId WHERE id = :tournamentId;`,
            {
              replacements: { gameId: gameId, tournamentId: tournament.id },
              type: queryInterface.sequelize.QueryTypes.UPDATE,
              transaction
            }
          );
          console.log(`Updated Tournament ID ${tournament.id} with gameId ${gameId} (from gameType "${tournament.gameType}").`);
        } else {
          console.warn(`No matching game found in "Games" table for gameType "${tournament.gameType}" (Tournament ID ${tournament.id}). gameId will remain NULL.`);
        }
      }

      // Step 2: Verify all gameIds are populated (or log if not)
      const tournamentsWithNullGameId = await queryInterface.sequelize.query(
        `SELECT id, name, "gameType" FROM "Tournaments" WHERE "gameId" IS NULL;`,
        { type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
      );

      if (tournamentsWithNullGameId.length > 0) {
        console.error(`ERROR: There are ${tournamentsWithNullGameId.length} tournaments with NULL gameId after population attempt. Cannot make gameId NOT NULL.`);
        tournamentsWithNullGameId.forEach(t => {
          console.error(` - Tournament ID: ${t.id}, Name: "${t.name}", gameType: "${t.gameType}" still has NULL gameId.`);
        });
        throw new Error('Cannot make gameId NOT NULL due to remaining NULL values. Please check "Games" table and "Tournaments".gameType fields.');
      }

      // Step 3: Alter Tournaments.gameId to be NOT NULL
      console.log('Altering Tournaments.gameId to be NOT NULL.');
      await queryInterface.changeColumn('Tournaments', 'gameId', {
        type: Sequelize.UUID,
        allowNull: false,
        references: { // Ensure references are kept if changeColumn overwrites them
          model: 'Games',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL', // Or previous value which was 'SET NULL'
      }, { transaction });

      // Step 4: Remove the gameType column from Tournaments
      // Check if 'gameType' column exists before trying to remove it
      const tableDescription = await queryInterface.describeTable('Tournaments', { transaction });
      if (tableDescription.gameType) {
        console.log('Removing gameType column from Tournaments.');
        await queryInterface.removeColumn('Tournaments', 'gameType', { transaction });
      } else {
        console.log('gameType column does not exist in Tournaments, skipping removal.');
      }

      await transaction.commit();
      console.log('Migration successful: Populated gameId, made it NOT NULL, and removed gameType.');

    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      // If the error is about gameType not existing during population, then our assumption was wrong.
      if (error.message && error.message.includes('column "gameType" does not exist')) {
          console.error('CRITICAL: The column "gameType" which was expected to hold old game names does not exist. Data migration cannot proceed as planned.');
      }
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Step 1: Add gameType column back to Tournaments
      console.log('Adding gameType column back to Tournaments.');
      await queryInterface.addColumn('Tournaments', 'gameType', {
        type: Sequelize.STRING,
        allowNull: true, // Allow null as we might not be able to perfectly repopulate
      }, { transaction });

      // Step 2: (Optional but good practice) Populate gameType from gameId
      const tournamentsToRestoreGameType = await queryInterface.sequelize.query(
        `SELECT t.id as "tournamentId", g.name as "gameName"
         FROM "Tournaments" t
         JOIN "Games" g ON t."gameId" = g.id;`,
        { type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
      );

      for (const item of tournamentsToRestoreGameType) {
        await queryInterface.sequelize.query(
          `UPDATE "Tournaments" SET "gameType" = :gameName WHERE id = :tournamentId;`,
          {
            replacements: { gameName: item.gameName, tournamentId: item.tournamentId },
            type: queryInterface.sequelize.QueryTypes.UPDATE,
            transaction
          }
        );
        console.log(`Restored gameType "${item.gameName}" for Tournament ID ${item.tournamentId}.`);
      }

      // Step 3: Alter Tournaments.gameId to be nullable
      // Important: The references and onDelete/onUpdate might be lost if not re-specified.
      // The previous migration (20250706...-update-tournaments) set gameId to allow NULL
      // and had onDelete: 'SET NULL'. We should match that.
      console.log('Altering Tournaments.gameId to allow NULL.');
      await queryInterface.changeColumn('Tournaments', 'gameId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Games',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }, { transaction });

      await transaction.commit();
      console.log('Migration rollback successful: gameType added back, gameId made nullable and repopulated gameType.');

    } catch (error) {
      await transaction.rollback();
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
};
