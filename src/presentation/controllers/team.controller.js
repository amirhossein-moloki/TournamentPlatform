const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');

class TeamController {
  constructor({ createTeamUseCase, getTeamByIdUseCase /*... other use cases */ }) {
    this.createTeamUseCase = createTeamUseCase;
    this.getTeamByIdUseCase = getTeamByIdUseCase;
  }

  createTeam = async (req, res, next) => {
    try {
      const { name, description, tag } = req.body;
      const ownerId = req.user.id;

      const team = await this.createTeamUseCase.execute({ name, description, tag, ownerId });

      return res.status(httpStatusCodes.CREATED).json(new ApiResponse(httpStatusCodes.CREATED, team, 'Team created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  // Placeholder for other methods
  getAllTeams = async (req, res, next) => {
    res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, [], 'Teams fetched successfully.'));
  };

  getTeamById = async (req, res, next) => {
     try {
      const { id } = req.params;
      const team = await this.getTeamByIdUseCase.execute(id);
      return res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, team, 'Team fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateTeam = async (req, res, next) => {
    res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'Team updated successfully.'));
  };

  deleteTeam = async (req, res, next) => {
    res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'Team deleted successfully.'));
  };

  addMember = async (req, res, next) => {
    res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'Member added successfully.'));
  };

  removeMember = async (req, res, next) => {
    res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'Member removed successfully.'));
  };
}

module.exports = TeamController;
