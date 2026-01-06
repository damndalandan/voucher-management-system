const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const authenticateToken = require('../middleware/auth');
const upload = require('../middleware/upload');
const { put } = require('@vercel/blob');

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

// Get Users
router.get('/', authenticateToken, (req, res) => {
    db.all("SELECT u.id, u.username, u.role, u.company_id, u.full_name, u.signature_path, c.name as company_name FROM users u LEFT JOIN companies c ON u.company_id = c.id", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create User
router.post('/', authenticateToken, async (req, res) => {
    // Only admin can create users
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    let { username, password, role, company_id } = req.body;

    // Force company_id to null if not staff
    if (role !== 'staff') {
        company_id = null;
    }
    
    // Handle empty string as null
    if (company_id === '') company_id = null;

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run("INSERT INTO users (username, password, role, company_id) VALUES (?, ?, ?, ?)", [username, hashedPassword, role, company_id], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "Username already exists" });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: "User created successfully" });
    });
});

// Delete User
router.delete('/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    const { id } = req.params;
    db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "User deleted successfully" });
    });
});

// Update User
router.put('/:id', authenticateToken, upload.single('signature'), async (req, res) => {
    // Only admin can update users
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    const { id } = req.params;
    const { username, password, role, company_id, full_name } = req.body;
    
    let signature_path = null;
    try {
        signature_path = await handleFileUpload(req.file);
        if (signature_path && !signature_path.startsWith('http') && req.file && req.file.destination) {
             signature_path = `/uploads/${req.file.filename}`;
        }
    } catch (e) {
        console.error("Upload error", e);
    }

    let sql = "UPDATE users SET ";
    const params = [];
    const updates = [];

    if (username) { updates.push("username = ?"); params.push(username); }
    if (password) { 
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.push("password = ?"); 
        params.push(hashedPassword); 
    }
    if (role) { updates.push("role = ?"); params.push(role); }
    
    // Handle company_id specifically to allow null
    if (company_id !== undefined) { 
        let finalCompanyId = company_id;
        // If role is being updated to non-staff, force null
        if (role && role !== 'staff') finalCompanyId = null;
        // Handle empty string
        if (finalCompanyId === '') finalCompanyId = null;
        
        updates.push("company_id = ?"); 
        params.push(finalCompanyId); 
    }
    
    if (full_name) { updates.push("full_name = ?"); params.push(full_name); }
    if (signature_path) { updates.push("signature_path = ?"); params.push(signature_path); }

    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

    sql += updates.join(", ") + " WHERE id = ?";
    params.push(id);

    db.run(sql, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "Username already exists" });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "User updated successfully" });
    });
});

module.exports = router;
