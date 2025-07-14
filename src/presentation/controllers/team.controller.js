const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');

class TeamController {
    constructor({
        createTeamUseCase,
        getTeamByIdUseCase,
        getAllTeamsUseCase,
        updateTeamUseCase,
        deleteTeamUseCase,
        addTeamMemberUseCase,
        removeTeamMemberUseCase
    }) {
        this.createTeamUseCase = createTeamUseCase;
        this.getTeamByIdUseCase = getTeamByIdUseCase;
        this.getAllTeamsUseCase = getAllTeamsUseCase;
        this.updateTeamUseCase = updateTeamUseCase;
        this.deleteTeamUseCase = deleteTeamUseCase;
        this.addTeamMemberUseCase = addTeamMemberUseCase;
        this.removeTeamMemberUseCase = removeTeamMemberUseCase;
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

    getAllTeams = async (req, res, next) => {
        try {
            const { page, limit } = req.query;
            const teams = await this.getAllTeamsUseCase.execute({ page, limit });
            return res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, teams, 'Teams fetched successfully.'));
        } catch (error) {
            next(error);
        }
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
        try {
            const { id } = req.params;
            const teamData = req.body;
            const updatedTeam = await this.updateTeamUseCase.execute(id, teamData);
            return res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, updatedTeam, 'Team updated successfully.'));
        } catch (error) {
            next(error);
        }
    };

    deleteTeam = async (req, res, next) => {
        try {
            const { id } = req.params;
            await this.deleteTeamUseCase.execute(id);
            return res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, {}, 'Team deleted successfully.'));
        } catch (error) {
            next(error);
        }
    };

    addMember = async (req, res, next) => {
        try {
            const { id: teamId } = req.params;
            const { userId, role } = req.body;
            const updatedTeam = await this.addTeamMemberUseCase.execute({ teamId, userId, role });
            return res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, updatedTeam, 'Member added successfully.'));
        } catch (error) {
            next(error);
        }
    };

    removeMember = async (req, res, next) => {
        try {
            const { id: teamId, userId } = req.params;
            const updatedTeam = await this.removeTeamMemberUseCase.execute({ teamId, userId });
            return res.status(httpStatusCodes.OK).json(new ApiResponse(httpStatusCodes.OK, updatedTeam, 'Member removed successfully.'));
        } catch (error) {
            next(error);
        }
    };
}

module.exports = TeamController;
