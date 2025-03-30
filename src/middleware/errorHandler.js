const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.type === 'ValidationError') {
    return res.status(400).json({
      error: {
        message: req.t('validation.error'),
        details: err.details
      }
    });
  }

  if (err.type === 'AuthenticationError') {
    return res.status(401).json({
      error: {
        message: req.t('auth.unauthorized')
      }
    });
  }

  return res.status(500).json({
    error: {
      message: req.t('error.internal')
    }
  });
};

module.exports = {
  errorHandler
};
