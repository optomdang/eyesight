const Joi = require('joi');

const synthesize = {
  body: Joi.object({
    provider: Joi.string().valid('google', 'azure', 'elevenlabs').required(),
    voiceId: Joi.string().required(),
    text: Joi.string().min(1).max(600).required(),
    lang: Joi.string().valid('vi', 'en').default('vi'),
    rate: Joi.number().min(0.7).max(1.3).default(0.95),
  }),
};

module.exports = {
  synthesize,
};
