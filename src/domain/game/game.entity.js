// src/domain/game/game.entity.js

class Game {
    constructor({
      id,
      name,
      shortName,
      description,
      platforms, // Array of strings
      supportedModes, // Array of strings
      isActive,
      winCondition, // 'higher_score_wins' or 'lower_score_wins'
      tournament_managers = [], // Array of User IDs
      tournament_supports = [], // Array of User IDs
      images = [],
      createdAt,
      updatedAt,
    }) {
      if (!id) throw new Error('Game ID is required.');
      if (!name) throw new Error('Game name is required.');

      this.id = id;
      this.name = name;
      this.shortName = shortName;
      this.description = description;
      this.platforms = platforms || [];
      this.supportedModes = supportedModes || [];
      this.isActive = isActive === undefined ? true : isActive; // Default to true if not provided
      this.winCondition = winCondition;
      this.tournament_managers = Array.isArray(tournament_managers) ? [...new Set(tournament_managers)] : [];
      this.tournament_supports = Array.isArray(tournament_supports) ? [...new Set(tournament_supports)] : [];
      this.images = images;
      this.createdAt = createdAt ? new Date(createdAt) : new Date();
      this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
    }

    static fromPersistence(persistedData) {
      const {
        id,
        name,
        shortName,
        description,
        platforms,
        supportedModes,
        isActive,
        winCondition,
        tournament_managers,
        tournament_supports,
        images,
        createdAt,
        updatedAt,
      } = persistedData;
      return new Game({
        id,
        name,
        shortName,
        description,
        platforms,
        supportedModes,
        isActive,
        winCondition,
        tournament_managers,
        tournament_supports,
        images,
        createdAt,
        updatedAt,
      });
    }

    toPlainObject() {
      return {
        id: this.id,
        name: this.name,
        shortName: this.shortName,
        description: this.description,
        platforms: [...this.platforms],
        supportedModes: [...this.supportedModes],
        isActive: this.isActive,
        winCondition: this.winCondition,
        tournament_managers: [...this.tournament_managers],
        tournament_supports: [...this.tournament_supports],
        images: this.images,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    }

    // --- Tournament Manager Management ---
    addTournamentManager(userId) {
      if (!userId) throw new Error('User ID is required to add a tournament manager.');
      if (!this.tournament_managers.includes(userId)) {
        this.tournament_managers.push(userId);
        this.updatedAt = new Date();
      }
    }

    removeTournamentManager(userId) {
      if (!userId) throw new Error('User ID is required to remove a tournament manager.');
      const index = this.tournament_managers.indexOf(userId);
      if (index > -1) {
        this.tournament_managers.splice(index, 1);
        this.updatedAt = new Date();
      }
    }

    isTournamentManager(userId) {
      return this.tournament_managers.includes(userId);
    }

    // --- Tournament Support Management ---
    addTournamentSupport(userId) {
      if (!userId) throw new Error('User ID is required to add a tournament support.');
      if (!this.tournament_supports.includes(userId)) {
        this.tournament_supports.push(userId);
        this.updatedAt = new Date();
      }
    }

    removeTournamentSupport(userId) {
      if (!userId) throw new Error('User ID is required to remove a tournament support.');
      const index = this.tournament_supports.indexOf(userId);
      if (index > -1) {
        this.tournament_supports.splice(index, 1);
        this.updatedAt = new Date();
      }
    }

    isTournamentSupport(userId) {
      return this.tournament_supports.includes(userId);
    }

    // --- General Game Updates ---
    updateDetails(details) {
        if (details.name !== undefined) this.name = details.name;
        if (details.shortName !== undefined) this.shortName = details.shortName;
        if (details.description !== undefined) this.description = details.description;
        if (details.platforms !== undefined && Array.isArray(details.platforms)) {
            this.platforms = [...new Set(details.platforms)];
        }
        if (details.supportedModes !== undefined && Array.isArray(details.supportedModes)) {
            this.supportedModes = [...new Set(details.supportedModes)];
        }
        if (details.isActive !== undefined) this.isActive = details.isActive;
        if (details.winCondition !== undefined) this.winCondition = details.winCondition;

        // Note: tournament_managers and tournament_supports are managed by their specific methods (add/remove)
        // If direct update via updateDetails is needed, add appropriate checks.
        // For example:
        // if (details.tournament_managers !== undefined && Array.isArray(details.tournament_managers)) {
        //     this.tournament_managers = [...new Set(details.tournament_managers)];
        // }
        // if (details.tournament_supports !== undefined && Array.isArray(details.tournament_supports)) {
        //     this.tournament_supports = [...new Set(details.tournament_supports)];
        // }

        this.updatedAt = new Date();
    }
  }

module.exports = { Game };
// export default Game;
