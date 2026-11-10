# Supermarket Billing & Inventory Management System (Vyapar Edition)

A full-stack, enterprise-grade Supermarket Billing and Inventory Management System built with **React, TypeScript, Vite, Tailwind CSS, Node.js, Express, and MySQL 8.x**. Compatible with **MySQL Workbench**.

---

## 1. System Architecture

```text
supermarket-billing/
├── backend/
│   ├── src/
│   │   ├── config/          # MySQL connection pool, environment config & startup tests
│   │   ├── controllers/     # Auth, Dashboard, Products, Inventory, Sales, Reports, etc.
│   │   ├── middleware/      # JWT auth, role authorization (RBAC), validation, error handler
│   │   ├── routes/          # Express REST API routes
│   │   ├── services/        # Atomic checkout transaction, stock updates, returns
│   │   ├── utils/           # Indian GST tax calculations, invoice numbers, idempotency
│   │   ├── tests/           # Automated unit & integration tests
│   │   └── server.js        # Express app entry point & MySQL connectivity tester
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client with JWT interceptor & 401 handler
│   │   ├── components/      # MainLayout, ProtectedRoute, PrintReceiptModal (A4/80mm/58mm)
│   │   ├── context/         # AuthContext with session management
│   │   ├── pages/           # POS, Dashboard, Products, Inventory, Sales, Purchases, Reports, etc.
│   │   ├── types/           # Complete TypeScript interfaces
│   │   ├── App.tsx          # React Router v6 setup
│   │   ├── main.tsx
│   │   └── index.css        # Tailwind CSS & Print styles
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── database/
│   ├── schema.sql           # Complete DDL script for MySQL Workbench (InnoDB, 24 tables)
│   ├── seed.sql             # Realistic Indian FMCG products, barcodes, GST rates, demo users
│   └── migrations/
│       └── 001_initial_schema.sql
│
├── .env.example
├── .gitignore
└── README.md
```

---

## 2. Key Features

- **High-Speed Vyapar-Style POS Screen:**
  - Barcode scanner input with autofocus & instant Enter-to-add.
  - Search by product name, barcode, or SKU.
  - Shopping cart with item-level and bill-level discounts.
  - Fractional/decimal quantities (e.g., `1.250 kg`, `0.500 L`).
  - Cash, UPI, Card, and split payments.
  - Automatic cash tendered & change return calculator.
  - Bill Hold and Resume (switch between multiple customer queues).
  - Idempotency protection against accidental cashier double-clicks.
  - Concurrency-safe atomic checkout (prevents overselling).
- **GST Invoices & Printing:**
  - Standard A4 Tax Invoice with detailed HSN and GST tax analysis tables.
  - 80 mm thermal receipt format for POS printers.
  - 58 mm compact receipt format for handheld printers.
  - Browser print dialog integration (`window.print()`).
  - Invoice search, history view, and reprint.
- **Product & Inventory Management:**
  - Catalog with HSN code, GST rate (0%, 5%, 12%, 18%, 28%), tax-inclusive/exclusive pricing.
  - Minimum stock alerts and out-of-stock highlights.
  - Immutable stock movement audit ledger (`OPENING`, `SALE`, `PURCHASE`, `SALE_RETURN`, `ADJUSTMENT`).
  - Stock adjustment dialog with audit notes.
- **Supplier Purchasing & Accounts Payable:**
  - Supplier purchase orders and purchase invoices.
  - Automatic inventory stock increments and purchase cost updates.
- **Financial Accounts & Cash Book Ledger:**
  - Live cash counter drawer balance, bank accounts, and UPI merchant balances.
  - Double-entry ledger audit trail for every rupee in and out.
- **Reports & Business Intelligence:**
  - Sales turnover (daily, weekly, monthly).
  - GSTR-1 format summary: rate-wise breakdown and HSN summary.
  - Real-time stock valuation (purchase cost vs. sales potential).
  - Profit & Loss statement (Sales Revenue - COGS = Gross Profit - Expenses = Net Profit).
  - One-click CSV export.

---

## 3. Step-by-Step Setup Guide

### Step 3.1: Execute Schema & Seed in MySQL Workbench

1. Open **MySQL Workbench** and connect to your local MySQL instance (e.g. `Local instance MySQL80`).
2. Go to **File** > **Open SQL Script...** (or press `Ctrl + Shift + O`).
3. Select `database/schema.sql` and click **Open**.
4. Click the yellow **Lightning Bolt** (Execute) icon or press `Ctrl + Shift + Enter`.
5. Verify in the bottom **Action Output** window that all 24 tables were created.
6. Open `database/seed.sql` in MySQL Workbench and execute it to populate sample FMCG products, Indian barcodes, categories, and pre-hashed user credentials.
7. In the left **Navigator (Schemas)** panel, right-click and select **Refresh All** to view the `supermarket_billing` schema tables.

---

### Step 3.2: Configure Backend Environment Variables

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edit `backend/.env` with your MySQL server credentials:
   ```env
   PORT=5000
   NODE_ENV=development

   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_actual_mysql_password
   DB_NAME=supermarket_billing
   DB_CONNECTION_LIMIT=10

   JWT_SECRET=supermarket_billing_jwt_super_secret_key_2026_secure
   JWT_EXPIRES_IN=24h

   CLIENT_URL=http://localhost:5173
   ```

