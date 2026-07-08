// const httpStatus = require('http-status');
// const ApiError = require('../../utils/ApiError');
// const catchAsync = require('../../utils/catchAsync');
// const { patientExerciseService } = require('../../services');

// /**
//  * Auto-adjust exercise level for a patient
//  */
// // const autoAdjustLevel = catchAsync(async (req, res) => {
// //   // First check if the patient exercise exists
// //   const patientExercise = await patientExerciseService.getPatientExerciseById(req.params.patientExerciseId);
// //   if (!patientExercise) {
// //     throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập của bệnh nhân không tồn tại');
// //   }

// //   // Get adjustment source from request body or use default
// //   const adjustmentSource = req.body.adjustmentSource || 'doctor_setting';

// //   // Auto-adjust the level
// //   // const updatedExercise = await levelAdjustmentService.autoAdjustExerciseLevel(
// //   //   req.params.patientExerciseId,
// //   //   adjustmentSource
// //   // );

// //   res.send(updatedExercise);
// // });

// /**
//  * Toggle auto-adjustment for a patient exercise
//  */
// const toggleAutoAdjust = catchAsync(async (req, res) => {
//   // First check if the patient exercise exists
//   const patientExercise = await patientExerciseService.getPatientExerciseById(req.params.patientExerciseId);
//   if (!patientExercise) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập của bệnh nhân không tồn tại');
//   }

//   // Toggle auto-adjustment and set adjustment source if provided
//   const updateBody = {
//     autoAdjustLevel: req.body.autoAdjust !== undefined ? req.body.autoAdjust : !patientExercise.autoAdjustLevel,
//   };

//   if (req.body.adjustmentSource) {
//     updateBody.adjustmentSource = req.body.adjustmentSource;
//   }

//   const updatedExercise = await patientExerciseService.updatePatientExerciseById(req.params.patientExerciseId, updateBody);

//   res.send(updatedExercise);
// });

// /**
//  * Set level manually by doctor
//  */
// const setLevelByDoctor = catchAsync(async (req, res) => {
//   // First check if the patient exercise exists
//   const patientExercise = await patientExerciseService.getPatientExerciseById(req.params.patientExerciseId);
//   if (!patientExercise) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập của bệnh nhân không tồn tại');
//   }

//   // Set level manually
//   const updatedExercise = await levelAdjustmentService.setLevelByDoctor(
//     req.params.patientExerciseId,
//     req.body.level,
//     req.body.visualSettings
//   );

//   res.send(updatedExercise);
// });

// /**
//  * Configure pass conditions for an exercise
//  */
// const configurePassConditions = catchAsync(async (req, res) => {
//   // First check if the patient exercise exists
//   const patientExercise = await patientExerciseService.getPatientExerciseById(req.params.patientExerciseId);
//   if (!patientExercise) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập của bệnh nhân không tồn tại');
//   }

//   // Configure pass conditions
//   const updatedExercise = await levelAdjustmentService.configurePassConditions(
//     req.params.patientExerciseId,
//     req.body.passConditions
//   );

//   res.send(updatedExercise);
// });

// module.exports = {
//   autoAdjustLevel,
//   toggleAutoAdjust,
//   setLevelByDoctor,
//   configurePassConditions,
// };
