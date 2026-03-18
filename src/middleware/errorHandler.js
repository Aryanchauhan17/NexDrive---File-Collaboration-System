import logger from '../utils/logger.js'

const errorHandler = (err, req, res, next) => {
  console.trace(err)
  logger.error(`${err.message} | Route: ${req.originalUrl} | Method: ${req.method}`)

  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'

  if (err.name === 'ValidationError') {
    statusCode = 400
    const errors = Object.values(err.errors).map(e => e.message)
    message = errors.join(', ')
  }

  if (err.code === 11000) {
    statusCode = 400
    const field = Object.keys(err.keyValue)[0]
    message = `${field} already exists`
  }

  if (err.name === 'CastError') {
    statusCode = 400
    message = `Invalid ${err.path}`
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

export default errorHandler