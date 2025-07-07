const express = require('express'); // Activated
const Joi = require('joi');
const { authenticateToken } = require('../../middleware/auth.middleware');
// const GetMatchUseCase = require('../../application/use-cases/match/get-match.usecase');
// const SubmitMatchResultUseCase = require('../../application/use-cases/match/submit-match-result.usecase');
// const GetUploadUrlUseCase = require('../../application/use-cases/match/get-upload-url.usecase');
const { Match } = require('../../domain/tournament/match.entity'); // Domain entity
const PostgresTournamentRepository = require('../../infrastructure/database/repositories/postgres.tournament.repository');
const { appConfig } = require('../../../config/config');
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');
// For S3, a dedicated service would be used. For now, AWS SDK could be used directly if needed.
// const AWS = require('aws-sdk');

// --- Schemas for Validation ---
// Note: router will be created inside the factory function
const submitResultSchema = Joi.object({
  winningParticipantId: Joi.string().uuid().required().description('ID of the user or team that won.'),
  scoreParticipant1: Joi.number().integer().min(0).optional().allow(null),
  scoreParticipant2: Joi.number().integer().min(0).optional().allow(null),
  resultScreenshotFileKey: Joi.string().required().description('S3 file key of the uploaded screenshot.'),
  comments: Joi.string().max(500).optional().allow(null, ''),
});

const uploadUrlRequestSchema = Joi.object({
  filename: Joi.string().trim().pattern(/^[\w@\-.\s()]+\.(png|jpe?g|gif)$/i, { name: 'image file' }).required()
    .messages({ 'string.pattern.name': 'Filename must be a valid image name (e.g., result.jpg, proof.png).' }),
  contentType: Joi.string().valid('image/png', 'image/jpeg', 'image/gif').required()
    .messages({ 'string.valid': 'Content type must be one of image/png, image/jpeg, image/gif.' }),
});

// The old router, its handlers, and repository instantiations were removed.
// The factory function below is now the primary export and defines its own router and routes.

module.exports = (
    { getMatchUseCase, getMatchUploadUrlUseCase, submitMatchResultUseCase }, // Use Cases
    authenticateToken
    // authorizeRole // If needed for any match routes
) => {
    const router = express.Router();

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
            const result = await getMatchUploadUrlUseCase.execute(userId, matchId, fileInfo);
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

            const result = await submitMatchResultUseCase.execute(userId, matchId, resultPayload);
            return new ApiResponse(res, httpStatusCodes.OK, result.message, result.match.toPlainObject ? result.match.toPlainObject() : result.match).send();
        } catch (error) {
            if (error instanceof ApiError) return next(error);
            next(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to submit match result.'));
        }
    });

    return router;
};
