const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'vouchers.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Create Companies Table
        db.run(`CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            prefix TEXT NOT NULL UNIQUE,
            address TEXT,
            contact TEXT
        )`);

        // Create Company Requests Table
        db.run(`CREATE TABLE IF NOT EXISTS company_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            requested_by INTEGER NOT NULL,
            new_name TEXT,
            new_address TEXT,
            new_contact TEXT,
            status TEXT DEFAULT 'Pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies(id),
            FOREIGN KEY (requested_by) REFERENCES users(id)
        )`);

        // Create Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL, -- 'admin' or 'staff'
            company_id INTEGER,
            FOREIGN KEY (company_id) REFERENCES companies(id)
        )`);

        // Create Vouchers Table
        db.run(`CREATE TABLE IF NOT EXISTS vouchers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voucher_no TEXT NOT NULL UNIQUE,
            company_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            payee TEXT NOT NULL,
            description TEXT,
            amount REAL NOT NULL,
            amount_in_words TEXT,
            payment_type TEXT NOT NULL, -- 'Encashment' or 'Check'
            check_no TEXT,
            bank_name TEXT,
            category TEXT, -- 'Sales', 'Wages', 'Benefits', 'Govt Contribution', 'Payroll', etc.
            status TEXT DEFAULT 'Issued',
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )`, (err) => {
            if (!err) {
                // Attempt to add columns to existing companies table
                db.run("ALTER TABLE companies ADD COLUMN address TEXT", () => {});
                db.run("ALTER TABLE companies ADD COLUMN contact TEXT", () => {});
                seedData();
            }
        });

        // Create Bank Accounts Table
        db.run(`CREATE TABLE IF NOT EXISTS bank_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER,
            bank_name TEXT NOT NULL,
            account_number TEXT NOT NULL,
            current_balance REAL DEFAULT 0,
            FOREIGN KEY (company_id) REFERENCES companies(id)
        )`);

        // Create Checkbooks Table
        db.run(`CREATE TABLE IF NOT EXISTS checkbooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bank_account_id INTEGER NOT NULL,
            series_start INTEGER NOT NULL,
            series_end INTEGER NOT NULL,
            next_check_no INTEGER,
            status TEXT DEFAULT 'Active', -- Active, Consumed
            FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
        )`);

        // Create Bank Transactions Table
        db.run(`CREATE TABLE IF NOT EXISTS bank_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bank_account_id INTEGER NOT NULL,
            voucher_id INTEGER,
            type TEXT NOT NULL, -- 'Deposit', 'Withdrawal'
            category TEXT, -- 'Sales', 'Check Issuance', 'Wages', 'Benefits', 'Govt Contribution', 'Payroll', etc.
            amount REAL NOT NULL,
            description TEXT,
            check_no TEXT,
            transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            running_balance REAL,
            FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
            FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
        )`, (err) => {
            if (!err) {
                // Add full_name to users if it doesn't exist
                db.run("ALTER TABLE users ADD COLUMN full_name TEXT", () => {});
                // Add category and check_no to bank_transactions if they don't exist
                db.run("ALTER TABLE bank_transactions ADD COLUMN category TEXT", () => {});
                // Add category to vouchers if it doesn't exist
                db.run("ALTER TABLE vouchers ADD COLUMN category TEXT", () => {});
                db.run("ALTER TABLE bank_transactions ADD COLUMN check_no TEXT", () => {});
                db.run("ALTER TABLE bank_transactions ADD COLUMN transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP", () => {});

                // Add new fields for urgency and deadline
                db.run("ALTER TABLE vouchers ADD COLUMN urgency TEXT DEFAULT 'Normal'", () => {}); // Normal, Urgent, Critical
                db.run("ALTER TABLE vouchers ADD COLUMN deadline_date TEXT", () => {});
                db.run("ALTER TABLE vouchers ADD COLUMN is_pdc INTEGER DEFAULT 0", () => {}); // Boolean 0 or 1
                db.run("ALTER TABLE vouchers ADD COLUMN check_date TEXT", () => {}); // PDC Date
                db.run("ALTER TABLE vouchers ADD COLUMN attachment_path TEXT", () => {}); // File path for attachment
                db.run("ALTER TABLE vouchers ADD COLUMN void_reason TEXT", () => {}); // Reason for voiding
            }
        });

        // Create Checks Table (for Checkbook Tracking)
        db.run(`CREATE TABLE IF NOT EXISTS checks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bank_account_id INTEGER NOT NULL,
            voucher_id INTEGER,
            check_number TEXT NOT NULL,
            check_date TEXT, -- PDC Date
            date_issued DATETIME DEFAULT CURRENT_TIMESTAMP,
            date_cleared DATETIME, -- Actual clearing date
            payee TEXT,
            description TEXT,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'Issued', -- 'Issued', 'Claimed', 'Cleared', 'Cancelled', 'Voided'
            FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
            FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
        )`, (err) => {
            if (!err) {
                // Create unique index to prevent duplicate check numbers for the same bank account
                db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_checks_bank_number ON checks (bank_account_id, check_number)");
                // Add date_cleared column if it doesn't exist
                db.run("ALTER TABLE checks ADD COLUMN date_cleared DATETIME", () => {});
            }
        });

        // Create Voucher Attachments Table
        db.run(`CREATE TABLE IF NOT EXISTS voucher_attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voucher_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            original_name TEXT,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
        )`);

        // Create Voucher History Table
        db.run(`CREATE TABLE IF NOT EXISTS voucher_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voucher_id INTEGER NOT NULL,
            user_id INTEGER,
            action TEXT, -- 'Created', 'Updated', 'Status Change'
            details TEXT, -- JSON or description of changes
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // Create Profile Update Requests Table
        db.run(`CREATE TABLE IF NOT EXISTS profile_update_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            new_username TEXT,
            new_password TEXT,
            new_full_name TEXT,
            status TEXT DEFAULT 'Pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // Create Categories Table
        // Check if table exists and has company_id column
        db.all("PRAGMA table_info(categories)", (err, rows) => {
            if (!err) {
                const hasCompanyId = rows.some(r => r.name === 'company_id');
                if (rows.length > 0 && !hasCompanyId) {
                    // Old schema, drop and recreate
                    console.log("Migrating categories table...");
                    db.run("DROP TABLE categories", () => {
                        createCategoriesTable();
                    });
                } else {
                    createCategoriesTable();
                }
            }
        });
    });
}

function createCategoriesTable() {
    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER,
        name TEXT NOT NULL,
        UNIQUE(company_id, name),
        FOREIGN KEY (company_id) REFERENCES companies(id)
    )`, (err) => {
        if (!err) {
            // seedCategories(); // Disabled default category seeding
        }
    });
}

function seedCategories() {
    // Disabled
}

function seedData() {
    // Check if data exists
    db.get("SELECT count(*) as count FROM users WHERE role = 'admin'", (err, row) => {
        if (row.count === 0) {
            console.log("Seeding data...");
            
            // Seed Users
            // Admin (company_id is NULL)
            db.run("INSERT INTO users (username, password, role, company_id) VALUES (?, ?, ?, ?)", 
                ['admin', 'admin123', 'admin', null]);

            console.log("Data seeded successfully (Admin only).");
        }
    });
}

function resetDatabase(callback) {
    const tables = [
        'voucher_history',
        'voucher_attachments',
        'checks',
        'bank_transactions',
        'checkbooks',
        'vouchers',
        'company_requests',
        'profile_update_requests',
        'categories',
        'bank_accounts',
        'users',
        'companies'
    ];

    db.serialize(() => {
        db.run("PRAGMA foreign_keys = OFF");
        tables.forEach(table => {
            db.run(`DELETE FROM ${table}`);
            db.run(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
        });
        db.run("PRAGMA foreign_keys = ON", () => {
             console.log("Database cleared. Re-seeding...");
             seedData();
             if (callback) callback(null);
        });
    });
}

module.exports = { db, resetDatabase };
