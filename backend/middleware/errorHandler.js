/* Central error handler */
export function notFoundHandler(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  console.error('API Error:', err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error.' });
}

