# Voucher Management System

A multi-tenant web-based system for managing encashment/check vouchers for 4 sister companies.

## Features
- **Multi-tenancy**: Separate data for Peachtree Lodge, Valrustri Realty, Busy Bee Hardware, and R. Capahi and Sons.
- **Admin View**: Super admin can view all transactions.
- **Voucher Generation**: Auto-numbering with prefixes (PL, VR, BB, RC).
- **Printing**: Ready-to-print "2-up" voucher template (A4 size).

## Setup Instructions

### 1. Backend Setup
1. Open a terminal and navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   The server will run on `http://localhost:5000`.
   *Note: The database will be automatically created and seeded with demo accounts on the first run.*

### 2. Frontend Setup
1. Open a new terminal and navigate to the client folder:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The application will open at `http://localhost:5173` (or similar).

## Login Credentials (Demo)

| Role | Username | Password | Company |
|------|----------|----------|---------|
| **Admin** | `admin` | `admin123` | All |
| **Liaison** | `liaison` | `liaison123` | All |
| **Staff** | `peachtree_staff` | `user123` | Peachtree Lodge |
| **Staff** | `valrustri_staff` | `user123` | Valrustri Realty |
| **Staff** | `busybee_staff` | `user123` | Busy Bee Hardware |
| **Staff** | `capahi_staff` | `user123` | R. Capahi and Sons |

## Usage
1. Log in with a staff account to create vouchers for that specific company.
2. Click "Create Voucher" to add a new transaction.
3. Click "Print" on any voucher to generate the printable view.
4. Log in as Admin to view all vouchers across all companies.
