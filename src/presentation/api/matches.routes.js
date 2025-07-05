const express = require('express');
const Joi = require('joi');
const { authenticateToken } = require('../../middleware/auth.middleware');
const GetMatchUseCase = require('../../application/use-cases/match/get-match.usecase');
const SubmitMatchResultUseCase = require('../../application/use-cases/match/submit-match-result.usecase');
const GetMatchUploadUrlUseCase = require('../../application/use-cases/match/get-match-upload-url.usecase');
const { PostgresTournamentRepository, TournamentModel, MatchModel, TournamentParticipantModel } = require('../../infrastructure/database/repositories/postgres.tournament.repository');
const { appConfig } = require('../../../config/config');
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');
// const { Match } = require('../../domain/tournament/match.entity'); // Not needed directly here if use cases return DTOs/plain objects

const router = express.Router();

// Instantiate Repositories
// Assuming PostgresTournamentRepository constructor takes models.
const tournamentRepository = new PostgresTournamentRepository(TournamentModel, MatchModel, TournamentParticipantModel);

// Instantiate Use Cases
const getMatchUseCase = new GetMatchUseCase(tournamentRepository);
const getMatchUploadUrlUseCase = new GetMatchUploadUrlUseCase(tournamentRepository); // S3 client is internal to use case
const submitMatchResultUseCase = new SubmitMatchResultUseCase(tournamentRepository); // fileValidationService is optional

// --- Schemas for Validation ---
const submitResultSchema = Joi.object({
  winningParticipantId: Joi.string().uuid().required().description('ID of the user or team that won.'),
  scoreParticipant1: Joi.number().integer().min(0).optional().allow(null),
  scoreParticipant2: Joi.number().integer().min(0).optional().allow(null),
  resultScreenshotFileKey: Joi.string().required().description('S3 file key of the uploaded screenshot after getting upload URL.'),
  comments: Joi.string().max(500).optional().allow(null, ''),
});

const uploadUrlRequestSchema = Joi.object({
    filename: Joi.string().pattern(/^[\w-\.]+\.(png|jpe?g|gif)$/i).required() // Basic filename validation for common image types
        .messages({ 'string.pattern.base': 'Filename must be a valid image name (e.g., result.jpg, proof.png).' }),
    contentType: Joi.string().valid('image/png', 'image/jpeg', 'image/gif').required()
        .messages({ 'string.valid': 'Content type must be one of image/png, image/jpeg, image/gif.' }),
});


// --- Route Handlers ---

