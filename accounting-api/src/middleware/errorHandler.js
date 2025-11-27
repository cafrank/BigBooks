// --- src/middleware/errorHandler.js ---
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const errorHandler = (err, req, res, next) => {
  console.error(err);
  
  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Resource already exists' });
  }
  
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced resource not found' });
  }

  res.status(500).json({ error: 'Internal server error' });
};

module.exports = { AppError, errorHandler };
