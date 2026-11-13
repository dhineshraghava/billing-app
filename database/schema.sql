-- =====================================================================
-- SUPERMARKET BILLING AND INVENTORY MANAGEMENT SYSTEM
-- Compatible with MySQL 8.x and MySQL Workbench
-- Database: supermarket_billing
-- Engine: InnoDB with Foreign Keys, Decimal Data Types & Indexes
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `supermarket_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `supermarket_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. Business Settings & Store Configuration
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `business_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `store_name` VARCHAR(150) NOT NULL DEFAULT 'SuperMart Hypermarket',
  `tagline` VARCHAR(255) DEFAULT 'Quality Groceries & Fresh Everyday',
  `gstin` VARCHAR(20) DEFAULT '33ABCDE1234F1Z5',
  `pan_number` VARCHAR(20) DEFAULT 'ABCDE1234F',
  `address_line1` VARCHAR(255) NOT NULL DEFAULT '123, Gandhi Road, Anna Nagar',
  `address_line2` VARCHAR(255) DEFAULT 'Near Metro Station',
  `city` VARCHAR(100) NOT NULL DEFAULT 'Chennai',
  `state` VARCHAR(100) NOT NULL DEFAULT 'Tamil Nadu',
  `state_code` VARCHAR(5) NOT NULL DEFAULT '33',
  `pincode` VARCHAR(10) NOT NULL DEFAULT '600040',
  `phone` VARCHAR(25) NOT NULL DEFAULT '+91 98765 43210',
  `email` VARCHAR(120) DEFAULT 'support@supermart.com',
  `website` VARCHAR(150) DEFAULT 'www.supermart.com',
  `currency_symbol` VARCHAR(10) NOT NULL DEFAULT '₹',
  `currency_code` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `invoice_prefix` VARCHAR(10) NOT NULL DEFAULT 'INV-',
  `thermal_receipt_header` TEXT,
  `thermal_receipt_footer` TEXT,
  `loyalty_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `loyalty_min_purchase` DECIMAL(12,2) NOT NULL DEFAULT 100.00,
  `loyalty_points_per_invoice` INT NOT NULL DEFAULT 1,
  `loyalty_redemption_rate` DECIMAL(12,2) NOT NULL DEFAULT 1.00,
  `loyalty_redemption_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. Roles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `display_name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. Users & Cashiers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` INT UNSIGNED NOT NULL,
  `username` VARCHAR(60) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(25) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_role_id` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. Financial Accounts (Cash Drawer, Bank Accounts, UPI Wallets)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `financial_accounts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_name` VARCHAR(100) NOT NULL,
  `account_type` ENUM('CASH', 'BANK', 'UPI', 'CARD') NOT NULL DEFAULT 'CASH',
  `account_number` VARCHAR(50) DEFAULT NULL,
  `bank_name` VARCHAR(100) DEFAULT NULL,
  `ifsc_code` VARCHAR(20) DEFAULT NULL,
  `upi_id` VARCHAR(100) DEFAULT NULL,
  `current_balance` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. Categories
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_categories_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. Units of Measurement
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `units` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `short_code` VARCHAR(20) NOT NULL,
  `allows_decimal` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_units_code` (`short_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. Products
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `barcode` VARCHAR(60) NOT NULL,
  `sku` VARCHAR(60) DEFAULT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  `unit_id` INT UNSIGNED NOT NULL,
  `hsn_code` VARCHAR(20) DEFAULT '2106',
  `purchase_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `mrp` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `gst_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '0.00, 5.00, 12.00, 18.00, 28.00',
  `is_tax_inclusive` TINYINT(1) NOT NULL DEFAULT 1,
  `discount_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `current_stock` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `min_stock_qty` DECIMAL(12,3) NOT NULL DEFAULT 5.000,
  `batch_tracking_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `image_url` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_products_barcode` (`barcode`),
  UNIQUE KEY `uk_products_sku` (`sku`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_unit` (`unit_id`),
  KEY `idx_products_name` (`name`),
  KEY `idx_products_active` (`is_active`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_products_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. Inventory Batches (Optional Batch & Expiry Tracking)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory_batches` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED NOT NULL,
  `batch_number` VARCHAR(60) NOT NULL,
  `mfg_date` DATE DEFAULT NULL,
  `expiry_date` DATE DEFAULT NULL,
  `quantity` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `purchase_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `mrp` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batches_product` (`product_id`),
  KEY `idx_batches_expiry` (`expiry_date`),
  CONSTRAINT `fk_batches_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. Customers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(25) NOT NULL,
  `email` VARCHAR(120) DEFAULT NULL,
  `address` TEXT,
  `gstin` VARCHAR(20) DEFAULT NULL,
  `state` VARCHAR(100) DEFAULT 'Tamil Nadu',
  `state_code` VARCHAR(5) DEFAULT '33',
  `credit_limit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `current_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Positive = customer owes store (debit)',
  `loyalty_points` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customers_phone` (`phone`),
  KEY `idx_customers_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 10. Suppliers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `company_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(25) NOT NULL,
  `email` VARCHAR(120) DEFAULT NULL,
  `address` TEXT,
  `gstin` VARCHAR(20) DEFAULT NULL,
  `state` VARCHAR(100) DEFAULT 'Tamil Nadu',
  `state_code` VARCHAR(5) DEFAULT '33',
  `current_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Positive = store owes supplier (payable)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_suppliers_phone` (`phone`),
  KEY `idx_suppliers_company` (`company_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 11. Sales Invoices
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sales_invoices` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `invoice_number` VARCHAR(50) NOT NULL,
  `invoice_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `customer_id` INT UNSIGNED NOT NULL,
  `cashier_id` INT UNSIGNED NOT NULL,
  `status` ENUM('COMPLETED', 'HOLD', 'CANCELLED', 'RETURNED') NOT NULL DEFAULT 'COMPLETED',
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_discount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `loyalty_points_earned` INT NOT NULL DEFAULT 0,
  `loyalty_points_redeemed` INT NOT NULL DEFAULT 0,
  `loyalty_discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `customer_points_before` INT NOT NULL DEFAULT 0,
  `customer_points_after` INT NOT NULL DEFAULT 0,
  `taxable_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `cgst_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sgst_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `igst_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_tax` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `round_off` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `balance_due` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` ENUM('PAID', 'PARTIAL', 'UNPAID') NOT NULL DEFAULT 'PAID',
  `payment_mode` VARCHAR(50) NOT NULL DEFAULT 'CASH',
  `notes` VARCHAR(255) DEFAULT NULL,
  `idempotency_key` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sales_invoice_number` (`invoice_number`),
  UNIQUE KEY `uk_sales_idempotency` (`idempotency_key`),
  KEY `idx_sales_date` (`invoice_date`),
  KEY `idx_sales_customer` (`customer_id`),
  KEY `idx_sales_cashier` (`cashier_id`),
  CONSTRAINT `fk_sales_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_sales_cashier` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 12. Sales Invoice Items (Historical Snapshot)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sales_invoice_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `invoice_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `batch_id` INT UNSIGNED DEFAULT NULL,
  `item_name` VARCHAR(200) NOT NULL,
  `barcode` VARCHAR(60) DEFAULT NULL,
  `hsn_code` VARCHAR(20) DEFAULT NULL,
  `unit_code` VARCHAR(20) NOT NULL DEFAULT 'PCS',
  `quantity` DECIMAL(12,3) NOT NULL,
  `unit_price` DECIMAL(12,2) NOT NULL,
  `mrp` DECIMAL(12,2) NOT NULL,
  `discount_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `taxable_amount` DECIMAL(12,2) NOT NULL,
  `gst_rate` DECIMAL(5,2) NOT NULL,
  `cgst_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sgst_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `igst_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_tax` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(12,2) NOT NULL,
  `returned_quantity` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_invoice_items_invoice` (`invoice_id`),
  KEY `idx_invoice_items_product` (`product_id`),
  CONSTRAINT `fk_invoice_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_invoice_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 13. Payments & Receipts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_number` VARCHAR(50) NOT NULL,
  `payment_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reference_type` ENUM('SALES_INVOICE', 'PURCHASE_INVOICE', 'CUSTOMER_CREDIT', 'SUPPLIER_PAYMENT', 'EXPENSE') NOT NULL,
  `reference_id` INT UNSIGNED NOT NULL,
  `customer_id` INT UNSIGNED DEFAULT NULL,
  `supplier_id` INT UNSIGNED DEFAULT NULL,
  `payment_mode` ENUM('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT', 'KHATA') NOT NULL DEFAULT 'CASH',
  `account_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `tender_amount` DECIMAL(12,2) DEFAULT NULL,
  `change_returned` DECIMAL(12,2) DEFAULT 0.00,
  `transaction_reference` VARCHAR(100) DEFAULT NULL,
  `notes` VARCHAR(255) DEFAULT NULL,
  `received_by_user_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_number` (`payment_number`),
  KEY `idx_payments_ref` (`reference_type`, `reference_id`),
  KEY `idx_payments_account` (`account_id`),
  KEY `idx_payments_user` (`received_by_user_id`),
  CONSTRAINT `fk_payments_account` FOREIGN KEY (`account_id`) REFERENCES `financial_accounts` (`id`),
  CONSTRAINT `fk_payments_user` FOREIGN KEY (`received_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 14. Payment Allocations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_allocations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_id` INT UNSIGNED NOT NULL,
  `invoice_type` ENUM('SALE', 'PURCHASE') NOT NULL,
  `invoice_id` INT UNSIGNED NOT NULL,
  `allocated_amount` DECIMAL(12,2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_allocations_payment` (`payment_id`),
  CONSTRAINT `fk_allocations_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 15. Stock Movements Ledger (Immutable Stock History)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED NOT NULL,
  `batch_id` INT UNSIGNED DEFAULT NULL,
  `movement_type` ENUM('OPENING', 'SALE', 'PURCHASE', 'SALE_RETURN', 'PURCHASE_RETURN', 'ADJUSTMENT') NOT NULL,
  `reference_type` VARCHAR(50) DEFAULT NULL,
  `reference_id` INT UNSIGNED DEFAULT NULL,
  `quantity` DECIMAL(12,3) NOT NULL COMMENT 'Positive for additions, Negative for deductions',
  `balance_after` DECIMAL(12,3) NOT NULL,
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_by_user_id` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stock_product` (`product_id`),
  KEY `idx_stock_movement_type` (`movement_type`),
  KEY `idx_stock_created_at` (`created_at`),
  CONSTRAINT `fk_stock_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 16. Sales Returns
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sales_returns` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `return_number` VARCHAR(50) NOT NULL,
  `return_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `invoice_id` INT UNSIGNED NOT NULL,
  `customer_id` INT UNSIGNED NOT NULL,
  `processed_by_user_id` INT UNSIGNED NOT NULL,
  `return_subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `return_tax` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `refund_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `refund_mode` ENUM('CASH', 'UPI', 'STORE_CREDIT', 'BANK_TRANSFER') NOT NULL DEFAULT 'CASH',
  `reason` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_returns_number` (`return_number`),
  KEY `idx_returns_invoice` (`invoice_id`),
  CONSTRAINT `fk_returns_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`),
  CONSTRAINT `fk_returns_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_returns_user` FOREIGN KEY (`processed_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 17. Sales Return Items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sales_return_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sales_return_id` INT UNSIGNED NOT NULL,
  `invoice_item_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `quantity` DECIMAL(12,3) NOT NULL,
  `unit_price` DECIMAL(12,2) NOT NULL,
  `tax_rate` DECIMAL(5,2) NOT NULL,
  `refund_amount` DECIMAL(12,2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ret_items_parent` (`sales_return_id`),
  KEY `idx_ret_items_product` (`product_id`),
  CONSTRAINT `fk_ret_items_parent` FOREIGN KEY (`sales_return_id`) REFERENCES `sales_returns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ret_items_inv_item` FOREIGN KEY (`invoice_item_id`) REFERENCES `sales_invoice_items` (`id`),
  CONSTRAINT `fk_ret_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 18. Purchase Invoices
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchase_invoices` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `invoice_number` VARCHAR(50) NOT NULL,
  `supplier_invoice_number` VARCHAR(60) DEFAULT NULL,
  `invoice_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `supplier_id` INT UNSIGNED NOT NULL,
  `status` ENUM('RECEIVED', 'DRAFT', 'CANCELLED') NOT NULL DEFAULT 'RECEIVED',
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_tax` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `balance_due` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` ENUM('PAID', 'PARTIAL', 'UNPAID') NOT NULL DEFAULT 'PAID',
  `notes` VARCHAR(255) DEFAULT NULL,
  `received_by_user_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_purchase_invoice_number` (`invoice_number`),
  KEY `idx_purchases_supplier` (`supplier_id`),
  CONSTRAINT `fk_purchases_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `fk_purchases_user` FOREIGN KEY (`received_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 19. Purchase Invoice Items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchase_invoice_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `purchase_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `batch_number` VARCHAR(60) DEFAULT NULL,
  `expiry_date` DATE DEFAULT NULL,
  `quantity` DECIMAL(12,3) NOT NULL,
  `unit_price` DECIMAL(12,2) NOT NULL,
  `taxable_amount` DECIMAL(12,2) NOT NULL,
  `gst_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(12,2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_purch_items_purchase` (`purchase_id`),
  KEY `idx_purch_items_product` (`product_id`),
  CONSTRAINT `fk_purch_items_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchase_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_purch_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 20. Supplier Payments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `supplier_payments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_id` INT UNSIGNED NOT NULL,
  `purchase_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supp_pay_payment` (`payment_id`),
  KEY `idx_supp_pay_purchase` (`purchase_id`),
  CONSTRAINT `fk_supp_pay_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_supp_pay_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchase_invoices` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 21. Purchase Returns
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchase_returns` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `return_number` VARCHAR(50) NOT NULL,
  `return_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `purchase_id` INT UNSIGNED NOT NULL,
  `supplier_id` INT UNSIGNED NOT NULL,
  `refund_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `reason` VARCHAR(255) DEFAULT NULL,
  `processed_by_user_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_purch_return_number` (`return_number`),
  CONSTRAINT `fk_purch_ret_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchase_invoices` (`id`),
  CONSTRAINT `fk_purch_ret_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `fk_purch_ret_user` FOREIGN KEY (`processed_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 22. Expenses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `expense_number` VARCHAR(50) NOT NULL,
  `expense_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `category` ENUM('UTILITIES', 'RENT', 'SALARIES', 'MAINTENANCE', 'SUPPLIES', 'MARKETING', 'MISCELLANEOUS') NOT NULL DEFAULT 'MISCELLANEOUS',
  `title` VARCHAR(150) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_mode` ENUM('CASH', 'UPI', 'CARD', 'BANK_TRANSFER') NOT NULL DEFAULT 'CASH',
  `account_id` INT UNSIGNED NOT NULL,
  `paid_to` VARCHAR(120) DEFAULT NULL,
  `approved_by_user_id` INT UNSIGNED NOT NULL,
  `receipt_url` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_expense_number` (`expense_number`),
  KEY `idx_expenses_category` (`category`),
  KEY `idx_expenses_date` (`expense_date`),
  CONSTRAINT `fk_expenses_account` FOREIGN KEY (`account_id`) REFERENCES `financial_accounts` (`id`),
  CONSTRAINT `fk_expenses_user` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 23. Account Ledger Transactions (Double-Entry Financial Audit Trail)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `account_transactions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `transaction_number` VARCHAR(60) NOT NULL,
  `transaction_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `account_id` INT UNSIGNED NOT NULL,
  `transaction_type` ENUM('CREDIT', 'DEBIT') NOT NULL COMMENT 'CREDIT = Inflow, DEBIT = Outflow',
  `amount` DECIMAL(12,2) NOT NULL,
  `balance_after` DECIMAL(15,2) NOT NULL,
  `reference_type` ENUM('SALE_PAYMENT', 'PURCHASE_PAYMENT', 'EXPENSE', 'TRANSFER', 'MANUAL_ADJUSTMENT', 'SALE_REFUND') NOT NULL,
  `reference_id` INT UNSIGNED DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_by_user_id` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_acct_trans_number` (`transaction_number`),
  KEY `idx_acct_trans_account` (`account_id`),
  KEY `idx_acct_trans_date` (`transaction_date`),
  CONSTRAINT `fk_acct_trans_account` FOREIGN KEY (`account_id`) REFERENCES `financial_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 24. Audit Logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `action` VARCHAR(60) NOT NULL,
  `entity_name` VARCHAR(60) NOT NULL,
  `entity_id` INT UNSIGNED DEFAULT NULL,
  `old_values` JSON DEFAULT NULL,
  `new_values` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_entity` (`entity_name`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 25. Loyalty Transactions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `loyalty_transactions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` INT UNSIGNED NOT NULL,
  `invoice_id` INT UNSIGNED DEFAULT NULL,
  `transaction_type` ENUM('EARN', 'REDEEM', 'REVERSAL', 'ADJUSTMENT') NOT NULL,
  `points` INT NOT NULL,
  `rupee_value` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lt_customer` (`customer_id`),
  KEY `idx_lt_invoice` (`invoice_id`),
  CONSTRAINT `fk_lt_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lt_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
