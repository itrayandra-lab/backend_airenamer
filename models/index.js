const { sequelize } = require('../config/database');
const User = require('./User');
const Subscription = require('./Subscription');
const UsageTracking = require('./UsageTracking');

// Define associations
User.hasMany(Subscription, {
  foreignKey: 'user_id',
  as: 'subscriptions'
});

User.hasOne(Subscription, {
  foreignKey: 'user_id',
  as: 'currentSubscription',
  scope: {
    status: 'active'
  }
});

User.hasMany(UsageTracking, {
  foreignKey: 'user_id',
  as: 'usageHistory'
});

Subscription.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

UsageTracking.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  Subscription,
  UsageTracking
};