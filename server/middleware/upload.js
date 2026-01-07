const multer = require('multer');
const fs = require('fs');
const path = require('path');

let storage;

// Use memory storage for Vercel/Cloud to allow uploading to Blob Storage later
// Use disk storage for local development unless BLOB token is present (shim)
if (process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN) {
    if (!process.env.BLOB_READ_WRITE_TOKEN && process.env.VERCEL) {
        // Vercel Serverless (without Blob) needs local file for processing
        // but Multer MemoryStorage puts it in buffer.
        // We need DiskStorage in /tmp for the restore function to work.
        storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadDir = path.join('/tmp', 'uploads');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                cb(null, uploadDir);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, uniqueSuffix + path.extname(file.originalname));
            }
        });
    } else {
        storage = multer.memoryStorage();
    }
} else {
    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            let uploadDir;
            // Fallback for non-Vercel environment logic just in case
            if (process.env.VERCEL) {
                uploadDir = path.join('/tmp', 'uploads');
            } else {
                uploadDir = path.join(__dirname, '../uploads');
            }
            
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });
}

const upload = multer({ storage: storage });

module.exports = upload;
