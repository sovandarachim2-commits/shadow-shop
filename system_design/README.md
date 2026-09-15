# Shadow Shop — System Design Documentation

Welcome to the **Shadow Shop** System Design repository. This folder contains comprehensive technical specifications, architectural diagrams, data models, and UI design standards for the wholesale cosmetics management platform.

---

## 📚 Table of Contents

| Document | Description |
| :--- | :--- |
| 🏗️ [**Architecture Overview**](file:///c:/xampp/htdocs/Shadow%20Shop/system_design/architecture.md) | High-level system topology, data flow, component boundaries, security, and deployment strategy. |
| 🎨 [**Frontend Architecture**](file:///c:/xampp/htdocs/Shadow%20Shop/system_design/frontend.md) | Component architecture, state management (Zustand), route structure, UI libraries, and print/scan subsystems. |
| ⚙️ [**Backend Architecture**](file:///c:/xampp/htdocs/Shadow%20Shop/system_design/backend.md) | Django 5 REST backend design, modular app structure, auth & RBAC, middleware, and API endpoints. |
| 🗄️ [**Database Design**](file:///c:/xampp/htdocs/Shadow%20Shop/system_design/database.md) | MySQL schema specifications, Entity-Relationship (ER) models, indexes, constraints, and audit logging. |
| 💎 [**UI/UX Design System**](file:///c:/xampp/htdocs/Shadow%20Shop/system_design/design.md) | Design tokens, color palette, typography scale, component guidelines, layout patterns, and responsive UX. |

---

## 🚀 Quick Reference

- **Backend Stack:** Python 3.13, Django 5, Django REST Framework, MySQL 8
- **Frontend Stack:** React 18, Vite, Tailwind CSS, ShadCN UI, Zustand, Lucide Icons
- **Integrations:** Cloudflare R2 (Object Storage), Telegram Bot API (Alerts), Local Bank Payment Gateways (ABA, ACLEDA, Wing)
- **Deployment Target:** Ubuntu 22.04 LTS, Nginx, Gunicorn, Certbot (HTTPS)
