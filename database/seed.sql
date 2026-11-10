-- =====================================================================
-- SUPERMARKET BILLING AND INVENTORY MANAGEMENT SYSTEM
-- Seed Data Script (Demo Data)
-- Compatible with MySQL 8.x and MySQL Workbench
-- Database: supermarket_db
-- =====================================================================

USE `supermarket_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. Business Settings
-- ---------------------------------------------------------------------
INSERT INTO `business_settings` (
  `id`, `store_name`, `tagline`, `gstin`, `pan_number`,
  `address_line1`, `address_line2`, `city`, `state`, `state_code`, `pincode`,
  `phone`, `email`, `website`, `currency_symbol`, `currency_code`, `invoice_prefix`,
  `thermal_receipt_header`, `thermal_receipt_footer`
) VALUES (
  1,
  'SuperMart Hypermarket',
  'Quality Groceries & Fresh Everyday',
  '33ABCDE1234F1Z5',
  'ABCDE1234F',
  '123, Gandhi Road, Anna Nagar',
  'Near Metro Station Gate 2',
  'Chennai',
  'Tamil Nadu',
  '33',
  '600040',
  '+91 98765 43210',
  'contact@supermart.com',
  'https://www.supermart.com',
  '₹',
  'INR',
  'INV-',
  '*** WELCOME TO SUPERMART HYPERMARKET ***\nGSTIN: 33ABCDE1234F1Z5 | Phone: +91 98765 43210',
  'Thank you for shopping with us!\nItems once sold can be returned within 7 days with original invoice.\nHave a wonderful day!'
) ON DUPLICATE KEY UPDATE `store_name` = VALUES(`store_name`);

-- ---------------------------------------------------------------------
-- 2. User Roles
-- ---------------------------------------------------------------------
INSERT INTO `roles` (`id`, `name`, `display_name`, `description`) VALUES
  (1, 'ADMIN', 'Store Administrator / Owner', 'Full system access, settings, user management, financial reports'),
  (2, 'MANAGER', 'Store Manager', 'Inventory, sales, purchase orders, customer & supplier management'),
  (3, 'CASHIER', 'Billing Cashier', 'Point of sale, bill generation, payments, receipt printing'),
  (4, 'INVENTORY_STAFF', 'Inventory Staff', 'Stock adjustments, receiving purchases, low-stock tracking')
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- ---------------------------------------------------------------------
-- 3. Users (Initial accounts with bcrypt hashed passwords)
-- Passwords:
-- admin     -> Admin@123
-- manager   -> Manager@123
-- cashier   -> Cashier@123
-- inventory -> Inventory@123
-- ---------------------------------------------------------------------
INSERT INTO `users` (`id`, `role_id`, `username`, `email`, `password_hash`, `full_name`, `phone`, `is_active`) VALUES
  (1, 1, 'admin', 'admin@supermart.com', '$2a$10$HCumLYs0oEXRgx6ZrSHK0.kiYXcL49zVVAy7sZSdMEOuUOppCiE0G', 'Arun Kumar (Owner)', '+91 98401 11222', 1),
  (2, 2, 'manager', 'manager@supermart.com', '$2a$10$JhLPH2nlNQsdz9W.Plq2pO9mCIyHP4yt9YeQSVo1Ydl3O3Eh7dKs.', 'Suresh Raman (Manager)', '+91 98402 22333', 1),
  (3, 3, 'cashier', 'cashier@supermart.com', '$2a$10$BsTH1jrfcIUOm5ZggKnutOuadQSUcHctzEYCYGXUuJp/9yKuTp4CO', 'Deepa Lakshmi (Cashier)', '+91 98403 33444', 1),
  (4, 4, 'inventory', 'inventory@supermart.com', '$2a$10$3KpCLXjMsE.T9QDM9K9zRuHxSfo44kJlfYupplaGbfcDxuMepoRc2', 'Venkatesh K (Inventory Staff)', '+91 98404 44555', 1)
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- ---------------------------------------------------------------------
-- 4. Financial Accounts
-- ---------------------------------------------------------------------
INSERT INTO `financial_accounts` (`id`, `account_name`, `account_type`, `account_number`, `bank_name`, `ifsc_code`, `upi_id`, `current_balance`, `is_active`) VALUES
  (1, 'Counter Cash Drawer (Main)', 'CASH', 'CASH-001', NULL, NULL, NULL, 15000.00, 1),
  (2, 'HDFC Current Bank Account', 'BANK', '50200012345678', 'HDFC Bank Anna Nagar', 'HDFC0001234', NULL, 150000.00, 1),
  (3, 'Merchant UPI QR (Paytm/GPay)', 'UPI', 'UPI-MERCH-01', 'HDFC Bank', 'HDFC0001234', 'supermart@hdfcbank', 25000.00, 1),
  (4, 'POS Card Terminal (PineLabs)', 'CARD', 'CARD-TERM-01', 'HDFC Bank', 'HDFC0001234', NULL, 40000.00, 1)
ON DUPLICATE KEY UPDATE `current_balance` = VALUES(`current_balance`);

-- ---------------------------------------------------------------------
-- 5. Categories
-- ---------------------------------------------------------------------
INSERT INTO `categories` (`id`, `name`, `description`, `is_active`) VALUES
  (1, 'Dairy & Breakfast', 'Milk, butter, cheese, paneer, curd, cereals', 1),
  (2, 'Groceries & Staples', 'Rice, flour, grains, pulses, cooking oils, salt & spices', 1),
  (3, 'Snacks & Beverages', 'Biscuits, noodles, soft drinks, juices, coffee & tea', 1),
  (4, 'Personal Care & Hygiene', 'Soaps, toothpastes, shampoos, skin care', 1),
  (5, 'Household & Cleaning', 'Detergents, dishwash, floor cleaners, mosquito repellents', 1),
  (6, 'Fresh Produce', 'Farm fresh vegetables and fruits', 1),
  (7, 'Chocolates & Confectionery', 'Chocolates, candies, sweets', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ---------------------------------------------------------------------
-- 6. Units of Measurement
-- ---------------------------------------------------------------------
INSERT INTO `units` (`id`, `name`, `short_code`, `allows_decimal`, `is_active`) VALUES
  (1, 'Pieces', 'PCS', 0, 1),
  (2, 'Packets', 'PKT', 0, 1),
  (3, 'Kilograms', 'KG', 1, 1),
  (4, 'Grams', 'G', 1, 1),
  (5, 'Litres', 'LTR', 1, 1),
  (6, 'Bottles', 'BTL', 0, 1),
  (7, 'Boxes', 'BOX', 0, 1)
ON DUPLICATE KEY UPDATE `short_code` = VALUES(`short_code`);

-- ---------------------------------------------------------------------
-- 7. Products (Realistic Indian FMCG Barcodes, HSN Codes & GST Rates)
-- ---------------------------------------------------------------------
INSERT INTO `products` (
  `id`, `name`, `barcode`, `sku`, `category_id`, `unit_id`, `hsn_code`,
  `purchase_price`, `selling_price`, `mrp`, `gst_rate`, `is_tax_inclusive`,
  `discount_percent`, `current_stock`, `min_stock_qty`, `is_active`
) VALUES
  (1, 'Amul Pasteurised Butter 500g', '8901262010053', 'SKU-BUTT-500', 1, 2, '0405', 235.00, 275.00, 285.00, 12.00, 1, 3.51, 45.000, 10.000, 1),
  (2, 'Maggi 2-Minute Masala Noodles 70g', '8901058852461', 'SKU-MAGG-70G', 3, 2, '1902', 11.50, 14.00, 14.00, 18.00, 1, 0.00, 120.000, 25.000, 1),
  (3, 'Tata Salt Vacuum Evaporated Iodized 1kg', '8904043901005', 'SKU-SALT-1KG', 2, 2, '2501', 22.00, 28.00, 28.00, 0.00, 1, 0.00, 85.000, 20.000, 1),
  (4, 'Fortune Sunlite Refined Sunflower Oil 1L', '8906007280014', 'SKU-OIL-1LTR', 2, 5, '1512', 125.00, 145.00, 160.00, 5.00, 1, 9.38, 50.000, 15.000, 1),
  (5, 'Aashirvaad Shudh Chakki Whole Wheat Atta 5kg', '8901725132223', 'SKU-ATTA-5KG', 2, 2, '1101', 230.00, 275.00, 295.00, 5.00, 1, 6.78, 30.000, 8.000, 1),
  (6, 'India Gate Basmati Rice Feast Rozzana 1kg', '8901537006024', 'SKU-RICE-1KG', 2, 2, '1006', 82.00, 105.00, 115.00, 5.00, 1, 8.70, 60.000, 15.000, 1),
  (7, 'Parle-G Original Glucose Biscuits 250g', '8901719101037', 'SKU-PARL-250', 3, 2, '1905', 21.00, 25.00, 25.00, 18.00, 1, 0.00, 150.000, 30.000, 1),
  (8, 'Coca-Cola Refreshing Soda 750ml Pet', '8901764012234', 'SKU-COKE-750', 3, 6, '2202', 32.00, 40.00, 40.00, 28.00, 1, 0.00, 75.000, 20.000, 1),
  (9, 'Colgate Strong Teeth Dental Cream 100g', '8901314010529', 'SKU-COLG-100', 4, 1, '3306', 52.00, 65.00, 68.00, 18.00, 1, 4.41, 65.000, 15.000, 1),
  (10, 'Dettol Original Germ Protection Bathing Soap 75g', '8901396322015', 'SKU-DETT-75G', 4, 1, '3401', 32.00, 42.00, 45.00, 18.00, 1, 6.67, 90.000, 20.000, 1),
  (11, 'Surf Excel Easy Wash Detergent Powder 1kg', '8901030383786', 'SKU-SURF-1KG', 5, 2, '3402', 115.00, 140.00, 150.00, 18.00, 1, 6.67, 40.000, 10.000, 1),
  (12, 'Vim Dishwash Bar 300g', '8901030013000', 'SKU-VIM-300G', 5, 1, '3402', 24.00, 30.00, 30.00, 18.00, 1, 0.00, 80.000, 20.000, 1),
  (13, 'Fresh Farm Potato (Loose)', '2000000000018', 'SKU-VEG-POTA', 6, 3, '0701', 25.00, 35.00, 35.00, 0.00, 1, 0.00, 120.500, 20.000, 1),
  (14, 'Fresh Nashik Onion (Loose)', '2000000000025', 'SKU-VEG-ONIO', 6, 3, '0703', 30.00, 42.00, 45.00, 0.00, 1, 6.67, 95.250, 20.000, 1),
  (15, 'Fresh Hybrid Red Tomato (Loose)', '2000000000032', 'SKU-VEG-TOMA', 6, 3, '0702', 20.00, 30.00, 30.00, 0.00, 1, 0.00, 45.000, 15.000, 1),
  (16, 'Fresh Royal Gala Apple (Loose)', '2000000000049', 'SKU-FRU-APPL', 6, 3, '0808', 140.00, 185.00, 200.00, 0.00, 1, 7.50, 35.750, 10.000, 1),
  (17, 'Amul Taaza Homogenised Toned Milk 1L', '8901262150056', 'SKU-MILK-1LTR', 1, 5, '0401', 62.00, 72.00, 72.00, 5.00, 1, 0.00, 55.000, 15.000, 1),
  (18, 'Nescafe Classic 100% Pure Instant Coffee 50g', '8901058863009', 'SKU-COFF-50G', 3, 1, '0901', 145.00, 180.00, 190.00, 18.00, 1, 5.26, 40.000, 10.000, 1),
  (19, 'Brooke Bond Red Label Strong Tea 250g', '8901030742118', 'SKU-TEA-250G', 3, 2, '0902', 105.00, 130.00, 135.00, 5.00, 1, 3.70, 50.000, 12.000, 1),
  (20, 'Cadbury Dairy Milk Silk Chocolate 60g', '8901233024041', 'SKU-SILK-60G', 7, 1, '1806', 70.00, 85.00, 90.00, 18.00, 1, 5.56, 60.000, 15.000, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ---------------------------------------------------------------------
-- 8. Opening Stock Movements
-- ---------------------------------------------------------------------
INSERT INTO `stock_movements` (
  `product_id`, `movement_type`, `reference_type`, `reference_id`, `quantity`, `balance_after`, `notes`, `created_by_user_id`
) SELECT `id`, 'OPENING', 'STORE_SETUP', 1, `current_stock`, `current_stock`, 'Initial supermarket opening stock', 1
FROM `products`
ON DUPLICATE KEY UPDATE `notes` = VALUES(`notes`);

-- ---------------------------------------------------------------------
-- 9. Customers
-- ---------------------------------------------------------------------
INSERT INTO `customers` (`id`, `name`, `phone`, `email`, `address`, `gstin`, `credit_limit`, `current_balance`, `loyalty_points`, `is_active`) VALUES
  (1, 'Walk-in Customer (Cash/Retail)', '9999999999', 'walkin@customer.com', 'Store Walk-in Counter', NULL, 0.00, 0.00, 0, 1),
  (2, 'Rajesh Kumar', '+91 98401 12233', 'rajesh.k@gmail.com', '45, 2nd Avenue, Anna Nagar, Chennai', '33AAAPK1234A1Z1', 5000.00, 0.00, 120, 1),
  (3, 'Priya Sharma', '+91 98402 23344', 'priya.sharma@yahoo.com', '12B, Shanti Colony, Chennai', NULL, 3000.00, 0.00, 85, 1),
  (4, 'Ananya Sundaram', '+91 98403 34455', 'ananya.sundaram@gmail.com', '88, Nelson Manickam Road, Chennai', NULL, 10000.00, 450.00, 310, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ---------------------------------------------------------------------
-- 10. Suppliers
-- ---------------------------------------------------------------------
INSERT INTO `suppliers` (`id`, `name`, `company_name`, `phone`, `email`, `address`, `gstin`, `current_balance`, `is_active`) VALUES
  (1, 'Ganesh Moorthy', 'Metro Cash & Carry Wholesale Ltd', '+91 94441 11000', 'orders@metrochennai.com', 'Plot 4A, Koyambedu Wholesale Market, Chennai', '33AAACM0123P1Z1', 12450.00, 1),
  (2, 'Venkatesh Rao', 'Hindustan Unilever Distributor Agency', '+91 94442 22000', 'supplies@huldistributor.com', '78, Ambattur Industrial Estate, Chennai', '33AABCH1234D1Z2', 0.00, 1),
  (3, 'Karthik Narayanan', 'ITC Consumer Goods Wholesale', '+91 94443 33000', 'karthik@itcwholesale.com', '102, Mount Road, Chennai', '33AABCI5678E1Z3', 5200.00, 1)
ON DUPLICATE KEY UPDATE `company_name` = VALUES(`company_name`);

-- ---------------------------------------------------------------------
-- 11. Initial Ledger Entry (Starting Balances)
-- ---------------------------------------------------------------------
INSERT INTO `account_transactions` (
  `transaction_number`, `transaction_date`, `account_id`, `transaction_type`,
  `amount`, `balance_after`, `reference_type`, `reference_id`, `description`, `created_by_user_id`
) VALUES
  ('TXN-INIT-001', CURRENT_TIMESTAMP, 1, 'CREDIT', 15000.00, 15000.00, 'MANUAL_ADJUSTMENT', 1, 'Opening Cash Drawer float balance', 1),
  ('TXN-INIT-002', CURRENT_TIMESTAMP, 2, 'CREDIT', 150000.00, 150000.00, 'MANUAL_ADJUSTMENT', 1, 'Opening HDFC Bank business current account balance', 1),
  ('TXN-INIT-003', CURRENT_TIMESTAMP, 3, 'CREDIT', 25000.00, 25000.00, 'MANUAL_ADJUSTMENT', 1, 'Opening UPI Merchant wallet balance', 1),
  ('TXN-INIT-004', CURRENT_TIMESTAMP, 4, 'CREDIT', 40000.00, 40000.00, 'MANUAL_ADJUSTMENT', 1, 'Opening Card POS settlement balance', 1)
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

SET FOREIGN_KEY_CHECKS = 1;

