-- Database: raymaizing_auth
-- Created for RAYMAIZING Authentication System

CREATE DATABASE IF NOT EXISTS `raymaizing_auth` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `raymaizing_auth`;

-- --------------------------------------------------------
-- Table structure for table `users`
-- --------------------------------------------------------

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL UNIQUE,
  
  -- Basic Information
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL UNIQUE,
  `phone` varchar(20) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin','moderator') DEFAULT 'user',
  
  -- Billing Address
  `billing_address` text DEFAULT NULL,
  `billing_city` varchar(100) DEFAULT NULL,
  `billing_postal_code` varchar(20) DEFAULT NULL,
  `billing_full_name` varchar(200) DEFAULT NULL,
  `billing_email` varchar(255) DEFAULT NULL,
  `billing_phone` varchar(20) DEFAULT NULL,
  
  -- Security Fields
  `email_verified` tinyint(1) DEFAULT 0,
  `email_verification_token` varchar(255) DEFAULT NULL,
  `email_verification_expires` datetime DEFAULT NULL,
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires` datetime DEFAULT NULL,
  `password_changed_at` datetime DEFAULT NULL,
  
  -- Account Security
  `login_attempts` int(11) DEFAULT 0,
  `lock_until` datetime DEFAULT NULL,
  `two_factor_enabled` tinyint(1) DEFAULT 0,
  `two_factor_secret` varchar(255) DEFAULT NULL,
  
  -- Profile Information
  `profile_completed` tinyint(1) DEFAULT 0,
  `avatar` varchar(500) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  
  -- Referral System
  `referral_code` varchar(10) NOT NULL UNIQUE,
  `referred_by` varchar(10) DEFAULT NULL,
  `referral_count` int(11) DEFAULT 0,
  
  -- Tracking Information
  `registration_ip` varchar(45) DEFAULT NULL,
  `last_login_ip` varchar(45) DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `last_active_at` datetime DEFAULT CURRENT_TIMESTAMP,
  
  -- Terms and Privacy
  `terms_accepted_at` datetime DEFAULT NULL,
  `privacy_accepted_at` datetime DEFAULT NULL,
  `marketing_opt_in` tinyint(1) DEFAULT 0,
  
  -- Account Status
  `is_active` tinyint(1) DEFAULT 1,
  `is_suspended` tinyint(1) DEFAULT 0,
  `suspended_at` datetime DEFAULT NULL,
  `suspended_reason` text DEFAULT NULL,
  
  -- Subscription Information
  `current_subscription_id` int(11) DEFAULT NULL,
  `subscription_status` enum('active','inactive','expired','cancelled') DEFAULT 'inactive',
  
  -- Usage Tracking
  `files_processed_this_month` int(11) DEFAULT 0,
  `monthly_limit` int(11) DEFAULT 50,
  `last_usage_reset` datetime DEFAULT CURRENT_TIMESTAMP,
  
  -- Preferences (JSON format)
  `preferences` json DEFAULT NULL,
  
  -- Timestamps
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_referral_code` (`referral_code`),
  KEY `idx_referred_by` (`referred_by`),
  KEY `idx_registration_ip` (`registration_ip`),
  KEY `idx_last_login_ip` (`last_login_ip`),
  KEY `idx_lock_until` (`lock_until`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_last_active_at` (`last_active_at`),
  KEY `idx_subscription_status` (`subscription_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `subscriptions`
-- --------------------------------------------------------

CREATE TABLE `subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL UNIQUE,
  `user_id` int(11) NOT NULL,
  
  -- Subscription Details
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `original_price` decimal(10,2) DEFAULT NULL,
  `currency` varchar(3) DEFAULT 'IDR',
  `billing_cycle` enum('monthly','yearly') DEFAULT 'monthly',
  `file_limit` int(11) DEFAULT 50,
  
  -- Features (JSON format)
  `features` json DEFAULT NULL,
  
  -- Payment Information
  `payment_method` enum('midtrans','stripe','paypal') DEFAULT 'midtrans',
  `payment_id` varchar(255) DEFAULT NULL,
  `payment_data` json DEFAULT NULL,
  
  -- Status and Dates
  `status` enum('pending','active','expired','cancelled','failed') DEFAULT 'pending',
  `activated_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `will_cancel_at` datetime DEFAULT NULL,
  `auto_renew` tinyint(1) DEFAULT 1,
  
  -- Upgrade Information
  `is_upgrade` tinyint(1) DEFAULT 0,
  `previous_subscription_id` int(11) DEFAULT NULL,
  `prorated_credit` decimal(10,2) DEFAULT NULL,
  
  -- Plan Configuration
  `is_active` tinyint(1) DEFAULT 1,
  `is_popular` tinyint(1) DEFAULT 0,
  `discount_percentage` decimal(5,2) DEFAULT 0,
  
  -- Timestamps
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_billing_cycle` (`billing_cycle`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `usage_tracking`
-- --------------------------------------------------------

CREATE TABLE `usage_tracking` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL UNIQUE,
  `user_id` int(11) NOT NULL,
  
  -- Usage Details
  `action_type` enum('file_process','api_call','download','upload') DEFAULT 'file_process',
  `file_count` int(11) DEFAULT 1,
  `file_size` bigint(20) DEFAULT NULL,
  `processing_time` int(11) DEFAULT NULL,
  
  -- Request Information
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `endpoint` varchar(255) DEFAULT NULL,
  `method` varchar(10) DEFAULT NULL,
  
  -- Additional Data
  `metadata` json DEFAULT NULL,
  `success` tinyint(1) DEFAULT 1,
  `error_message` text DEFAULT NULL,
  
  -- Timestamps
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_ip_address` (`ip_address`),
  CONSTRAINT `fk_usage_tracking_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `two_factor_backup_codes`
-- --------------------------------------------------------

CREATE TABLE `two_factor_backup_codes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `code` varchar(255) NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_code` (`code`),
  CONSTRAINT `fk_backup_codes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Insert default subscription plans
-- --------------------------------------------------------

INSERT INTO `subscriptions` (`uuid`, `user_id`, `name`, `description`, `price`, `currency`, `billing_cycle`, `file_limit`, `features`, `status`, `is_active`, `is_popular`, `discount_percentage`, `created_at`) VALUES
(UUID(), 0, 'Free Plan', 'Basic plan with limited features', 0.00, 'IDR', 'monthly', 50, 
 JSON_OBJECT('features', JSON_ARRAY('50 files per month', 'Basic support', 'Standard processing')), 
 'active', 1, 0, 0, NOW()),

(UUID(), 0, 'Pro Plan', 'Professional plan for regular users', 99000.00, 'IDR', 'monthly', 500, 
 JSON_OBJECT('features', JSON_ARRAY('500 files per month', 'Priority support', 'Fast processing', 'Advanced features')), 
 'active', 1, 1, 0, NOW()),

(UUID(), 0, 'Business Plan', 'Business plan for teams and companies', 299000.00, 'IDR', 'monthly', 2000, 
 JSON_OBJECT('features', JSON_ARRAY('2000 files per month', '24/7 support', 'Ultra-fast processing', 'All features', 'API access')), 
 'active', 1, 0, 0, NOW()),

(UUID(), 0, 'Pro Plan Yearly', 'Professional plan with yearly discount', 990000.00, 'IDR', 'yearly', 500, 
 JSON_OBJECT('features', JSON_ARRAY('500 files per month', 'Priority support', 'Fast processing', 'Advanced features', '2 months free')), 
 'active', 1, 0, 20, NOW()),

(UUID(), 0, 'Business Plan Yearly', 'Business plan with yearly discount', 2990000.00, 'IDR', 'yearly', 2000, 
 JSON_OBJECT('features', JSON_ARRAY('2000 files per month', '24/7 support', 'Ultra-fast processing', 'All features', 'API access', '2 months free')), 
 'active', 1, 0, 20, NOW());

-- --------------------------------------------------------
-- Create indexes for better performance
-- --------------------------------------------------------

-- Additional indexes for users table
CREATE INDEX `idx_users_email_verified` ON `users` (`email_verified`);
CREATE INDEX `idx_users_subscription_status` ON `users` (`subscription_status`);
CREATE INDEX `idx_users_is_active` ON `users` (`is_active`);
CREATE INDEX `idx_users_two_factor` ON `users` (`two_factor_enabled`);

-- Additional indexes for subscriptions table
CREATE INDEX `idx_subscriptions_payment_method` ON `subscriptions` (`payment_method`);
CREATE INDEX `idx_subscriptions_auto_renew` ON `subscriptions` (`auto_renew`);

-- Additional indexes for usage_tracking table
CREATE INDEX `idx_usage_success` ON `usage_tracking` (`success`);
CREATE INDEX `idx_usage_date_user` ON `usage_tracking` (`user_id`, `created_at`);

-- --------------------------------------------------------
-- Create triggers for automatic UUID generation
-- --------------------------------------------------------

DELIMITER $$

CREATE TRIGGER `users_uuid_trigger` BEFORE INSERT ON `users`
FOR EACH ROW BEGIN
    IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
        SET NEW.uuid = UUID();
    END IF;
    IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
        SET NEW.referral_code = UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 8));
    END IF;
