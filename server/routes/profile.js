const express = require('express');
const router = express.Router();
const { db } = require('../database');
const authenticateToken = require('../middleware/auth');
const upload = require('../middleware/upload');
const { put } = require('@vercel/blob');
const bcrypt = require('bcryptjs'); // Moved to top

// Helper to handle file upload (Disk or Blob)
async function handleFileUpload(file) {
    if (!file) return null;
    if (file.path) return file.path; // Disk storage already saved it
    if (file.buffer) {
        // Blob storage
        const blob = await put(file.originalname, file.buffer, { access: 'public' });
        return blob.url;
    }
    return null;
}

// Get Current User Profile
router.get('/profile/:id', authenticateToken, (req, res) => {
    // Users can only see their own profile unless admin?
    if (req.user.id != req.params.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied" });
    }

    db.get("SELECT id, username, role, company_id, full_name, signature_path FROM users WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

// Request Profile Update
router.post('/profile/request', authenticateToken, upload.single('signature'), async (req, res) => {
    const { user_id, new_username, new_password, new_full_name } = req.body;
    let new_signature_path = null;
    
    try {
        new_signature_path = await handleFileUpload(req.file);
    } catch (e) {
        console.error("Upload error", e);
        // Continue without signature or error? Let's continue but maybe warn?
    }
    
    // Fallback for disk storage formatting if handleFileUpload returns a local path
    // Wait, handleFileUpload returns either full absolute path (maybe?) or relative?
    // Multer diskStorage usually sets 'path' as absolute or relative depending on config.
    // In our upload.js we set destination. Multre sets 'path' to full path.
    // The previous code did `/uploads/${req.file.filename}`.
    // Memory storage returns URL.
    // If disk storage, req.file.path is usually prompt.
    // But we want a web-accessible URL.
    // If disk storage, we probably need `/uploads/filename`.
    
    if (new_signature_path && !new_signature_path.startsWith('http')) {
        // It's a local path from disk storage?
        // Actually handleFileUpload returns req.file.path.
        // If we are on disk storage, we want to store the relative URL '/uploads/...'
        if (req.file.destination) {
             // It is disk storage
             new_signature_path = `/uploads/${req.file.filename}`;
        }
    }
    
    if (req.user.id != user_id) return res.status(403).json({ error: "Access denied" });

    let sql = "INSERT INTO profile_update_requests (user_id, new_username, new_password, new_full_name";
    let values = [user_id, new_username, new_password, new_full_name];
    let placeholders = "?, ?, ?, ?";

    if (new_signature_path) {
        sql += ", new_signature_path";
        values.push(new_signature_path);
        placeholders += ", ?";
    }

    sql += `) VALUES (${placeholders})`;

    db.run(sql, values, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Profile update request submitted for approval" });
        }
    );
});

// Get Pending Profile Requests (Admin)
router.get('/profile/requests/pending', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    const sql = `SELECT r.*, u.username as current_username, u.full_name as current_full_name 
                 FROM profile_update_requests r 
                 JOIN users u ON r.user_id = u.id 
                 WHERE r.status = 'Pending'`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Approve/Reject Profile Request
router.post('/profile/requests/:id/:action', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    const { id, action } = req.params; // action: approve or reject
    
    if (action === 'reject') {
        db.run("UPDATE profile_update_requests SET status = 'Rejected' WHERE id = ?", [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Request rejected" });
        });
    } else if (action === 'approve') {
        db.get("SELECT * FROM profile_update_requests WHERE id = ?", [id], (err, reqData) => {
            if (err || !reqData) return res.status(404).json({ error: "Request not found" });
            
            const updates = [];
            const params = [];
            
            if (reqData.new_username) { updates.push("username = ?"); params.push(reqData.new_username); }
            if (reqData.new_password) { 
                const hashedPassword = bcrypt.hashSync(reqData.new_password, 10);
                updates.push("password = ?"); 
                params.push(hashedPassword); 
            }
            if (reqData.new_full_name) { updates.push("full_name = ?"); params.push(reqData.new_full_name); }
            if (reqData.new_signature_path) { updates.push("signature_path = ?"); params.push(reqData.new_signature_path); }
            
            if (updates.length > 0) {
                const sql = "UPDATE users SET " + updates.join(", ") + " WHERE id = ?";
                params.push(reqData.user_id);
                
                db.run(sql, params, function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    db.run("UPDATE profile_update_requests SET status = 'Approved' WHERE id = ?", [id]);
                    res.json({ message: "Request approved and profile updated" });
                });
            } else {
                db.run("UPDATE profile_update_requests SET status = 'Approved' WHERE id = ?", [id]);
                res.json({ message: "Request approved (no changes)" });
            }
        });
    } else {
        res.status(400).json({ error: "Invalid action" });
    }
});

module.exports = router;
