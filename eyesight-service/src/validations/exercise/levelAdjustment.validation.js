const Joi = require('joi');

const autoAdjustLevel = {
  params: Joi.object().keys({
    assignmentId: Joi.number().required(),
  }),
  body: Joi.object().keys({
    adjustmentSource: Joi.string().valid('exam_result', 'doctor_setting', 'last_session').default('doctor_setting'),
  }),
};

const toggleAutoAdjust = {
  params: Joi.object().keys({
    assignmentId: Joi.number().required(),
  }),
  body: Joi.object()
    .keys({
      autoAdjust: Joi.boolean(),
      adjustmentSource: Joi.string().valid('exam_result', 'doctor_setting', 'last_session'),
    })
    .min(1),
};

const setLevelByDoctor = {
  params: Joi.object().keys({
    assignmentId: Joi.number().required(),
  }),
  body: Joi.object().keys({
    level: Joi.number().required().min(1).max(5),
    visualSettings: Joi.object({
      objectSize: Joi.number().min(0).max(100),
      contrast: Joi.number().min(0).max(100),
      colorIntensity: Joi.number().min(0).max(100),
      // Add more visual settings as needed
    }).optional(),
  }),
};

const configurePassConditions = {
  params: Joi.object().keys({
    assignmentId: Joi.number().required(),
  }),
  body: Joi.object().keys({
    passConditions: Joi.object({
      minimumScore: Joi.number().min(0),
      targetScore: Joi.number().min(0),
      maximumTime: Joi.number().min(0),
      requiredAccuracy: Joi.number().min(0).max(100),
      // Add more pass conditions as needed
    }).required(),
  }),
};

module.exports = {
  autoAdjustLevel,
  toggleAutoAdjust,
  setLevelByDoctor,
  configurePassConditions,
};
