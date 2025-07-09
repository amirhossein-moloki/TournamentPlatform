// src/domain/user/userGameProfile.entity.js

class UserGameProfile {
    constructor({
      id,
      userId,
      gameId,
      inGameName,
      createdAt,
      updatedAt,
      // You can also include associated user or game objects if needed for domain logic
      // user,
      // game,
    }) {
      this.id = id;
      this.userId = userId;
      this.gameId = gameId;
      this.inGameName = inGameName;
      this.createdAt = createdAt;
      this.updatedAt = updatedAt;
      // this.user = user;
      // this.game = game;
    }

    static fromPersistence(persistedData) {
      const {
        id,
        userId,
        gameId,
        inGameName,
        createdAt,
        updatedAt,
        // User, // Sequelize might return associated data with capitalized model name
        // Game,
      } = persistedData;

      // Basic entity mapping
      const entity = new UserGameProfile({
        id,
        userId,
        gameId,
        inGameName,
        createdAt,
        updatedAt,
      });

      // If associated data is passed and you want to map it to domain entities:
      // if (User) entity.user = YourUserEntity.fromPersistence(User); // Assuming you have a User entity
      // if (Game) entity.game = YourGameEntity.fromPersistence(Game); // Assuming you have a Game entity

      return entity;
    }

    toPlainObject() {
      return {
        id: this.id,
        userId: this.userId,
        gameId: this.gameId,
        inGameName: this.inGameName,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        // user: this.user ? this.user.toPlainObject() : undefined,
        // game: this.game ? this.game.toPlainObject() : undefined,
      };
    }

    // Add any other domain-specific methods here.
    // For example, a method to validate or update the inGameName based on certain rules.
    // updateInGameName(newName) {
    //   if (!newName || newName.trim() === '') {
    //     throw new Error('In-game name cannot be empty.');
    //   }
    //   if (newName.length > 100) {
    //     throw new Error('In-game name is too long.');
    //   }
    //   this.inGameName = newName;
    //   this.updatedAt = new Date();
    // }

    updateInGameName(newName) {
      if (!newName || newName.trim() === '') {
        throw new Error('In-game name cannot be empty.');
      }
      if (newName.length > 100) {
        throw new Error('In-game name is too long.');
      }
      this.inGameName = newName;
      this.updatedAt = new Date();
    }
  }

module.exports = { UserGameProfile };
// export default UserGameProfile;