END$$

CREATE TRIGGER `subscriptions_uuid_trigger` BEFORE INSERT ON `subscriptions`
FOR EACH ROW BEGIN
    IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
        SET NEW.uuid = UUID();
    END IF;
END$$

CREATE TRIGGER `usage_tracking_uuid_trigger` BEFORE INSERT ON `usage_tracking`
FOR EACH ROW BEGIN
    IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
        SET NEW.uuid = UUID();
    END IF;
END$$

DELIMITER ;

-- --------------------------------------------------------
-- Create stored procedures for common operations
-- --------------------------------------------------------

DELIMITER $$

-- Procedure to reset monthly usage for all users
CREATE PROCEDURE `ResetMonthlyUsage`()
BEGIN
    UPDATE `users` 
    SET `files_processed_this_month` = 0, 
        `last_usage_reset` = NOW() 
    WHERE MONTH(`last_usage_reset`) != MONTH(NOW()) 
       OR YEAR(`last_usage_reset`) != YEAR(NOW());
END$$

-- Procedure to get user with subscription details
CREATE PROCEDURE `GetUserWithSubscription`(IN user_id INT)
BEGIN
    SELECT 
        u.*,
        s.name as subscription_name,
        s.price as subscription_price,
        s.file_limit as subscription_file_limit,
        s.expires_at as subscription_expires_at,
        s.status as subscription_status_detail
    FROM `users` u
    LEFT JOIN `subscriptions` s ON u.current_subscription_id = s.id
    WHERE u.id = user_id;
