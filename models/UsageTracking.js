const { DataTypes, Model } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');

class UsageTracking extends Model {
  // Instance methods
  isSuccessful() {
    return this.success === true;
  }

  getProcessingTimeFormatted() {
    if (!this.processing_time) return 'N/A';
    if (this.processing_time < 60) {
      return `${this.processing_time}s`;
    }
    const minutes = Math.floor(this.processing_time / 60);
    const seconds = this.processing_time % 60;
    return `${minutes}m ${seconds}s`;
  }

  getMetadataValue(key, defaultValue = null) {
    if (!this.metadata || typeof this.metadata !== 'object') {
      return defaultValue;
    }
    return this.metadata[key] || defaultValue;
  }
}

UsageTracking.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  uuid: {
    type: DataTypes.STRING(36),
    allowNull: false,
    unique: true,
    defaultValue: () => uuidv4()
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  action_type: {
    type: DataTypes.ENUM('file_process', 'api_call', 'download', 'upload'),
    defaultValue: 'file_process'
  },
  file_count: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  file_size: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  processing_time: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Processing time in seconds'
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  endpoint: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  method: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  success: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'UsageTracking',
  tableName: 'usage_tracking',
  timestamps: false,
  indexes: [
    {
      name: 'idx_user_id',
      fields: ['user_id']
    },
    {
      name: 'idx_action_type',
      fields: ['action_type']
    },
    {
      name: 'idx_created_at',
      fields: ['created_at']
    },
    {
      name: 'idx_ip_address',
      fields: ['ip_address']
    },
    {
      name: 'usage_tracking_user_id_created_at',
      fields: ['user_id', 'created_at']
    },
    {
      name: 'usage_tracking_success',
      fields: ['success']
    }
  ]
});

module.exports = UsageTracking;