/**
 * GET /api/v1/matches/:id
 * Get details of a specific match. (Could be public or participant-only)
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
    // GetMatchUseCase will throw ApiError if not found.

    return new ApiResponse(res, httpStatusCodes.OK, 'Match details retrieved.', matchDetails).send();
  } catch (error) {
    next(error);
  }
});


/**
 * POST /api/v1/matches/:id/results/upload-url
 * Get a secure URL to upload a result screenshot.
 * Only accessible by a participant of the match.
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

    // The GetMatchUploadUrlUseCase handles fetching match, auth checks, and S3 URL generation.
    // It needs tournamentId, which should be part of the match details or passed if known.
    // For now, assuming matchId is sufficient for the use case to find the tournamentId if needed (e.g. from match object).
    // The use case `GetMatchUploadUrlUseCase` takes (userId, tournamentId, matchId, fileInfo).
    // We need to fetch tournamentId from the match object first if not passed in URL.
    // Let's assume the route is `/tournaments/:tournamentId/matches/:matchId/results/upload-url` for clarity,
    // or fetch match here to get tournamentId. For now, fetching match here.

    const match = await tournamentRepository.findMatchById(matchId); // Fetch match to get tournamentId
    if (!match) {
        throw new ApiError(httpStatusCodes.NOT_FOUND, 'Match not found to derive tournament ID.');
    }

    const result = await getMatchUploadUrlUseCase.execute(userId, match.tournamentId, matchId, fileInfo);

    return new ApiResponse(res, httpStatusCodes.OK, 'Upload URL generated successfully.', result).send();
  } catch (error) {
    next(error);
  }
});


/**
 * POST /api/v1/matches/:id/results
 * Submit the final result after file upload and scan.
 * Only accessible by a participant of the match.
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

    // Fetch tournamentId from match for the use case, or adjust route to include it.
    const matchForTournamentId = await tournamentRepository.findMatchById(matchId);
    if (!matchForTournamentId) {
        throw new ApiError(httpStatusCodes.NOT_FOUND, 'Match not found to derive tournament ID.');
    }

    const result = await submitMatchResultUseCase.execute(
      userId,
      matchForTournamentId.tournamentId,
      matchId,
      resultPayload
    );
    // SubmitMatchResultUseCase returns { match: UpdatedMatchEntity, message: string }

    return new ApiResponse(res, httpStatusCodes.OK, result.message, result.match).send();
  } catch (error) {
    next(error);
  }
});


// TODO: Add routes for confirming/disputing results if they are HTTP-based
// POST /api/v1/matches/:id/results/confirm (by opponent or admin)
// POST /api/v1/matches/:id/results/dispute (by participant)

module.exports = router;

// Notes:
// - Placeholder comments for Match-specific use cases and repositories.
//   - `PostgresMatchRepository` would be dedicated to Match CRUD and specific queries.
//   - `S3Service` would handle interactions with AWS S3 for signed URLs and file management.
//   - For now, `tournamentRepository.findMatchById` and `updateMatch` are used as stand-ins.
// - Input validation with Joi for submitting results and requesting upload URLs.
// - Authorization checks ensure only match participants can perform actions like getting upload URLs or submitting results.
// - The `upload-url` endpoint simulates generating an S3 pre-signed URL. A real implementation
//   would use the AWS SDK. The `fileKey` is returned to the client, who then uses it in the
//   subsequent result submission after uploading the file.
// - The `results` submission endpoint takes the `fileKey` (among other data).
//   A crucial step (marked Future) is to verify this `fileKey` against actual uploads and scan results.
// - Reconstructing the Match domain entity (`MatchEntity`) allows using its domain logic methods
//   (like `recordResult`) before persisting changes via the repository.
// - The blueprint's API table lists these two endpoints. Additional endpoints for confirmation/dispute
//   are mentioned as TODOs if they are to be HTTP-based rather than handled through other mechanisms (e.g., admin panel).
// - Assumes `MatchEntity` is available from `../../domain/tournament`. If it's `match.entity.js` directly, path would adjust.
//   Corrected import to `require('../../domain/tournament')` assuming an index.js there exports entities.
//   If not, `require('../../domain/tournament/match.entity').Match`
//   Given previous patterns, direct entity import is more likely: `require('../../domain/tournament/match.entity').Match;`
//   Let's assume `Match` is directly from `match.entity.js`.
//   The `tournament.entity.js` exports `{ Tournament }`. So `match.entity.js` exports `{ Match }`.
//   The domain entity import has been adjusted.
// - The `uploadUrlRequestSchema` includes basic image filename and content type validation.
// - The path for `MatchEntity` was `../../domain/tournament/match.entity`, changed to use `Match` from `../../domain/tournament` assuming an index.js there. This is a common pattern. If not, it should be `require('../../domain/tournament/match.entity').Match`.
//   For consistency with how `Tournament` entity was imported in its own use case, I'll use direct path.
//   `const { Match } = require('../../domain/tournament/match.entity');` - this is more precise.
//   The file `postgres.tournament.repository.js` already defines `MatchModel`.
//   This implies `Match` entity should be used for domain logic, then mapped to `MatchModel` for DB.
//   The `tournamentRepository` already has `updateMatch` and `findMatchById`.
//   Re-instantiating `MatchEntity` from DB data to call domain methods is a good pattern.
//   The `PostgresTournamentRepository` methods `findMatchById` and `updateMatch` should ideally return/accept domain entities,
//   or the mapping should happen here in the route handler (or in a use case).
//   The current `tournamentRepository` returns domain entities via `toDomainMatchEntity`. This is good.
//   So `match` from `tournamentRepository.findMatchById(null, matchId)` is already a domain entity.
//   This simplifies the logic in the route handler.

// Corrected logic: `match` is already a domain entity.
// const match = await tournamentRepository.findMatchById(null, matchId);
// match.recordResult(...); // Call domain method directly
// const updatedMatchData = { winnerId: match.winnerId, ... }; // Get updated fields from domain entity
// await tournamentRepository.updateMatch(matchId, updatedMatchData);
// This is cleaner.
// I will refactor the POST /:id/results to use this cleaner approach.```javascript
const express = require('express');
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
// const AWS = require('aws-sdk'); // If directly using AWS SDK here for presigned URL

const router = express.Router();
const tournamentRepository = new PostgresTournamentRepository(); // Provides match-related methods for now

// --- Schemas for Validation ---
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


// --- Route Handlers ---

/**
 * GET /api/v1/matches/:id
 * Get details of a specific match.
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id: matchId } = req.params;
    if (Joi.string().uuid().validate(matchId).error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid match ID format.');
    }

    const match = await tournamentRepository.findMatchById(null, matchId); // Pass null for tournamentId if matchId is globally unique

    if (!match) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Match not found.');
    }
    // Authorization: Check if user is participant, admin, or if match details are public.
    // For now, assuming any authenticated user can view.
    return new ApiResponse(res, httpStatusCodes.OK, 'Match details retrieved.', match).send();
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

    if (Joi.string().uuid().validate(matchId).error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid match ID format.');
    }

    const { error, value: uploadParams } = uploadUrlRequestSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const match = await tournamentRepository.findMatchById(null, matchId);
    if (!match) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Match not found.');
    }

    if (match.participant1Id !== userId && match.participant2Id !== userId) {
      throw new ApiError(httpStatusCodes.FORBIDDEN, 'You are not a participant in this match.');
    }
    if (!['IN_PROGRESS', 'AWAITING_SCORES'].includes(match.status)) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, `Cannot get upload URL for match with status: ${match.status}.`);
    }

    // Placeholder for S3Service.getPresignedUploadUrl(fileKey, contentType, expiresIn)
    // const s3Service = new S3Service(); // Assuming S3Service is configured
    // const fileKey = `results/${match.tournamentId}/${matchId}/${userId}/${Date.now()}_${uploadParams.filename}`;
    // const { uploadUrl } = await s3Service.getPresignedUploadUrl(fileKey, uploadParams.contentType, appConfig.aws.s3.signedUrlExpiration);

    // Simplified placeholder for now:
    const fileKey = `results/${match.tournamentId}/${matchId}/${userId}/${Date.now()}_${uploadParams.filename.replace(/\s+/g, '_')}`;
    const placeholderUploadUrl = `https://s3-placeholder-url.com/${appConfig.aws.s3.bucketName}/${fileKey}`;
    // In a real scenario, use AWS SDK to generate this:
    // const s3 = new AWS.S3({ region: appConfig.aws.region, accessKeyId: ..., secretAccessKey: ...});
    // const params = { Bucket: appConfig.aws.s3.bucketName, Key: fileKey, Expires: appConfig.aws.s3.signedUrlExpiration, ContentType: uploadParams.contentType };
    // const uploadUrl = await s3.getSignedUrlPromise('putObject', params);


    return new ApiResponse(res, httpStatusCodes.OK, 'Upload URL generated successfully.', {
      uploadUrl: placeholderUploadUrl,
      fileKey,
    }).send();
  } catch (error) {
    next(error);
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

    if (Joi.string().uuid().validate(matchId).error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid match ID format.');
    }

    const { error, value: resultData } = submitResultSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const match = await tournamentRepository.findMatchById(null, matchId); // Returns domain entity
    if (!match) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Match not found.');
    }

    if (match.participant1Id !== userId && match.participant2Id !== userId) {
      throw new ApiError(httpStatusCodes.FORBIDDEN, 'You are not a participant in this match.');
    }
    if (!['IN_PROGRESS', 'AWAITING_SCORES'].includes(match.status)) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, `Cannot submit result for match with status: ${match.status}.`);
    }
    if (resultData.winningParticipantId !== match.participant1Id && resultData.winningParticipantId !== match.participant2Id) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Winner ID is not a valid participant of this match.');
    }

    // (Future step: Verify resultScreenshotFileKey against an actual uploaded & scanned file)

    // Use domain entity method to update state
    match.recordResult(
      resultData.winningParticipantId,
      resultData.scoreParticipant1,
      resultData.scoreParticipant2,
      `s3://${appConfig.aws.s3.bucketName}/${resultData.resultScreenshotFileKey}` // Store S3 URI or similar
    );
    if (resultData.comments) {
        // match.addComment(userId, resultData.comments); // Or similar method if entity supports it
        // For now, this might be stored in match metadata if such a field exists for the model.
    }

    // Persist changes. `updateMatch` should take the relevant fields from the domain entity.
    const updatedMatchData = {
      winnerId: match.winnerId,
      scoreParticipant1: match.scoreParticipant1,
      scoreParticipant2: match.scoreParticipant2,
      resultScreenshotUrl: match.resultScreenshotUrl,
      status: match.status, // Should be AWAITING_CONFIRMATION from recordResult
      actualEndTime: match.actualEndTime,
      isConfirmed: match.isConfirmed, // Should be false from recordResult
    };
    const updatedMatchFromDb = await tournamentRepository.updateMatch(matchId, updatedMatchData);

    if (!updatedMatchFromDb) {
      throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to update match result.');
    }

    return new ApiResponse(res, httpStatusCodes.OK, 'Match result submitted. Waiting for confirmation.', updatedMatchFromDb).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```
