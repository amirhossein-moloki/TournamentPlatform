const router = require('express').Router();
const userController = require('../controllers/user.controller');
const { authenticateToken } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validation.middleware');
const { updateUserProfileSchema } = require('../validators/user.validator');

// --- Routes ---

// Get current user's profile
router.get('/me', authenticateToken, userController.getCurrentUserProfile);
/*  #swagger.tags = ['Users']
    #swagger.summary = "Get current user's profile"
    #swagger.description = "Retrieves the profile of the currently authenticated user."
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'User profile retrieved successfully.', schema: { $ref: '#/components/schemas/UserPublicProfile' } }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
*/

// Update current user's profile
router.put('/me', authenticateToken, validate(updateUserProfileSchema), userController.updateCurrentUserProfile);
/*  #swagger.tags = ['Users']
    #swagger.summary = "Update current user's profile"
    #swagger.description = "Allows the authenticated user to update their own profile information."
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateUserProfileRequest" } } } }
    #swagger.responses[200] = { description: 'User profile updated successfully.', schema: { $ref: '#/components/schemas/UserPublicProfile' } }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
*/

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/me/submit-id-card', authenticateToken, upload.single('idCard'), userController.submitIdCard);
/*  #swagger.tags = ['Users']
    #swagger.summary = "Submit ID card for verification"
    #swagger.description = "Allows the authenticated user to submit their ID card for level 2 verification."
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { type: 'object', properties: { idCard: { type: 'string', format: 'binary' } } } } } }
    #swagger.responses[200] = { description: 'ID card submitted successfully.' }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
*/

router.post('/me/submit-verification-video', authenticateToken, upload.single('video'), userController.submitVerificationVideo);
/*  #swagger.tags = ['Users']
    #swagger.summary = "Submit verification video"
    #swagger.description = "Allows the authenticated user to submit a verification video for level 3 verification."
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { type: 'object', properties: { video: { type: 'string', format: 'binary' } } } } } }
    #swagger.responses[200] = { description: 'Verification video submitted successfully.' }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
*/

module.exports = router;
