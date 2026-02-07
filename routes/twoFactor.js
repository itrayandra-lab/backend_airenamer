const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { User } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/2fa/setup
// @desc    Generate 2FA secret and QR code
// @access  Private
router.post('/setup', authenticate, async (req, res) => {
  try {
    const user = await User.scope('withSecrets').findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if 2FA is already enabled
    if (user.two_factor_enabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication is already enabled'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `RAYMAIZING (${user.email})`,
      issuer: 'RAYMAIZING'
    });

    // Save secret temporarily (not enabled yet)
    user.two_factor_secret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return res.json({
      success: true,
      message: '2FA setup initiated',
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntry: secret.base32
      }
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to setup two-factor authentication'
      });
    }
  }
});

// @route   POST /api/2fa/verify
// @desc    Verify 2FA token and enable 2FA
// @access  Private
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    const user = await User.scope('withSecrets').findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.two_factor_secret) {
      return res.status(400).json({
        success: false,
        message: 'Please setup 2FA first'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps before/after
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Enable 2FA
    user.two_factor_enabled = true;
    await user.save();

    return res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully'
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to verify two-factor authentication'
      });
    }
  }
});

// @route   POST /api/2fa/validate
// @desc    Validate 2FA token during login
// @access  Public (but requires valid JWT)
router.post('/validate', authenticate, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    const user = await User.scope('withSecrets').findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.two_factor_enabled || !user.two_factor_secret) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled for this account'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    return res.json({
      success: true,
      message: '2FA validation successful'
    });
  } catch (error) {
    console.error('2FA validate error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to validate two-factor authentication'
      });
    }
  }
});

// @route   POST /api/2fa/disable
// @desc    Disable 2FA
// @access  Private
router.post('/disable', authenticate, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to disable 2FA'
      });
    }

    const user = await User.scope('withSecrets').findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Disable 2FA
    user.two_factor_enabled = false;
    user.two_factor_secret = null;
    await user.save();

    return res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to disable two-factor authentication'
      });
    }
  }
});

module.exports = router;
