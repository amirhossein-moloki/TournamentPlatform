// src/domain/game/game.entity.js

class Game {
    constructor({
      id,
      name,
      shortName,
      description,
      iconUrl,
      bannerUrl,
      platforms,
      supportedModes,
      isActive,
      winCondition,
      createdAt,
      updatedAt,
    }) {
      this.id = id;
      this.name = name;
      this.shortName = shortName;
      this.description = description;
      this.iconUrl = iconUrl;
      this.bannerUrl = bannerUrl;
      this.platforms = platforms; // Array of strings
      this.supportedModes = supportedModes; // Array of strings
      this.isActive = isActive;
      this.winCondition = winCondition; // 'higher_score_wins' or 'lower_score_wins'
      this.createdAt = createdAt;
      this.updatedAt = updatedAt;
    }

    static fromPersistence(persistedData) {
      const {
        id,
        name,
        shortName,
        description,
        iconUrl,
        bannerUrl,
        platforms,
        supportedModes,
        isActive,
        winCondition,
        createdAt,
        updatedAt,
      } = persistedData;
      return new Game({
        id,
        name,
        shortName,
        description,
        iconUrl,
        bannerUrl,
        platforms,
        supportedModes,
        isActive,
        winCondition,
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
        iconUrl: this.iconUrl,
        bannerUrl: this.bannerUrl,
        platforms: this.platforms,
        supportedModes: this.supportedModes,
        isActive: this.isActive,
        winCondition: this.winCondition,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    }
  }

module.exports = { Game };
// export default Game;
