const router = require('express').Router();
const { authenticateToken } = require('../../middleware/auth.middleware');
const uploadController = require('../controllers/upload.controller');

router.post('/', authenticateToken, uploadController.uploadFile);

module.exports = router;
