# Event Sphere — PROJECT_CONTEXT.md

## 1. PROJECT OVERVIEW

Event Sphere is a full-stack multi-role event ticket marketplace system similar to Eventbrite / Ticketmaster.

It is built as a SaaS-ready platform with:
- API-first backend
- Separate frontend/backend architecture
- Role-based access control
- Scalable database structure

---

## 2. TECH STACK

### Frontend
- React
- TypeScript
- Vite
- TanStack Router
- UI originally generated using Lovable

### Backend
- Laravel API
- PHP 8+
- PostgreSQL (Supabase)
- Laravel Sanctum (authentication)

---

## 3. CORE ARCHITECTURE RULES

### Frontend Rules
- Frontend must NOT be modified unless necessary
- UI/UX must remain intact
- Existing routes/components must not be broken
- Frontend may be extended but not rewritten

Allowed frontend extensions:
- new dashboard pages
- new admin panels
- new organizer tools
- API integration layers

---

### Backend Rules
- API-only backend (NO Blade)
- Must adapt to frontend structure
- Must be scalable and modular
- Must use Laravel best practices
- Must support role-based access control

---

## 4. SYSTEM ROLES

### USER
- browse events
- buy tickets
- view orders
- favorites
- reviews
- profile management

---

### ORGANIZER
- create events
- edit own events
- delete own events
- manage ticket types
- upload event images
- view sales and analytics
- manage attendees

IMPORTANT:
- organizer can ONLY manage their own data

---

### ADMIN
- full system access
- manage all users
- change roles
- manage all events
- override permissions
- platform analytics

---

## 5. DATABASE STRUCTURE

Core tables:

- users
- events
- event_images
- ticket_types
- orders
- order_items
- tickets
- favorites
- reviews

Key principles:
- foreign keys required
- cascade delete where needed
- indexed fields for performance
- PostgreSQL compatible structure
- organizer ownership relationships enforced

---

## 6. AUTH SYSTEM

- Laravel Sanctum authentication
- login/register/logout APIs
- role-based access control
- middleware protection
- email verification ready
- password reset ready

Roles stored in:
- users.role = (user | organizer | admin)

---

## 7. FEATURE MODULES

### Events
- CRUD API
- slug generation
- search/filter/pagination
- organizer ownership validation

---

### Ticket Types
- multiple tiers per event
- VIP / General / Early Bird
- inventory tracking
- overselling prevention
- sale start/end dates

---

### Orders / Checkout
- order creation
- order items
- subtotal calculation
- fees calculation
- payment status tracking
- inventory reservation system

---

### Event Images
- multiple images per event
- secure upload
- storage linking
- image deletion
- optimized URLs

---

## 8. CURRENT DEVELOPMENT STATUS

- Backend initialized (Laravel) with full API (Sanctum, events, orders, tickets, Stripe, dashboards)
- Database connected (Supabase PostgreSQL)
- Static frontend (`public/site/*.html`) connected via `public/assets/js/api/` client layer
- `POST /api/orders` creates pending orders with inventory reservation
- Checkout flow: order → Stripe Checkout Session → webhook fulfillment

See [INTEGRATION.md](INTEGRATION.md) for local dev setup (FRONTEND_URL, API base meta tag).

---

## 9. DEVELOPMENT STRATEGY

1. Build backend APIs first
2. Ensure role-based security
3. Ensure database consistency
4. Ensure frontend compatibility
5. Later integrate frontend fully with APIs

---

## 10. IMPORTANT RULES FOR AI (CODEX)

- Never redesign frontend
- Never break existing API structure
- Always extend existing features
- Always check role permissions
- Always ensure ownership validation
- Always build scalable architecture
- Always keep responses frontend-compatible

---

## 11. FINAL GOAL

A fully functional, scalable SaaS event marketplace:
- secure authentication
- role-based dashboards
- full CRUD system
- payment-ready architecture
- frontend fully connected to API