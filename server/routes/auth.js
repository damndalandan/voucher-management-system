const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { SECRET_KEY } = require('../config');
const { logAction } = require('../services/audit');

// Login Endpoint
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = `SELECT u.id, u.username, u.password, u.role, u.company_id, c.name as company_name, c.prefix 
                 FROM users u 
                 LEFT JOIN companies c ON u.company_id = c.id 
                 WHERE u.username = ?`;
    
    db.get(sql, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });
        
        let validPassword = false;
        let needsRehash = false;

        // Try bcrypt
        try {
            validPassword = await bcrypt.compare(password, user.password);
        } catch (e) {}

        // Fallback to plain text
        if (!validPassword && user.password === password) {
            validPassword = true;
            needsRehash = true;
        }

        if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });

        if (needsRehash) {
            const hashedPassword = await bcrypt.hash(password, 10);
            db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user.id]);
        }

        // Log Login
        req.user = user; // Set for logging context
        logAction(req, 'Login', 'User', user.id, 'User logged in successfully');

        const token = jwt.sign({ 
            id: user.id, 
            username: user.username, 
            role: user.role,
            company_id: user.company_id 
        }, SECRET_KEY, { expiresIn: '24h' });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                company_id: user.company_id,
                company_name: user.company_name,
                prefix: user.prefix
            }
        });
    });
});

// Signup Endpoint
router.post('/signup', async (req, res) => {
    let { username, password, role, company_id } = req.body;

    // Default to staff if not provided
    if (!role) role = 'staff';

    // Prevent creating admin via public signup
    if (role === 'admin') return res.status(403).json({ error: "Cannot create admin account via signup" });

    // Force company_id to null if not staff (Liaison/HR usually don't belong to one company in this context? Or maybe they do?)
    // In users.js logic: if (role !== 'staff') company_id = null;
    // Let's keep it consistent.
    if (role !== 'staff') {
        company_id = null;
    }
    
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

module.exports = router;