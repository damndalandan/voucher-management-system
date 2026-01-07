const { initDb, closeDatabase } = require('./database');

async function runInit() {
    console.log("Manual Database Initialization Started...");
    if (!process.env.DATABASE_URL) {
        console.warn("No DATABASE_URL found. Initialization checks only effective for production Postgres if configured.");
    }
    
    // initDb is async inside database.js but not exported as a promise-returning function directly in the original code,
    // however, based on my read, it IS async function initDb() {...}
    
    try {
        await initDb();
        console.log("Database initialized successfully.");
    } catch (e) {
        console.error("Initialization failed:", e);
    } finally {
        closeDatabase();
    }
}

runInit();
