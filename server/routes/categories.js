const express = require('express');
const router = express.Router();
const { db } = require('../database');
const authenticateToken = require('../middleware/auth');

// Get Categories
router.get('/categories', authenticateToken, (req, res) => {
    const { company_id } = req.query;
    const { role } = req.user;

    let sql = `SELECT cat.*, c.name as company_name 
               FROM categories cat 
               LEFT JOIN companies c ON cat.company_id = c.id`;
    const params = [];
    const conditions = [];

    // Logic:
    // 1. If company_id is provided (e.g. from VoucherForm), we want categories for that company.
    // 2. PLUS, if the user is HR or Liaison, they should see their role-specific categories (which have company_id = NULL).
    // 3. If user is Admin, they see everything if no filter, or filtered company + all role categories?
    
    if (company_id) {
        // Specific company requested
        if (role === 'admin') {
            // Admin sees company categories + ALL role categories (HR/Liaison)
            conditions.push("(cat.company_id = ? OR cat.role IS NOT NULL)");
            params.push(company_id);
        } else if (role === 'hr') {
            // HR sees company categories + HR categories
            conditions.push("(cat.company_id = ? OR cat.role = 'hr')");
            params.push(company_id);
        } else if (role === 'liaison') {
            // Liaison sees company categories + Liaison categories
            conditions.push("(cat.company_id = ? OR cat.role = 'liaison')");
            params.push(company_id);
        } else {
            // Staff sees only company categories
            conditions.push("cat.company_id = ?");
            params.push(company_id);
        }
    } else {
        // No company filter (e.g. Management view)
        if (role === 'admin') {
            // Show everything
        } else if (role === 'hr') {
            conditions.push("(cat.company_id = ? OR cat.role = 'hr')");
            params.push(req.user.company_id);
        } else if (role === 'liaison') {
            conditions.push("(cat.company_id = ? OR cat.role = 'liaison')");
            params.push(req.user.company_id);
        } else {
            conditions.push("cat.company_id = ?");
            params.push(req.user.company_id);
        }
    }

    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }
    
    sql += " ORDER BY cat.role DESC, c.name, cat.name";
    
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add Category
router.post('/categories', authenticateToken, (req, res) => {
    const { name, company_id, role } = req.body;
    const userRole = req.user.role;

    if (!name) return res.status(400).json({ error: "Category name is required" });

    let finalCompanyId = company_id;
    let finalRole = null;

    if (userRole === 'admin') {
        if (role) {
            finalRole = role; // 'hr' or 'liaison'
            finalCompanyId = null;
        } else if (!company_id) {
             return res.status(400).json({ error: "Company ID is required for general categories" });
        }
    } else if (userRole === 'hr' || userRole === 'liaison') {
        if (company_id) {
             finalCompanyId = company_id;
        } else {
             finalRole = userRole;
             finalCompanyId = null;
        }
    } else {
        return res.status(403).json({ error: "Only Admin, HR, and Liaison can create categories" });
    }
    
    db.run("INSERT INTO categories (name, company_id, role) VALUES (?, ?, ?)", [name, finalCompanyId, finalRole], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "Category already exists" });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, name, company_id: finalCompanyId, role: finalRole, message: "Category added" });
    });
});

// Delete Category
router.delete('/categories/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { role } = req.user;

    let sql = "DELETE FROM categories WHERE id = ?";
    let params = [id];

    if (role !== 'admin') {
        // Non-admins can only delete their own role categories
        sql += " AND role = ?";
        params.push(role);
    }

    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(403).json({ error: "Not authorized to delete this category or not found" });
        res.json({ message: "Category deleted" });
    });
});

module.exports = router;
