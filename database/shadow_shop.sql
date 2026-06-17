-- ============================================================
--  Shadow Shop — Full Database Creation Script
--  Run this in phpMyAdmin or MySQL CLI
--  Compatible with MySQL 8 / MariaDB 10.4+
-- ============================================================

CREATE DATABASE IF NOT EXISTS shadow_shop
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE shadow_shop;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Django internals
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS django_migrations (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  app         VARCHAR(255)    NOT NULL,
  name        VARCHAR(255)    NOT NULL,
  applied     DATETIME(6)     NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS django_content_type (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  app_label VARCHAR(100) NOT NULL,
  model     VARCHAR(100) NOT NULL,
  UNIQUE KEY django_content_type_app_label_model_76bd3d3b_uniq (app_label, model)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_permission (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  content_type_id INT UNSIGNED NOT NULL,
  codename        VARCHAR(100) NOT NULL,
  UNIQUE KEY auth_permission_content_type_id_codename_01ab375a_uniq (content_type_id, codename),
  CONSTRAINT auth_permission_content_type_id_2f476e4b_fk
    FOREIGN KEY (content_type_id) REFERENCES django_content_type (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_group (
  id   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_group_permissions (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  group_id      INT UNSIGNED    NOT NULL,
  permission_id INT UNSIGNED    NOT NULL,
  UNIQUE KEY auth_group_permissions_group_id_permission_id_0cd325b0_uniq (group_id, permission_id),
  CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk
    FOREIGN KEY (group_id) REFERENCES auth_group (id),
  CONSTRAINT auth_group_permissions_permission_id_84c5c92e_fk
    FOREIGN KEY (permission_id) REFERENCES auth_permission (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Users  (replaces auth_user via AUTH_USER_MODEL)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  password     VARCHAR(128) NOT NULL,
  last_login   DATETIME(6)  NULL,
  is_superuser TINYINT(1)   NOT NULL DEFAULT 0,
  username     VARCHAR(150) NOT NULL UNIQUE,
  first_name   VARCHAR(150) NOT NULL DEFAULT '',
  last_name    VARCHAR(150) NOT NULL DEFAULT '',
  email        VARCHAR(254) NOT NULL DEFAULT '',
  is_staff     TINYINT(1)   NOT NULL DEFAULT 0,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  date_joined  DATETIME(6)  NOT NULL,
  role         VARCHAR(20)  NOT NULL DEFAULT 'customer',
  phone        VARCHAR(20)  NOT NULL DEFAULT '',
  avatar       VARCHAR(100) NULL,
  created_at   DATETIME(6)  NOT NULL,
  updated_at   DATETIME(6)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users_groups (
  id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id  INT UNSIGNED    NOT NULL,
  group_id INT UNSIGNED    NOT NULL,
  UNIQUE KEY users_groups_user_id_group_id_b88eab82_uniq (user_id, group_id),
  CONSTRAINT users_groups_user_id_fk  FOREIGN KEY (user_id)  REFERENCES users (id),
  CONSTRAINT users_groups_group_id_fk FOREIGN KEY (group_id) REFERENCES auth_group (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users_user_permissions (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED    NOT NULL,
  permission_id INT UNSIGNED    NOT NULL,
  UNIQUE KEY users_user_permissions_user_id_permission_id_43338c45_uniq (user_id, permission_id),
  CONSTRAINT users_user_permissions_user_id_fk       FOREIGN KEY (user_id)       REFERENCES users (id),
  CONSTRAINT users_user_permissions_permission_id_fk FOREIGN KEY (permission_id) REFERENCES auth_permission (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Django admin log & session
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS django_admin_log (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  action_time     DATETIME(6)   NOT NULL,
  object_id       LONGTEXT      NULL,
  object_repr     VARCHAR(200)  NOT NULL,
  action_flag     SMALLINT UNSIGNED NOT NULL,
  change_message  LONGTEXT      NOT NULL,
  content_type_id INT UNSIGNED  NULL,
  user_id         INT UNSIGNED  NOT NULL,
  CONSTRAINT django_admin_log_content_type_id_c4bce8eb_fk
    FOREIGN KEY (content_type_id) REFERENCES django_content_type (id),
  CONSTRAINT django_admin_log_user_id_c564eba6_fk
    FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS django_session (
  session_key  VARCHAR(40)  NOT NULL PRIMARY KEY,
  session_data LONGTEXT     NOT NULL,
  expire_date  DATETIME(6)  NOT NULL,
  KEY django_session_expire_date_a5c62663 (expire_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- JWT Token Blacklist  (djangorestframework-simplejwt)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS token_blacklist_outstandingtoken (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  token       LONGTEXT        NOT NULL,
  jti         VARCHAR(255)    NOT NULL UNIQUE,
  expires_at  DATETIME(6)     NOT NULL,
  created_at  DATETIME(6)     NULL,
  user_id     INT UNSIGNED    NULL,
  CONSTRAINT token_blacklist_outstandingtoken_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS token_blacklist_blacklistedtoken (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  blacklisted_at       DATETIME(6)     NOT NULL,
  token_id             BIGINT UNSIGNED NOT NULL UNIQUE,
  CONSTRAINT token_blacklist_blacklistedtoken_token_id_fk
    FOREIGN KEY (token_id) REFERENCES token_blacklist_outstandingtoken (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Accounts app
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS permissions (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  module      VARCHAR(50)  NOT NULL,
  action      VARCHAR(20)  NOT NULL,
  description VARCHAR(200) NOT NULL DEFAULT '',
  UNIQUE KEY permissions_module_action_uniq (module, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_permissions (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  role          VARCHAR(20)  NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  granted       TINYINT(1)   NOT NULL DEFAULT 1,
  UNIQUE KEY role_permissions_role_permission_uniq (role, permission_id),
  CONSTRAINT role_permissions_permission_id_fk
    FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS activity_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED    NULL,
  action      VARCHAR(20)     NOT NULL,
  module      VARCHAR(50)     NOT NULL,
  description LONGTEXT        NOT NULL,
  object_id   VARCHAR(50)     NOT NULL DEFAULT '',
  object_type VARCHAR(100)    NOT NULL DEFAULT '',
  ip_address  VARCHAR(39)     NULL,
  extra_data  JSON            NOT NULL,
  created_at  DATETIME(6)     NOT NULL,
  KEY activity_logs_created_at_idx (created_at),
  CONSTRAINT activity_logs_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Products app
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200)  NOT NULL,
  slug        VARCHAR(50)   NOT NULL UNIQUE,
  image       VARCHAR(100)  NULL,
  parent_id   INT UNSIGNED  NULL,
  description LONGTEXT      NOT NULL DEFAULT '',
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  `order`     INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at  DATETIME(6)   NOT NULL,
  CONSTRAINT categories_parent_id_fk
    FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id              INT UNSIGNED     NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(50)      NOT NULL UNIQUE,
  barcode         VARCHAR(100)     NOT NULL DEFAULT '',
  name            VARCHAR(300)     NOT NULL,
  slug            VARCHAR(255)     NOT NULL UNIQUE,
  category_id     INT UNSIGNED     NULL,
  description     LONGTEXT         NOT NULL DEFAULT '',
  benefits        LONGTEXT         NOT NULL DEFAULT '',
  ingredients     LONGTEXT         NOT NULL DEFAULT '',
  how_to_use      LONGTEXT         NOT NULL DEFAULT '',
  unit            VARCHAR(20)      NOT NULL DEFAULT 'piece',
  weight          DECIMAL(8,2)     NULL,
  cost_price      DECIMAL(12,2)    NOT NULL DEFAULT 0.00,
  wholesale_price DECIMAL(12,2)    NOT NULL DEFAULT 0.00,
  retail_price    DECIMAL(12,2)    NOT NULL DEFAULT 0.00,
  min_order_qty   INT UNSIGNED     NOT NULL DEFAULT 1,
  is_active       TINYINT(1)       NOT NULL DEFAULT 1,
  is_featured     TINYINT(1)       NOT NULL DEFAULT 0,
  is_new_arrival  TINYINT(1)       NOT NULL DEFAULT 0,
  is_best_seller  TINYINT(1)       NOT NULL DEFAULT 0,
  rating          DECIMAL(3,2)     NOT NULL DEFAULT 0.00,
  review_count    INT UNSIGNED     NOT NULL DEFAULT 0,
  created_at      DATETIME(6)      NOT NULL,
  updated_at      DATETIME(6)      NOT NULL,
  KEY products_category_id_idx (category_id),
  CONSTRAINT products_category_id_fk
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_images (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED  NOT NULL,
  image      VARCHAR(100)  NOT NULL,
  alt_text   VARCHAR(200)  NOT NULL DEFAULT '',
  is_primary TINYINT(1)    NOT NULL DEFAULT 0,
  `order`    INT UNSIGNED  NOT NULL DEFAULT 0,
  CONSTRAINT product_images_product_id_fk
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_sets (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(300)  NOT NULL,
  slug           VARCHAR(255)  NOT NULL UNIQUE,
  description    LONGTEXT      NOT NULL DEFAULT '',
  image          VARCHAR(100)  NULL,
  price          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_price DECIMAL(12,2) NULL,
  is_active      TINYINT(1)    NOT NULL DEFAULT 1,
  is_featured    TINYINT(1)    NOT NULL DEFAULT 0,
  created_at     DATETIME(6)   NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_set_items (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_set_id INT UNSIGNED NOT NULL,
  product_id     INT UNSIGNED NOT NULL,
  quantity       INT UNSIGNED NOT NULL DEFAULT 1,
  UNIQUE KEY product_set_items_set_product_uniq (product_set_id, product_id),
  CONSTRAINT product_set_items_set_id_fk     FOREIGN KEY (product_set_id) REFERENCES product_sets (id) ON DELETE CASCADE,
  CONSTRAINT product_set_items_product_id_fk FOREIGN KEY (product_id)     REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lucky_boxes (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200)  NOT NULL,
  description LONGTEXT      NOT NULL DEFAULT '',
  image       VARCHAR(100)  NULL,
  price       DECIMAL(12,2) NOT NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  stock       INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at  DATETIME(6)   NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS promotions (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(200)  NOT NULL,
  type             VARCHAR(20)   NOT NULL DEFAULT 'banner',
  image            VARCHAR(100)  NULL,
  discount_percent DECIMAL(5,2)  NULL,
  discount_amount  DECIMAL(12,2) NULL,
  start_date       DATETIME(6)   NOT NULL,
  end_date         DATETIME(6)   NOT NULL,
  is_active        TINYINT(1)    NOT NULL DEFAULT 1,
  created_at       DATETIME(6)   NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS promotions_products (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  promotion_id INT UNSIGNED    NOT NULL,
  product_id   INT UNSIGNED    NOT NULL,
  UNIQUE KEY promotions_products_uniq (promotion_id, product_id),
  CONSTRAINT promotions_products_promotion_id_fk FOREIGN KEY (promotion_id) REFERENCES promotions (id) ON DELETE CASCADE,
  CONSTRAINT promotions_products_product_id_fk   FOREIGN KEY (product_id)   REFERENCES products (id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Orders app
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customers (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED  NULL UNIQUE,
  name         VARCHAR(200)  NOT NULL,
  phone        VARCHAR(20)   NOT NULL,
  email        VARCHAR(254)  NOT NULL DEFAULT '',
  address      LONGTEXT      NOT NULL,
  province     VARCHAR(50)   NOT NULL DEFAULT 'phnom_penh',
  notes        LONGTEXT      NOT NULL DEFAULT '',
  created_by_id INT UNSIGNED NULL,
  total_orders INT UNSIGNED  NOT NULL DEFAULT 0,
  total_spent  DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  is_active    TINYINT(1)    NOT NULL DEFAULT 1,
  created_at   DATETIME(6)   NOT NULL,
  updated_at   DATETIME(6)   NOT NULL,
  KEY customers_phone_idx (phone),
  CONSTRAINT customers_user_id_fk       FOREIGN KEY (user_id)       REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT customers_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_number   VARCHAR(20)   NOT NULL UNIQUE,
  customer_id    INT UNSIGNED  NOT NULL,
  seller_id      INT UNSIGNED  NULL,
  status         VARCHAR(20)   NOT NULL DEFAULT 'new',
  payment_status VARCHAR(20)   NOT NULL DEFAULT 'unpaid',
  payment_method VARCHAR(20)   NOT NULL DEFAULT '',
  subtotal       DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  delivery_fee   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  grand_total    DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  notes          LONGTEXT      NOT NULL DEFAULT '',
  is_draft       TINYINT(1)    NOT NULL DEFAULT 0,
  qr_code        VARCHAR(100)  NULL,
  printed_at     DATETIME(6)   NULL,
  printed_by_id  INT UNSIGNED  NULL,
  created_at     DATETIME(6)   NOT NULL,
  updated_at     DATETIME(6)   NOT NULL,
  KEY orders_status_idx (status),
  KEY orders_created_at_idx (created_at),
  CONSTRAINT orders_customer_id_fk   FOREIGN KEY (customer_id)   REFERENCES customers (id),
  CONSTRAINT orders_seller_id_fk     FOREIGN KEY (seller_id)     REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT orders_printed_by_id_fk FOREIGN KEY (printed_by_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id      INT UNSIGNED  NOT NULL,
  product_id    INT UNSIGNED  NULL,
  product_name  VARCHAR(300)  NOT NULL,
  product_code  VARCHAR(50)   NOT NULL,
  product_image VARCHAR(200)  NOT NULL DEFAULT '',
  quantity      INT UNSIGNED  NOT NULL DEFAULT 1,
  unit_price    DECIMAL(12,2) NOT NULL,
  cost_price    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_price   DECIMAL(15,2) NOT NULL,
  CONSTRAINT order_items_order_id_fk   FOREIGN KEY (order_id)   REFERENCES orders (id)   ON DELETE CASCADE,
  CONSTRAINT order_items_product_id_fk FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_status_history (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id     INT UNSIGNED NOT NULL,
  status       VARCHAR(20)  NOT NULL,
  note         LONGTEXT     NOT NULL DEFAULT '',
  changed_by_id INT UNSIGNED NULL,
  created_at   DATETIME(6)  NOT NULL,
  CONSTRAINT order_status_history_order_id_fk
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT order_status_history_changed_by_id_fk
    FOREIGN KEY (changed_by_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wishlists (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  created_at DATETIME(6)  NOT NULL,
  UNIQUE KEY wishlists_user_product_uniq (user_id, product_id),
  CONSTRAINT wishlists_user_id_fk    FOREIGN KEY (user_id)    REFERENCES users (id)    ON DELETE CASCADE,
  CONSTRAINT wishlists_product_id_fk FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cart_items (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity   INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6)  NOT NULL,
  updated_at DATETIME(6)  NOT NULL,
  UNIQUE KEY cart_items_user_product_uniq (user_id, product_id),
  CONSTRAINT cart_items_user_id_fk    FOREIGN KEY (user_id)    REFERENCES users (id)    ON DELETE CASCADE,
  CONSTRAINT cart_items_product_id_fk FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Inventory app
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS warehouses (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  code       VARCHAR(20)  NOT NULL UNIQUE,
  address    LONGTEXT     NOT NULL DEFAULT '',
  manager_id INT UNSIGNED NULL,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME(6)  NOT NULL,
  CONSTRAINT warehouses_manager_id_fk
    FOREIGN KEY (manager_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id   INT UNSIGNED NOT NULL UNIQUE,
  quantity     INT          NOT NULL DEFAULT 0,
  min_quantity INT          NOT NULL DEFAULT 5,
  max_quantity INT          NULL,
  location     VARCHAR(100) NOT NULL DEFAULT '',
  updated_at   DATETIME(6)  NOT NULL,
  CONSTRAINT stock_product_id_fk
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_movements (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type           VARCHAR(20)     NOT NULL,
  product_id     INT UNSIGNED    NOT NULL,
  quantity       INT             NOT NULL,
  before_qty     INT             NOT NULL,
  after_qty      INT             NOT NULL,
  reference      VARCHAR(100)    NOT NULL DEFAULT '',
  reference_type VARCHAR(50)     NOT NULL DEFAULT '',
  notes          LONGTEXT        NOT NULL DEFAULT '',
  created_by_id  INT UNSIGNED    NULL,
  created_at     DATETIME(6)     NOT NULL,
  KEY stock_movements_product_id_idx (product_id),
  KEY stock_movements_created_at_idx (created_at),
  CONSTRAINT stock_movements_product_id_fk
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT stock_movements_created_by_id_fk
    FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_transfers (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  transfer_number   VARCHAR(20)     NOT NULL UNIQUE,
  from_warehouse_id INT UNSIGNED    NULL,
  to_warehouse_id   INT UNSIGNED    NULL,
  status            VARCHAR(20)     NOT NULL DEFAULT 'pending',
  notes             LONGTEXT        NOT NULL DEFAULT '',
  created_by_id     INT UNSIGNED    NULL,
  approved_by_id    INT UNSIGNED    NULL,
  completed_at      DATETIME(6)     NULL,
  created_at        DATETIME(6)     NOT NULL,
  updated_at        DATETIME(6)     NOT NULL,
  CONSTRAINT stock_transfers_from_warehouse_id_fk
    FOREIGN KEY (from_warehouse_id) REFERENCES warehouses (id) ON DELETE SET NULL,
  CONSTRAINT stock_transfers_to_warehouse_id_fk
    FOREIGN KEY (to_warehouse_id) REFERENCES warehouses (id) ON DELETE SET NULL,
  CONSTRAINT stock_transfers_created_by_id_fk
    FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT stock_transfers_approved_by_id_fk
    FOREIGN KEY (approved_by_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  transfer_id   BIGINT UNSIGNED NOT NULL,
  product_id    INT UNSIGNED    NOT NULL,
  requested_qty INT UNSIGNED    NOT NULL,
  actual_qty    INT UNSIGNED    NOT NULL DEFAULT 0,
  UNIQUE KEY stock_transfer_items_transfer_product_uniq (transfer_id, product_id),
  CONSTRAINT stock_transfer_items_transfer_id_fk
    FOREIGN KEY (transfer_id) REFERENCES stock_transfers (id) ON DELETE CASCADE,
  CONSTRAINT stock_transfer_items_product_id_fk
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Delivery app
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS delivery_companies (
  id                    INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name                  VARCHAR(200)  NOT NULL,
  code                  VARCHAR(20)   NOT NULL UNIQUE,
  logo                  VARCHAR(100)  NULL,
  contact               VARCHAR(20)   NOT NULL DEFAULT '',
  email                 VARCHAR(254)  NOT NULL DEFAULT '',
  website               VARCHAR(200)  NOT NULL DEFAULT '',
  tracking_url_template VARCHAR(200)  NOT NULL DEFAULT '',
  base_fee              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_active             TINYINT(1)    NOT NULL DEFAULT 1,
  created_at            DATETIME(6)   NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS delivery_zones (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(200)  NOT NULL,
  province   VARCHAR(100)  NOT NULL,
  fee        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  company_id INT UNSIGNED  NOT NULL,
  is_active  TINYINT(1)    NOT NULL DEFAULT 1,
  CONSTRAINT delivery_zones_company_id_fk
    FOREIGN KEY (company_id) REFERENCES delivery_companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS deliveries (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id         INT UNSIGNED  NOT NULL UNIQUE,
  company_id       INT UNSIGNED  NULL,
  tracking_number  VARCHAR(100)  NOT NULL DEFAULT '',
  fee              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status           VARCHAR(20)   NOT NULL DEFAULT 'ready',
  notes            LONGTEXT      NOT NULL DEFAULT '',
  recipient_name   VARCHAR(200)  NOT NULL,
  recipient_phone  VARCHAR(20)   NOT NULL,
  delivery_address LONGTEXT      NOT NULL,
  province         VARCHAR(100)  NOT NULL,
  latitude         DECIMAL(10,7) NULL,
  longitude        DECIMAL(10,7) NULL,
  assigned_to_id   INT UNSIGNED  NULL,
  assigned_by_id   INT UNSIGNED  NULL,
  shipped_at       DATETIME(6)   NULL,
  delivered_at     DATETIME(6)   NULL,
  created_at       DATETIME(6)   NOT NULL,
  updated_at       DATETIME(6)   NOT NULL,
  CONSTRAINT deliveries_order_id_fk
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT deliveries_company_id_fk
    FOREIGN KEY (company_id) REFERENCES delivery_companies (id) ON DELETE SET NULL,
  CONSTRAINT deliveries_assigned_to_id_fk
    FOREIGN KEY (assigned_to_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT deliveries_assigned_by_id_fk
    FOREIGN KEY (assigned_by_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS delivery_status_history (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  delivery_id    INT UNSIGNED    NOT NULL,
  status         VARCHAR(20)     NOT NULL,
  note           LONGTEXT        NOT NULL DEFAULT '',
  location       VARCHAR(200)    NOT NULL DEFAULT '',
  changed_by_id  INT UNSIGNED    NULL,
  created_at     DATETIME(6)     NOT NULL,
  CONSTRAINT delivery_status_history_delivery_id_fk
    FOREIGN KEY (delivery_id) REFERENCES deliveries (id) ON DELETE CASCADE,
  CONSTRAINT delivery_status_history_changed_by_id_fk
    FOREIGN KEY (changed_by_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Finance app
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS expense_categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  description LONGTEXT     NOT NULL DEFAULT '',
  is_active   TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expenses (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  category_id  INT UNSIGNED    NULL,
  description  LONGTEXT        NOT NULL,
  amount       DECIMAL(15,2)   NOT NULL,
  date         DATE            NOT NULL,
  receipt_image VARCHAR(100)   NULL,
  reference    VARCHAR(100)    NOT NULL DEFAULT '',
  notes        LONGTEXT        NOT NULL DEFAULT '',
  created_by_id INT UNSIGNED   NULL,
  created_at   DATETIME(6)     NOT NULL,
  updated_at   DATETIME(6)     NOT NULL,
  KEY expenses_date_idx (date),
  CONSTRAINT expenses_category_id_fk
    FOREIGN KEY (category_id) REFERENCES expense_categories (id) ON DELETE SET NULL,
  CONSTRAINT expenses_created_by_id_fk
    FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS revenues (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id       INT UNSIGNED    NULL UNIQUE,
  amount         DECIMAL(15,2)   NOT NULL,
  payment_method VARCHAR(20)     NOT NULL,
  reference      VARCHAR(100)    NOT NULL DEFAULT '',
  notes          LONGTEXT        NOT NULL DEFAULT '',
  received_at    DATETIME(6)     NOT NULL,
  received_by_id INT UNSIGNED    NULL,
  created_at     DATETIME(6)     NOT NULL,
  KEY revenues_received_at_idx (received_at),
  CONSTRAINT revenues_order_id_fk
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL,
  CONSTRAINT revenues_received_by_id_fk
    FOREIGN KEY (received_by_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS daily_summaries (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  date           DATE          NOT NULL UNIQUE,
  total_orders   INT UNSIGNED  NOT NULL DEFAULT 0,
  total_revenue  DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_cost     DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_expenses DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  gross_profit   DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  net_profit     DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  updated_at     DATETIME(6)   NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Done! 33 empty tables created.
-- NOTE: After installing Python, run:
--   python manage.py migrate --fake-initial
-- to let Django track these tables without re-creating them.
-- Create the first admin account with:
--   python manage.py createsuperuser
-- ============================================================
