-- ==============================================================
-- Shadow Shop: Reset Orders Database Script
-- ==============================================================
-- This script completely clears all orders and related records,
-- and resets the order ID counter back to 1.
--
-- Tables cleared:
--  - order_status_history
--  - order_items
--  - prepare_records
--  - out_records
--  - delivery_status_history
--  - deliveries
--  - aba_payments
--  - bakong_payments
--  - pending_checkouts
--  - revenues (order-linked revenue)
--  - promo_code_usages
--  - orders
--
-- Safe: Products, categories, brands, customers, users, and stock are NOT deleted.
-- ==============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Clear status history and line items
TRUNCATE TABLE order_status_history;
TRUNCATE TABLE order_items;

-- 2. Clear warehouse packing / dispatch records
TRUNCATE TABLE prepare_records;
TRUNCATE TABLE out_records;

-- 3. Clear deliveries and delivery history
TRUNCATE TABLE delivery_status_history;
TRUNCATE TABLE deliveries;

-- 4. Clear payment transactions & pending checkout states
TRUNCATE TABLE aba_payments;
TRUNCATE TABLE bakong_payments;
TRUNCATE TABLE pending_checkouts;

-- 5. Clear order financial records & promotion usage
DELETE FROM revenues WHERE order_id IS NOT NULL;
TRUNCATE TABLE promo_code_usages;

-- 6. Truncate orders and reset auto-increment counter
TRUNCATE TABLE orders;
ALTER TABLE orders AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

