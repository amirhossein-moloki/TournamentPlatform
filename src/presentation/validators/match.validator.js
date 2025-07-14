const Joi = require('joi');

const matchIdParamSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
});

const uploadUrlRequestSchema = Joi.object({
    body: Joi.object({
        filename: Joi.string().pattern(new RegExp('^[^/\\0]+\\.(png|jpe?g|gif)$')).required()
            .messages({
                'string.pattern.base': 'Filename must be valid and have a .png, .jpg, .jpeg, or .gif extension.',
            }),
        contentType: Joi.string().valid('image/png', 'image/jpeg', 'image/gif').required(),
    }),
});

const submitResultSchema = Joi.object({
    body: Joi.object({
        winningParticipantId: Joi.string().uuid().required(),
        scoreParticipant1: Joi.number().integer().min(0).optional().allow(null),
        scoreParticipant2: Joi.number().integer().min(0).optional().allow(null),
        resultScreenshotFileKey: Joi.string().required(), // S3 Key from upload step
        comments: Joi.string().max(500).optional().allow('', null),
    }),
});

module.exports = {
  matchIdParamSchema,
  uploadUrlRequestSchema,
  submitResultSchema,
};
