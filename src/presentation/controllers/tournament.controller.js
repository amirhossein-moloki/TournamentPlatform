const httpStatusCodes = require('http-status-codes');
const CreateTournamentUseCase = require('../../application/use-cases/tournament/create-tournament.usecase');
const ListTournamentsUseCase = require('../../application/use-cases/tournament/list-tournaments.usecase');
const GetTournamentUseCase = require('../../application/use-cases/tournament/get-tournament.usecase');
const RegisterForTournamentUseCase = require('../../application/use-cases/tournament/registerForTournament.useCase');

class TournamentController {
  constructor({ createTournamentUseCase, listTournamentsUseCase, getTournamentUseCase, registerForTournamentUseCase, decideTournamentUseCase }) {
    this.createTournamentUseCase = createTournamentUseCase;
    this.listTournamentsUseCase = listTournamentsUseCase;
    this.getTournamentUseCase = getTournamentUseCase;
    this.registerForTournamentUseCase = registerForTournamentUseCase;
    this.decideTournamentUseCase = decideTournamentUseCase;
  }

  createTournament = async (req, res, next) => {
    try {
      const tournamentData = req.body;
      const tournament = await this.createTournamentUseCase.execute(tournamentData);
      res.status(httpStatusCodes.CREATED).json(tournament);
    } catch (error) {
      next(error);
    }
  };

  listTournaments = async (req, res, next) => {
    try {
      const options = req.query;
      const tournaments = await this.listTournamentsUseCase.execute(options);
      res.status(httpStatusCodes.OK).json(tournaments);
    } catch (error) {
      next(error);
    }
  };

  getTournamentById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { include } = req.query;
      const tournament = await this.getTournamentUseCase.execute({ id, include });
      if (tournament) {
        res.status(httpStatusCodes.OK).json(tournament);
      } else {
        res.status(httpStatusCodes.NOT_FOUND).json({ message: 'Tournament not found' });
      }
    } catch (error) {
      next(error);
    }
  };

  registerForTournament = async (req, res, next) => {
    try {
      const { id: tournamentId } = req.params;
      const { id: userId } = req.user; // Assuming user is available in req.user from auth middleware
      const result = await this.registerForTournamentUseCase.execute({ tournamentId, userId });
      res.status(httpStatusCodes.OK).json(result);
    } catch (error) {
      next(error);
    }
  };

  decideTournament = async (req, res, next) => {
    try {
      const { id: tournamentId } = req.params;
      const { id: managerId } = req.user;
      const { decision } = req.body;
      const result = await this.decideTournamentUseCase.execute(tournamentId, managerId, decision);
      res.status(httpStatusCodes.OK).json(result);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = TournamentController;
