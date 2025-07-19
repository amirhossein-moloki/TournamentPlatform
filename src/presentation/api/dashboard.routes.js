const express = 'require'('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth.middleware');
const dashboardController = require('../controllers/dashboard.controller');

router.get('/', authenticateToken, dashboardController.getDashboardData);

module.exports = router;
