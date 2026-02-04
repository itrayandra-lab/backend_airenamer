const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const validator = require('validator');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');

class User extends Model {
  // Instance methods
  async comparePassword(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  }

  generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  createEmailVerificationToken() {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    this.email_verification_token = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
      
    this.email_verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    return verificationToken;
  }

  createPasswordResetToken() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.password_reset_token = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
      
    this.password_reset_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    return resetToken;
  }

  async incrementLoginAttempts() {
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    const lockTime = parseInt(process.env.LOCK_TIME) * 60 * 1000 || 30 * 60 * 1000; // 30 minutes

    // If we have a previous lock that has expired, restart at 1
    if (this.lock_until && this.lock_until < new Date()) {
      return await this.update({
        lock_until: null,
        login_attempts: 1
      });
    }
    
    const updates = { login_attempts: this.login_attempts + 1 };
    
    // Lock account after max attempts
    if (this.login_attempts + 1 >= maxAttempts && !this.isLocked) {
      updates.lock_until = new Date(Date.now() + lockTime);
    }
    
    return await this.update(updates);
  }

  async resetLoginAttempts() {
    return await this.update({
      login_attempts: 0,
      lock_until: null
    });
  }

  async updateLastLogin(ip) {
    return await this.update({
      last_login_at: new Date(),
      last_login_ip: ip,
      last_active_at: new Date()
    });
  }

  async resetMonthlyUsage() {
    const now = new Date();
    const lastReset = new Date(this.last_usage_reset);
    
    // Reset if it's a new month
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      return await this.update({
        files_processed_this_month: 0,
        last_usage_reset: now
      });
    }
    
    return Promise.resolve();
  }

  canProcessFiles(count = 1) {
    return this.files_processed_this_month + count <= this.monthly_limit;
  }

  async incrementFileUsage(count = 1) {
    if (!this.canProcessFiles(count)) {
      throw new Error('Monthly file limit exceeded');
    }
    
    return await this.update({
      files_processed_this_month: this.files_processed_this_month + count,
      last_active_at: new Date()
    });
  }

  // Virtual getters
  get isLocked() {
    return !!(this.lock_until && this.lock_until > new Date());
  }

  get remainingFiles() {
    return Math.max(0, this.monthly_limit - this.files_processed_this_month);
  }

  get displayName() {
    return `${this.first_name} ${this.last_name}`.trim() || this.email.split('@')[0];
  }

  get fullName() {
    return `${this.first_name} ${this.last_name}`.trim();
  }

  // Static methods
  static async findByEmail(email) {
    return await this.findOne({ where: { email: email.toLowerCase() } });
  }

  static async findByReferralCode(code) {
    return await this.findOne({ where: { referral_code: code.toUpperCase() } });
  }

  static async getFailedLogin(email) {
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    return await this.findOne({
      where: {
        email: email.toLowerCase(),
        [sequelize.Sequelize.Op.or]: [
          { lock_until: { [sequelize.Sequelize.Op.gt]: new Date() } },
          { login_attempts: { [sequelize.Sequelize.Op.gte]: maxAttempts } }
        ]
      }
    });
  }
}

// Define the model
User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    unique: true,
    allowNull: false
  },
  
  // Basic Information
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'First name is required' },
      len: { args: [2, 100], msg: 'First name must be between 2 and 100 characters' },
      is: { args: /^[a-zA-Z\s]+$/, msg: 'First name can only contain letters and spaces' }
    }
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Last name is required' },
      len: { args: [2, 100], msg: 'Last name must be between 2 and 100 characters' },
      is: { args: /^[a-zA-Z\s]+$/, msg: 'Last name can only contain letters and spaces' }
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: { msg: 'Please provide a valid email' },
      notEmpty: { msg: 'Email is required' }
    },
    set(value) {
      this.setDataValue('email', value.toLowerCase().trim());
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: { args: /^[0-9+\-\s()]*$/, msg: 'Phone number contains invalid characters' }
    }
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Password is required' },
      len: { args: [8, 255], msg: 'Password must be at least 8 characters' }
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'admin', 'moderator'),
    defaultValue: 'user'
  },

  // Billing Address
  billing_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  billing_city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  billing_postal_code: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  billing_full_name: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  billing_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: { msg: 'Please provide a valid billing email' }
    }
  },
  billing_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },

  // Security Fields
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  email_verification_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  email_verification_expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  password_reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  password_reset_expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  password_changed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Account Security
  login_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lock_until: {
    type: DataTypes.DATE,
    allowNull: true
  },
  two_factor_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  two_factor_secret: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  // Profile Information
  profile_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: { args: [0, 500], msg: 'Bio cannot exceed 500 characters' }
    }
  },
  
  // Referral System
  referral_code: {
    type: DataTypes.STRING(10),
    unique: true,
    allowNull: false,
    defaultValue: () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
  },
  referred_by: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  referral_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },

  // Tracking Information
  registration_ip: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  last_login_ip: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_active_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  // Terms and Privacy
  terms_accepted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  privacy_accepted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  marketing_opt_in: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  // Account Status
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_suspended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  suspended_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  suspended_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Subscription Information
  current_subscription_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  subscription_status: {
    type: DataTypes.ENUM('active', 'inactive', 'expired', 'cancelled'),
    defaultValue: 'inactive'
  },

  // Usage Tracking
  files_processed_this_month: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  monthly_limit: {
    type: DataTypes.INTEGER,
    defaultValue: 50
  },
  last_usage_reset: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },

  // Preferences (JSON)
  preferences: {
    type: DataTypes.JSON,
    defaultValue: {
      language: 'id',
      timezone: 'Asia/Jakarta',
      notifications: {
        email: true,
        marketing: false,
        security: true
      },
      theme: 'auto'
    }
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      // Generate UUID if not provided
      if (!user.uuid) {
        user.uuid = uuidv4();
      }
      
      // Generate referral code if not provided
      if (!user.referral_code) {
        user.referral_code = user.generateReferralCode();
      }
      
      // Hash password
      if (user.password) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      // Hash password if it's being updated
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        user.password = await bcrypt.hash(user.password, salt);
        user.password_changed_at = new Date();
      }
    }
  },
  defaultScope: {
    attributes: { exclude: ['password', 'two_factor_secret', 'email_verification_token', 'password_reset_token'] }
  },
  scopes: {
    withPassword: {
      attributes: { include: ['password'] }
    },
    withSecrets: {
      attributes: { include: ['password', 'two_factor_secret', 'email_verification_token', 'password_reset_token'] }
    }
  }
});

module.exports = User;