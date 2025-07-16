const router = require('express').Router();
const { authenticateToken } = require('../../middleware/auth.middleware');

module.exports = ({ uploadController }) => {
    router.post('/', authenticateToken, uploadController.uploadFile);

    return router;
};
