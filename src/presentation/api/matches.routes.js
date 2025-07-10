const express = require('express'); // SINGLE REQUIRE AT THE TOP
const Joi = require('joi');
// Middleware and UseCase imports are for the factory version
// const { authenticateToken } = require('../../middleware/auth.middleware'); // Passed as argument
// const GetMatchUseCase = require('../../application/use-cases/match/get-match.usecase');
// const SubmitMatchResultUseCase = require('../../application/use-cases/match/submit-match-result.usecase');
// const GetMatchUploadUrlUseCase = require('../../application/use-cases/match/get-match-upload-url.usecase');
// Domain entity, config, utils
// const { Match } = require('../../domain/tournament/match.entity'); // Not directly used if use cases handle entities
const { appConfig } = require('../../../config/config'); // Needed for S3 bucket name placeholder
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');

// Schemas are defined once, used by the factory-returned router
const submitResultSchema = Joi.object({
  winningParticipantId: Joi.string().uuid().required().description('ID of the user or team that won.'),
  scoreParticipant1: Joi.number().integer().min(0).optional().allow(null),
  scoreParticipant2: Joi.number().integer().min(0).optional().allow(null),
  resultScreenshotFileKey: Joi.string().required().description('S3 file key of the uploaded screenshot after getting upload URL.'),
  comments: Joi.string().max(500).optional().allow(null, ''),
});

const uploadUrlRequestSchema = Joi.object({
    filename: Joi.string().trim().pattern(/^[^/\0]+\.(png|jpe?g|gif)$/i, { name: 'image file' }).required()
        .messages({
            'string.pattern.name': 'Filename must be a valid image name with a .png, .jpg, .jpeg, or .gif extension and cannot contain slashes.',
            'any.required': 'Filename is required.'
        }),
    contentType: Joi.string().valid('image/png', 'image/jpeg', 'image/gif').required()
        .messages({
            'any.only': 'Content type must be one of image/png, image/jpeg, image/gif.',
            'any.required': 'Content type is required.'
        }),
});

