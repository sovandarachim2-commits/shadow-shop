# 🎨 Frontend Architecture — Shadow Shop

This document details the frontend architecture, technology stack, directory structure, state management patterns, UI design integration, and hardware integration features (Thermal Printing & Scanner).

---

## 1. Technology Stack

- **Core Library:** React 18
- **Build Tool:** Vite (Ultra-fast HMR and build optimization)
- **Styling & UI:**
  - Tailwind CSS (Utility-first styling system)
  - Shadcn UI (Radix-based accessible components)
  - Lucide React (Unified icon library)
- **State Management:** Zustand (Lightweight, atomic global state management)
- **HTTP Client:** Axios (Interceptors for authentication and API error management)
- **Routing:** React Router v6 (Nested routes, lazy loading, and role guards)
- **Multilingual Support:** i18next (English / Khmer language switching)

---

## 2. Directory Structure (`frontend/src/`)

```
frontend/src/
├── api/                   # Centralized API service functions
│   ├── axios.js           # Pre-configured Axios instance (BaseURL, Headers, Interceptors)
│   ├── auth.js            # Authentication endpoints
│   ├── orders.js          # Order management API
│   ├── products.js        # Products & Inventory API
│   ├── delivery.js        # Delivery & Logistics API
│   └── finance.js         # Financial & Expense API
├── assets/                # Static assets (Logos, Icons, Audio alerts)
├── components/            # Reusable UI Components
│   ├── layout/            # AdminLayout, CustomerLayout, Sidebar, Header
│   ├── ui/                # Custom UI primitives (Badge, Card, Modal, Table, Input)
│   ├── scanner/           # Barcode/QR Scanner integration component
│   └── printer/           # Receipt & Invoice thermal print templates
├── data/                  # Static configuration & initial seed data
├── hooks/                 # Custom React hooks (useAuth, useScan, usePrint, useDebounce)
├── i18n/                  # Internationalization translation files (en.json, km.json)
├── pages/                 # Page View Controllers
│   ├── admin/             # Back-Office Admin Pages (Dashboard, Inventory, Orders, Finance)
│   └── customer/          # Customer App Pages (Home, Shop, Cart, Checkout, Tracking)
├── store/                 # Zustand Global State Stores
│   ├── authStore.js       # Auth token, user info, permissions
│   ├── cartStore.js       # Customer cart items, totals, discount rules
│   └── orderStore.js      # Active orders & live status updates
├── types/                 # TypeScript JSDoc definitions
├── utils/                 # Utility functions (currency formatting, date formatters)
├── App.jsx                # Main Application routing entrypoint
├── index.css              # Global design system variables & utility styles
└── main.jsx               # DOM Root Initialization
```

---

## 3. State Management Architecture (Zustand)

Shadow Shop uses **Zustand** for state management to avoid prop drilling and maintain high UI responsiveness:

```
                      ┌─────────────────────────────────┐
                      │        Zustand Stores           │
                      ├─────────────────────────────────┤
                      │ - AuthStore (User, Roles, JWT)  │
                      │ - CartStore (Items, Totals)     │
                      │ - OrderStore (Fulfillment Workflow)│
                      └────────────────┬────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
 ┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
 │  Customer Checkout │    │  Admin Dashboard   │    │  Warehouse Scanner │
 └────────────────────┘    └────────────────────┘    └────────────────────┘
```

- **`authStore`**: Manages logged-in user profile, permissions array, access token storage (localStorage), and automatic logout handling on `401 Unauthorized`.
- **`cartStore`**: Persists customer cart items locally, calculates subtotal/VAT/discounts, and handles item additions and volume tier calculations.
- **`orderStore`**: Tracks active orders in the backend fulfillment pipeline with live filtering by status (`New`, `Preparing`, `Packed`, etc.).

---

## 4. Hardware Integration Subsystems

### 4.1 Thermal Print Engine
- Supports standard 80mm & 58mm POS thermal printers.
- CSS `@media print` rules ensure clean, margin-free receipt printing.
- Generates batch print layouts for:
  - Sales Receipts
  - Official Invoices
  - Packing Slips with Item Checklists
  - Shipping Labels with QR Barcodes

### 4.2 QR / Barcode Scanner Subsystem
- Integrates browser-based camera scanning (`html5-qrcode`) and USB hardware HID barcode scanners.
- Real-time scanning feedback (audio chimes for successful match / error sound for invalid items).
- Instant verification mode for warehouse packing accuracy.

---

## 5. Mobile-First Customer App vs. Admin Back-Office

| Feature Area | Customer App | Admin Back-Office |
| :--- | :--- | :--- |
| **Target Device** | iOS / Android Mobile & Desktop Browsers | Desktop / Tablet Screens |
| **Hero Banner** | Touch 90% peek carousel (Mobile) / **Concept 2 Split Slider + Side Quick-Cards** (Desktop `lg:`) | KPI summary cards & analytics banners |
| **Navigation** | Bottom Navigation Bar (Mobile) + Header | Left Collapsible Sidebar |
| **Interaction** | Touch-friendly cards, swipe actions, hover desktop controls | High-density data tables, filters, bulk actions |
| **Performance** | Lazy-loaded routes & compressed image webp | Fast keyboard shortcuts & instant data updates |
