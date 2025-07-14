const { BadRequestError, NotFoundError, ForbiddenError, InternalServerError } = require('../../../utils/errors');
const { appConfig } = require('../../../../config/config');
// const S3Service = require('../../services/s3.service'); // Ideal - to be created/injected

class GetMatchUploadUrlUseCase {
  constructor(tournamentRepository /*, s3Service */) {
    this.tournamentRepository = tournamentRepository;
    // this.s3Service = s3Service; // For generating pre-signed URLs
  }

  async execute(userId, tournamentId, matchId, fileInfo) {
    if (!userId || !tournamentId || !matchId || !fileInfo || !fileInfo.filename || !fileInfo.contentType) {
      throw new BadRequestError('User ID, tournament ID, match ID, and file information are required.');
    }

    const match = await this.tournamentRepository.findMatchById(tournamentId, matchId);
    if (!match) {
      throw new NotFoundError('Match not found.');
    }

    // Authorization: Check if user is a participant
    if (match.participant1Id !== userId && match.participant2Id !== userId && !(match.team1Participants && match.team1Participants.includes(userId)) && !(match.team2Participants && match.team2Participants.includes(userId)) ) {
      throw new ForbiddenError('You are not authorized to upload results for this match.');
    }

    // Check match status
    // TODO: Define these statuses centrally, e.g., in MatchStatus constants/enum
    const allowedStatuses = ['IN_PROGRESS', 'AWAITING_SCORES', 'PENDING_RESULT_SUBMISSION'];
    if (!allowedStatuses.includes(match.status)) {
      throw new BadRequestError(`Cannot get upload URL for match with status: ${match.status}.`);
    }

    // Generate file key
    const fileExtension = fileInfo.filename.split('.').pop();
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
    const fileKey = `match-results/${tournamentId}/${matchId}/${userId}/${uniqueFilename}`;

    // Simulate S3 pre-signed URL generation
    // In a real application, this would use AWS SDK and an S3 service
    // const { uploadUrl, fileKey } = await this.s3Service.getPresignedUploadUrl(
    //   appConfig.aws.s3.bucketName,
    //   fileKey,
    //   fileInfo.contentType,
    //   appConfig.aws.s3.signedUrlExpiration // e.g., 60*5 (5 minutes)
    // );

    // Placeholder for S3Service.getPresignedUploadUrl(bucket, fileKey, contentType, expiresIn)
    // This is a simplified placeholder for the actual S3 pre-signed URL generation logic.
    // A real implementation would use the AWS SDK.
    const placeholderUploadUrl = `https://${appConfig.aws.s3.bucketName}.s3.${appConfig.aws.region}.amazonaws.com/${fileKey}?presigned-signature=EXAMPLE`;


    if (!placeholderUploadUrl) {
        throw new InternalServerError('Failed to generate upload URL.');
    }

    return {
      uploadUrl: placeholderUploadUrl,
      fileKey: fileKey, // The key client will use to confirm upload and for result submission
    };
  }
}

module.exports = GetMatchUploadUrlUseCase;
