const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { resetDatabase, closeDatabase } = require('./database');
const syncData = require('./sync');
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
const PORT = 5000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
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
    const dbPath = path.resolve(__dirname, 'vouchers.db');
    res.download(dbPath, 'vouchers_backup.db');
});

app.post('/api/restore', upload.single('database'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const dbPath = path.resolve(__dirname, 'vouchers.db');
    const uploadedPath = req.file.path;

    // Close the database connection first
    closeDatabase((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to close database connection' });
        }

        // Overwrite the database file
        try {
            // Need a small delay to ensure file handle is released by OS? 
            // Usually callback is enough but Windows can be slow to release.
            setTimeout(() => {
                 try {
                    fs.copyFileSync(uploadedPath, dbPath);
                    fs.unlinkSync(uploadedPath);
                    
                    // Trigger server restart by touching this file
                    const now = new Date();
                    fs.utimesSync(__filename, now, now);

                    res.json({ message: 'Database restored successfully. Server is restarting...' });
                 } catch (e) {
                     console.error('Error copying file:', e);
                     res.status(500).json({ error: 'Failed to replace database file. Please check server logs.' });
                 }
            }, 100);
        } catch (copyErr) {
            console.error('Error restoring database:', copyErr);
            res.status(500).json({ error: 'Failed to restore database file' });
        }
    });
});

app.post('/api/reset', (req, res) => {
    resetDatabase((err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Clear uploads folder
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

        res.json({ message: 'System reset successfully. All data has been cleared and default data restored.' });
    });
});

// Run Sync on Start
setTimeout(syncData, 5000);

app.listen(PORT, () => {
    console.log('Server running on http://localhost:' + PORT);
});
