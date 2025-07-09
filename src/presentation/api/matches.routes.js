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

    /**
     * GET /api/v1/matches/:id
     * Get details of a specific match.
     */
    router.get('/:id', authenticateToken, async (req, res, next) => {
        try {
            const { id: matchId } = req.params;
            const { error: idError } = Joi.string().uuid().required().validate(matchId);
            if (idError) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid Match ID format.', idError.details.map(d => d.message));
            }
            // Pass requesting user ID for potential authorization checks within use case
            const matchDetails = await getMatchUseCase.execute(matchId, req.user.sub);
            // GetMatchUseCase now returns enhanced details including inGameNames
            return new ApiResponse(res, httpStatusCodes.OK, 'Match details retrieved.', matchDetails).send();
        } catch (error) {
            next(error);
        }
    });

    /**
     * POST /api/v1/matches/:id/results/upload-url
     * Get a secure URL to upload a result screenshot.
     */
    router.post('/:id/results/upload-url', authenticateToken, async (req, res, next) => {
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

            // The use case handles auth checks and S3 URL generation.
            // It might need tournamentId from match, which it can fetch internally or be passed.
            const result = await getMatchUploadUrlUseCase.execute(userId, matchId, fileInfo);
            // Example placeholder for S3 URL if not using real S3 service in use case:
            // const fileKey = `results/${result.tournamentId}/${matchId}/${userId}/${Date.now()}_${fileInfo.filename.replace(/\s+/g, '_')}`;
            // const placeholderUploadUrl = `https://s3-placeholder-url.com/${appConfig.aws.s3.bucketName}/${fileKey}`;
            // const responsePayload = { uploadUrl: result.uploadUrl || placeholderUploadUrl, fileKey: result.fileKey || fileKey };

            return new ApiResponse(res, httpStatusCodes.OK, 'Upload URL generated successfully.', result).send();
        } catch (error) {
            // Handle specific errors from use case, e.g., match not found, user not participant
            if (error instanceof ApiError) return next(error);
            next(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to generate upload URL.'));
        }
    });

    /**
     * POST /api/v1/matches/:id/results
     * Submit the final result after file upload.
     */
    router.post('/:id/results', authenticateToken, async (req, res, next) => {
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

            // The use case handles fetching match, auth checks, result recording, and persistence.
            const result = await submitMatchResultUseCase.execute(userId, matchId, resultPayload);
            // result expected: { match: UpdatedMatchDomainEntity, message: string }
            // Align with OpenAPI spec: MatchResultResponse (message, matchId, status)
            const responsePayload = {
              message: result.message,
              matchId: result.match.id,
              status: result.match.status, // Assuming match object has id and status
            };
            return new ApiResponse(res, httpStatusCodes.OK, responsePayload.message, responsePayload).send();
        } catch (error) {
            if (error instanceof ApiError) return next(error);
            next(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to submit match result.'));
        }
    });

    return router;
};
