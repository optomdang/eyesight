// const httpStatus = require('http-status');
// const pick = require('../../utils/pick');
// const ApiError = require('../../utils/ApiError');
// const catchAsync = require('../../utils/catchAsync');
// const { scheduleService } = require('../../services');
//
// const filterKeys = ['code'];
//
// const createSchedule = catchAsync(async (req, res) => {
//     const schedule = await scheduleService.createSchedule(req.body);
//     res.status(httpStatus.CREATED).send(schedule);
// });
//
// const getSchedules = catchAsync(async (req, res) => {
//     const filter = pick(req.query, filterKeys);
//     const options = pick(req.query, ['sortBy', 'limit', 'page']);
//     const result = await scheduleService.querySchedules(filter, options);
//     res.send(result);
// });
//
// const getSchedule = catchAsync(async (req, res) => {
//     const schedule = await scheduleService.getScheduleById(req.params.scheduleId);
//     if (!schedule) {
//         throw new ApiError(httpStatus.NOT_FOUND, 'Phòng khám không tồn tại');
//     }
//     res.send(schedule);
// });
//
// const updateSchedule = catchAsync(async (req, res) => {
//     const schedule = await scheduleService.updateScheduleById(req.params.scheduleId, req.body);
//     res.send(schedule);
// });
//
// const deleteSchedule = catchAsync(async (req, res) => {
//     await scheduleService.deleteScheduleById(req.params.scheduleId);
//     res.status(httpStatus.NO_CONTENT).send();
// });
//
// const deleteSchedules = catchAsync(async (req, res) => {
//     await scheduleService.deleteScheduleByIds(req.body);
//     res.status(httpStatus.NO_CONTENT).send();
// });
//
// module.exports = {
//     createSchedule,
//     getSchedules,
//     getSchedule,
//     updateSchedule,
//     deleteSchedule,
//     deleteSchedules,
// };
