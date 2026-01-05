const express = require('express');
const router = express.Router();
const { db } = require('../database');
const authenticateToken = require('../middleware/auth');

// Get Current User Profile
router.get('/profile/:id', authenticateToken, (req, res) => {
    // Users can only see their own profile unless admin?
    // For now, let's allow if ID matches token or if admin
    if (req.user.id != req.params.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied" });
    }

    db.get("SELECT id, username, role, company_id, full_name FROM users WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

// Request Profile Update
router.post('/profile/request', authenticateToken, (req, res) => {
    const { user_id, new_username, new_password, new_full_name } = req.body;
    
    if (req.user.id != user_id) return res.status(403).json({ error: "Access denied" });

    db.run("INSERT INTO profile_update_requests (user_id, new_username, new_password, new_full_name) VALUES (?, ?, ?, ?)",
        [user_id, new_username, new_password, new_full_name],
        function(err) {
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
                // Password should be hashed here if it wasn't already?
                // The request stores plain text password? That's bad.
                // Ideally, the request should store hashed password, or we hash it now.
                // Let's assume we hash it now.
                const bcrypt = require('bcryptjs');
                // We need to be in an async function to use await, or use sync hash
                // Since we are in callback, let's use sync or promise chain.
                // But wait, db.get callback is not async.
                // Let's use bcrypt.hashSync for simplicity here or refactor.
                const hashedPassword = bcrypt.hashSync(reqData.new_password, 10);
                updates.push("password = ?"); 
                params.push(hashedPassword); 
            }
            if (reqData.new_full_name) { updates.push("full_name = ?"); params.push(reqData.new_full_name); }
            
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