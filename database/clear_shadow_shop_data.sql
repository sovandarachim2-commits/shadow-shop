-- Clear Shadow Shop application data.
-- Keeps Django schema/migration metadata:
--   django_migrations, django_content_type, auth_permission
-- Keeps superadmin users and removes other user accounts.

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE token_blacklist_blacklistedtoken;
TRUNCATE TABLE token_blacklist_outstandingtoken;
TRUNCATE TABLE django_admin_log;
TRUNCATE TABLE django_session;

TRUNCATE TABLE role_permissions;
TRUNCATE TABLE permissions;
TRUNCATE TABLE users_user_permissions;
TRUNCATE TABLE users_groups;
TRUNCATE TABLE auth_group_permissions;
TRUNCATE TABLE auth_group;
TRUNCATE TABLE activity_logs;

TRUNCATE TABLE daily_summaries;
TRUNCATE TABLE revenues;
TRUNCATE TABLE expenses;
TRUNCATE TABLE expense_categories;

TRUNCATE TABLE delivery_status_history;
TRUNCATE TABLE deliveries;
TRUNCATE TABLE delivery_zones;
TRUNCATE TABLE delivery_companies;

TRUNCATE TABLE stock_transfer_items;
TRUNCATE TABLE stock_transfers;
TRUNCATE TABLE stock_movements;
TRUNCATE TABLE stock;
TRUNCATE TABLE warehouses;

TRUNCATE TABLE cart_items;
TRUNCATE TABLE wishlists;
TRUNCATE TABLE order_status_history;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE customers;

TRUNCATE TABLE promotions_products;
TRUNCATE TABLE promotions;
TRUNCATE TABLE lucky_boxes;
TRUNCATE TABLE product_set_items;
TRUNCATE TABLE product_sets;
TRUNCATE TABLE product_images;
TRUNCATE TABLE products;
TRUNCATE TABLE brands;
TRUNCATE TABLE categories;

DELETE FROM users WHERE role <> 'super_admin';

SET FOREIGN_KEY_CHECKS = 1;
