function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || err.status || 500;

  res.status(status).json({
    error: {
      message: err.message || "Internal server error",
      code: err.code || "INTERNAL_SERVER_ERROR"
    }
  });
}

module.exports = { errorHandler };
