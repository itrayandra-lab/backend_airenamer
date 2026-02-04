// Manual activation script untuk subscription yang sudah bayar
// Jalankan dengan: node manual-activate.js

const { User, Subscription, sequelize } = require('./models');

async function activateSubscription(orderId) {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Find subscription by order ID
    const subscription = await Subscription.findOne({
      where: { payment_id: orderId }
    });

    if (!subscription) {
      console.log(`❌ Subscription not found for order: ${orderId}`);
      return;
    }

    console.log(`📋 Found subscription:`, {
      id: subscription.id,
      user_id: subscription.user_id,
      name: subscription.name,
      status: subscription.status,
      file_limit: subscription.file_limit
    });

    // Activate subscription
    await subscription.update({
      status: 'active',
      activated_at: new Date()
    });

    // Update user subscription
    const user = await User.findByPk(subscription.user_id);
    if (user) {
      await user.update({
        current_subscription_id: subscription.id,
        subscription_status: 'active',
        monthly_limit: subscription.file_limit
      });

      console.log(`✅ Subscription activated successfully!`);
      console.log(`👤 User ${user.email} monthly limit updated to: ${user.monthly_limit}`);
    } else {
      console.log(`❌ User not found for subscription`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Ganti dengan Order ID yang ingin diaktifkan
const ORDER_ID = 'SUB-1770183975927-1-10';

console.log(`🚀 Activating subscription for order: ${ORDER_ID}`);
activateSubscription(ORDER_ID);