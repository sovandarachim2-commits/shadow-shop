# ⚙️ Backend Architecture — Shadow Shop

This document defines the Django REST Framework (DRF) backend architecture, modular Django app structure, authentication & authorization model, API conventions, and background task management.

---

## 1. Technology Stack & Frameworks

- **Language & Runtime:** Python 3.13
- **Web Framework:** Django 5.x
- **API Framework:** Django REST Framework (DRF)
- **Database Connector:** `mysqlclient` (Native C-bindings for MySQL 8)
- **Storage Driver:** `django-storages` + `boto3` (Cloudflare R2 / AWS S3 compatibility)
- **Documentation:** `drf-spectacular` (OpenAPI 3.0 / Swagger UI / ReDoc)
- **WSGI Server:** Gunicorn (Production multi-worker deployment behind Nginx)

---

## 2. Modular Django App Architecture (`backend/apps/`)

The backend follows a domain-driven modular monolith pattern. Each app in `backend/apps/` is responsible for a self-contained domain:

```
backend/
├── config/                  # Project configuration, settings, URLs, WSGI/ASGI
└── apps/
    ├── accounts/            # User authentication, custom user model, roles, permissions, audit logs
    ├── products/            # Product catalog, categories, product sets, volume pricing, promotions
    ├── orders/              # Orders, order items, cart, wishlist, status workflow state machine
    ├── inventory/           # Stock levels, movements (In/Out/Transfer/Adjustment), warehouse tracking
    ├── delivery/            # Delivery partners, tracking numbers, shipping fee calculations
    ├── finance/             # Revenue, daily summaries, operational expenses, profit & loss reports
    ├── payments/            # Payment gateway callbacks (ABA, ACLEDA, Wing), QR generation
    ├── notifications/       # Telegram Bot integration, automated operational alerts
    └── reports/             # Analytical aggregations, export generation (Excel / PDF)
```

---

## 3. Authentication & Role-Based Access Control (RBAC)

### 3.1 Authentication Mechanism
- **Token / Session Authentication:** API requests authenticate via HTTP headers (`Authorization: Token <token>` or `Bearer <jwt>`).
- **Telegram Web App Authentication:** Validates HMAC-SHA256 signatures for Telegram Mini App auth payloads.

### 3.2 User Roles & Access Hierarchy

```
[ Super Admin ] ──► [ Admin ] ──► [ Seller ] ──► [ Cashier ] ──► [ Warehouse ] ──► [ Delivery ] ──► [ Customer ]
```

| Role | Domain Access Scope |
| :--- | :--- |
| **Super Admin** | Unrestricted system configuration, database management, user role assignments. |
| **Admin** | Full management of orders, products, inventory, financial reports, and settings. |
| **Seller** | Customer creation, draft order entry, price negotiation view. |
| **Cashier** | Thermal print generation, order status updates, manual payment verification. |
| **Warehouse / Scanner** | Inventory movement logs, order picking verification, packing scan validation. |
| **Delivery Driver** | Order dispatch status, proof-of-delivery upload, customer delivery list. |
| **Customer** | Product browsing, shopping cart, checkout, order tracking, personal profile. |

---

## 4. REST API Endpoint Overview

All API routes follow strict RESTful naming conventions under `/api/`:

| Path Prefix | Module | Description |
| :--- | :--- | :--- |
| `/api/auth/` | `accounts` | Login, logout, user profile, password reset, token refresh. |
| `/api/products/` | `products` | Product catalog CRUD, categories, promotions, sets, media upload. |
| `/api/orders/` | `orders` | Order creation, status workflow transitions, receipt print payload. |
| `/api/inventory/` | `inventory` | Stock management, warehouse transfers, damaged goods recording. |
| `/api/delivery/` | `delivery` | Delivery company settings, shipment tracking updates. |
| `/api/finance/` | `finance` | Expense records, daily financial reconciliation, revenue metrics. |
| `/api/notifications/`| `notifications` | Telegram webhooks, alert triggers, message logs. |
| `/api/reports/` | `reports` | Analytical summaries, CSV/XLSX export endpoints. |
| `/api/docs/` | `config` | Interactive Swagger API documentation. |

---

## 5. Middleware & Error Handling Pipeline

1. **`CORSMiddleware`**: Controls cross-origin browser access.
2. **`AuditLogMiddleware`**: Captures user IP, user agent, request method, and modifications for compliance tracking.
3. **`CustomExceptionHandler`**: Formats all exception responses (400, 401, 403, 404, 500) into a standardized JSON response format:

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to perform this action.",
    "details": {}
  }
}
```

---

## 6. Background Processing & Telegram Webhook Engine

- **Telegram Bot Webhook Engine:** Listens to incoming bot interactions and dispatches async alerts for:
  - New high-value order creation.
  - Low stock warning thresholds.
  - Cashier shift closing reports.
- **Asynchronous Data Export:** Generates heavy PDF/Excel analytical reports asynchronously to avoid blocking the main WSGI request workers.
