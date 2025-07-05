const express = require('express');
const Joi = require('joi');
const { authenticateToken, authorizeRole } = require('../../middleware/auth.middleware');
// const GetMatchUseCase = require('../../application/use-cases/match/get-match.usecase');
// const SubmitMatchResultUseCase = require('../../application/use-cases/match/submit-match-result.usecase');
// const GetUploadUrlUseCase = require('../../application/use-cases/match/get-upload-url.usecase'); // For S3 signed URL
// const ConfirmMatchResultUseCase = require('../../application/use-cases/match/confirm-match-result.usecase');
// const DisputeMatchResultUseCase = require('../../application/use-cases/match/dispute-match-result.usecase');
// const PostgresMatchRepository = require('../../infrastructure/database/repositories/postgres.match.repository'); // Placeholder
// const S3Service = require('../../infrastructure/services/s3.service'); // Placeholder for file uploads
const { appConfig } = require('../../../config/config'); // For AWS S3 config
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');
const { Tournament, Match: MatchEntity } = require('../../domain/tournament'); // Assuming domain entities are exported this way
const PostgresTournamentRepository = require('../../infrastructure/database/repositories/postgres.tournament.repository'); // To get match info

const router = express.Router();
// const matchRepository = new PostgresMatchRepository();
// const s3Service = new S3Service(appConfig.aws.s3); // Initialize S3 service

const tournamentRepository = new PostgresTournamentRepository(); // Using this for now to access match methods

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
    if (!Joi.string().uuid().validate(matchId).error) { // Valid UUID
        // const getMatch = new GetMatchUseCase(matchRepository);
        // const match = await getMatch.execute(matchId);
        // Placeholder using tournamentRepository's findMatchById method
        const match = await tournamentRepository.findMatchById(null, matchId); // tournamentId context might be needed by repo

        if (!match) {
            throw new ApiError(httpStatusCodes.NOT_FOUND, 'Match not found.');
        }
        // Add authorization: is user a participant, admin, or is match public?
        // For now, assuming authenticated users can view any match.
        return new ApiResponse(res, httpStatusCodes.OK, 'Match details retrieved.', match).send();
    } else {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid match ID format.');
    }
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

    if (Joi.string().uuid().validate(matchId).error) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid match ID format.');
    }

    const { error, value: uploadParams } = uploadUrlRequestSchema.validate(req.body);
    if (error) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    // 1. Fetch match details
    const match = await tournamentRepository.findMatchById(null, matchId); // Assuming findMatchById can work without tournamentId if matchId is global
    if (!match) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Match not found.');
    }

    // 2. Authorization: Check if req.user.sub is one of the participants
    if (match.participant1Id !== userId && match.participant2Id !== userId) {
      throw new ApiError(httpStatusCodes.FORBIDDEN, 'You are not a participant in this match.');
    }

    // 3. Check match status (e.g., must be IN_PROGRESS or AWAITING_SCORES)
    if (!['IN_PROGRESS', 'AWAITING_SCORES'].includes(match.status)) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, `Cannot get upload URL for match with status: ${match.status}.`);
    }

    // 4. Generate signed URL using a service (e.g., S3Service)
    // const getUploadUrl = new GetUploadUrlUseCase(s3Service);
    // const { uploadUrl, fileKey } = await getUploadUrl.execute(matchId, userId, uploadParams.filename, uploadParams.contentType);

    // Placeholder for S3 signed URL generation:
    const fileKey = `results/${match.tournamentId}/${matchId}/${userId}/${Date.now()}_${uploadParams.filename}`;
    const placeholderUploadUrl = `https://s3.${appConfig.aws.region}.amazonaws.com/${appConfig.aws.s3.bucketName}/${fileKey}?presigned_signature=EXAMPLE`;
    // End placeholder

    return new ApiResponse(res, httpStatusCodes.OK, 'Upload URL generated successfully.', {
      uploadUrl: placeholderUploadUrl, // Replace with actual signed URL
      fileKey, // Client needs this to submit the result later
    }).send();
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
    const userId = req.user.sub; // Reporting user

    if (Joi.string().uuid().validate(matchId).error) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid match ID format.');
    }

    const { error, value: resultData } = submitResultSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    // 1. Fetch match details
    const match = await tournamentRepository.findMatchById(null, matchId);
    if (!match) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Match not found.');
    }

    // 2. Authorization: Check if req.user.sub is one of the participants
    if (match.participant1Id !== userId && match.participant2Id !== userId) {
      throw new ApiError(httpStatusCodes.FORBIDDEN, 'You are not a participant in this match.');
    }

    // 3. Check match status (e.g., IN_PROGRESS, AWAITING_SCORES)
     if (!['IN_PROGRESS', 'AWAITING_SCORES'].includes(match.status)) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, `Cannot submit result for match with status: ${match.status}.`);
    }

    // 4. Validate winnerId is one of the participants
    if (resultData.winningParticipantId !== match.participant1Id && resultData.winningParticipantId !== match.participant2Id) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Winner ID is not a valid participant of this match.');
    }

    // 5. (Future) Verify fileKey corresponds to a successfully uploaded and scanned file.
    //    This might involve checking a database record or metadata from S3.

    // 6. Execute use case to submit result
    // const submitResult = new SubmitMatchResultUseCase(matchRepository /*, other services */);
    // const updatedMatch = await submitResult.execute(matchId, userId, resultData);

    // Placeholder logic:
    const matchDomainEntity = new MatchEntity( // Reconstruct domain entity to use its methods
        match.id, match.tournamentId, match.roundNumber, match.matchNumberInRound,
        match.participant1Id, match.participant2Id, match.status
    );
    matchDomainEntity.recordResult(
        resultData.winningParticipantId,
        resultData.scoreParticipant1,
        resultData.scoreParticipant2,
        `${appConfig.aws.s3.bucketName}/${resultData.resultScreenshotFileKey}` // Construct a conceptual URL
    );
    // Add comments to description or metadata if needed
    // matchDomainEntity.metadata.comments = resultData.comments;

    const updatedMatchData = {
        winnerId: matchDomainEntity.winnerId,
        scoreParticipant1: matchDomainEntity.scoreParticipant1,
        scoreParticipant2: matchDomainEntity.scoreParticipant2,
        resultScreenshotUrl: matchDomainEntity.resultScreenshotUrl,
        status: matchDomainEntity.status, // Should be AWAITING_CONFIRMATION
        actualEndTime: matchDomainEntity.actualEndTime,
        isConfirmed: false,
    };
    const updatedMatchFromDb = await tournamentRepository.updateMatch(matchId, updatedMatchData);
    // End placeholder logic

    if (!updatedMatchFromDb) {
        throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to update match result.');
    }

    return new ApiResponse(res, httpStatusCodes.OK, 'Match result submitted. Waiting for confirmation.', updatedMatchFromDb).send();
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
