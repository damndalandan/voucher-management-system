const express = require('express');
const router = express.Router();
const { db } = require('../database');
const authenticateToken = require('../middleware/auth');

// Get Bank Accounts
router.get('/banks', authenticateToken, (req, res) => {
    const { company_id } = req.query;
    let sql = `SELECT b.*, c.name as company_name,
               (SELECT SUM(amount) FROM checks WHERE bank_account_id = b.id AND status = 'Issued') as unclaimed_balance,
               (SELECT COUNT(*) FROM checks WHERE bank_account_id = b.id AND status = 'Issued') as unclaimed_count
               FROM bank_accounts b 
               LEFT JOIN companies c ON b.company_id = c.id`;
    const params = [];
    if (company_id) {
        sql += " WHERE b.company_id = ?";
        params.push(company_id);
    }
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create Bank Account
router.post('/banks', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    const { company_id, bank_name, account_number, initial_balance } = req.body;
    db.run("INSERT INTO bank_accounts (company_id, bank_name, account_number, current_balance) VALUES (?, ?, ?, ?)", 
        [company_id, bank_name, account_number, initial_balance || 0], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (initial_balance > 0) {
                db.run("INSERT INTO bank_transactions (bank_account_id, type, amount, description, running_balance) VALUES (?, 'Deposit', ?, 'Initial Balance', ?)",
                    [this.lastID, initial_balance, initial_balance]);
            }
            res.json({ id: this.lastID, message: "Bank account created" });
        }
    );
});

// Get Checkbooks
router.get('/banks/:id/checkbooks', authenticateToken, (req, res) => {
    db.all("SELECT * FROM checkbooks WHERE bank_account_id = ?", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add Checkbook
router.post('/banks/:id/checkbooks', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'liaison') return res.status(403).json({ error: "Access denied" });

    const { series_start, series_end } = req.body;
    const bank_account_id = req.params.id;
    
    db.run("INSERT INTO checkbooks (bank_account_id, series_start, series_end, next_check_no) VALUES (?, ?, ?, ?)",
        [bank_account_id, series_start, series_end, series_start],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: "Checkbook added" });
        }
    );
});

// Get Transactions
router.get('/banks/:id/transactions', authenticateToken, (req, res) => {
    db.all("SELECT * FROM bank_transactions WHERE bank_account_id = ? ORDER BY transaction_date DESC", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Record Transaction
router.post('/banks/:id/transaction', authenticateToken, (req, res) => {
    const { type, amount, description, category, check_no, date } = req.body;
    const bank_account_id = req.params.id;
    
    db.get("SELECT current_balance FROM bank_accounts WHERE id = ?", [bank_account_id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "Account not found" });
        
        let newBalance = row.current_balance;
        if (type === 'Deposit') {
            newBalance += parseFloat(amount);
        } else {
            newBalance -= parseFloat(amount);
        }
        
        const transactionDate = date || new Date().toISOString();

        db.serialize(() => {
            db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", [newBalance, bank_account_id]);
            db.run("INSERT INTO bank_transactions (bank_account_id, type, category, amount, description, check_no, running_balance, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [bank_account_id, type, category, amount, description, check_no, newBalance, transactionDate]);
        });
        
        res.json({ message: "Transaction recorded", new_balance: newBalance });
    });
});

// Record Deposit (Legacy)
router.post('/banks/:id/deposit', authenticateToken, (req, res) => {
    const { amount, description } = req.body;
    const bank_account_id = req.params.id;
    db.get("SELECT current_balance FROM bank_accounts WHERE id = ?", [bank_account_id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "Account not found" });
        const newBalance = row.current_balance + parseFloat(amount);
        db.serialize(() => {
            db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", [newBalance, bank_account_id]);
            db.run("INSERT INTO bank_transactions (bank_account_id, type, category, amount, description, running_balance) VALUES (?, 'Deposit', 'Sales', ?, ?, ?)",
                [bank_account_id, amount, description, newBalance]);
        });
        res.json({ message: "Deposit recorded", new_balance: newBalance });
    });
});

// Get Checks
router.get('/banks/:id/checks', authenticateToken, (req, res) => {
    db.all("SELECT * FROM checks WHERE bank_account_id = ? ORDER BY date_issued DESC", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;