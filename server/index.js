require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { resetDatabase, closeDatabase } = require('./database');
const syncData = require('./sync');
const migrateSQLiteToPostgres = require('./migrate');
const { backupPostgresToSQLite } = require('./backup_service');
const upload = require('./middleware/upload');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const companyRoutes = require('./routes/companies');
const voucherRoutes = require('./routes/vouchers');
const bankRoutes = require('./routes/banks');
const checkRoutes = require('./routes/checks');
const profileRoutes = require('./routes/profile');
const categoryRoutes = require('./routes/categories');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
let uploadDir;
if (process.env.VERCEL) {
    uploadDir = path.join('/tmp', 'uploads');
} else {
    uploadDir = path.join(__dirname, 'uploads');
}

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use('/uploads', express.static(uploadDir));

// Mount Routes
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', companyRoutes);
app.use('/api', voucherRoutes);
app.use('/api', bankRoutes);
app.use('/api', checkRoutes);
app.use('/api', profileRoutes);
app.use('/api', categoryRoutes);

// Database Management Routes
app.get('/api/backup', (req, res) => {
    // Check if using Postgres
    if (process.env.DATABASE_URL) {
         return backupPostgresToSQLite(res);
    }
    
    // Fallback for local SQLite
    const dbPath = path.resolve(__dirname, 'vouchers.db');
    if (fs.existsSync(dbPath)) {
        res.download(dbPath, 'vouchers_backup.db');
    } else {
        res.status(404).json({ error: "Database file not found" });
    }
});

app.post('/api/restore', upload.single('database'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Safety check
    if (!req.file.path) {
         return res.status(400).json({ error: "File path missing (Upload config error)" });
    }

    const uploadedPath = req.file.path;

    // Handle PostgreSQL Migration
    if (process.env.DATABASE_URL) {
        try {
            console.log("Starting SQLite to Postgres migration...");
            await migrateSQLiteToPostgres(uploadedPath);
            
            // Clean up uploaded file
            if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);

            // Respond success
            return res.json({ message: 'Database migrated to PostgreSQL successfully. Please refresh.' });
        } catch (e) {
            console.error("Migration error:", e);
            if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
            return res.status(500).json({ error: `Migration failed: ${e.message}` });
        }
    }

    // Handle SQLite Restore (Original Logic)
    const restorePath = path.resolve(__dirname, 'restore_pending.db');

    try {
        // Move uploaded file to pending restore location
        fs.copyFileSync(uploadedPath, restorePath);
        if (fs.existsSync(uploadedPath)) {
            fs.unlinkSync(uploadedPath);
        }
        
        // Send success response before restarting
        res.json({ message: 'Database restored successfully. Server is restarting...' });

        // Trigger server restart by touching this file
        setTimeout(() => {
            const now = new Date();
            try {
                fs.utimesSync(__filename, now, now);
            } catch (e) {
                console.error("Failed to trigger restart:", e);
            }
        }, 1000);

    } catch (e) {
        console.error('Error scheduling database restore:', e);
        res.status(500).json({ error: `Failed to schedule database restore: ${e.message}` });
    }
});

app.post('/api/reset', (req, res) => {
    resetDatabase((err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Clear uploads folder? Only if local.
        // If Blob, we can't easily clear all blobs without API listing.
        // For now, we just clear local folder.
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            fs.readdir(uploadDir, (err, files) => {
                if (err) console.error('Error reading uploads dir:', err);
                else {
                    for (const file of files) {
                        fs.unlink(path.join(uploadDir, file), err => {
                            if (err) console.error('Error deleting ' + file + ':', err);
                        });
                    }
                }
            });
        }

        res.json({ message: 'System reset successfully. All data has been cleared and default data restored.' });
    });
});

// Run Sync on Start
setTimeout(syncData, 5000);

// Export for Vercel
module.exports = app;

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log('Server running on http://localhost:' + PORT);
    });
}
