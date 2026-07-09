const Joi = require('joi');
const { password } = require('../custom.validation');

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
    dateOfBirth: Joi.date().iso().allow(null).optional(),
    gender: Joi.string().valid('male', 'female', 'other').allow('', null).optional(),
    roleId: Joi.number(), // Optional, sẽ auto-detect từ userType và centerId
    phoneNumber: Joi.string().required(),
    zaloUserId: Joi.string().allow(null).optional(),
    zaloPhoneNumber: Joi.string().allow(null).optional(),
    address: Joi.object({
      country: Joi.string().optional(),
      province: Joi.string().optional(),
      provinceCode: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
      district: Joi.string().optional(),
      districtCode: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
      ward: Joi.string().optional(),
      wardCode: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
      specificAddress: Joi.string().optional(),
    })
      .unknown(true)
      .optional(),
    userType: Joi.string().valid('admin', 'doctor', 'patient').required(),
    defaultClinicId: Joi.number(),
    clinicId: Joi.number(), // Alias cho defaultClinicId
    centerId: Joi.number().required(),
    updatedBy: Joi.number(),
    active: Joi.boolean().optional(),
    // Doctor specific fields
    doctor: Joi.object({
      code: Joi.string(),
      specialization: Joi.string(),
      licenseNumber: Joi.string(),
      qualification: Joi.string(),
      clinicId: Joi.number(), // Alias cho defaultClinicId
    }).when('userType', {
      is: 'doctor',
      then: Joi.optional(),
      otherwise: Joi.forbidden(),
    }),

    // Patient data as nested object
    patient: Joi.object({
      code: Joi.string(),
      clinicId: Joi.number(), // Alias cho defaultClinicId
      doctorId: Joi.number(),
      severityLevel: Joi.string().valid('normal', 'mild', 'moderate', 'severe', 'critical').allow(null).optional(),
      severityNotes: Joi.string().allow('', null).optional(),
      treatmentStatus: Joi.string().valid('not_started', 'active', 'paused', 'completed').optional(),
      treatmentPackageId: Joi.number().integer(),
      activeFrom: Joi.date().iso().allow(null).optional(),
      activeTo: Joi.date().iso().allow(null).optional(),
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
    }).when('userType', {
      is: 'patient',
      then: Joi.optional(),
      otherwise: Joi.forbidden(),
    }),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    search: Joi.string(),
    roleId: Joi.number(),
    userType: Joi.string().valid('admin', 'doctor', 'patient'),
    phoneNumber: Joi.string(),
    sortBy: Joi.string(),
    order: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.number().required(),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.number().required(),
  }),
  body: Joi.object()
    .keys({
      id: Joi.number().required(),
      email: Joi.string().email(),
      password: Joi.string().custom(password),
      name: Joi.string(),
      dateOfBirth: Joi.date().iso().allow(null).optional(),
      gender: Joi.string().valid('male', 'female', 'other').allow('', null).optional(),
      roleId: Joi.number().required(),
      zaloUserId: Joi.string().allow(null).optional(),
      zaloPhoneNumber: Joi.string().allow(null).optional(),
      address: Joi.object({
        country: Joi.string().optional(),
        province: Joi.string().optional(),
        provinceCode: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
        district: Joi.string().optional(),
        districtCode: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
        ward: Joi.string().optional(),
        wardCode: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
        specificAddress: Joi.string().optional(),
      })
        .unknown(true)
        .optional(),
      phoneNumber: Joi.string(),
      userType: Joi.string().valid('admin', 'doctor', 'patient'),
      defaultClinicId: Joi.number(),
      centerId: Joi.number().required(),
      updatedBy: Joi.number(),
      active: Joi.boolean().optional(),
      // Doctor specific fields
      doctor: Joi.object({
        id: Joi.number(),
        userId: Joi.number(),
        code: Joi.string(),
        specialization: Joi.string(),
        licenseNumber: Joi.string(),
        qualification: Joi.string(),
        clinicId: Joi.number(), // Alias cho defaultClinicId
      }).when('userType', {
        is: 'doctor',
        then: Joi.optional(),
        otherwise: Joi.forbidden(),
      }),

      patient: Joi.object({
        id: Joi.number(),
        userId: Joi.number(),
        code: Joi.string(),
        clinicId: Joi.number(), // Alias cho defaultClinicId
        doctorId: Joi.number(),
        severityLevel: Joi.string().valid('normal', 'mild', 'moderate', 'severe', 'critical').allow(null).optional(),
        severityNotes: Joi.string().allow('', null).optional(),
        treatmentStatus: Joi.string().valid('not_started', 'active', 'paused', 'completed').optional(),
        treatmentPackageId: Joi.number().integer(),
        activeFrom: Joi.date().iso().allow(null).optional(),
        activeTo: Joi.date().iso().allow(null).optional(),
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
      }).when('userType', {
        is: 'patient',
        then: Joi.optional(),
        otherwise: Joi.forbidden(),
      }),
    })
    .min(1),
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.number().required(),
  }),
};

const deleteUsers = {
  body: Joi.array().items(Joi.number()),
};

const storeRegistrationToken = {
  body: Joi.object().keys({
    token: Joi.string().allow(null).required(),
  }),
};

const markNotificationRead = {
  params: Joi.object().keys({
    notificationId: Joi.number().required(),
  }),
};

const updateCurrentUser = {
  body: Joi.object()
    .keys({
      name: Joi.string().min(3).max(255),
      dateOfBirth: Joi.date().iso().allow(null),
      gender: Joi.string().valid('male', 'female', 'other').allow(null),
      address: Joi.object({
        country: Joi.string().allow('', null).optional(),
        province: Joi.string().allow('', null).optional(),
        provinceCode: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null).optional(),
        district: Joi.string().allow('', null).optional(),
        districtCode: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null).optional(),
        ward: Joi.string().allow('', null).optional(),
        wardCode: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null).optional(),
        specificAddress: Joi.string().allow('', null).optional(),
      })
        .unknown(true)
        .allow(null)
        .optional(),
      phoneNumber: Joi.string().pattern(/^0\d{9}$/),
      zaloUserId: Joi.string().allow('', null).optional(),
      zaloPhoneNumber: Joi.string()
        .pattern(/^0\d{9}$/)
        .allow('', null)
        .optional(),
      email: Joi.string().email(),
      avatar: Joi.string().allow('', null).optional(), // Base64 or URL
    })
    .min(1), // At least one field must be provided
};

const changeAdminCenter = {
  body: Joi.object().keys({
    centerId: Joi.number().required(),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  deleteUsers,
  storeRegistrationToken,
  markNotificationRead,
  updateCurrentUser,
  changeAdminCenter,
};
