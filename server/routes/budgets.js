const express = require('express');
const router = express.Router();
const { db } = require('../database');
const auth = require('../middleware/auth');

// Get all budgets for the company
router.get('/', auth, (req, res) => {
    let sql = `
        SELECT b.*, 
        (SELECT COALESCE(SUM(amount), 0) FROM vouchers v 
         WHERE v.company_id = b.company_id 
         AND v.category = b.category
         AND v.status != 'Voided'
         AND v.status != 'Rejected'
         AND (b.start_date IS NULL OR v.date >= b.start_date)
         AND (b.end_date IS NULL OR v.date <= b.end_date)
        ) as spent
        FROM budgets b 
    `;
    const params = [];

    if (req.user.role !== 'admin' && req.user.role !== 'liaison') {
        sql += ' WHERE b.company_id = ?';
        params.push(req.user.company_id);
    } 

    // Filter by company_id query param if admin
    if ((req.user.role === 'admin' || req.user.role === 'liaison') && req.query.company_id) {
        sql += ' WHERE b.company_id = ?';
        params.push(req.query.company_id);
    }
    
    sql += ' ORDER BY b.created_at DESC';

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Create a new budget
router.post('/', auth, (req, res) => {
    // Only Admin can create budgets ?? Or Manager? Let's say Admin/Liaison/Manager(if we had one)
    // For now, let's allow anyone with a company_id to create budgets for their company
    // Or restrict to Admin? The requirement says "Manage budget categories", usually an admin/manager task.
    // Assuming users of a company can manage their own budgets.
    
    const { name, category, amount, start_date, end_date } = req.body;
    const company_id = req.user.role === 'admin' ? req.body.company_id : req.user.company_id;

    if (!name || !amount || !category) {
        return res.status(400).json({ error: 'Name, Amount and Category are required' });
    }

    const sql = `INSERT INTO budgets (company_id, name, category, amount, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [company_id, name, category, amount, start_date, end_date], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, company_id, name, category, amount, start_date, end_date });
    });
});

// Update budget
router.put('/:id', auth, (req, res) => {
    const { name, category, amount, start_date, end_date, status } = req.body;
    
    // Check ownership
    const checkSql = `SELECT * FROM budgets WHERE id = ?`;
    db.get(checkSql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Budget not found' });
        
        if (req.user.role !== 'admin' && row.company_id !== req.user.company_id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const sql = `UPDATE budgets SET name = ?, category = ?, amount = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?`;
        db.run(sql, [name || row.name, category || row.category, amount || row.amount, start_date || row.start_date, end_date || row.end_date, status || row.status, req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Budget updated' });
        });
    });
});

// Delete budget
router.delete('/:id', auth, (req, res) => {
     const checkSql = `SELECT * FROM budgets WHERE id = ?`;
    db.get(checkSql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Budget not found' });
        
        if (req.user.role !== 'admin' && row.company_id !== req.user.company_id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const sql = `DELETE FROM budgets WHERE id = ?`;
        db.run(sql, [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Budget deleted' });
        });
    });
});

module.exports = router;