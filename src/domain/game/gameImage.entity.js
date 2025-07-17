// src/domain/game/gameImage.entity.js

class GameImage {
  constructor({ id, gameId, type, url, createdAt, updatedAt }) {
    this.id = id;
    this.gameId = gameId;
    this.type = type;
    this.url = url;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  static fromPersistence(persistedData) {
    const { id, gameId, type, url, createdAt, updatedAt } = persistedData;
    return new GameImage({ id, gameId, type, url, createdAt, updatedAt });
  }

  toPlainObject() {
    return {
      id: this.id,
      gameId: this.gameId,
      type: this.type,
      url: this.url,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

const GameImageType = Object.freeze({
  HERO_BANNER: 'hero_banner',
  CTA_BANNER: 'cta_banner',
  GAME_IMAGE: 'game_image',
  THUMBNAIL: 'thumbnail',
  ICON: 'icon',
  SLIDER: 'slider',
  ILLUSTRATION: 'illustration',
  PROMOTIONAL_BANNER: 'promotional_banner',
});

module.exports = { GameImage, GameImageType };