---

### Step 3.3: Start the Backend Server

```bash
cd backend
npm install
npm run dev
```

On startup, the backend automatically performs a database connection test:
```text
======================================================
  Supermarket Billing Backend running on port 5000
  API Health: http://localhost:5000/api/health
======================================================

======================================================
  MySQL Database Connected Successfully!
  Host:      localhost:3306
  Database:  supermarket_billing
  User:      root
  Version:   MySQL 8.0.x
======================================================
```

Run automated backend tests anytime:
```bash
npm test
```

---

### Step 3.4: Start the React Frontend

In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```

The application will launch at:
```text
http://localhost:5173
```

---

## 4. Default Login Credentials (Role-Based Access)

The seed script creates 4 pre-configured staff accounts with bcrypt-hashed passwords:

| Role | Username | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin / Owner** | `admin` | `Admin@123` | Full system access, financial reports, settings, user management |
| **Store Manager** | `manager` | `Manager@123` | Products, inventory, sales, purchases, customers, suppliers |
| **Billing Cashier** | `cashier` | `Cashier@123` | POS billing counter, bill generation, payments, receipt printing |
| **Inventory Staff** | `inventory` | `Inventory@123` | Stock adjustments, receiving purchases, low-stock tracking |

*The login page also includes one-click test credentials pills for convenience.*

---

## 5. REST API Documentation

### Authentication
- `POST /api/auth/login` - Authenticate staff with username/password and receive JWT
- `POST /api/auth/logout` - Invalidate session
- `GET /api/auth/me` - Fetch profile of currently authenticated user
- `POST /api/auth/setup-admin` - Initial admin account creation if database is fresh

### Dashboard
- `GET /api/dashboard/summary` - Today's sales, month sales, bill count, liquid balances, gross profit
- `GET /api/dashboard/recent-sales` - Last 10 completed sales
- `GET /api/dashboard/chart` - Daily sales timeline data for Recharts
- `GET /api/dashboard/top-products` - Top 5 selling products by volume

### Products
- `GET /api/products` - Search, filter by category or stock status, paginated list
- `GET /api/products/:id` - Full product details
- `GET /api/products/barcode/:barcode` - Instant lookup by barcode or SKU for POS scanners
- `POST /api/products` - Create new product with opening stock
- `PUT /api/products/:id` - Update product details & pricing
- `PATCH /api/products/:id/status` - Activate or deactivate product

### Inventory
- `GET /api/inventory` - Current stock status and stock valuation
- `GET /api/inventory/low-stock` - Products with stock ≤ minimum threshold
- `GET /api/inventory/movements` - Immutable stock audit trail
- `POST /api/inventory/adjustments` - Adjust stock (damage, count correction)

### Sales & Billing
- `GET /api/sales` - Filterable sales invoice list
- `GET /api/sales/:id` - Historical snapshot of invoice, items, and tax breakdown
- `POST /api/sales` - Atomic checkout transaction (deducts stock, saves invoice, creates payments & ledger entries)
- `POST /api/sales/:id/returns` - Process returns and refunds (restores stock)

### Purchases
- `GET /api/purchases` - List supplier purchases
- `POST /api/purchases` - Record goods receipt, update purchase prices, increment stock

### Customers & Suppliers
- `GET /api/customers`, `POST /api/customers`, `PUT /api/customers/:id`
- `GET /api/suppliers`, `POST /api/suppliers`, `PUT /api/suppliers/:id`

### Expenses & Financial Accounts
- `GET /api/expenses`, `POST /api/expenses`
- `GET /api/accounts`, `GET /api/accounts/:id/transactions`

### Reports
- `GET /api/reports/sales` - Sales turnover by day/month
- `GET /api/reports/gst` - Rate-wise breakdown & HSN summary
- `GET /api/reports/stock` - Inventory valuation
- `GET /api/reports/profit-loss` - P&L summary

---

## 6. Verification & Checkout Workflow

1. Start both servers: backend on port 5000, frontend on port 5173.
2. Sign in as `cashier` or `admin`.
3. Click **Open POS Counter**.
4. Scan or enter barcode `8901058852461` (Maggi Noodles) or `8901262010053` (Amul Butter) and press <kbd>Enter</kbd>.
5. Notice that the product is added with server-calculated GST, taxable amount, and line totals.
6. Select payment mode (**Cash**, **UPI**, or **Card**) and enter amount tendered.
7. Click **Complete Sale**.
8. The print modal opens automatically:
   - Switch between **80mm Thermal**, **58mm Compact**, or **A4 Tax Invoice**.
   - Click **Print Receipt** to open the browser print dialog.
9. Open MySQL Workbench and run:
   ```sql
   SELECT * FROM sales_invoices ORDER BY id DESC LIMIT 1;
   SELECT * FROM sales_invoice_items ORDER BY id DESC LIMIT 5;
   SELECT * FROM stock_movements ORDER BY id DESC LIMIT 5;
   SELECT * FROM account_transactions ORDER BY id DESC LIMIT 5;
   ```
10. All records are persistently stored in MySQL InnoDB tables with foreign key constraints intact.

