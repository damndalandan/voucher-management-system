const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Helper to handle both SQLite and Postgres
function run(sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function get(sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function all(sql, params) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// GET all vendors for the company
router.get('/vendors', authenticateToken, async (req, res) => {
    try {
        const vendors = await all("SELECT * FROM vendors WHERE company_id = ? ORDER BY name ASC", [req.user.company_id]);
        res.json(vendors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create a new vendor
router.post('/vendors', authenticateToken, async (req, res) => {
    const { name, tax_id, contact_person, email, phone, address } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: "Vendor Name is required" });
    }

    try {
        // Check for duplicate name
        const existing = await get("SELECT id FROM vendors WHERE company_id = ? AND name = ?", [req.user.company_id, name]);
        if (existing) {
            return res.status(400).json({ error: "Vendor with this name already exists" });
        }

        const result = await run(
            `INSERT INTO vendors (company_id, name, tax_id, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.company_id, name, tax_id || null, contact_person || null, email || null, phone || null, address || null]
        );
        
        res.status(201).json({ 
            message: "Vendor created", 
            id: result.lastID,
            name 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update vendor
router.put('/vendors/:id', authenticateToken, async (req, res) => {
    const { name, tax_id, contact_person, email, phone, address, status } = req.body;
    const { id } = req.params;

    try {
        await run(
            `UPDATE vendors SET name = ?, tax_id = ?, contact_person = ?, email = ?, phone = ?, address = ?, status = ? WHERE id = ? AND company_id = ?`,
            [name, tax_id, contact_person, email, phone, address, status, id, req.user.company_id]
        );
        res.json({ message: "Vendor updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE vendor
router.delete('/vendors/:id', authenticateToken, async (req, res) => {
    try {
        await run("DELETE FROM vendors WHERE id = ? AND company_id = ?", [req.params.id, req.user.company_id]);
        res.json({ message: "Vendor deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
