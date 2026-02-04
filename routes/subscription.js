const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Subscription } = require('../models');
const { authenticate } = require('../middleware/auth');
const midtransClient = require('midtrans-client');

const router = express.Router();

// Initialize Midtrans
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY
});

// Subscription tiers configuration
const SUBSCRIPTION_TIERS = [
  { id: 0, files: 0, price: 0, name: "Paket Gratis", type: "gratis" },
  { id: 1, files: 25, price: 0, name: "Paket Gratis", type: "gratis" },
  { id: 2, files: 50, price: 0, name: "Paket Gratis", type: "gratis" },
  { id: 3, files: 100, price: 75000, name: "Paket Pro", type: "pro" },
  { id: 4, files: 250, price: 120000, name: "Paket Pro", type: "pro" },
  { id: 5, files: 500, price: 180000, name: "Paket Pro", type: "pro" },
  { id: 6, files: 750, price: 240000, name: "Paket Pro", type: "pro" },
  { id: 7, files: 1000, price: 300000, name: "Paket Pro", type: "pro" },
  { id: 8, files: 1500, price: 450000, name: "Paket Bisnis", type: "bisnis" },
  { id: 9, files: 2500, price: 600000, name: "Paket Bisnis", type: "bisnis" },
  { id: 10, files: 5000, price: 900000, name: "Paket Bisnis", type: "bisnis" },
  { id: 11, files: 10000, price: 1500000, name: "Paket Bisnis", type: "bisnis" },
  { id: 12, files: "Unlimited", price: 2000000, name: "Paket Bisnis", type: "bisnis" },
];

// All routes are protected except webhook and guest transactions
router.use('/webhook', (req, res, next) => next()); // Skip auth for webhook
router.use('/guest-transaction', (req, res, next) => next()); // Skip auth for guest transactions

