# Database Guide: Resetting Orders in Shadow Shop

This document provides complete instructions on how to safely reset or clear orders in the **Shadow Shop** database. Use this guide during testing, staging cleanup, or when you want to clear test transactions and restart order numbering from `#1`.

---

## 📌 Summary: What Gets Cleared vs. Preserved

| Cleared / Reset (Order Data) | Safe & Preserved (System Data) |
| :--- | :--- |
| ✅ `orders` (Main orders table) | 🛡️ `products` (All catalog items & images) |
| ✅ `order_items` (Order line items) | 🛡️ `stock` & `warehouses` (Product inventory) |
| ✅ `order_status_history` (Status logs) | 🛡️ `categories` & `brands` |
| ✅ `prepare_records` (Warehouse packing) | 🛡️ `users` & `customers` (User accounts) |
| ✅ `out_records` (Warehouse dispatch) | 🛡️ `roles` & `permissions` |
| ✅ `deliveries` & tracking history | 🛡️ `banners` & `site_settings` |
| ✅ `aba_payments` & `bakong_payments` | 🛡️ `reward_items` & `promo_codes` (definitions) |
| ✅ `pending_checkouts` | 🛡️ `expense_categories` & non-order expenses |
| ✅ `revenues` (Entries linked to orders) | |

---

## 🚀 Method 1: Using the Django Command (Recommended)

A dedicated Django management command is available in `backend/apps/orders/management/commands/reset_orders.py`. It runs within a database transaction, cleans up all cascading relationships, and resets the auto-increment ID back to `1`.

### Step 1: Open Terminal in the backend directory
```powershell
cd "c:\xampp\htdocs\Shadow Shop\backend"
```

### Step 2: Activate the Python Virtual Environment
```powershell
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Or Command Prompt (cmd)
.\venv\Scripts\activate.bat
```

### Step 3: Run the Reset Command
```powershell
python manage.py reset_orders
```

The system will ask for confirmation:
```text
⚠️ WARNING: This will delete ALL orders from the database,
along with associated order items, delivery records, and payment logs.
Products, inventory, customers, and user accounts will NOT be deleted.

Type 'yes' to proceed: yes
```

### Optional Flags:
- **Skip confirmation prompt (Force mode)**:
  ```powershell
  python manage.py reset_orders --force
  ```
- **Also clear abandoned customer carts**:
  ```powershell
  python manage.py reset_orders --force --clear-carts
  ```

---

## 🗄️ Method 2: Direct SQL in phpMyAdmin or MySQL CLI

If you prefer using **phpMyAdmin** in XAMPP or the **MySQL command-line client**, you can execute the pre-built script located at [`database/reset_orders.sql`](file:///c:/xampp/htdocs/Shadow%20Shop/database/reset_orders.sql).

### Option A: Via phpMyAdmin (GUI)
1. Open your browser and go to `http://localhost/phpmyadmin/`.
2. In the left sidebar, click on the **`shadow_shop`** database.
3. Click on the **SQL** tab in the top navigation bar.
4. Copy and paste the following script into the text box:

```sql
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Clear status history and line items
TRUNCATE TABLE order_status_history;
TRUNCATE TABLE order_items;

-- 2. Clear warehouse packing & dispatch records
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

-- 6. Truncate orders and reset auto-increment counter to 1
TRUNCATE TABLE orders;
ALTER TABLE orders AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;
```
5. Click **Go** (Execute).

### Option B: Via MySQL Terminal
```powershell
# In PowerShell:
mysql -u root -p shadow_shop < "c:\xampp\htdocs\Shadow Shop\database\reset_orders.sql"
```
*(If your MySQL root user does not have a password, omit `-p`)*

---

## 🎯 Method 3: Resetting a Single Specific Order

If you only want to delete or reset a specific test order (e.g. Order ID `#15`) without wiping other orders:

### 1. Delete a specific order using Django Shell:
```powershell
cd "c:\xampp\htdocs\Shadow Shop\backend"
python manage.py shell
```
Inside the interactive shell:
```python
from apps.orders.models import Order

# Find order with ID 15 and delete it (cascades to items, payments, etc.)
order = Order.objects.filter(id=15).first()
if order:
    order.delete()
    print("Order deleted successfully.")
else:
    print("Order not found.")
exit()
```

### 2. Reset an order's status back to `pending`:
```python
from apps.orders.models import Order

order = Order.objects.filter(id=15).first()
if order:
    order.status = 'pending'
    order.payment_status = 'pending'
    order.save()
    print("Order status reset to pending.")
exit()
```

---

## 🔍 Verification

After resetting orders, verify that the database is clean:

1. **Check via Django Shell**:
   ```powershell
   python manage.py shell -c "from apps.orders.models import Order; print('Total Orders:', Order.objects.count())"
   ```
   *Expected output:* `Total Orders: 0`

2. **Check the Admin Dashboard**:
   - Open `http://localhost:5173/admin/orders` (or your production admin URL).
   - The order list will be clean and empty.
   - The next order created by a customer will receive order number `#1` (e.g., `ORD-000001` or ID `1`).

---

## ⚠️ Important Precautions & Best Practices

1. **Backup First (Production Environments)**:
   Always take a database backup before resetting:
   ```powershell
   mysqldump -u root shadow_shop > backup_before_reset.sql
   ```
2. **Cache Synchronization**:
   Shadow Shop uses storefront caching. If you reset orders while the admin web app is running, refresh the Admin Orders page or restart the Django server to clear in-memory query caches.
