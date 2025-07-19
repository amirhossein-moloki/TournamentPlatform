const catchAsync = require('../../utils/catchAsync');
const { CreatedResponse, SuccessResponse } = require('../../utils/ApiResponse');

class MatchController {
    constructor({ getMatchUseCase, getMatchUploadUrlUseCase, submitMatchResultUseCase }) {
        this.getMatchUseCase = getMatchUseCase;
        this.getMatchUploadUrlUseCase = getMatchUploadUrlUseCase;
        this.submitMatchResultUseCase = submitMatchResultUseCase;
    }

    getMatchById = catchAsync(async (req, res) => {
        const match = await this.getMatchUseCase.execute(req.params.id, req.user.id);
        new SuccessResponse('Match retrieved successfully.', match).send(res);
    });

    getUploadUrl = catchAsync(async (req, res) => {
        const { id: matchId } = req.params;
        const { filename, contentType } = req.body;
        const result = await this.getMatchUploadUrlUseCase.execute(req.user.id, req.body.tournamentId, matchId, { filename, contentType });
        new SuccessResponse('Upload URL generated successfully.', result).send(res);
    });

    submitResult = catchAsync(async (req, res) => {
        const { id: matchId } = req.params;
        const result = await this.submitMatchResultUseCase.execute(req.user.id, req.body.tournamentId, matchId, req.body);
        new SuccessResponse('Match result submitted successfully.', result).send(res);
    });
}

module.exports = MatchController;
