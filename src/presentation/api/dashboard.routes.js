const express = 'require'('express');
const { authenticateToken } = require('../../middleware/auth.middleware');

module.exports = ({ dashboardController }) => {
    const router = express.Router();
    router.get('/', authenticateToken, dashboardController.getDashboardData);
    return router;
};
