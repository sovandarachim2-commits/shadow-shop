# 🗄️ Database Architecture — Shadow Shop

This document specifies the database architecture, relational schema, table structures, index strategy, and transactional integrity guarantees for the **Shadow Shop** MySQL 8 database.

---

## 1. Database Specifications

- **Database Engine:** MySQL 8.0+
- **Storage Engine:** InnoDB (ACID compliant, row-level locking, foreign key enforcement)
- **Character Set:** `utf8mb4`
- **Collation:** `utf8mb4_unicode_ci` (Full Unicode support for Khmer text and Emojis)

---

## 2. Entity-Relationship (ER) Overview

```
 ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
 │    Users     │ 1────N  │    Orders    │ 1────N  │  OrderItems  │
 ├──────────────┤         ├──────────────┤         ├──────────────┤
 │ id (PK)      │         │ id (PK)      │         │ id (PK)      │
 │ phone / role │         │ user_id (FK) │         │ order_id(FK) │
 └──────┬───────┘         │ status       │         │ product_(FK) │
        │                 └──────┬───────┘         └──────┬───────┘
        │ 1                      │ 1                      │ N
        ▼ N                      ▼ N                      ▼ 1
 ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
 │  AuditLogs   │         │ Deliveries   │         │   Products   │
 └──────────────┘         └──────────────┘         └──────┬───────┘
                                                          │ N
                                                          ▼ 1
                                                   ┌──────────────┐
                                                   │  Categories  │
                                                   └──────────────┘
```

---

## 3. Core Database Tables & Schemas

### 3.1 `accounts_user` (Users & Permissions)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BigInt | Primary Key, Auto Increment | Unique User ID |
| `username` | VarChar(150) | Unique, Not Null | Phone number or username |
| `email` | VarChar(254) | Nullable | Email address |
| `role` | VarChar(20) | Not Null, Index | Role (`super_admin`, `admin`, `seller`, `cashier`, `warehouse`, `delivery`, `customer`) |
| `is_active` | Boolean | Default True | Account activation state |
| `created_at` | DateTime | Not Null | User creation timestamp |

### 3.2 `products_product` (Product Catalog)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BigInt | Primary Key, Auto Increment | Product ID |
| `name` | VarChar(255) | Not Null, Index | Product title (Khmer/English) |
| `sku` | VarChar(100) | Unique, Index | Barcode / Stock Keeping Unit |
| `category_id` | BigInt | Foreign Key | Link to `products_category` |
| `cost_price` | Decimal(10,2) | Not Null | Wholesale cost |
| `retail_price`| Decimal(10,2) | Not Null | Selling price |
| `stock_qty` | Integer | Default 0, Index | Current available stock level |
| `min_stock` | Integer | Default 5 | Threshold for low-stock alerts |
| `image_url` | VarChar(500) | Nullable | Cloudflare R2 image link |

### 3.3 `orders_order` (Order Management)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BigInt | Primary Key, Auto Increment | Order ID |
| `order_number`| VarChar(50) | Unique, Index | Human-readable order code (e.g., `ORD-2026-0089`) |
| `customer_id` | BigInt | Foreign Key | Buyer reference |
| `status` | VarChar(20) | Not Null, Index | Lifecycle state (`new`, `printed`, `preparing`, `packed`, `shipped`, `completed`, `cancelled`) |
| `subtotal` | Decimal(10,2) | Not Null | Items total |
| `discount` | Decimal(10,2) | Default 0.00 | Applied discount |
| `total_amount`| Decimal(10,2) | Not Null | Net total amount payable |
| `payment_type`| VarChar(20) | Not Null | Payment method (`aba`, `acleda`, `wing`, `cod`) |
| `payment_status`|VarChar(20) | Default `pending` | Payment state (`pending`, `paid`, `refunded`) |
| `created_at` | DateTime | Not Null, Index | Order placement timestamp |

### 3.4 `inventory_movement` (Stock Audit & Movements)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BigInt | Primary Key, Auto Increment | Movement ID |
| `product_id` | BigInt | Foreign Key, Index | Product reference |
| `type` | VarChar(20) | Not Null, Index | Movement type (`in`, `out`, `transfer`, `adjustment`, `damaged`) |
| `quantity` | Integer | Not Null | Quantity changed (+ / -) |
| `notes` | Text | Nullable | Reason for adjustment |
| `created_by_id`| BigInt | Foreign Key | Operator user ID |
| `created_at` | DateTime | Not Null | Timestamp of movement |

---

## 4. Indexing & Optimization Strategy

To maintain sub-100ms API response times across millions of records:

1. **Composite Indexes:**
   - `orders_order(status, created_at)` for fast dashboard status filtering.
   - `products_product(category_id, is_active)` for category shop browsing.
   - `inventory_movement(product_id, created_at)` for historical stock movement queries.
2. **Search Indexing:**
   - B-Tree index on `sku` and `order_number` for instant barcode scanner lookups.

---

## 5. Database Transaction Integrity

- **Atomic Order Placement:** Order creation and stock reservation are wrapped inside `django.db.transaction.atomic()` blocks.
- **Stock Double-Deduction Prevention:** Stock validation utilizes database row locking (`select_for_update()`) during batch packing scans to avoid race conditions.
