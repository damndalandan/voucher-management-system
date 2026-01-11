const express = require('express');
const router = express.Router();
const { db } = require('../database');
const auth = require('../middleware/auth');

// GET all logs
router.get('/', auth, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'liaison') {
        return res.status(403).json({ error: "Access denied" });
    }

    let sql = `
        SELECT a.*, u.username, u.role as user_role
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 500
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;
