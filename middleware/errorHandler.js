const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      message,
      statusCode: 404
    };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    
    // Extract field name from error
    const field = Object.keys(err.keyValue)[0];
    if (field === 'email') {
      message = 'Email address is already registered';
    } else if (field === 'referralCode') {
      message = 'Referral code already exists';
    }
    
    error = {
      message,
      statusCode: 400,
      field: field
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    const fields = Object.keys(err.errors);
    
    error = {
      message: 'Validation failed',
      statusCode: 400,
      errors: message,
      fields: fields
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expired',
      statusCode: 401,
      expired: true
    };
  }

  // Rate limiting errors
  if (err.status === 429) {
    error = {
      message: 'Too many requests, please try again later',
      statusCode: 429,
      retryAfter: err.retryAfter || 60
    };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      message: 'File too large',
      statusCode: 413,
      maxSize: process.env.MAX_FILE_SIZE || '10MB'
    };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = {
      message: 'Too many files',
      statusCode: 413
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = {
      message: 'Unexpected file field',
      statusCode: 400
    };
  }

  // Database connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    error = {
      message: 'Database connection error',
      statusCode: 503
    };
  }

  // Permission errors
  if (err.code === 'EACCES' || err.code === 'EPERM') {
    error = {
      message: 'Permission denied',
      statusCode: 403
    };
  }

  // File system errors
  if (err.code === 'ENOENT') {
    error = {
      message: 'File not found',
      statusCode: 404
    };
  }

  if (err.code === 'ENOSPC') {
    error = {
      message: 'Insufficient storage space',
      statusCode: 507
    };
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Prepare response
  const response = {
    success: false,
    message: message
  };

  // Add additional error details in development
  if (process.env.NODE_ENV === 'development') {
    response.error = {
      statusCode: statusCode,
      stack: err.stack,
      details: error
    };
  }

  // Add specific error fields if they exist
  if (error.field) response.field = error.field;
  if (error.fields) response.fields = error.fields;
  if (error.errors) response.errors = error.errors;
  if (error.retryAfter) response.retryAfter = error.retryAfter;
  if (error.expired) response.expired = error.expired;
  if (error.maxSize) response.maxSize = error.maxSize;

  // Send error response
  res.status(statusCode).json(response);
};

module.exports = errorHandler;