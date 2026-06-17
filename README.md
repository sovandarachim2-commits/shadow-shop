# Shadow Shop — Wholesale Cosmetics Management System

Enterprise-level wholesale e-commerce management system for cosmetics distribution.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.13, Django 5, Django REST Framework |
| Database | MySQL 8 |
| Frontend | React 18, Vite, Tailwind CSS, ShadCN UI |
| Storage | Cloudflare R2 |
| Notifications | Telegram Bot |
| Maps | Google Maps API |
| Deployment | Ubuntu, Nginx, Gunicorn |

## Project Structure

```
Shadow Shop/
├── backend/                  # Django API
│   ├── config/               # Settings, URLs, WSGI
│   ├── apps/
│   │   ├── accounts/         # Users, Roles, Permissions, Activity Logs
│   │   ├── products/         # Products, Categories, Sets, Promotions
│   │   ├── orders/           # Orders, Customers, Cart, Wishlist
│   │   ├── inventory/        # Stock, Movements, Transfers
│   │   ├── delivery/         # Delivery Companies, Tracking
│   │   ├── finance/          # Revenue, Expenses, Daily Summary
│   │   ├── notifications/    # Telegram Bot
│   │   └── reports/          # Sales, Product, Inventory Reports
│   ├── utils/                # Permissions, Pagination, Storage
│   ├── requirements.txt
│   ├── .env.example
│   └── gunicorn.conf.py
├── frontend/                 # React App
│   ├── src/
│   │   ├── api/              # API client & endpoints
│   │   ├── components/
│   │   │   ├── layout/       # AdminLayout, CustomerLayout, Sidebar, Header
│   │   │   ├── ui/           # Badge, Card, Table, Modal
│   │   │   └── shared/       # PageHeader, SearchFilter
│   │   ├── pages/
│   │   │   ├── admin/        # Full admin dashboard
│   │   │   └── customer/     # Customer e-commerce app
│   │   ├── store/            # Zustand state (auth, cart)
│   │   └── utils/            # Helpers, formatters
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── deploy/
    ├── nginx.conf
    ├── shadow_shop.service
    ├── setup.sh
    └── deploy.sh
```

## Admin Dashboard Features

- **Dashboard**: KPI cards, sales chart, order status pie chart, recent orders, quick actions
- **Orders**: Create, list, detail with full status workflow (New → Printed → Preparing → Packed → Shipped → Completed)
- **Products**: Full CRUD with images, categories, sets, promotions
- **Inventory**: Stock dashboard, movements (In/Out/Transfer/Adjustment/Damaged), transfers
- **Print Center**: Print receipts, invoices, delivery notes, packing slips, QR labels (batch printing)
- **Scanner**: QR/barcode scanner for order verification and packing validation
- **Delivery**: Assign delivery companies, track shipments, update status
- **Finance**: Revenue dashboard, expense tracking, P&L reports
- **Users**: Multi-role user management with granular permissions
- **Settings**: General, Telegram bot, delivery zones, payment methods

## Customer App Features

- **Home**: Search, banners, categories, best sellers, new arrivals, lucky box, offers
- **Products**: Search, filter by category, sort, product grid
- **Product Detail**: Gallery, rating, quantity selector, add to cart / buy now
- **Cart**: Item management, quantity update, order summary
- **Checkout**: 4-step (Info → Delivery → Payment → Review)
- **Payment Methods**: ABA, ACLEDA, Wing, Cash on Delivery
- **My Orders**: Order tracking with timeline
- **Profile**: Account info, navigation, logout

## User Roles

| Role | Access |
|------|--------|
| Super Admin | Full system access |
| Admin | All admin functions |
| Seller | Create orders, manage customers |
| Cashier | Print orders, record payments |
| Warehouse | View & prepare orders, scanner |
| Scanner | Scan & verify packing |
| Delivery | Update delivery status |
| Customer | Shop, orders, profile |

## Order Status Flow

```
New → Printed → Preparing → Packed → Shipped → Completed
                                              ↘ Cancelled
```

## Quick Start (Development)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Edit with your settings
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
cd "C:\xampp\htdocs\Shadow Shop\backend"
.\venv\Scripts\Activate.ps1
python manage.py runserver 8001


### Frontend
```bash
cd frontend
npm install
npm run dev
```

### API Documentation
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/

## API Endpoints

| Module | Base URL |
|--------|----------|
| Auth | /api/auth/ |
| Products | /api/products/ |
| Orders | /api/orders/ |
| Inventory | /api/inventory/ |
| Delivery | /api/delivery/ |
| Finance | /api/finance/ |
| Notifications | /api/notifications/ |
| Reports | /api/reports/ |

## Design System

- **Colors**: White background, Navy sidebar (#1e1b4b), Purple accent (#7c3aed), Pink cosmetics (#ec4899)
- **Typography**: Inter font family
- **Radius**: 12-16px rounded corners
- **Shadows**: Soft card shadows
- **Mobile First**: Responsive for all screen sizes

## Deployment (Ubuntu + Nginx + Gunicorn)

```bash
# On Ubuntu server:
git clone <repo> /var/www/shadow_shop
cd /var/www/shadow_shop
bash deploy/setup.sh
# Edit .env, then:![alt text](image.png)
