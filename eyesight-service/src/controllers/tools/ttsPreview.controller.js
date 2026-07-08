const catchAsync = require('../../utils/catchAsync');
const ttsPreviewService = require('../../services/tools/ttsPreview.service');

const getStatus = catchAsync(async (req, res) => {
  res.send(ttsPreviewService.getPreviewStatus());
});

const synthesize = catchAsync(async (req, res) => {
  const result = await ttsPreviewService.synthesizePreview(req.body);
  res.send(result);
});

module.exports = {
  getStatus,
  synthesize,
};
