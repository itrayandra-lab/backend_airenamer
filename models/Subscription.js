const { DataTypes, Model } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');

class Subscription extends Model {
  // Instance methods
  isExpired() {
    return this.expires_at && this.expires_at < new Date();
  }

  daysUntilExpiry() {
    if (!this.expires_at) return null;
    const now = new Date();
    const expiry = new Date(this.expires_at);
    const diffTime = expiry - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  calculateProratedAmount(newPrice) {
    if (!this.expires_at) return newPrice;
    
    const now = new Date();
    const expiry = new Date(this.expires_at);
    const totalDays = this.billing_cycle === 'yearly' ? 365 : 30;
    const remainingDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    const currentValue = (this.price / totalDays) * remainingDays;
    return Math.max(0, newPrice - currentValue);
  }

  // Static methods
  static async getActivePlans() {
    return await this.findAll({
      where: {
        is_active: true,
        user_id: 0 // Template plans
      },
      order: [['price', 'ASC']]
    });
  }

  static async getUserSubscriptions(userId) {
    return await this.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
  }

  static async getActiveSubscription(userId) {
    return await this.findOne({
      where: {
        user_id: userId,
        status: 'active'
      }
    });
  }
}

// Define the model
Subscription.init({
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
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0 // 0 for template plans, actual user ID for user subscriptions
  },
  
  // Subscription Details
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Subscription name is required' }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Price must be non-negative' }
    }
  },
  original_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'IDR',
    validate: {
      isIn: { args: [['IDR', 'USD', 'EUR']], msg: 'Currency must be IDR, USD, or EUR' }
    }
  },
  billing_cycle: {
    type: DataTypes.ENUM('monthly', 'yearly'),
    defaultValue: 'monthly'
  },
  file_limit: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    validate: {
      min: { args: [0], msg: 'File limit must be non-negative' }
    }
  },
  
  // Features (JSON format)
  features: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  
  // Payment Information
  payment_method: {
    type: DataTypes.ENUM('midtrans', 'stripe', 'paypal'),
    defaultValue: 'midtrans'
  },
  payment_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  payment_data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  
  // Status and Dates
  status: {
    type: DataTypes.ENUM('pending', 'active', 'expired', 'cancelled', 'failed'),
    defaultValue: 'pending'
  },
  activated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  will_cancel_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  auto_renew: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // Upgrade Information
  is_upgrade: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  previous_subscription_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  prorated_credit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  
  // Plan Configuration
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_popular: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Discount percentage must be non-negative' },
      max: { args: [100], msg: 'Discount percentage cannot exceed 100' }
    }
  }
}, {
  sequelize,
  modelName: 'Subscription',
  tableName: 'subscriptions',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (subscription) => {
      // Generate UUID if not provided
      if (!subscription.uuid) {
        subscription.uuid = uuidv4();
      }
      
      // Set original price if not provided
      if (!subscription.original_price) {
        subscription.original_price = subscription.price;
      }
    }
  },
  scopes: {
    active: {
      where: { is_active: true }
    },
    templates: {
      where: { user_id: 0 }
    },
    userSubscriptions: (userId) => ({
      where: { user_id: userId }
    })
  }
});

module.exports = Subscription;