END$$

-- Procedure to increment file usage
CREATE PROCEDURE `IncrementFileUsage`(IN user_id INT, IN file_count INT)
BEGIN
    DECLARE current_usage INT DEFAULT 0;
    DECLARE monthly_limit INT DEFAULT 0;
    
    SELECT `files_processed_this_month`, `monthly_limit` 
    INTO current_usage, monthly_limit
    FROM `users` 
    WHERE `id` = user_id;
    
    IF (current_usage + file_count) <= monthly_limit THEN
        UPDATE `users` 
        SET `files_processed_this_month` = `files_processed_this_month` + file_count,
            `last_active_at` = NOW()
        WHERE `id` = user_id;
        
        SELECT 'success' as status, (current_usage + file_count) as new_usage;
    ELSE
        SELECT 'limit_exceeded' as status, current_usage as new_usage;
    END IF;
END$$

DELIMITER ;

-- --------------------------------------------------------
-- Sample data for testing (optional)
-- --------------------------------------------------------

-- Insert a test admin user (password: Admin123!)
-- INSERT INTO `users` (`uuid`, `first_name`, `last_name`, `email`, `password`, `role`, `email_verified`, `terms_accepted_at`, `privacy_accepted_at`, `created_at`) VALUES
-- (UUID(), 'Admin', 'User', 'admin@raymaizing.com', '$2a$12$LQv3c1yqBwEHxv5hSe8/VOJ2LJlpXXeL8W8PiLlxZOFrbKGaOgvie', 'admin', 1, NOW(), NOW(), NOW());

-- --------------------------------------------------------
-- Views for easier data access
-- --------------------------------------------------------

-- View for active users with subscription info
CREATE VIEW `active_users_view` AS
SELECT 
    u.id,
    u.uuid,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    u.email,
    u.phone,
    u.company_name,
    u.subscription_status,
    u.files_processed_this_month,
    u.monthly_limit,
    (u.monthly_limit - u.files_processed_this_month) as remaining_files,
    u.referral_code,
    u.referral_count,
    u.last_login_at,
    u.created_at,
    s.name as subscription_name,
    s.expires_at as subscription_expires_at
FROM `users` u
LEFT JOIN `subscriptions` s ON u.current_subscription_id = s.id
WHERE u.is_active = 1 AND u.is_suspended = 0;

-- View for subscription statistics
CREATE VIEW `subscription_stats_view` AS
SELECT 
    s.name,
    s.billing_cycle,
    COUNT(*) as total_subscribers,
    SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_subscribers,
    SUM(s.price) as total_revenue,
    AVG(s.price) as average_price
FROM `subscriptions` s
WHERE s.user_id > 0
GROUP BY s.name, s.billing_cycle;

-- --------------------------------------------------------
-- Final setup complete
-- --------------------------------------------------------

SELECT 'Database setup completed successfully!' as message;