/* Central Express error handlers */

function sanitizeMessage(err, isProduction) {
  if (!err) return 'Internal server error.';

  if (err.expose || (err.status && err.status < 500)) {
    return err.message || 'Request failed.';
  }

  if (isProduction) {
    return 'Internal server error.';
  }

  return err.message || 'Internal server error.';
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const status = Number(err.status || err.statusCode || 500);

  // Never echo connection strings, passwords, or tokens
  const safeLog = {
    method: req.method,
    url: req.originalUrl,
    status,
    code: err.code,
    message: err.message,
  };
  console.error('API Error:', safeLog);
  if (!isProduction && err.stack) {
    console.error(err.stack);
  }

  res.status(status >= 400 && status < 600 ? status : 500).json({
    message: sanitizeMessage(err, isProduction),
  });
}
