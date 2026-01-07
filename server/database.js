const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Determine environment
const isPostgres = !!process.env.DATABASE_URL;

let db;
let dbPath;

if (isPostgres) {
    console.log("Using PostgreSQL Database");
    db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { 
            rejectUnauthorized: false 
        }
    });
    // Initialize DB immediately for Postgres
    // initDb() call moved to after dbWrapper definition to avoid ReferenceError
} else {
    // SQLite Fallback (Development)
    console.log("Using SQLite Database");
    
    // Handling for Vercel Serverless environment (SQLite fallback in tmp, though not persistent)
    if (process.env.VERCEL) {
        dbPath = path.resolve('/tmp', 'vouchers.db');
    } else {
        dbPath = path.resolve(__dirname, 'vouchers.db');
    }
    console.log("Database path:", dbPath);

    const restorePath = path.resolve(__dirname, 'restore_pending.db');

    // Check for pending restore
    if (fs.existsSync(restorePath)) {
        console.log("Found pending database restore. Overwriting database...");
        try {
            // Try to delete journal/wal files if they exist to prevent corruption/locking
            const walPath = dbPath + '-wal';
            const shmPath = dbPath + '-shm';
            const journalPath = dbPath + '-journal';
            
            try { if (fs.existsSync(walPath)) fs.unlinkSync(walPath); } catch (e) { console.warn('Could not delete WAL file', e.message); }
            try { if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath); } catch (e) { console.warn('Could not delete SHM file', e.message); }
            try { if (fs.existsSync(journalPath)) fs.unlinkSync(journalPath); } catch (e) { console.warn('Could not delete Journal file', e.message); }

            fs.copyFileSync(restorePath, dbPath);
            fs.unlinkSync(restorePath);
            console.log("Database restored successfully from pending file.");
        } catch (e) {
            console.error("Error restoring database from pending file:", e);
        }
    }

    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database', err.message);
        } else {
            console.log('Connected to the SQLite database.');
            initDb();
        }
    });
}

// Helper to convert query
function normalizeQuery(sql) {
    if (!isPostgres) return sql;
    let i = 1;
    // Replace ? with $1, $2, etc. (naive but effective for this codebase)
    return sql.replace(/\?/g, () => `$${i++}`); 
}

// Wrapper for DB interface to unify SQLite and Postgres
const dbWrapper = {
    run: function(sql, params, callback) {
        if (!isPostgres) {
            return db.run(sql, params, callback);
        }
        
        let normalizedSql = normalizeQuery(sql);
        // Handle lastID for INSERT
        const isInsert = /^\s*INSERT/i.test(normalizedSql);
        if (isInsert && !normalizedSql.toLowerCase().includes('returning')) {
            // PostgreSQL doesn't return ID by default, need RETURNING clause
            // We assume 'id' is the primary key column name
            normalizedSql += ' RETURNING id';
        }

        db.query(normalizedSql, params || [], (err, res) => {
            const context = {};
            if (res && isInsert && res.rows && res.rows.length > 0) {
                // Mimic sqlite3 'this.lastID'
                context.lastID = res.rows[0].id;
            } else if (res && (res.command === 'UPDATE' || res.command === 'DELETE')) {
                 // Mimic sqlite3 'this.changes'
                 context.changes = res.rowCount;
            }
            if (callback) callback.call(context, err);
        });
    },
    get: function(sql, params, callback) {
        if (!isPostgres) {
             return db.get(sql, params, callback);
        }
        db.query(normalizeQuery(sql), params || [], (err, res) => {
            callback(err, res && res.rows.length > 0 ? res.rows[0] : undefined);
        });
    },
    all: function(sql, params, callback) {
        if (!isPostgres) {
            return db.all(sql, params, callback);
        }
        db.query(normalizeQuery(sql), params || [], (err, res) => {
            callback(err, res ? res.rows : []);
        });
    },
    serialize: function(callback) {
        if (!isPostgres) {
            return db.serialize(callback);
        }
        // Postgres pool queries are internally queued/managed, serialize is less relevant
        // But for strict sequential execution of init, we just run callback
        if (callback) callback();
    },
    exec: function(sql, callback) { 
        if (!isPostgres) {
             return db.exec(sql, callback);
        }
        db.query(sql, [], (err, res) => {
            if (callback) callback(err);
        });
    },
    prepare: function(sql) {
        // Mock prepare for simple use cases
        const stmt = {
            run: function(...params) {
                // params might be (arg1, arg2, callback)
                const callback = typeof params[params.length - 1] === 'function' ? params.pop() : undefined;
                if(callback) {
                     dbWrapper.run(sql, params, callback);
                } else {
                     dbWrapper.run(sql, params);
                }
            },
            finalize: function() {}
        };
        return stmt;
    },
    close: function(callback) {
        if (!isPostgres) return db.close(callback);
        db.end(callback);
    }
};

