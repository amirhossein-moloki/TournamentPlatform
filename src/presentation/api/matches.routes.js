const router = require('express').Router();
const { authenticateToken } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validation.middleware');
const { matchIdParamSchema, uploadUrlRequestSchema, submitResultSchema } = require('../validators/match.validator');

module.exports = ({ matchController }) => {
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

    return router;
};
