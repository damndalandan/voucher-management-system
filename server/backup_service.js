const { Pool } = require('pg');
const { db } = require('./database');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 1. Export Postgres to SQLite (Backup)
async function backupPostgresToSQLite(res) {
    console.log("Starting Backup: Postgres -> SQLite");
    
    // Create a temporary SQLite database
    const tempDbPath = path.join('/tmp', `backup_${Date.now()}.db`);
    const sqliteDb = new sqlite3.Database(tempDbPath);

    // Helper to run sqlite query as promise
    const runSqlite = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            sqliteDb.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    };

    // Helper to get Postgres data
    const getPgData = (table) => {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM "${table}"`, [], (err, rows) => { // Quote table for PG casing
                if (err) {
                    // Normalize error if table doesn't exist
                    resolve([]); 
                } else {
                    resolve(rows);
                }
            });
        });
    };

    try {
        // Schema creation (Compatible SQLite Version)
        // We reuse the logic from database.js but simplified for pure data dump structure
        await runSqlite(`CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT, prefix TEXT, address TEXT, contact TEXT)`);
        await runSqlite(`CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT, company_id INTEGER, full_name TEXT, signature_path TEXT)`);
        await runSqlite(`CREATE TABLE bank_accounts (id INTEGER PRIMARY KEY, company_id INTEGER, bank_name TEXT, account_number TEXT, current_balance REAL)`);
        await runSqlite(`CREATE TABLE categories (id INTEGER PRIMARY KEY, company_id INTEGER, name TEXT, role TEXT)`);
        await runSqlite(`CREATE TABLE company_requests (id INTEGER PRIMARY KEY, company_id INTEGER, requested_by INTEGER, new_name TEXT, new_address TEXT, new_contact TEXT, status TEXT, created_at TEXT)`);
        await runSqlite(`CREATE TABLE profile_update_requests (id INTEGER PRIMARY KEY, user_id INTEGER, new_username TEXT, new_password TEXT, new_full_name TEXT, new_signature_path TEXT, status TEXT, created_at TEXT)`);
        
        await runSqlite(`CREATE TABLE vouchers (
            id INTEGER PRIMARY KEY, voucher_no TEXT, company_id INTEGER, date TEXT, payee TEXT, description TEXT, amount REAL, amount_in_words TEXT, 
            payment_type TEXT, check_no TEXT, bank_name TEXT, category TEXT, status TEXT, created_by INTEGER, created_at TEXT, 
            urgency TEXT, deadline_date TEXT, is_pdc INTEGER, check_date TEXT, check_issued_date TEXT, attachment_path TEXT, 
            void_reason TEXT, certified_by TEXT, approved_by TEXT, received_by TEXT, approval_attachment TEXT
        )`);
        
        await runSqlite(`CREATE TABLE voucher_attachments (id INTEGER PRIMARY KEY, voucher_id INTEGER, file_path TEXT, original_name TEXT, uploaded_at TEXT)`);
        await runSqlite(`CREATE TABLE voucher_history (id INTEGER PRIMARY KEY, voucher_id INTEGER, user_id INTEGER, action TEXT, details TEXT, created_at TEXT)`);
        await runSqlite(`CREATE TABLE checkbooks (id INTEGER PRIMARY KEY, bank_account_id INTEGER, series_start INTEGER, series_end INTEGER, next_check_no INTEGER, status TEXT)`);
        await runSqlite(`CREATE TABLE bank_transactions (id INTEGER PRIMARY KEY, bank_account_id INTEGER, voucher_id INTEGER, type TEXT, category TEXT, amount REAL, description TEXT, check_no TEXT, transaction_date TEXT, running_balance REAL)`);
        await runSqlite(`CREATE TABLE checks (id INTEGER PRIMARY KEY, bank_account_id INTEGER, voucher_id INTEGER, check_number TEXT, check_date TEXT, date_issued TEXT, date_cleared TEXT, payee TEXT, description TEXT, amount REAL, status TEXT)`);

        // List tables to export
        const tables = [
            'companies', 'users', 'bank_accounts', 'categories', 'company_requests', 
            'profile_update_requests', 'vouchers', 'voucher_attachments', 'voucher_history', 
            'checkbooks', 'bank_transactions', 'checks'
        ];

        for (const table of tables) {
            const rows = await getPgData(table);
            if (rows.length > 0) {
                const cols = Object.keys(rows[0]);
                const placeholders = cols.map(() => '?').join(',');
                const stmt = sqliteDb.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`);
                
                rows.forEach(row => {
                    const values = Object.values(row).map(val => {
                        // Ensure Dates are converted to ISO strings for SQLite/Portability
                        if (val instanceof Date) {
                            return val.toISOString();
                        }
                        // Ensure Objects/Arrays (JSON) are stringified if PG returns them as objects
                        if (typeof val === 'object' && val !== null) {
                            return JSON.stringify(val);
                        }
                        return val;
                    });
                    stmt.run(values);
                });
                stmt.finalize();
            }
        }

        sqliteDb.close((err) => {
            if (err) {
                console.error("Error closing backup db:", err);
                res.status(500).json({ error: "Backup generation failed" });
            } else {
                res.download(tempDbPath, `voucher_system_backup_${new Date().toISOString().split('T')[0]}.db`, (err) => {
                    // Cleanup
                    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
                });
            }
        });

    } catch (e) {
        console.error("Backup failed:", e);
        if (sqliteDb) sqliteDb.close();
        if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
        res.status(500).json({ error: "Backup failed: " + e.message });
    }
}

module.exports = { backupPostgresToSQLite };