// Initialize DB immediately for Postgres (now that dbWrapper is defined)
if (isPostgres) {
    initDb();
}

// Helper to run query as promise
function runAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        dbWrapper.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this); // this contains lastID/changes
        });
    });
}

async function initDb() {
    const AUTO_INCREMENT = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const DATETIME_TYPE = isPostgres ? 'TIMESTAMP' : 'DATETIME';
    const TEXT_TYPE = 'TEXT';
    
    console.log(`Initializing Database Schema (${isPostgres ? 'Postgres' : 'SQLite'})...`);

    try {
        // 1. Independent Tables
        await runAsync(`CREATE TABLE IF NOT EXISTS companies (
            id ${AUTO_INCREMENT},
            name ${TEXT_TYPE} NOT NULL,
            prefix ${TEXT_TYPE} NOT NULL UNIQUE,
            address ${TEXT_TYPE},
            contact ${TEXT_TYPE}
        )`);

        // 2. Tables requesting Companies
        await runAsync(`CREATE TABLE IF NOT EXISTS users (
            id ${AUTO_INCREMENT},
            username ${TEXT_TYPE} NOT NULL UNIQUE,
            password ${TEXT_TYPE} NOT NULL,
            role ${TEXT_TYPE} NOT NULL,
            company_id INTEGER,
            full_name ${TEXT_TYPE},
            signature_path ${TEXT_TYPE},
            FOREIGN KEY (company_id) REFERENCES companies(id)
        )`);

        await runAsync(`CREATE TABLE IF NOT EXISTS bank_accounts (
            id ${AUTO_INCREMENT},
            company_id INTEGER,
            bank_name ${TEXT_TYPE} NOT NULL,
            account_number ${TEXT_TYPE} NOT NULL,
            current_balance REAL DEFAULT 0,
            FOREIGN KEY (company_id) REFERENCES companies(id)
        )`);

        await runAsync(`CREATE TABLE IF NOT EXISTS categories (
            id ${AUTO_INCREMENT},
            company_id INTEGER,
            name ${TEXT_TYPE} NOT NULL,
            role ${TEXT_TYPE},
            UNIQUE(company_id, name),
            FOREIGN KEY (company_id) REFERENCES companies(id)
        )`);

        // 3. Tables depending on Users and Companies
        await runAsync(`CREATE TABLE IF NOT EXISTS company_requests (
            id ${AUTO_INCREMENT},
            company_id INTEGER NOT NULL,
            requested_by INTEGER NOT NULL,
            new_name ${TEXT_TYPE},
            new_address ${TEXT_TYPE},
            new_contact ${TEXT_TYPE},
            status ${TEXT_TYPE} DEFAULT 'Pending',
            created_at ${DATETIME_TYPE} DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies(id),
            FOREIGN KEY (requested_by) REFERENCES users(id)
        )`);

        await runAsync(`CREATE TABLE IF NOT EXISTS profile_update_requests (
            id ${AUTO_INCREMENT},
            user_id INTEGER NOT NULL,
            new_username ${TEXT_TYPE},
            new_password ${TEXT_TYPE},
            new_full_name ${TEXT_TYPE},
            new_signature_path ${TEXT_TYPE},
            status ${TEXT_TYPE} DEFAULT 'Pending',
            created_at ${DATETIME_TYPE} DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        await runAsync(`CREATE TABLE IF NOT EXISTS vouchers (
            id ${AUTO_INCREMENT},
            voucher_no ${TEXT_TYPE} NOT NULL UNIQUE,
            company_id INTEGER NOT NULL,
            date ${TEXT_TYPE} NOT NULL,
            payee ${TEXT_TYPE} NOT NULL,
            description ${TEXT_TYPE},
            amount REAL NOT NULL,
            amount_in_words ${TEXT_TYPE},
            payment_type ${TEXT_TYPE} NOT NULL,
            check_no ${TEXT_TYPE},
            bank_name ${TEXT_TYPE},
            category ${TEXT_TYPE},
            status ${TEXT_TYPE} DEFAULT 'Issued',
            created_by INTEGER,
            created_at ${DATETIME_TYPE} DEFAULT CURRENT_TIMESTAMP,
            urgency ${TEXT_TYPE} DEFAULT 'Normal',
            deadline_date ${TEXT_TYPE},
            is_pdc INTEGER DEFAULT 0,
            check_date ${TEXT_TYPE},
            check_issued_date ${TEXT_TYPE},
            attachment_path ${TEXT_TYPE},
            void_reason ${TEXT_TYPE},
            certified_by ${TEXT_TYPE},
            approved_by ${TEXT_TYPE},
            received_by ${TEXT_TYPE},
            approval_attachment ${TEXT_TYPE},
            FOREIGN KEY (company_id) REFERENCES companies(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )`);

        // 4. Tables depending on Vouchers or Bank Accounts
        await runAsync(`CREATE TABLE IF NOT EXISTS voucher_attachments (
            id ${AUTO_INCREMENT},
            voucher_id INTEGER NOT NULL,
            file_path ${TEXT_TYPE} NOT NULL,
            original_name ${TEXT_TYPE},
            uploaded_at ${DATETIME_TYPE} DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
        )`);

        await runAsync(`CREATE TABLE IF NOT EXISTS voucher_history (
            id ${AUTO_INCREMENT},
            voucher_id INTEGER NOT NULL,
            user_id INTEGER,
            action ${TEXT_TYPE},
            details ${TEXT_TYPE},
            created_at ${DATETIME_TYPE} DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        await runAsync(`CREATE TABLE IF NOT EXISTS checkbooks (
            id ${AUTO_INCREMENT},
            bank_account_id INTEGER NOT NULL,
            series_start INTEGER NOT NULL,
            series_end INTEGER NOT NULL,
            next_check_no INTEGER,
            status ${TEXT_TYPE} DEFAULT 'Active',
            FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
        )`);

        await runAsync(`CREATE TABLE IF NOT EXISTS bank_transactions (
            id ${AUTO_INCREMENT},
            bank_account_id INTEGER NOT NULL,
            voucher_id INTEGER,
            type ${TEXT_TYPE} NOT NULL,
            category ${TEXT_TYPE},
            amount REAL NOT NULL,
            description ${TEXT_TYPE},
            check_no ${TEXT_TYPE},
            transaction_date ${DATETIME_TYPE} DEFAULT CURRENT_TIMESTAMP,
            running_balance REAL,
            FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
            FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
        )`);

        await runAsync(`CREATE TABLE IF NOT EXISTS checks (
            id ${AUTO_INCREMENT},
            bank_account_id INTEGER NOT NULL,
            voucher_id INTEGER,
            check_number ${TEXT_TYPE} NOT NULL,
            check_date ${TEXT_TYPE},
            date_issued ${DATETIME_TYPE} DEFAULT CURRENT_TIMESTAMP,
            date_cleared ${DATETIME_TYPE},
            payee ${TEXT_TYPE},
            description ${TEXT_TYPE},
            amount REAL NOT NULL,
            status ${TEXT_TYPE} DEFAULT 'Issued',
            FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
            FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
        )`);
        
        // 5. Indices
        await runAsync("CREATE UNIQUE INDEX IF NOT EXISTS idx_checks_bank_number ON checks (bank_account_id, check_number)");

        console.log("Database tables initialized successfully.");
        seedData();

    } catch (err) {
        console.error("Critical Error initializing database schema:", err);
    }
}

async function initDbPostgres() {
    // Legacy function, kept for safety but unused
}


function seedData() {
    // Check if data exists
    const checkSql = "SELECT count(*) as count FROM users WHERE role = 'admin'";
    dbWrapper.get(checkSql, [], (err, row) => {
        if (!row || row.count == '0' || row.count === 0) {
            console.log("Seeding data...");
            
            // Seed Users
            // Admin (company_id is NULL)
            dbWrapper.run("INSERT INTO users (username, password, role, company_id) VALUES (?, ?, ?, ?)", 
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

    dbWrapper.serialize(() => {
        if (!isPostgres) {
            dbWrapper.run("PRAGMA foreign_keys = OFF");
            tables.forEach(table => {
                dbWrapper.run(`DELETE FROM ${table}`);
                dbWrapper.run(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
            });
            dbWrapper.run("PRAGMA foreign_keys = ON", () => {
                 console.log("Database cleared. Re-seeding...");
                 seedData();
                 if (callback) callback(null);
            });
        } else {
             // Postgres Truncate
             const truncateAll = tables.map(t => `TRUNCATE TABLE ${t} RESTART IDENTITY CASCADE`).join('; ');
             dbWrapper.run(truncateAll, [], (err) => {
                 console.log("Database cleared (Postgres). Re-seeding...");
                 seedData();
                 if (callback) callback(null);
             });
        }
    });
}

function closeDatabase(callback) {
    dbWrapper.close((err) => {
        if (err) {
            console.error('Error closing database', err.message);
        } else {
            console.log('Database connection closed.');
        }
        if (callback) callback(err);
    });
}

// Export the wrapper as 'db' so existing code works without change
module.exports = { db: dbWrapper, resetDatabase, closeDatabase };
