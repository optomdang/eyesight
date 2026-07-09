const Joi = require('joi');
const { CAUSE_CODES } = require('../../config/causes');

const createPatient = {
  body: Joi.object().keys({
    code: Joi.string().required(),
    userId: Joi.number().required(),
    name: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
    status: Joi.string().optional(),
    clinicId: Joi.number().optional(),
    gender: Joi.string().valid('male', 'female', 'other'),
    doctorId: Joi.number(),
    centerId: Joi.number().optional(),
    updatedBy: Joi.number(),
    doctor: Joi.any().optional(),
    clinic: Joi.any().optional(),
    user: Joi.any().optional(),
    examResults: Joi.object()
      .keys({
        far: Joi.object()
          .keys({
            initialResult: Joi.object()
              .keys({
                leftEye: Joi.number().allow(null).optional(),
                rightEye: Joi.number().allow(null).optional(),
                bothEye: Joi.number().allow(null).optional(),
              })
              .optional(),
            currentResult: Joi.object()
              .keys({
                leftEye: Joi.number().allow(null).optional(),
                rightEye: Joi.number().allow(null).optional(),
                bothEye: Joi.number().allow(null).optional(),
              })
              .optional(),
            lastExamDate: Joi.date().iso().allow(null).optional(),
          })
          .optional(),
        near: Joi.object()
          .keys({
            initialResult: Joi.object()
              .keys({
                leftEye: Joi.number().allow(null).optional(),
                rightEye: Joi.number().allow(null).optional(),
                bothEye: Joi.number().allow(null).optional(),
              })
              .optional(),
            currentResult: Joi.object()
              .keys({
                leftEye: Joi.number().allow(null).optional(),
                rightEye: Joi.number().allow(null).optional(),
                bothEye: Joi.number().allow(null).optional(),
              })
              .optional(),
            lastExamDate: Joi.date().iso().allow(null).optional(),
          })
          .optional(),
        contrast: Joi.object()
          .keys({
            initialResult: Joi.object()
              .keys({
                leftEye: Joi.number().allow(null).optional(),
                rightEye: Joi.number().allow(null).optional(),
                bothEye: Joi.number().allow(null).optional(),
              })
              .optional(),
            currentResult: Joi.object()
              .keys({
                leftEye: Joi.number().allow(null).optional(),
                rightEye: Joi.number().allow(null).optional(),
                bothEye: Joi.number().allow(null).optional(),
              })
              .optional(),
            lastExamDate: Joi.date().iso().allow(null).optional(),
          })
          .optional(),
        stereopsis: Joi.object()
          .keys({
            initialResult: Joi.object()
              .keys({
                leftEye: Joi.number().allow(null).optional(),
                rightEye: Joi.number().allow(null).optional(),
                bothEye: Joi.number().allow(null).optional(),
              })
              .optional(),
            currentResult: Joi.object()
              .keys({
                leftEye: Joi.number().allow(null).optional(),
                rightEye: Joi.number().allow(null).optional(),
                bothEye: Joi.number().allow(null).optional(),
              })
              .optional(),
            lastExamDate: Joi.date().iso().allow(null).optional(),
          })
          .optional(),
      })
      .optional(),
  }),
};

