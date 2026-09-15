# 🏗️ System Architecture — Shadow Shop

This document outlines the high-level system architecture, component topology, integration points, data flows, and security model of the **Shadow Shop Wholesale Cosmetics Management System**.

---

## 1. High-Level Architecture Overview

Shadow Shop adopts a **decoupled client-server architecture** (SPA + Modular Monolith API) optimized for high reliability, fast local performance, and ease of multi-device operations (desktop back-office & mobile customer app).

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                                CLIENT LAYER                                 │
 │                                                                             │
 │    ┌───────────────────────────┐           ┌───────────────────────────┐    │
 │    │ Admin Back-Office (React) │           │ Customer Web App (React)  │    │
 │    └─────────────┬─────────────┘           └─────────────┬─────────────┘    │
 └──────────────────┼───────────────────────────────────────┼──────────────────┘
                    │ HTTPS / REST API                      │ HTTPS / REST API
                    ▼                                       ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         REVERSE PROXY & GATEWAY                             │
 │                                                                             │
 │                          Nginx Reverse Proxy & SSL                          │
 └──────────────────────────────────┬──────────────────────────────────────────┘
                                    │ Static / WSGI Pass
                                    ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                             BACKEND API LAYER                               │
 │                                                                             │
 │                   Django 5 + DRF (Modular Monolith)                         │
 │                                                                             │
 │  ┌──────────┬───────────┬────────────┬─────────────┬───────────┬─────────┐  │
 │  │ Accounts │ Products  │ Orders     │ Inventory   │ Delivery  │ Finance │  │
 │  │ Apps     │ Apps      │ Apps       │ Apps        │ Apps      │ Apps    │  │
 │  └──────────┴───────────┴────────────┴─────────────┴───────────┴─────────┘  │
 └───────┬──────────────────────┬─────────────────────────────┬────────────────┘
         │                      │                             │
         ▼                      ▼                             ▼
 ┌───────────────┐      ┌───────────────┐             ┌───────────────┐
 │   DATABASE    │      │ OBJECT STORAGE│             │ EXTERNAL APIS │
 │ MySQL 8 DB    │      │ Cloudflare R2 │             │ Telegram Bot  │
 │ (Relational)  │      │ (Images/Files)│             │ Payment GWs   │
 └───────────────┘      └───────────────┘             └───────────────┘
```

---

## 2. Core System Components

### 2.1 Client Layer (Frontend SPA)
- **Technology:** React 18, Vite, Tailwind CSS, Zustand, React Router.
- **Portals:**
  - **Admin Back-Office:** Operations center for inventory management, order processing workflow, barcode scanning, thermal printing (invoices, packing slips), user role control, and financial analytics.
  - **Customer Portal:** E-commerce shop experience optimized for mobile ordering, live order tracking, promotions, and payment confirmations.

### 2.2 API Server Layer (Django 5 REST Framework)
- **Technology:** Python 3.13, Django 5.x, Django REST Framework (DRF), Gunicorn WSGI.
- **Architecture Pattern:** **Modular Monolith** — business domains are divided into dedicated Django applications (`accounts`, `products`, `orders`, `inventory`, `delivery`, `finance`, `payments`, `notifications`, `reports`).

### 2.3 Data Storage & Asset Management
- **Primary Database:** MySQL 8.0 serving transactional relational data, strict foreign key constraints, indexes, and full text search support.
- **Object Storage:** Cloudflare R2 / AWS S3 compatible storage for high-resolution product media, receipts, and invoice documents.

---

## 3. Order Processing State Machine

Order processing follows a strictly controlled state lifecycle to ensure stock accuracy and error-free fulfillment:

```
 [ Draft / New ] ──► [ Printed ] ──► [ Preparing ] ──► [ Packed ] ──► [ Shipped ] ──► [ Completed ]
        │                                                                                   ▲
        └─────────────────────────────────► [ Cancelled ] ──────────────────────────────────┘
```

| Order State | Responsible Role | Stock Effect | Description |
| :--- | :--- | :--- | :--- |
| **New** | Customer / Seller | Reserved | Order created and awaiting store acceptance. |
| **Printed** | Cashier / Warehouse | Reserved | Packing list & thermal invoice printed. |
| **Preparing** | Warehouse Staff | Reserved | Items being picked from warehouse shelves. |
| **Packed** | Scanner / Warehouse | Deducted | Verified via QR/Barcode scanner. |
| **Shipped** | Delivery / Driver | Deducted | Order dispatched with delivery driver. |
| **Completed** | Admin / Cashier | Deducted | Delivery confirmed & payment reconciled. |
| **Cancelled** | Admin / Super Admin | Released | Order voided; reserved stock returned. |

---

## 4. Integration Points & External Services

1. **Telegram Notification Engine:** Sends automated order alerts, stock warnings, daily revenue digests, and customer receipts directly to Telegram staff groups.
2. **Local Payment Integration:** QR payload & screenshot verification for ABA KHQR, ACLEDA Bank, Wing, and Cash on Delivery (COD).
3. **Cloudflare R2 Storage:** S3-compatible, zero-egress fee media storage for optimized product image serving worldwide.
4. **Google Maps API:** Location autocomplete and delivery distance calculation for checkout address selection.

---

## 5. Security & Compliance Architecture

- **Authentication:** Token-based Authentication / Session Security with HTTP-only cookies and Bearer tokens.
- **Role-Based Access Control (RBAC):** Granular permission enforcement at both API endpoints (DRF Permissions) and UI route guards.
- **Data Protection:** Password hashing using PBKDF2 with SHA256, strict CORS policy (`CORS_ALLOWED_ORIGINS`), CSRF trusted origins, and HTTPS enforcement via Nginx + Certbot SSL.
- **Audit Logs:** Immutable audit log tracking sensitive user operations (stock adjustments, manual price edits, user role changes).
