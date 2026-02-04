const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, UsageTracking, sequelize } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(authenticate);

// @route   GET /api/user/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Reset monthly usage if needed
    await user.resetMonthlyUsage();

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters'),
  
  body('company_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Company name cannot exceed 255 characters'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  
  body('billing_address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Billing address cannot exceed 500 characters'),
  
  body('billing_city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Billing city cannot exceed 100 characters'),
  
  body('billing_postal_code')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Billing postal code cannot exceed 20 characters'),
  
  body('billing_email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid billing email')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const updateData = req.body;

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user profile
    await user.update(updateData);

    // Remove sensitive data from response
    const userResponse = user.toJSON();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: userResponse
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during profile update'
    });
  }
});

// @route   GET /api/user/usage
// @desc    Get user usage statistics
// @access  Private
router.get('/usage', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Reset monthly usage if needed
    await user.resetMonthlyUsage();

    // Refresh user data after potential reset
    const refreshedUser = await User.findByPk(req.user.id);

    const usageData = {
      filesProcessedThisMonth: refreshedUser.files_processed_this_month,
      monthlyLimit: refreshedUser.monthly_limit,
      remainingFiles: refreshedUser.remainingFiles,
      lastUsageReset: refreshedUser.last_usage_reset,
      subscriptionStatus: refreshedUser.subscription_status,
      usagePercentage: Math.round((refreshedUser.files_processed_this_month / refreshedUser.monthly_limit) * 100)
    };

    res.json({
      success: true,
      data: {
        usage: usageData
      }
    });

  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/user/track-usage
// @desc    Track file processing usage
// @access  Private
router.post('/track-usage', [
  body('files_processed')
    .isInt({ min: 1 })
    .withMessage('Files processed must be a positive integer'),
  
  body('processing_date')
    .optional()
    .isISO8601()
    .withMessage('Processing date must be a valid ISO date'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { files_processed, processing_date, metadata } = req.body;
    const userId = req.user.id;

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Reset monthly usage if needed
    await user.resetMonthlyUsage();

    // Check if user has enough quota
    const remainingFiles = user.remainingFiles;
    if (files_processed > remainingFiles) {
      // Log failed attempt to usage_tracking
      await UsageTracking.create({
        user_id: userId,
        action_type: 'file_process',
        file_count: files_processed,
        processing_time: metadata?.processing_duration ? Math.round(metadata.processing_duration) : null,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        endpoint: req.originalUrl,
        method: req.method,
        metadata: {
          ...metadata,
          quota_check: {
            requested: files_processed,
            available: remainingFiles,
            monthly_limit: user.monthly_limit,
            current_usage: user.files_processed_this_month
          }
        },
        success: false,
        error_message: `Insufficient quota. Requested: ${files_processed}, Available: ${remainingFiles}`
      });

      return res.status(400).json({
        success: false,
        message: `Insufficient quota. Requested: ${files_processed}, Available: ${remainingFiles}`,
        data: {
          files_processed: 0,
          remaining_files: remainingFiles,
          monthly_limit: user.monthly_limit,
          quota_exceeded: true
        }
      });
    }

    // Update user's file processing count
    const newFilesProcessed = user.files_processed_this_month + files_processed;
    await user.update({
      files_processed_this_month: newFilesProcessed,
      last_active_at: new Date()
    });

    // Create usage tracking record
    const usageRecord = await UsageTracking.create({
      user_id: userId,
      action_type: 'file_process',
      file_count: files_processed,
      processing_time: metadata?.processing_duration ? Math.round(metadata.processing_duration) : null,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      method: req.method,
      metadata: {
        ...metadata,
        quota_info: {
          previous_usage: user.files_processed_this_month,
          new_usage: newFilesProcessed,
          remaining_after: user.monthly_limit - newFilesProcessed,
          monthly_limit: user.monthly_limit
        },
        processing_timestamp: processing_date || new Date().toISOString()
      },
      success: true
    });

    // Log the usage tracking
    console.log(`✅ Usage tracked for user ${user.id} (${user.email}): ${files_processed} files processed`, {
      userId: user.id,
      email: user.email,
      files_processed,
      processing_date: processing_date || new Date().toISOString(),
      new_total: newFilesProcessed,
      remaining: user.monthly_limit - newFilesProcessed,
      tracking_id: usageRecord.uuid
    });

    // Refresh user data
    const refreshedUser = await User.findByPk(userId);

    res.json({
      success: true,
      message: `Successfully tracked ${files_processed} files processed`,
      data: {
        files_processed,
        total_processed_this_month: refreshedUser.files_processed_this_month,
        remaining_files: refreshedUser.remainingFiles,
        monthly_limit: refreshedUser.monthly_limit,
        usage_percentage: Math.round((refreshedUser.files_processed_this_month / refreshedUser.monthly_limit) * 100),
        processing_date: processing_date || new Date().toISOString(),
        metadata,
        tracking_id: usageRecord.uuid
      }
    });

  } catch (error) {
    console.error('Track usage error:', error);
    
    // Try to log the error to usage_tracking
    try {
      await UsageTracking.create({
        user_id: req.user?.id || null,
        action_type: 'file_process',
        file_count: req.body.files_processed || 0,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        endpoint: req.originalUrl,
        method: req.method,
        metadata: {
          error_details: error.message,
          request_body: req.body
        },
        success: false,
        error_message: error.message
      });
    } catch (logError) {
      console.error('Failed to log error to usage_tracking:', logError);
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during usage tracking'
    });
  }
});

// @route   GET /api/user/usage-history
// @desc    Get user usage tracking history
// @access  Private
router.get('/usage-history', async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50, action_type, success } = req.query;

    // Build where clause
    const whereClause = { user_id: userId };
    if (action_type) {
      whereClause.action_type = action_type;
    }
    if (success !== undefined) {
      whereClause.success = success === 'true';
    }

    // Get usage history with pagination
    const offset = (page - 1) * limit;
    const usageHistory = await UsageTracking.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'uuid',
        'action_type',
        'file_count',
        'file_size',
        'processing_time',
        'ip_address',
        'endpoint',
        'method',
        'metadata',
        'success',
        'error_message',
        'created_at'
      ]
    });

    // Calculate summary statistics
    const summaryStats = await UsageTracking.findAll({
      where: { user_id: userId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_records'],
        [sequelize.fn('SUM', sequelize.col('file_count')), 'total_files_processed'],
        [sequelize.fn('AVG', sequelize.col('processing_time')), 'avg_processing_time'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN success = true THEN 1 END')), 'successful_operations'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN success = false THEN 1 END')), 'failed_operations']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        usage_history: usageHistory.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(usageHistory.count / limit),
          total_records: usageHistory.count,
          per_page: parseInt(limit)
        },
        summary: summaryStats[0] || {
          total_records: 0,
          total_files_processed: 0,
          avg_processing_time: 0,
          successful_operations: 0,
          failed_operations: 0
        }
      }
    });

  } catch (error) {
    console.error('Get usage history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;