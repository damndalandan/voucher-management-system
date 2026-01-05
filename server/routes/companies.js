const express = require('express');
const router = express.Router();
const { db } = require('../database');
const authenticateToken = require('../middleware/auth');

// Get Companies
router.get('/companies', authenticateToken, (req, res) => {
    db.all("SELECT * FROM companies", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get Public Companies (for Signup)
router.get('/public/companies', (req, res) => {
    db.all("SELECT id, name FROM companies", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create Company
router.post('/companies', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    const { name, prefix, address, contact } = req.body;
    if (!name || !prefix) return res.status(400).json({ error: "Name and Prefix are required" });

    db.run("INSERT INTO companies (name, prefix, address, contact) VALUES (?, ?, ?, ?)", 
        [name, prefix, address, contact], 
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: "Company prefix must be unique" });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: "Company created successfully" });
        }
    );
});

// Delete Company
router.delete('/companies/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    const { id } = req.params;
    const { password } = req.body; 
    const userId = req.user.id;

    db.get("SELECT password FROM users WHERE id = ?", [userId], async (err, user) => {
        if (err || !user) return res.status(500).json({ error: "User not found" });
        
        const bcrypt = require('bcryptjs');
        let validPassword = false;
        try {
            validPassword = await bcrypt.compare(password, user.password);
        } catch (e) {}

        if (!validPassword) return res.status(403).json({ error: "Invalid admin password" });

        db.serialize(() => {
            db.run("DELETE FROM vouchers WHERE company_id = ?", [id]);
            db.run("DELETE FROM users WHERE company_id = ?", [id]);
            db.run("DELETE FROM categories WHERE company_id = ?", [id]);
            db.run("DELETE FROM bank_accounts WHERE company_id = ?", [id]);
            db.run("DELETE FROM companies WHERE id = ?", [id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Company deleted successfully" });
            });
        });
    });
});

// --- Company Requests ---

router.post('/company/request', authenticateToken, (req, res) => {
    const { company_id, new_name, new_address, new_contact } = req.body;
    const requested_by = req.user.id;

    db.run("INSERT INTO company_requests (company_id, requested_by, new_name, new_address, new_contact) VALUES (?, ?, ?, ?, ?)", 
        [company_id, requested_by, new_name, new_address, new_contact], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Request submitted successfully" });
        }
    );
});

router.get('/company/requests', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    const sql = `SELECT r.*, c.name as current_name, u.username as requester 
                 FROM company_requests r 
                 JOIN companies c ON r.company_id = c.id 
                 JOIN users u ON r.requested_by = u.id 
                 WHERE r.status = 'Pending'`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/company/requests/:id/:action', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    const { id, action } = req.params; 
    
    if (action === 'reject') {
        db.run("UPDATE company_requests SET status = 'Rejected' WHERE id = ?", [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Request rejected" });
        });
    } else if (action === 'approve') {
        db.get("SELECT * FROM company_requests WHERE id = ?", [id], (err, reqData) => {
            if (err || !reqData) return res.status(404).json({ error: "Request not found" });
            
            const updates = [];
            const params = [];
            
            if (reqData.new_name) { updates.push("name = ?"); params.push(reqData.new_name); }
            if (reqData.new_address) { updates.push("address = ?"); params.push(reqData.new_address); }
            if (reqData.new_contact) { updates.push("contact = ?"); params.push(reqData.new_contact); }
            
            if (updates.length > 0) {
                const sql = "UPDATE companies SET " + updates.join(", ") + " WHERE id = ?";
                params.push(reqData.company_id);
                
                db.run(sql, params, function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    db.run("UPDATE company_requests SET status = 'Approved' WHERE id = ?", [id]);
                    res.json({ message: "Request approved and company updated" });
                });
            } else {
                res.json({ message: "Nothing to update" });
            }
        });
    } else {
        res.status(400).json({ error: "Invalid action" });
    }
});

module.exports = router;