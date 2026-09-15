# Shadow Shop Security Documentation

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [API Security](#api-security)
- [Frontend Security](#frontend-security)
- [Infrastructure](#infrastructure)
- [Production Checklist](#production-checklist)
- [Incident Response](#incident-response)

---

## Overview

Shadow Shop is a wholesale cosmetics distribution system with customer-facing storefront and admin panel. This document covers security controls, known risks, and deployment requirements.

**Stack**: Django REST Framework + React (Vite) + MySQL + Cloudflare R2

---

## Architecture

```
Frontend (React)     →  API (Django DRF)  →  MySQL Database
     ↓                      ↓                     ↓
  localStorage           JWT Auth            User/Role/Permission
  CORS Policy            Rate Limiting        Activity Logs
  CSP Headers            Input Validation     Audit Trail
```

---

## Authentication

### JWT Token Flow

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access | 8 hours | localStorage | API requests |
| Refresh | 7 days | localStorage | Token renewal |

### Login Methods
1. **Password** — Username/email + password
2. **Email OTP** — 4-digit code, 10min expiry, max 5 attempts
3. **Google OAuth** — Verified via Google tokeninfo endpoint
4. **Telegram Login** — HMAC-SHA256 signature verification
5. **Telegram OTP** — Phone number + 6-digit Telegram bot code

### Token Security
- Tokens rotate on refresh (`ROTATE_REFRESH_TOKENS = True`)
- Old tokens blacklisted after rotation (`BLACKLIST_AFTER_ROTATION = True`)
- Refresh tokens blacklisted on logout

### Password Rules
- Minimum 8 characters (Django `AUTH_PASSWORD_VALIDATORS`)
- Cannot be similar to user attributes
- Not in common password list
- Not entirely numeric

---

## Authorization

### Role Hierarchy

```
super_admin  ←── Full access to everything
admin        ←── Full access to everything
seller       ←── Orders, customers, products (view/create/edit)
cashier      ←── Orders, customers, products, finance
warehouse    ←── Inventory, delivery, orders (view only)
scanner      ←── Scanner operations, print
delivery     ←── Delivery operations, orders (view)
customer     ←── Storefront only
```

### Permission System

Permissions are defined as `module + action` pairs:

| Module | Actions |
|--------|---------|
| dashboard, orders, customers, products, inventory, finance, reports, users, settings, etc. | view, create, edit, delete, export, print, approve, adjust_points |

**Enforcement**:
- Backend: `HasModulePermission` DRF class checks `RolePermission` table
- Frontend: `useRolePermission(module, action)` hook hides UI elements
- Admin bypass: `super_admin` and `admin` roles skip all permission checks

### Known Limitations
- Most backend endpoints use hardcoded role checks (`IsAdminOrSuperAdmin`, `IsStaff`) instead of granular `HasModulePermission`
- Frontend-only permission filtering on sidebar/navigation (no route-level guards for admin sub-pages)
- Permission enforcement is inconsistent between frontend and backend

---

## API Security

### Headers (Production)

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Rate Limiting

| Endpoint | Recommended Limit | Current Status |
|----------|-------------------|----------------|
| `/auth/login/` | 5 req/min per IP | **NOT IMPLEMENTED** |
| `/auth/password/forgot/` | 3 req/min per IP | 45s cooldown only |
| `/auth/email/resend-code/` | 3 req/min per IP | 45s cooldown only |
| `/auth/register/` | 3 req/min per IP | **NOT IMPLEMENTED** |

### Input Validation
- DRF serializers validate all input fields
- Email normalization: lowercase, stripped
- Phone validation: Cambodia format
- Username: regex `[a-z0-9._]{3,24}`
- Role validation: checked against `Role` table

### CORS Configuration
```
CORS_ALLOWED_ORIGINS = http://localhost:5175  # production: your domain only
CORS_ALLOW_CREDENTIALS = True
```

---

## Frontend Security

### XSS Prevention
- React escapes output by default (no `dangerouslySetInnerHTML` used for user data)
- Telegram widget uses `innerHTML = ''` to clear, then appends trusted script
- No user-controlled HTML injection points found

### Token Storage (Known Risk)
- Tokens stored in `localStorage` (accessible to XSS)
- Consider httpOnly cookies for high-security production

### Content Security
- No CSP headers configured in production
- Recommended: Add CSP middleware

---

## Infrastructure

### Environment Variables (`.env`)

| Variable | Sensitivity | Notes |
|----------|-------------|-------|
| `SECRET_KEY` | CRITICAL | Must be unique, 50+ chars |
| `DB_PASSWORD` | CRITICAL | Strong MySQL password |
| `R2_ACCESS_KEY_ID` | HIGH | Cloudflare R2 storage |
| `R2_SECRET_ACCESS_KEY` | HIGH | Cloudflare R2 storage |
| `TELEGRAM_BOT_TOKEN` | HIGH | Telegram bot secret |
| `ABA_PAYWAY_API_KEY` | HIGH | Payment gateway |
| `BAKONG_TOKEN` | HIGH | Bakong payment |
| `GOOGLE_OAUTH_CLIENT_ID` | MEDIUM | Google login |
| `EMAIL_HOST_PASSWORD` | MEDIUM | SMTP credentials |

### Git Safety
- `.env` is in `.gitignore` (but may exist in git history)
- Never commit secrets after rotation

### Database
- MySQL with `STRICT_TRANS_TABLES` mode
- UTF8MB4 charset for full Unicode support
- Connection pooling via `CONN_MAX_AGE = 60` in production

---

## Production Checklist

### Critical (Must Fix)

- [ ] Rotate all API keys that were in `.env` (R2, ABA, Telegram, Bakong)
- [ ] Set strong `SECRET_KEY` (50+ random characters)
- [ ] Set `DEBUG = False`
- [ ] Set `ALLOWED_HOSTS` to production domain only
- [ ] Add rate limiting to `/auth/login/`, `/auth/register/`, `/auth/password/forgot/`
- [ ] Use `hmac.compare_digest` for OTP comparison (`views.py:819`)
- [ ] Disable Swagger docs in production or add authentication

### High (Should Fix)

- [ ] Add `SECURE_SSL_REDIRECT = True`
- [ ] Add `SECURE_HSTS_SECONDS = 31536000` (already in production.py)
- [ ] Add Content-Security-Policy headers
- [ ] Add rate limiting to all auth endpoints
- [ ] Restrict CORS to production domain only
- [ ] Validate password strength in serializers

### Medium (Nice to Have)

- [ ] Move tokens to httpOnly cookies
- [ ] Add request signing for Telegram webhook
- [ ] Add API key authentication for Swagger docs
- [ ] Implement account lockout after failed attempts
- [ ] Add IP logging for failed logins

---

## Incident Response

### If API Keys Are Compromised
1. Rotate all affected keys immediately
2. Check R2 access logs for unauthorized file access
3. Check ABA PayWay logs for unauthorized transactions
4. Regenerate Telegram bot token
5. Review git history and remove secrets

### If Account Is Compromised
1. Force password reset for affected user
2. Blacklist all active sessions (refresh tokens)
3. Review activity logs for unauthorized actions
4. Check if role/permissions were modified
5. Notify affected users if customer data exposed

### If Database Is Compromised
1. Take database offline immediately
2. Preserve logs and evidence
3. Identify scope of data exposure
4. Notify affected users within 72 hours (GDPR)
5. Rotate all credentials
6. Restore from clean backup

---

## Security Contacts

- Report vulnerabilities to: [your-email]
- Emergency contact: [your-phone]

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-15 | Initial security documentation |