// @route   POST /api/subscription/guest-transaction
// @desc    Create transaction for guest users (auto-register or login)
// @access  Public
router.post('/guest-transaction', [
  body('tier_id')
    .isInt({ min: 0, max: 12 })
    .withMessage('Valid tier ID is required (0-12)'),
  
  body('billing_cycle')
    .isIn(['monthly', 'yearly'])
    .withMessage('Billing cycle must be monthly or yearly'),
  
  body('customer_details')
    .isObject()
    .withMessage('Customer details are required'),
  
  body('customer_details.first_name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name is required'),
  
  body('customer_details.last_name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name is required'),
  
  body('customer_details.email')
    .isEmail()
    .withMessage('Valid email is required'),
  
  body('customer_details.phone')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Valid phone number is required')
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

    const { tier_id, billing_cycle, customer_details } = req.body;

    // Get tier configuration
    const tier = SUBSCRIPTION_TIERS.find(t => t.id === tier_id);
    if (!tier) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier ID'
      });
    }

    // Check if user exists by email
    let user = await User.findByEmail(customer_details.email);
    let isNewUser = false;
    let authToken = null;

    if (!user) {
      // Create new user
      const bcrypt = require('bcryptjs');
      const jwt = require('jsonwebtoken');
      
      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      
      user = await User.create({
        first_name: customer_details.first_name,
        last_name: customer_details.last_name,
        email: customer_details.email,
        phone: customer_details.phone,
        company_name: customer_details.company || '',
        billing_address: customer_details.address || '',
        billing_city: customer_details.city || '',
        billing_postal_code: customer_details.postal_code || '',
        password: tempPassword,
        email_verified: false,
        profile_completed: true,
        registration_ip: req.ip
      });
      
      isNewUser = true;
      
      // Generate auth token
      authToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      
      // Send welcome email with temporary password
      try {
        const emailService = require('../utils/emailService');
        await emailService.sendWelcomeEmail(user.email, {
          name: user.displayName,
          tempPassword: tempPassword,
          loginUrl: `${process.env.FRONTEND_URL}/login`
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
      
    } else {
      // User exists, generate auth token for auto-login
      const jwt = require('jsonwebtoken');
      authToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      
      // Update user information if provided
      await user.update({
        phone: customer_details.phone || user.phone,
        company_name: customer_details.company || user.company_name,
        billing_address: customer_details.address || user.billing_address,
        billing_city: customer_details.city || user.billing_city,
        billing_postal_code: customer_details.postal_code || user.billing_postal_code,
        last_login_at: new Date(),
        last_login_ip: req.ip,
        last_active_at: new Date()
      });
    }

    // Handle free tier
    if (tier.price === 0) {
      // Activate free tier immediately
      await user.update({
        subscription_status: 'active',
        monthly_limit: tier.files === 'Unlimited' ? 999999 : tier.files
      });
      
      return res.json({
        success: true,
        message: 'Free tier activated successfully',
        data: {
          is_free: true,
          tier: tier,
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            subscription_status: user.subscription_status
          },
          auth_token: authToken,
          is_new_user: isNewUser
        }
      });
    }

    // Calculate price for paid tiers
    let finalPrice = tier.price;
    let discount = 0;
    
    if (billing_cycle === 'yearly') {
      const yearlyPrice = tier.price * 12;
      finalPrice = Math.round(yearlyPrice * 0.85); // 15% discount
      discount = yearlyPrice - finalPrice;
    }

    // Add tax (11% PPN)
    const tax = Math.round(finalPrice * 0.11);
    const totalPrice = finalPrice + tax;

    // Generate unique order ID
    const orderId = `SUB-${Date.now()}-${user.id}-${tier_id}`;

    // Create subscription record
    const subscription = await Subscription.create({
      user_id: user.id,
      name: tier.name,
      description: `${tier.name} - ${typeof tier.files === 'number' ? tier.files.toLocaleString() : tier.files} files per month`,
      price: finalPrice,
      original_price: billing_cycle === 'yearly' ? tier.price * 12 : tier.price,
      currency: 'IDR',
      billing_cycle: billing_cycle,
      file_limit: tier.files === 'Unlimited' ? 999999 : tier.files,
      features: getFeaturesByTier(tier.type),
      payment_method: 'midtrans',
      status: 'pending',
      expires_at: new Date(Date.now() + (billing_cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
      auto_renew: true
    });

    // Prepare Midtrans transaction data
    const transactionData = {
      transaction_details: {
        order_id: orderId,
        gross_amount: totalPrice
      },
      customer_details: {
        first_name: customer_details.first_name,
        last_name: customer_details.last_name,
        email: customer_details.email,
        phone: customer_details.phone,
        billing_address: {
          first_name: customer_details.first_name,
          last_name: customer_details.last_name,
          address: customer_details.address || '',
          city: customer_details.city || '',
          postal_code: customer_details.postal_code || '',
          country_code: "IDN"
        }
      },
      item_details: [{
        id: `tier-${tier_id}`,
        price: finalPrice,
        quantity: 1,
        name: `${tier.name} - ${typeof tier.files === 'number' ? tier.files.toLocaleString() : tier.files} files (${billing_cycle})`
      }],
      credit_card: {
        secure: true
      },
      custom_expiry: {
        expiry_duration: 24,
        unit: "hour"
      },
      callbacks: {
        finish: `${process.env.FRONTEND_URL}/payment/success?order_id=${orderId}`
      }
    };

    // Add tax as separate item if applicable
    if (tax > 0) {
      transactionData.item_details.push({
        id: 'tax-ppn',
        price: tax,
        quantity: 1,
        name: 'PPN (11%)'
      });
    }

    // Create Midtrans transaction
    const snapTransaction = await snap.createTransaction(transactionData);

    // Update subscription with payment data
    await subscription.update({
      payment_id: orderId,
      payment_data: {
        snap_token: snapTransaction.token,
        redirect_url: snapTransaction.redirect_url,
        transaction_data: transactionData
      }
    });

    res.json({
      success: true,
      message: 'Transaction created successfully',
      data: {
        subscription_id: subscription.id,
        order_id: orderId,
        snap_token: snapTransaction.token,
        redirect_url: snapTransaction.redirect_url,
        amount: totalPrice,
        tier: tier,
        billing_cycle: billing_cycle,
        discount: discount,
        tax: tax,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          subscription_status: user.subscription_status
        },
        auth_token: authToken,
        is_new_user: isNewUser
      }
    });

  } catch (error) {
    console.error('Guest transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.use(authenticate);

// @route   GET /api/subscription/plans
// @desc    Get all available subscription plans
// @access  Private
router.get('/plans', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        plans: SUBSCRIPTION_TIERS.map(tier => ({
          id: tier.id,
          name: tier.name,
          type: tier.type,
          files: tier.files,
          price: tier.price,
          currency: 'IDR',
          features: getFeaturesByTier(tier.type),
          isPopular: tier.id === 3 // Pro 100 files
        }))
      }
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/subscription/current
// @desc    Get user's current subscription
// @access  Private
router.get('/current', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: Subscription,
        as: 'currentSubscription',
        required: false
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let subscriptionData = {
      status: user.subscription_status,
      files_processed_this_month: user.files_processed_this_month,
      monthly_limit: user.monthly_limit,
      remaining_files: user.remainingFiles
    };

    if (user.currentSubscription) {
      subscriptionData.subscription = {
        id: user.currentSubscription.id,
        name: user.currentSubscription.name,
        package_type: user.currentSubscription.name,
        price: user.currentSubscription.price,
        currency: user.currentSubscription.currency,
        billing_cycle: user.currentSubscription.billing_cycle,
        file_limit: user.currentSubscription.file_limit,
        status: user.currentSubscription.status,
        start_date: user.currentSubscription.activated_at,
        end_date: user.currentSubscription.expires_at,
        auto_renew: user.currentSubscription.auto_renew
      };
    }

    res.json({
      success: true,
      data: subscriptionData
    });

  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/subscription/create-transaction
// @desc    Create Midtrans transaction for subscription
// @access  Private
router.post('/create-transaction', [
  body('tier_id')
    .isInt({ min: 0, max: 12 })
    .withMessage('Valid tier ID is required (0-12)'),
  
  body('billing_cycle')
    .isIn(['monthly', 'yearly'])
    .withMessage('Billing cycle must be monthly or yearly'),
  
  body('customer_details')
    .isObject()
    .withMessage('Customer details are required'),
  
  body('customer_details.first_name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name is required'),
  
  body('customer_details.last_name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name is required'),
  
  body('customer_details.email')
    .isEmail()
    .withMessage('Valid email is required'),
  
  body('customer_details.phone')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Valid phone number is required')
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

    const { tier_id, billing_cycle, customer_details } = req.body;

    // Get tier configuration
    const tier = SUBSCRIPTION_TIERS.find(t => t.id === tier_id);
    if (!tier) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier ID'
      });
    }

    // Handle free tier
    if (tier.price === 0) {
      return res.json({
        success: true,
        message: 'Free tier activated successfully',
        data: {
          is_free: true,
          tier: tier
        }
      });
    }

    // Calculate price
    let finalPrice = tier.price;
    let discount = 0;
    
    if (billing_cycle === 'yearly') {
      const yearlyPrice = tier.price * 12;
      finalPrice = Math.round(yearlyPrice * 0.85); // 15% discount
      discount = yearlyPrice - finalPrice;
    }

    // Add tax (11% PPN)
    const tax = Math.round(finalPrice * 0.11);
    const totalPrice = finalPrice + tax;

    // Generate unique order ID
    const orderId = `SUB-${Date.now()}-${req.user.id}-${tier_id}`;

    // Create subscription record
    const subscription = await Subscription.create({
      user_id: req.user.id,
      name: tier.name,
      description: `${tier.name} - ${typeof tier.files === 'number' ? tier.files.toLocaleString() : tier.files} files per month`,
      price: finalPrice,
      original_price: billing_cycle === 'yearly' ? tier.price * 12 : tier.price,
      currency: 'IDR',
      billing_cycle: billing_cycle,
      file_limit: tier.files === 'Unlimited' ? 999999 : tier.files,
      features: getFeaturesByTier(tier.type),
      payment_method: 'midtrans',
      status: 'pending',
      expires_at: new Date(Date.now() + (billing_cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
      auto_renew: true
    });

    // Prepare Midtrans transaction data
    const transactionData = {
      transaction_details: {
        order_id: orderId,
        gross_amount: totalPrice
      },
      customer_details: {
        first_name: customer_details.first_name,
        last_name: customer_details.last_name,
        email: customer_details.email,
        phone: customer_details.phone,
        billing_address: {
          first_name: customer_details.first_name,
          last_name: customer_details.last_name,
          address: customer_details.address || '',
          city: customer_details.city || '',
          postal_code: customer_details.postal_code || '',
          country_code: "IDN"
        }
      },
      item_details: [{
        id: `tier-${tier_id}`,
        price: finalPrice,
        quantity: 1,
        name: `${tier.name} - ${typeof tier.files === 'number' ? tier.files.toLocaleString() : tier.files} files (${billing_cycle})`
      }],
      credit_card: {
        secure: true
      },
      custom_expiry: {
        expiry_duration: 24,
        unit: "hour"
      },
      callbacks: {
        finish: `${process.env.FRONTEND_URL}/payment/success?order_id=${orderId}`
      }
    };

    // Add tax as separate item if applicable
    if (tax > 0) {
      transactionData.item_details.push({
        id: 'tax-ppn',
        price: tax,
        quantity: 1,
        name: 'PPN (11%)'
      });
    }

    // Create Midtrans transaction
    const snapTransaction = await snap.createTransaction(transactionData);

    // Update subscription with payment data
    await subscription.update({
      payment_id: orderId,
      payment_data: {
        snap_token: snapTransaction.token,
        redirect_url: snapTransaction.redirect_url,
        transaction_data: transactionData
      }
    });

    res.json({
      success: true,
      message: 'Transaction created successfully',
      data: {
        subscription_id: subscription.id,
        order_id: orderId,
        snap_token: snapTransaction.token,
        redirect_url: snapTransaction.redirect_url,
        amount: totalPrice,
        tier: tier,
        billing_cycle: billing_cycle,
        discount: discount,
        tax: tax
      }
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/subscription/webhook
// @desc    Handle Midtrans webhook notifications
// @access  Public (but verified)
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const notification = req.body;
    
    console.log('Webhook received:', notification);
    
    // Verify notification authenticity
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const orderId = notification.order_id;
    const statusCode = notification.status_code;
    const grossAmount = notification.gross_amount;
    const signatureKey = notification.signature_key;
    
    const expectedSignature = require('crypto')
      .createHash('sha512')
      .update(orderId + statusCode + grossAmount + serverKey)
      .digest('hex');
    
    if (signatureKey !== expectedSignature) {
      console.log('Invalid signature:', { expected: expectedSignature, received: signatureKey });
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Find subscription by order ID
    const subscription = await Subscription.findOne({
      where: { payment_id: orderId }
    });

    if (!subscription) {
      console.log('Subscription not found for order:', orderId);
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Update subscription based on transaction status
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    console.log('Processing webhook:', { orderId, transactionStatus, fraudStatus });

    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      if (fraudStatus === 'accept' || !fraudStatus) {
        // Payment successful
        await subscription.update({
          status: 'active',
          activated_at: new Date(),
          payment_data: {
            ...subscription.payment_data,
            notification: notification
          }
        });

        // Update user subscription
        const user = await User.findByPk(subscription.user_id);
        await user.update({
          current_subscription_id: subscription.id,
          subscription_status: 'active',
          monthly_limit: subscription.file_limit
        });

        console.log(`Subscription ${subscription.id} activated for user ${user.id}`);
      }
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
      // Payment failed
      await subscription.update({
        status: 'failed',
        payment_data: {
          ...subscription.payment_data,
          notification: notification
        }
      });

      console.log(`Subscription ${subscription.id} payment failed: ${transactionStatus}`);
    } else if (transactionStatus === 'pending') {
      // Payment pending
      await subscription.update({
        status: 'pending',
        payment_data: {
          ...subscription.payment_data,
          notification: notification
        }
      });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

// @route   GET /api/subscription/status/:order_id
// @desc    Check transaction status
// @access  Private
router.get('/status/:order_id', async (req, res) => {
  try {
    const { order_id } = req.params;

    // Find subscription
    const subscription = await Subscription.findOne({
      where: { 
        payment_id: order_id,
        user_id: req.user.id
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check status with Midtrans
    try {
      const statusResponse = await snap.transaction.status(order_id);
      
      res.json({
        success: true,
        data: {
          subscription_id: subscription.id,
          order_id: order_id,
          transaction_status: statusResponse.transaction_status,
          payment_type: statusResponse.payment_type,
          transaction_time: statusResponse.transaction_time,
          subscription_status: subscription.status,
          amount: statusResponse.gross_amount
        }
      });
    } catch (midtransError) {
      // If Midtrans API fails, return local status
      res.json({
        success: true,
        data: {
          subscription_id: subscription.id,
          order_id: order_id,
          subscription_status: subscription.status,
          local_status_only: true
        }
      });
    }

  } catch (error) {
    console.error('Check status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check transaction status'
    });
  }
});

// @route   POST /api/subscription/confirm-payment
// @desc    Confirm payment success from frontend callback
// @access  Private
router.post('/confirm-payment', [
  body('order_id')
    .notEmpty()
    .withMessage('Order ID is required'),
  
  body('transaction_status')
    .isIn(['success', 'pending', 'failed'])
    .withMessage('Transaction status must be success, pending, or failed'),
  
  body('payment_data')
    .optional()
    .isObject()
    .withMessage('Payment data must be an object')
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

    const { order_id, transaction_status, payment_data } = req.body;

    // Find subscription by order ID and user ID
    const subscription = await Subscription.findOne({
      where: { 
        payment_id: order_id,
        user_id: req.user.id
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    console.log(`Payment confirmation received: ${order_id} - ${transaction_status}`);

    // Update subscription based on transaction status
    if (transaction_status === 'success') {
      // Payment successful - activate subscription
      await subscription.update({
        status: 'active',
        activated_at: new Date(),
        payment_data: {
          ...subscription.payment_data,
          frontend_callback: payment_data,
          confirmed_at: new Date()
        }
      });

      // Update user subscription
      const user = await User.findByPk(subscription.user_id);
      await user.update({
        current_subscription_id: subscription.id,
        subscription_status: 'active',
        monthly_limit: subscription.file_limit
      });

      console.log(`✅ Subscription ${subscription.id} activated for user ${user.id} (${user.email})`);
      console.log(`📊 User monthly limit updated to: ${user.monthly_limit} files`);

      res.json({
        success: true,
        message: 'Payment confirmed and subscription activated successfully',
        data: {
          subscription_id: subscription.id,
          status: subscription.status,
          activated_at: subscription.activated_at,
          monthly_limit: user.monthly_limit
        }
      });

    } else if (transaction_status === 'pending') {
      // Payment pending
      await subscription.update({
        status: 'pending',
        payment_data: {
          ...subscription.payment_data,
          frontend_callback: payment_data,
          confirmed_at: new Date()
        }
      });

      console.log(`⏳ Subscription ${subscription.id} marked as pending`);

      res.json({
        success: true,
        message: 'Payment is pending confirmation',
        data: {
          subscription_id: subscription.id,
          status: subscription.status
        }
      });

    } else if (transaction_status === 'failed') {
      // Payment failed
      await subscription.update({
        status: 'failed',
        payment_data: {
          ...subscription.payment_data,
          frontend_callback: payment_data,
          confirmed_at: new Date()
        }
      });

      console.log(`❌ Subscription ${subscription.id} payment failed`);

      res.json({
        success: true,
        message: 'Payment failed',
        data: {
          subscription_id: subscription.id,
          status: subscription.status
        }
      });
    }

  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/subscription/history
// @desc    Get subscription history for user
// @access  Private
router.get('/history', async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      attributes: [
        'id', 'name', 'price', 'original_price', 'currency', 'billing_cycle',
        'status', 'payment_id', 'created_at', 'activated_at', 'expires_at',
        'cancelled_at', 'cancellation_reason', 'is_upgrade', 'prorated_credit'
      ]
    });

    res.json({
      success: true,
      data: {
        subscriptions: subscriptions.map(sub => sub.toJSON())
      }
    });

  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function to get features by tier type
function getFeaturesByTier(tierType) {
  const baseFeatures = [
    'AI File Organization',
    'Batch Processing',
    'Cloud Sync',
    'Email Support'
  ];

  switch (tierType) {
    case 'gratis':
      return baseFeatures;
    case 'pro':
      return [
        ...baseFeatures,
        'Priority Processing',
        'Advanced Filters',
        'Custom Rules',
        'Chat Support'
      ];
    case 'bisnis':
      return [
        ...baseFeatures,
        'Priority Processing',
        'Advanced Filters',
        'Custom Rules',
        'Chat Support',
        'API Access',
        'Team Management',
        'Custom Integrations',
        'Dedicated Support'
      ];
    default:
      return baseFeatures;
  }
}

module.exports = router;