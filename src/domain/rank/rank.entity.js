/**
 * Represents a Rank in the system.
 */
class Rank {
  /**
   * @param {string} id - The unique identifier for the rank.
   * @param {string} name - The name of the rank (e.g., "Bronze", "Silver").
   * @param {string} imageUrl - The URL for the rank's image.
   * @param {number} requiredPoints - The number of points required to achieve this rank.
   */
  constructor(id, name, imageUrl, requiredPoints) {
    if (!id) throw new Error('Rank ID is required.');
    if (!name) throw new Error('Rank name is required.');
    if (!imageUrl) throw new Error('Rank image URL is required.');
    if (requiredPoints < 0) throw new Error('Required points must be non-negative.');

    this.id = id;
    this.name = name;
    this.imageUrl = imageUrl;
    this.requiredPoints = requiredPoints;
  }
}

module.exports = { Rank };
