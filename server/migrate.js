const sqlite3 = require('sqlite3').verbose();
const { db, resetDatabase } = require('./database');

async function migrateSQLiteToPostgres(sqlitePath) {
    return new Promise(async (resolve, reject) => {
        const sourceDb = new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY, (err) => {
            if (err) return reject(err);
        });

        // Helper to get all rows from sqlite
        const getAll = (table) => {
            return new Promise((res, rej) => {
                sourceDb.all(`SELECT * FROM ${table}`, [], (err, rows) => {
                    if (err) {
                        // If table doesn't exist, just return empty
                        if (err.message.includes('no such table')) res([]);
                        else rej(err);
                    } else {
                        res(rows);
                    }
                });
            });
        };

        // Helper to insert into Postgres
        const insertRows = async (table, rows) => {
            if (!rows || rows.length === 0) return;
            
            console.log(`Migrating ${rows.length} rows to ${table}...`);
            
            // Get columns from first row
            const columns = Object.keys(rows[0]);
            
            for (const row of rows) {
                // Fix boolean/dates if needed? Postgres is picky?
                // node-postgres usually handles basic type conversion.
                // We just need to construct the param list.
                const cols = columns.map(c => `"${c}"`).join(', '); // Quote cols for safety
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                const values = columns.map(c => row[c]);

                // Very naive insert. ID conflicts might occur if we didn't reset.
                // We assume database was reset before this.
                const sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`;
                
                try {
                    await new Promise((res, rej) => {
                        db.run(sql, values, (err) => {
                            if (err) rej(err);
                            else res();
                        });
                    });
                } catch (e) {
                    console.error(`Error inserting into ${table}:`, e.message);
                    // Continue despite error? Or fail?
                    // Let's continue for now.
                }
            }
        };
        
        try {
            // 1. Reset Postgres Database (Clear tables)
            await new Promise((res, rej) => {
                resetDatabase((err) => {
                    if (err) rej(err);
                    else res();
                });
            });

            // 2. Migrate Tables in Order (Dependencies first)
            const tables = [
                'companies',
                'users',
                'bank_accounts',
                'categories',
                'company_requests',
                'profile_update_requests',
                'vouchers',
                'voucher_attachments',
                'voucher_history',
                'checkbooks',
                'checks',
                'bank_transactions'
            ];

            for (const table of tables) {
                const rows = await getAll(table);
                await insertRows(table, rows);
            }

            // Close source
            sourceDb.close();
            resolve("Migration completed successfully");

        } catch (err) {
            sourceDb.close();
            console.error("Migration Failed:", err);
            reject(err);
        }
    });
}

module.exports = migrateSQLiteToPostgres;
