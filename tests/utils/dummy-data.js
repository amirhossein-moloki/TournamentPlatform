const { User, Game, Tournament } = require('../../src/infrastructure/database/models');
const { UserFactory, GameFactory, TournamentFactory } = require('./factories');

const insertUsers = async (users) => {
  await User.bulkCreate(users);
};

const insertGames = async (games) => {
  await Game.bulkCreate(games);
};

const insertTournaments = async (tournaments) => {
  await Tournament.bulkCreate(tournaments);
};

module.exports = {
  insertUsers,
  insertGames,
  insertTournaments,
};
