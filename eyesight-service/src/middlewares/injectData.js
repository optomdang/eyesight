const injectData = (dataType) => (req, res, next) => {
  if (req.user) {
    if (dataType === 'query') {
      req.query = {
        ...req.query,
        centerId: req.user.centerId,
      };
    } else {
      req.body = {
        ...req.body,
        centerId: req.user.centerId,
        updatedBy: req.user.id,
      };
    }
  }
  return next();
};

module.exports = injectData;
