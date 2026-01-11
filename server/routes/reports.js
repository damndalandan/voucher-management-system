const express = require('express');
const router = express.Router();
const { db } = require('../database');
const auth = require('../middleware/auth');

function all(sql, params) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

router.get('/summary', auth, async (req, res) => {
    try {
        const company_id = (req.user.role === 'admin' || req.user.role === 'liaison') ? req.query.company_id : req.user.company_id;
        
        const params = [];
        let whereClause = " WHERE status != 'Voided' AND status != 'Rejected' ";
        
        if (company_id) {
            whereClause += " AND company_id = ? ";
            params.push(company_id);
        }

        // Spend by Category
        const categorySpend = await all(
            `SELECT category as name, SUM(amount) as value 
             FROM vouchers ${whereClause} 
             GROUP BY category 
             ORDER BY value DESC`,
            params
        );

        // Spend by Vendor (Payee)
        const vendorSpend = await all(
            `SELECT payee as name, SUM(amount) as value 
             FROM vouchers ${whereClause} 
             GROUP BY payee 
             ORDER BY value DESC 
             LIMIT 10`,
            params
        );

        // Monthly Trend
        const monthlyTrend = await all(
            `SELECT strftime('%Y-%m', date) as name, SUM(amount) as value 
             FROM vouchers ${whereClause} 
             GROUP BY name 
             ORDER BY name DESC 
             LIMIT 12`,
            params
        );

        res.json({
            categorySpend,
            vendorSpend,
            monthlyTrend: monthlyTrend.reverse()
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
