const express = require('express');
const router = express.Router();
const { db } = require('../database');
const auth = require('../middleware/auth');

// Helper for Promisified DB calls
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

// GET all POs
router.get('/', auth, async (req, res) => {
    try {
        let sql = `
            SELECT po.*, v.name as vendor_name, u.username as creator_name
            FROM purchase_orders po
            LEFT JOIN vendors v ON po.vendor_id = v.id
            LEFT JOIN users u ON po.created_by = u.id
        `;
        const params = [];
        
        if (req.user.role !== 'admin' && req.user.role !== 'liaison') {
            sql += ' WHERE po.company_id = ?';
            params.push(req.user.company_id);
        } else if (req.query.company_id) {
             sql += ' WHERE po.company_id = ?';
             params.push(req.query.company_id);
        }

        sql += ' ORDER BY po.created_at DESC';
        
        const pos = await all(sql, params);
        res.json(pos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single PO with items
router.get('/:id', auth, async (req, res) => {
    try {
        const po = await get(
            `SELECT po.*, v.name as vendor_name, v.address as vendor_address, v.phone as vendor_phone, v.email as vendor_email
             FROM purchase_orders po
             LEFT JOIN vendors v ON po.vendor_id = v.id
             WHERE po.id = ?`, 
            [req.params.id]
        );
        
        if (!po) return res.status(404).json({ error: "PO not found" });
        
        // Authorization check
        if (req.user.role !== 'admin' && req.user.role !== 'liaison' && po.company_id !== req.user.company_id) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const items = await all("SELECT * FROM purchase_order_items WHERE po_id = ?", [req.params.id]);
        res.json({ ...po, items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Create PO
router.post('/', auth, async (req, res) => {
    const { vendor_id, date, expected_date, notes, items } = req.body;
    const company_id = req.user.company_id; // Or from body if admin? Assume user context for now
    
    if (!vendor_id || !items || items.length === 0) {
        return res.status(400).json({ error: "Vendor and Items are required" });
    }

    try {
        // Generate PO Number (Simple timestamp based or sequential?)
        // Let's use PO-{YYYYMMDD}-{Random4}
        const today = new Date();
        const yyyymmdd = today.toISOString().slice(0,10).replace(/-/g,'');
        const random = Math.floor(1000 + Math.random() * 9000);
        const po_number = `PO-${yyyymmdd}-${random}`;

        // Calculate Total
        const total_amount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);

        const result = await run(
            `INSERT INTO purchase_orders (company_id, vendor_id, po_number, date, expected_date, status, total_amount, notes, created_by)
             VALUES (?, ?, ?, ?, ?, 'Draft', ?, ?, ?)`,
            [company_id, vendor_id, po_number, date, expected_date, total_amount, notes, req.user.id]
        );
        
        const po_id = result.lastID;

        // Insert Items
        for (const item of items) {
             await run(
                `INSERT INTO purchase_order_items (po_id, description, quantity, unit_price, total_price)
                 VALUES (?, ?, ?, ?, ?)`,
                [po_id, item.description, item.quantity, item.unit_price, Number(item.quantity) * Number(item.unit_price)]
             );
        }

        res.json({ message: "Purchase Order Created", id: po_id, po_number });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT Update Status
router.put('/:id/status', auth, async (req, res) => {
    const { status } = req.body;
    try {
        await run("UPDATE purchase_orders SET status = ? WHERE id = ?", [status, req.params.id]);
        res.json({ message: "Status updated" });
    } catch (err) {
         res.status(500).json({ error: err.message });
    }
});

// Generate Voucher from PO
router.post('/:id/generate-voucher', auth, async (req, res) => {
    try {
        const po = await get("SELECT * FROM purchase_orders WHERE id = ?", [req.params.id]);
        if (!po) return res.status(404).json({ error: "PO not found" });
        
        if (po.status !== 'Approved' && po.status !== 'Received') {
             return res.status(400).json({ error: "PO must be Approved or Received to generate voucher" });
        }

        const vendor = await get("SELECT * FROM vendors WHERE id = ?", [po.vendor_id]);
        
        // Create Voucher
        const voucher_no = `V-${po.po_number}`; // Link numbers
        // Check duplicate
        const exist = await get("SELECT id FROM vouchers WHERE voucher_no = ?", [voucher_no]);
        if (exist) return res.status(400).json({ error: "Voucher for this PO already exists" });

        await run(
            `INSERT INTO vouchers (voucher_no, company_id, date, payee, description, amount, payment_type, status, created_by, urgency)
             VALUES (?, ?, DATE('now'), ?, ?, ?, 'Check', 'Draft', ?, 'Normal')`,
            [voucher_no, po.company_id, vendor.name, `Payment for ${po.po_number}`, po.total_amount, req.user.id]
        );

        res.json({ message: "Voucher generated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
