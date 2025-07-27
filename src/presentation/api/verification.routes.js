const router = require('express').Router();
const { authenticateToken, checkRole } = require('../../middleware/auth.middleware');
const { UserRoles } = require('../../domain/user/user.entity');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

module.exports = ({ verificationController }) => {
    // User routes
    router.post('/submit-id-card', authenticateToken, upload.single('idCard'), verificationController.submitIdCard);
    router.post('/submit-verification-video', authenticateToken, upload.single('video'), verificationController.submitVerificationVideo);

    // Admin routes
    router.post('/approve/:userId', authenticateToken, checkRole(UserRoles.ADMIN), verificationController.approveVerification);
    router.post('/reject/:userId', authenticateToken, checkRole(UserRoles.ADMIN), verificationController.rejectVerification);

    return router;
};
