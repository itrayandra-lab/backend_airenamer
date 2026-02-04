const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.'
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user and check if still exists
      const user = await User.scope('withPassword').findByPk(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is no longer valid. User not found.'
        });
      }
      
      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated.'
        });
      }
      
      // Check if user is suspended
      if (user.is_suspended) {
        return res.status(401).json({
          success: false,
          message: 'Account is suspended.',
          suspendedReason: user.suspended_reason
        });
      }
      
      // Check if password was changed after token was issued
      if (user.password_changed_at && decoded.iat < user.password_changed_at.getTime() / 1000) {
        return res.status(401).json({
          success: false,
          message: 'Password was recently changed. Please log in again.'
        });
      }
      
      // Update last active time
      try {
        user.last_active_at = new Date();
        await user.save();
      } catch (saveError) {
        // Log the error but don't fail the authentication
        logger.warn('Failed to update last_active_at:', saveError);
      }
      
      // Add user to request object
      req.user = user;
      next();
      
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please log in again.',
          expired: true
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please log in again.'
        });
      } else {
        throw jwtError;
      }
    }
    
  } catch (error) {
    logger.error('Authentication error:', error);
    // Check if response has already been sent
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Authentication failed due to server error.'
      });
    }
  }
};

// Check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user.id} with role ${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to access this resource.'
      });
    }
    
    next();
  };
};

// Check if email is verified
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }
  
  if (!req.user.email_verified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required to access this resource.',
      requiresVerification: true
    });
  }
  
  next();
};

// Check if two-factor authentication is enabled and verified
const requireTwoFactor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }
  
  if (req.user.two_factor_enabled && !req.twoFactorVerified) {
    return res.status(403).json({
      success: false,
      message: 'Two-factor authentication required.',
      requiresTwoFactor: true
    });
  }
  
  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      return next(); // Continue without authentication
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);
      
      if (user && user.is_active && !user.is_suspended) {
        // Check password change
        if (!user.password_changed_at || decoded.iat >= user.password_changed_at.getTime() / 1000) {
          req.user = user;
          
          // Update last active time
          user.last_active_at = new Date();
          await user.save();
        }
      }
    } catch (jwtError) {
      // Ignore JWT errors for optional auth
    }
    
    next();
    
  } catch (error) {
    logger.error('Optional authentication error:', error);
    next(); // Continue without authentication on error
  }
};

// Rate limiting for sensitive operations
const sensitiveOperationLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 5, // Much higher limit in development
  message: {
    success: false,
    message: 'Too many sensitive operations from this IP, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development', // Skip rate limiting in development
  handler: (req, res) => {
    logger.warn(`Sensitive operation rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many sensitive operations from this IP, please try again later.',
      retryAfter: 15 * 60
    });
  }
});

// Check subscription status and limits
const checkSubscriptionLimits = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }
    
    // Reset monthly usage if needed
    await req.user.resetMonthlyUsage();
    
    // Check if user can process files
    const fileCount = req.body.fileCount || 1;
    
    if (!req.user.canProcessFiles(fileCount)) {
      return res.status(403).json({
        success: false,
        message: 'Monthly file processing limit exceeded.',
        currentUsage: req.user.files_processed_this_month,
        monthlyLimit: req.user.monthly_limit,
        remainingFiles: req.user.remainingFiles
      });
    }
    
    next();
    
  } catch (error) {
    logger.error('Subscription limit check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check subscription limits.'
    });
  }
};

module.exports = {
  authenticate,
  authorize,
  requireEmailVerification,
  requireTwoFactor,
  optionalAuth,
  sensitiveOperationLimit,
  checkSubscriptionLimits
};