const getPatients = {
  query: Joi.object().keys({
    code: Joi.string(),
    userId: Joi.number(),
    name: Joi.string(),
    phoneNumber: Joi.string(),
    status: Joi.string(),
    inactiveDays: Joi.string(),
    effectiveness: Joi.string(),
    severityLevel: Joi.string(),
    country: Joi.string(),
    clinicId: Joi.number(),
    gender: Joi.string(),
    doctorId: Joi.number(),
    centerId: Joi.number(),
    zaloUserId: Joi.string(), // Allow filtering by Zalo User ID
    zaloPhoneNumber: Joi.string(), // Allow filtering by Zalo Phone Number
    updatedBy: Joi.number(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    order: Joi.any(),
  }),
};

const getPatient = {
  params: Joi.object().keys({
    patientId: Joi.number(),
  }),
};

const updatePatient = {
  params: Joi.object().keys({
    patientId: Joi.number().required(),
  }),
  body: Joi.object()
    .keys({
      code: Joi.string().required(),
      userId: Joi.number(),
      name: Joi.string().optional(),
      phoneNumber: Joi.string().optional(),
      status: Joi.string().optional(),
      clinicId: Joi.number().optional(),
      gender: Joi.string().valid('male', 'female', 'other'),
      doctorId: Joi.number(),
      centerId: Joi.number(),
      updatedBy: Joi.number(),
      id: Joi.any().optional(),
      doctor: Joi.any().optional(),
      clinic: Joi.any().optional(),
      user: Joi.any().optional(),
      examResults: Joi.object()
        .keys({
          far: Joi.object()
            .keys({
              initialResult: Joi.object()
                .keys({
                  leftEye: Joi.number().allow(null).optional(),
                  rightEye: Joi.number().allow(null).optional(),
                  bothEye: Joi.number().allow(null).optional(),
                })
                .optional(),
              currentResult: Joi.object()
                .keys({
                  leftEye: Joi.number().allow(null).optional(),
                  rightEye: Joi.number().allow(null).optional(),
                  bothEye: Joi.number().allow(null).optional(),
                })
                .optional(),
              lastExamDate: Joi.date().iso().allow(null).optional(),
            })
            .optional(),
          near: Joi.object()
            .keys({
              initialResult: Joi.object()
                .keys({
                  leftEye: Joi.number().allow(null).optional(),
                  rightEye: Joi.number().allow(null).optional(),
                  bothEye: Joi.number().allow(null).optional(),
                })
                .optional(),
              currentResult: Joi.object()
                .keys({
                  leftEye: Joi.number().allow(null).optional(),
                  rightEye: Joi.number().allow(null).optional(),
                  bothEye: Joi.number().allow(null).optional(),
                })
                .optional(),
              lastExamDate: Joi.date().iso().allow(null).optional(),
            })
            .optional(),
          contrast: Joi.object()
            .keys({
              initialResult: Joi.object()
                .keys({
                  leftEye: Joi.number().allow(null).optional(),
                  rightEye: Joi.number().allow(null).optional(),
                  bothEye: Joi.number().allow(null).optional(),
                })
                .optional(),
              currentResult: Joi.object()
                .keys({
                  leftEye: Joi.number().allow(null).optional(),
                  rightEye: Joi.number().allow(null).optional(),
                  bothEye: Joi.number().allow(null).optional(),
                })
                .optional(),
              lastExamDate: Joi.date().iso().allow(null).optional(),
            })
            .optional(),
          stereopsis: Joi.object()
            .keys({
              initialResult: Joi.object()
                .keys({
                  leftEye: Joi.number().allow(null).optional(),
                  rightEye: Joi.number().allow(null).optional(),
                  bothEye: Joi.number().allow(null).optional(),
                })
                .optional(),
              currentResult: Joi.object()
                .keys({
                  leftEye: Joi.number().allow(null).optional(),
                  rightEye: Joi.number().allow(null).optional(),
                  bothEye: Joi.number().allow(null).optional(),
                })
                .optional(),
              lastExamDate: Joi.date().iso().allow(null).optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .min(1),
};

const deletePatient = {
  params: Joi.object().keys({
    patientId: Joi.number(),
  }),
};

const deletePatients = {
  body: Joi.array().items(Joi.number()),
};

const getPatientByUserId = {
  params: Joi.object().keys({
    userId: Joi.number().integer().required(),
  }),
};

const updateMedicalRecord = {
  params: Joi.object().keys({
    patientId: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    medicalHistory: Joi.string().allow(null, '').max(50000).optional(),
    additionalNotes: Joi.string().allow(null, '').max(10000).optional(),
    medicalImages: Joi.array()
      .items(
        Joi.object().keys({
          id: Joi.string().required(),
          data: Joi.string()
            .pattern(/^data:image\/(jpeg|jpg|png|gif|webp);base64,/)
            .required()
            .custom((value, helpers) => {
              // Check base64 size (max 1MB = ~1.37MB base64)
              const base64Data = value.split(',')[1];
              const sizeInBytes = (base64Data.length * 3) / 4;
              if (sizeInBytes > 1024 * 1024) {
                return helpers.error('Image size must be less than 1MB');
              }
              return value;
            }),
          filename: Joi.string().required(),
          size: Joi.number()
            .integer()
            .max(1024 * 1024)
            .required(),
          uploadedAt: Joi.date().iso().required(),
        })
      )
      .max(10)
      .optional(),
    // Stored as stable codes (not Vietnamese labels); FE maps code → label for display.
    causes: Joi.array()
      .items(Joi.string().valid(...CAUSE_CODES))
      .optional(),
  }),
};

const pausePatientTreatment = {
  params: Joi.object().keys({
    patientId: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    updatedBy: Joi.number().optional(),
  }),
};

const resumePatientTreatment = {
  params: Joi.object().keys({
    patientId: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    activeFrom: Joi.date().iso().allow(null).optional(),
    activeTo: Joi.date().iso().allow(null).optional(),
    updatedBy: Joi.number().optional(),
  }),
};

const getPatientActiveTreatmentPackage = {
  params: Joi.object().keys({
    patientId: Joi.number().integer().required(),
  }),
};

module.exports = {
  createPatient,
  getPatients,
  getPatient,
  updatePatient,
  pausePatientTreatment,
  resumePatientTreatment,
  deletePatient,
  deletePatients,
  getPatientByUserId,
  updateMedicalRecord,
  getPatientActiveTreatmentPackage,
};
