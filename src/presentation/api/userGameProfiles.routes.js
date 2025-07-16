const router = require('express').Router();
const { authenticateToken } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validation.middleware');
const {
  upsertUserGameProfileSchema,
  getUserGameProfilesSchema,
  getUserGameProfileForGameSchema,
} = require('../validators/user.validator');

module.exports = ({ userGameProfileController }) => {
  router.put(
    '/',
    authenticateToken,
    validate(upsertUserGameProfileSchema),
    userGameProfileController.upsertUserGameProfile
  );

  router.get(
    '/',
    authenticateToken,
    validate(getUserGameProfilesSchema),
    userGameProfileController.getUserGameProfiles
  );

  router.get(
    '/:gameId',
    authenticateToken,
    validate(getUserGameProfileForGameSchema),
    userGameProfileController.getUserGameProfileForGame
  );

  return router;
};
