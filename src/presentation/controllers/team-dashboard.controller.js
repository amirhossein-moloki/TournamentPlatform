const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');
const getTeamDashboardDataUseCase = require('../../application/use-cases/team-dashboard/get-team-dashboard-data.usecase');
const inviteUserToTeamUseCase = require('../../application/use-cases/team-dashboard/invite-user-to-team.usecase');
const respondToInvitationUseCase = require('../../application/use-cases/team-dashboard/respond-to-invitation.usecase');
const registerTeamForTournamentUseCase = require('../../application/use-cases/team-dashboard/register-team-for-tournament.usecase');

const getTeamDashboardData = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const teamDashboardData = await getTeamDashboardDataUseCase.execute({ teamId });
    const response = new ApiResponse(httpStatusCodes.OK, 'Team dashboard data retrieved successfully.', teamDashboardData);
    res.status(httpStatusCodes.OK).json(response);
  } catch (error) {
    next(error);
  }
};

const inviteUserToTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { userId } = req.body;
    await inviteUserToTeamUseCase.execute({ teamId, userId, inviterId: req.user.id });
    const response = new ApiResponse(httpStatusCodes.OK, 'Invitation sent successfully.');
    res.status(httpStatusCodes.OK).json(response);
  } catch (error) {
    next(error);
  }
};

const respondToInvitation = async (req, res, next) => {
  try {
    const { teamId, invitationId } = req.params;
    const { accept } = req.body;
    await respondToInvitationUseCase.execute({ teamId, invitationId, userId: req.user.id, accept });
    const response = new ApiResponse(httpStatusCodes.OK, 'Invitation responded successfully.');
    res.status(httpStatusCodes.OK).json(response);
  } catch (error) {
    next(error);
  }
};

const registerTeamForTournament = async (req, res, next) => {
  try {
    const { teamId, tournamentId } = req.params;
    const { memberIds } = req.body;
    await registerTeamForTournamentUseCase.execute({ teamId, tournamentId, memberIds, leaderId: req.user.id });
    const response = new ApiResponse(httpStatusCodes.OK, 'Team registered for tournament successfully.');
    res.status(httpStatusCodes.OK).json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeamDashboardData,
  inviteUserToTeam,
  respondToInvitation,
  registerTeamForTournament,
};
