const express = 'require'('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../../middleware/auth.middleware');
const teamDashboardController = require('../controllers/team-dashboard.controller');
const { TeamRole } = require('../../domain/team/teamRole.enums');

router.get('/:teamId', authenticateToken, authorizeRole([TeamRole.OWNER, TeamRole.LEADER]), teamDashboardController.getTeamDashboardData);
router.post('/:teamId/invitations', authenticateToken, authorizeRole([TeamRole.OWNER, TeamRole.LEADER]), teamDashboardController.inviteUserToTeam);
router.put('/:teamId/invitations/:invitationId', authenticateToken, teamDashboardController.respondToInvitation);
router.post('/:teamId/tournaments/:tournamentId/register', authenticateToken, authorizeRole([TeamRole.OWNER, TeamRole.LEADER]), teamDashboardController.registerTeamForTournament);

module.exports = router;
