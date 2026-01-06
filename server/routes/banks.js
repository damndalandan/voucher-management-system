const express = require('express');
const router = express.Router();
const { db } = require('../database');
const authenticateToken = require('../middleware/auth');

// Get Bank Accounts
router.get('/banks', authenticateToken, (req, res) => {
    const { company_id } = req.query;
    let sql = `SELECT b.*, c.name as company_name,
               (SELECT SUM(amount) FROM checks WHERE bank_account_id = b.id AND status = 'Issued') as unclaimed_balance,
               (SELECT COUNT(*) FROM checks WHERE bank_account_id = b.id AND status = 'Issued') as unclaimed_count,
               (SELECT next_check_no FROM checkbooks WHERE bank_account_id = b.id AND status = 'Active' ORDER BY id ASC LIMIT 1) as next_check_no
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

// Update Transaction
router.put('/transactions/:id', authenticateToken, (req, res) => {
    const { transaction_date, amount } = req.body;
    const { id } = req.params;
    const { role } = req.user;

    if (role !== 'admin') {
        return res.status(403).json({ error: "Only admins can edit transaction details" });
    }

    db.get("SELECT * FROM bank_transactions WHERE id = ?", [id], (err, tx) => {
        if (err || !tx) return res.status(404).json({ error: "Transaction not found" });

        const newDate = transaction_date || tx.transaction_date;
        const newAmount = (amount !== undefined && amount !== null && amount !== '') ? parseFloat(amount) : tx.amount;

        db.serialize(() => {
            // 1. Update the target transaction first
            db.run("UPDATE bank_transactions SET transaction_date = ?, amount = ? WHERE id = ?", 
                [newDate, newAmount, id], (err) => {
                    if (err) return res.status(500).json({ error: err.message });

                    // 2. Recalculate ALL balances for this account from top to bottom
                    db.all("SELECT * FROM bank_transactions WHERE bank_account_id = ? ORDER BY transaction_date ASC, id ASC", 
                        [tx.bank_account_id], (err, transactions) => {
                        if (err) return res.status(500).json({ error: err.message });

                        let runningBalance = 0;
                        const updateStmt = db.prepare("UPDATE bank_transactions SET running_balance = ? WHERE id = ?");

                        transactions.forEach(t => {
                            const amt = parseFloat(t.amount);
                            // Assuming 'Deposit' adds to balance, everything else subtracts (Withdrawal, Bounced, etc.)
                            // Adjust logic if 'Bounced' behaves differently (e.g. Bounced Check adds back money?)
                            // Based on previous code: 
                            // Deposit -> +
                            // Withdrawal -> -
                            // Bounced (if it was a check clearing) -> + (Reversal)
                            // Void Refund -> +
                            
                            // However, the 'type' field in DB is what we have.
                            // Let's look at how they are inserted.
                            // Deposit -> 'Deposit'
                            // Withdrawal -> 'Withdrawal'
                            // Bounced Check Reversal -> 'Deposit' (type is Deposit, category is Reversal)
                            // Bounced Check Fee -> 'Bounced' (type is Bounced) -> usually 0 or fee?
                            
                            // Simplest assumption: Deposit adds, everything else subtracts?
                            // Let's check the 'type' column usage.
                            
                            if (t.type === 'Deposit') {
                                runningBalance += amt;
                            } else {
                                runningBalance -= amt;
                            }
                            
                            updateStmt.run(runningBalance, t.id);
                        });

                        updateStmt.finalize(() => {
                            // 3. Update final account balance
                            db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", 
                                [runningBalance, tx.bank_account_id], (err) => {
                                    if (err) return res.status(500).json({ error: err.message });
                                    res.json({ message: "Transaction updated and passbook recalculated" });
                                });
                        });
                    });
                });
        });
    });
});

module.exports = router;