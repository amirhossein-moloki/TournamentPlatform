const router = require('express').Router();
const { Joi, validate } = require('express-validation');
const matchController = require('../controllers/match.controller'); // Assuming you'll create this
const { authenticateToken, authorizeRole } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../domain/user/user.entity').User; // Assuming UserRoles is exported as USER_ROLES

// Joi validation schemas
const matchIdParamSchema = {
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
};

const uploadUrlRequestSchema = {
    body: Joi.object({
        filename: Joi.string().pattern(new RegExp('^[^/\\0]+\\.(png|jpe?g|gif)$')).required()
            .messages({
                'string.pattern.base': 'Filename must be valid and have a .png, .jpg, .jpeg, or .gif extension.',
            }),
        contentType: Joi.string().valid('image/png', 'image/jpeg', 'image/gif').required(),
    }),
};

const submitResultSchema = {
    body: Joi.object({
        winningParticipantId: Joi.string().uuid().required(),
        scoreParticipant1: Joi.number().integer().min(0).optional().allow(null),
        scoreParticipant2: Joi.number().integer().min(0).optional().allow(null),
        resultScreenshotFileKey: Joi.string().required(), // S3 Key from upload step
        comments: Joi.string().max(500).optional().allow('', null),
    }),
};


// --- Routes ---

// Get match details by ID
router.get('/:id', authenticateToken, validate(matchIdParamSchema), matchController.getMatchById);
/*  #swagger.tags = ['Matches']
    #swagger.summary = 'Get match details by ID'
    #swagger.description = 'Retrieves details for a specific match.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { $ref: '#/components/parameters/MatchIdPath' }
    #swagger.responses[200] = {
        description: 'Match details retrieved successfully.',
        content: { "application/json": { schema: { $ref: "#/components/schemas/Match" } } }
    }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
*/

// Get pre-signed URL for uploading match result screenshot
router.post('/:id/results/upload-url', authenticateToken, validate(matchIdParamSchema), validate(uploadUrlRequestSchema), matchController.getUploadUrl);
/*  #swagger.tags = ['Matches']
    #swagger.summary = 'Get pre-signed URL for match result screenshot'
    #swagger.description = 'Generates a pre-signed S3 URL for uploading a match result screenshot.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { $ref: '#/components/parameters/MatchIdPath' }
    #swagger.requestBody = {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/UploadUrlRequest" } } }
    }
    #swagger.responses[200] = {
        description: 'Pre-signed URL generated successfully.',
        content: { "application/json": { schema: { $ref: "#/components/schemas/UploadUrlResponse" } } }
    }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' } // If user is not a participant
    #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' } // If match not found
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
*/

// Submit match result
router.post('/:id/results', authenticateToken, validate(matchIdParamSchema), validate(submitResultSchema), matchController.submitResult);
/*  #swagger.tags = ['Matches']
    #swagger.summary = 'Submit match result'
    #swagger.description = 'Submits the result for a match. Requires the user to be a participant in the match.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { $ref: '#/components/parameters/MatchIdPath' }
    #swagger.requestBody = {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/SubmitResultRequest" } } }
    }
    #swagger.responses[200] = {
        description: 'Match result submitted successfully. The match may be updated or a dispute might be created.',
        content: { "application/json": { schema: { $ref: "#/components/schemas/Match" } } } // Returns the updated Match object
    }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' } // If user is not a participant or match not in correct state
    #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' } // If match not found
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
*/

module.exports = router;