module.exports = (
    { getMatchUseCase, getMatchUploadUrlUseCase, submitMatchResultUseCase }, // Injected Use Cases
    authenticateToken // Injected Middleware
    // authorizeRole // If needed for any match routes, inject here
) => {
    const router = express.Router(); // Router created inside the factory

    router.get('/:id', authenticateToken, async (req, res, next) => {
        /*
            #swagger.tags = ['Matches']
            #swagger.summary = 'Get details of a specific match.'
            #swagger.description = 'Retrieves detailed information about a specific match, including participants. Requires authentication as users should generally only access matches they are part of or that are public within a tournament they can see.'
            #swagger.security = [{ "bearerAuth": [] }]
            #swagger.parameters['id'] = {
                in: 'path', description: 'ID of the match to retrieve.', required: true,
                schema: { type: 'string', format: 'uuid' }
            }
            #swagger.responses[200] = {
                description: 'Match details retrieved successfully.',
                content: { "application/json": { schema: { $ref: "#/components/schemas/MatchDetailsResponse" } } }
            }
            #swagger.responses[400] = { description: 'Invalid Match ID format.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[403] = { description: 'Forbidden (user is not a participant or does not have rights to view).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[404] = { description: 'Match not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        */
        try {
            const { id: matchId } = req.params;
            const { error: idError } = Joi.string().uuid().required().validate(matchId);
            if (idError) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Match ID format.', idError.details.map(d => d.message));
            }
            const matchDetails = await getMatchUseCase.execute(matchId, req.user.sub);
            return new ApiResponse(res, httpStatusCodes.OK, 'Match details retrieved.', matchDetails).send();
        } catch (error) {
            next(error);
        }
    });

    router.post('/:id/results/upload-url', authenticateToken, async (req, res, next) => {
        /*
            #swagger.tags = ['Matches']
            #swagger.summary = 'Get a pre-signed URL for uploading a match result screenshot.'
            #swagger.description = 'Generates a pre-signed S3 URL that can be used to upload a match result screenshot. The user must be a participant in the match. The `fileKey` returned should be used when submitting the result.'
            #swagger.security = [{ "bearerAuth": [] }]
            #swagger.parameters['id'] = {
                in: 'path', description: 'ID of the match for which to upload a screenshot.', required: true,
                schema: { type: 'string', format: 'uuid' }
            }
            #swagger.requestBody = {
                required: true,
                content: { "application/json": { schema: { $ref: "#/components/schemas/UploadUrlRequest" } } }
            }
            #swagger.responses[200] = {
                description: 'Pre-signed upload URL generated successfully.',
                content: { "application/json": { schema: { $ref: "#/components/schemas/UploadUrlResponse" } } }
            }
            #swagger.responses[400] = { description: 'Invalid Match ID or validation error for filename/contentType.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[403] = { description: 'Forbidden (user is not a participant of the match or not allowed to submit results).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[404] = { description: 'Match not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[500] = { description: 'Failed to generate upload URL.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        */
        try {
            const { id: matchId } = req.params;
            const userId = req.user.sub;

            const { error: idError } = Joi.string().uuid().required().validate(matchId);
            if (idError) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Match ID format.', idError.details.map(d => d.message));
            }

            const { error, value: fileInfo } = uploadUrlRequestSchema.validate(req.body);
            if (error) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
            }
            const result = await getMatchUploadUrlUseCase.execute(userId, matchId, fileInfo);
            return new ApiResponse(res, httpStatusCodes.OK, 'Upload URL generated successfully.', result).send();
        } catch (error) {
            if (error instanceof ApiError) return next(error);
            next(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to generate upload URL.'));
        }
    });

    router.post('/:id/results', authenticateToken, async (req, res, next) => {
        /*
            #swagger.tags = ['Matches']
            #swagger.summary = 'Submit the result for a match.'
            #swagger.description = 'Submits the scores and winning participant for a match. Requires the `fileKey` obtained from the `/upload-url` endpoint for the result screenshot. User must be a participant authorized to submit results.'
            #swagger.security = [{ "bearerAuth": [] }]
            #swagger.parameters['id'] = {
                in: 'path', description: 'ID of the match to submit results for.', required: true,
                schema: { type: 'string', format: 'uuid' }
            }
            #swagger.requestBody = {
                required: true,
                content: { "application/json": { schema: { $ref: "#/components/schemas/SubmitResultRequest" } } }
            }
            #swagger.responses[200] = {
                description: 'Match result submitted successfully.',
                content: { "application/json": { schema: { $ref: "#/components/schemas/MatchResultResponse" } } }
            }
            #swagger.responses[400] = { description: 'Invalid Match ID or validation error for result payload.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[403] = { description: 'Forbidden (e.g., user not participant, result already submitted, match not in correct state).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[404] = { description: 'Match not found or winning participant not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[409] = { description: 'Conflict (e.g., result already submitted and confirmed, or conflicting result submitted).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[500] = { description: 'Failed to submit match result.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        */
        try {
            const { id: matchId } = req.params;
            const userId = req.user.sub;

            const { error: idError } = Joi.string().uuid().required().validate(matchId);
            if (idError) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Match ID format.', idError.details.map(d => d.message));
            }

            const { error, value: resultPayload } = submitResultSchema.validate(req.body);
            if (error) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
            }
            const result = await submitMatchResultUseCase.execute(userId, matchId, resultPayload);
            const responsePayload = {
              message: result.message,
              matchId: result.match.id,
              status: result.match.status,
            };
            return new ApiResponse(res, httpStatusCodes.OK, responsePayload.message, responsePayload).send();
        } catch (error) {
            if (error instanceof ApiError) return next(error);
            next(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to submit match result.'));
        }
    });

    return router;
};
