const express = require('express');
const authMiddleware = require('../../middleware/auth.middleware');
// const validate = require('../../middleware/validate.middleware'); // If using validation middleware
// const teamValidation = require('../../validations/team.validation'); // Example validation schemas

// This module exports a function that takes instantiated controllers
module.exports = (teamController, teamMemberController) => {
  const router = express.Router();

  // ======== Team Routes ========
  router.post(
    '/',
    authMiddleware,
    // validate(teamValidation.createTeamSchema), // Example validation
    teamController.createTeam
  );

  router.get(
    '/',
    authMiddleware, // Or public if teams can be listed publicly
    // validate(teamValidation.getAllTeamsSchema),
    teamController.getAllTeams
  );

  router.get(
    '/:teamId',
    authMiddleware,
    // validate(teamValidation.getTeamByIdSchema),
    teamController.getTeamById
  );

  router.put(
    '/:teamId',
    authMiddleware,
    // validate(teamValidation.updateTeamSchema),
    teamController.updateTeam
  );

  router.delete(
    '/:teamId',
    authMiddleware,
    // validate(teamValidation.deleteTeamSchema),
    teamController.deleteTeam
  );

  router.patch(
    '/:teamId/owner',
    authMiddleware,
    // validate(teamValidation.changeOwnerSchema),
    teamController.changeTeamOwner
  );

  // ======== Team Member Routes ========
  router.post(
    '/:teamId/members', // Add/invite a user to a team
    authMiddleware,
    // validate(teamValidation.addMemberSchema),
    teamMemberController.addMember
  );

  router.get(
    '/:teamId/members', // List members of a team
    authMiddleware,
    // validate(teamValidation.getTeamMembersSchema),
    teamMemberController.getTeamMembers
  );

  router.delete(
    '/:teamId/members/:userId', // Remove a user from a team (or user leaves)
    authMiddleware,
    // validate(teamValidation.removeMemberSchema),
    teamMemberController.removeMember
  );

  router.patch(
    '/:teamId/members/:userId/role', // Update a member's role
    authMiddleware,
    // validate(teamValidation.updateMemberRoleSchema),
    teamMemberController.updateMemberRole
  );

  // User updates their own membership status (accept/reject invite, leave team)
  // userId for this action is req.user.id (the authenticated user)
  router.patch(
    '/:teamId/membership/status',
    authMiddleware,
    // validate(teamValidation.updateSelfMemberStatusSchema),
    teamMemberController.updateMemberStatus
  );

  // Note: Routes for listing teams a user belongs to (e.g., /api/users/:userId/teams or /api/me/teams)
  // are often better placed in a user-centric route file (e.g., user.routes.js or a new userProfile.routes.js).
  // However, if they are to be included here for user convenience:
  // This pattern below assumes teamMemberController has methods like `getCurrentUserTeams` and `getUserTeams`.
  // These methods would typically use the `GetUserTeamsUseCase`.
  // Example: if you want /api/teams/my-teams
  // router.get('/me/current-user-teams', authMiddleware, teamMemberController.getCurrentUserTeams);
  // Example: if you want /api/teams/user/:userId/list
  // router.get('/user/:userId/list', authMiddleware, teamMemberController.getUserTeams);


  return router;
};
