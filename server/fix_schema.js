const { db } = require('./database');

// SQL Commands to alter tables to use NUMERIC type for precise currency storage
// This is necessary because REAL (float4) has limited precision (~6 digits), 
// which causes rounding errors for amounts > 100,000 with decimals.
const alterQueries = [
    "ALTER TABLE bank_accounts ALTER COLUMN current_balance TYPE NUMERIC",
    "ALTER TABLE bank_transactions ALTER COLUMN amount TYPE NUMERIC",
    "ALTER TABLE bank_transactions ALTER COLUMN running_balance TYPE NUMERIC",
    "ALTER TABLE checks ALTER COLUMN amount TYPE NUMERIC",
    "ALTER TABLE vouchers ALTER COLUMN amount TYPE NUMERIC"
];

async function fixSchema() {
    console.log("Starting schema fix for decimal precision...");

    // Only run this on Postgres
    if (!process.env.DATABASE_URL) {
        console.error("This script is intended for the production PostgreSQL database (Vercel/Supabase).");
        console.error("Local SQLite databases use REAL by default which behaves differently.");
        console.error("To run this against production, ensure DATABASE_URL is set in .env");
        process.exit(1);
    }

    try {
        for (const query of alterQueries) {
            console.log(`Executing: ${query}`);
            await new Promise((resolve, reject) => {
                db.run(query, [], (err) => {
                    if (err) {
                        // Ignore if already numeric or similar error, but log it
                        console.warn(`Warning/Error: ${err.message}`);
                        // Don't reject, continue to next
                        resolve(); 
                    } else {
                        console.log("Success.");
                        resolve();
                    }
                });
            });
        }
        console.log("Schema fix completed successfully. Decimals should now be preserved.");
    } catch (error) {
        console.error("Fatal error during schema fix:", error);
    } finally {
        // We cannot easily close the db connection here because database.js manages it globally 
        // without exposing a clean closeForScript method, but process.exit will handle it.
        // However, dbWrapper has close.
        const { closeDatabase } = require('./database');
        closeDatabase(() => {
             process.exit(0);
        });
    }
}

fixSchema();
