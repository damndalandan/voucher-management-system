const express = require('express');
const router = express.Router();
const { db } = require('../database');
const authenticateToken = require('../middleware/auth');

// Get Categories
router.get('/categories', authenticateToken, (req, res) => {
    const { company_id } = req.query;
    let sql = `SELECT cat.*, c.name as company_name 
               FROM categories cat 
               LEFT JOIN companies c ON cat.company_id = c.id`;
    const params = [];
    
    if (company_id) {
        sql += " WHERE cat.company_id = ?";
        params.push(company_id);
    }
    
    sql += " ORDER BY c.name, cat.name";
    
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add Category
router.post('/categories', authenticateToken, (req, res) => {
    const { name, company_id } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });
    if (!company_id) return res.status(400).json({ error: "Company ID is required" });
    
    db.run("INSERT INTO categories (name, company_id) VALUES (?, ?)", [name, company_id], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "Category already exists for this company" });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, name, company_id, message: "Category added" });
    });
});

// Delete Category
router.delete('/categories/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM categories WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Category deleted" });
    });
});

module.exports = router;
