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

    let { company_id, bank_name, account_number, initial_balance } = req.body;
    
    // Ensure initial_balance is a valid number (handle commas)
    let processedBalance = initial_balance;
    if (typeof processedBalance === 'string') {
        processedBalance = processedBalance.split(',').join('');
    }
    
    let floatBalance = parseFloat(processedBalance) || 0;
    // floatBalance = Math.round(floatBalance * 100) / 100;

    db.run("INSERT INTO bank_accounts (company_id, bank_name, account_number, current_balance) VALUES (?, ?, ?, ?)", 
        [company_id, bank_name, account_number, floatBalance], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            const bankId = this.lastID;
            
            if (floatBalance > 0) {
                 const today = new Date().toISOString();
                 // Added explicit transaction_date and error logging
                db.run("INSERT INTO bank_transactions (bank_account_id, type, amount, description, running_balance, transaction_date) VALUES (?, 'Deposit', ?, 'Initial Balance', ?, ?)",
                    [bankId, floatBalance, floatBalance, today], (err) => {
                        if (err) console.error("Error creating initial balance transaction:", err);
                    });
            }
            res.json({ id: bankId, message: "Bank account created" });
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
    db.all("SELECT * FROM bank_transactions WHERE bank_account_id = ? ORDER BY transaction_date ASC, id ASC", [req.params.id], (err, rows) => {
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
        
        let newBalance = parseFloat(row.current_balance);
        
        // Handle commas in input
        let safeAmount = amount;
        if (typeof safeAmount === 'string') {
            safeAmount = safeAmount.replace(/,/g, '');
        }

        const amountFloat = parseFloat(safeAmount);
        if (type === 'Deposit') {
            newBalance += amountFloat;
        } else {
            newBalance -= amountFloat;
        }

        // Use raw balance
        // newBalance = Math.round(newBalance * 100) / 100;
        
        const transactionDate = date || new Date().toISOString();

        db.serialize(() => {
            db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", [newBalance, bank_account_id]);
            db.run("INSERT INTO bank_transactions (bank_account_id, type, category, amount, description, check_no, running_balance, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [bank_account_id, type, category, amountFloat, description, check_no, newBalance, transactionDate], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: "Transaction recorded", new_balance: newBalance, id: this.lastID });
                });
        });
    });
});

// Record Deposit (Legacy)
router.post('/banks/:id/deposit', authenticateToken, (req, res) => {
    const { amount, description } = req.body;
    const bank_account_id = req.params.id;
    db.get("SELECT current_balance FROM bank_accounts WHERE id = ?", [bank_account_id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "Account not found" });
        
        let safeAmount = amount;
        if (typeof safeAmount === 'string') {
            safeAmount = safeAmount.replace(/,/g, '');
        }
        
        // Ensure current_balance is treated as a number
        let currentBalance = parseFloat(row.current_balance);
        let newBalance = currentBalance + parseFloat(safeAmount);
        // newBalance = Math.round(newBalance * 100) / 100;
        
        const safeAmountFloat = parseFloat(safeAmount);

        db.serialize(() => {
            db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", [newBalance, bank_account_id]);
            db.run("INSERT INTO bank_transactions (bank_account_id, type, category, amount, description, running_balance) VALUES (?, 'Deposit', 'Sales', ?, ?, ?)",
                [bank_account_id, safeAmountFloat, description, newBalance]);
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
        let newAmount = tx.amount;
        
        if (amount !== undefined && amount !== null && amount !== '') {
            let safeAmount = amount;
            if (typeof safeAmount === 'string') {
                safeAmount = safeAmount.replace(/,/g, '');
            }
            newAmount = parseFloat(safeAmount);
        }

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
                        
                        // Use Promise.all equivalent logic since db.run might be async in Postgres wrapper
                        // and we want to ensure all updates complete before sending response.
                        const updatePromises = transactions.map(t => {
                            const amt = parseFloat(t.amount);

                            if (t.type === 'Deposit') {
                                runningBalance += amt;
                            } else {
                                runningBalance -= amt;
                            }
                            
                            // Return a promise for each update
                            return new Promise((resolve, reject) => {
                                db.run("UPDATE bank_transactions SET running_balance = ? WHERE id = ?", 
                                    [runningBalance, t.id], (err) => {
                                        if (err) reject(err);
                                        else resolve();
                                    });
                            });
                        });

                        Promise.all(updatePromises)
                            .then(() => {
                                // 3. Update final account balance
                                db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", 
                                    [runningBalance, tx.bank_account_id], (err) => {
                                        if (err) return res.status(500).json({ error: err.message });
                                        res.json({ message: "Transaction updated and passbook recalculated" });
                                    });
                            })
                            .catch(err => {
                                console.error("Error recalculating balances:", err);
                                res.status(500).json({ error: "Failed to recalculate balances" });
                            });
                    });
                });
        });
    });
});

// Delete Bank Account
router.delete('/banks/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    const bankId = req.params.id;
    
    db.serialize(() => {
        // Delete related data first to avoid foreign key constraints
        // Note: In a production system, you might want to soft-delete or archive instead.
        db.run("DELETE FROM checks WHERE bank_account_id = ?", [bankId]);
        db.run("DELETE FROM checkbooks WHERE bank_account_id = ?", [bankId]);
        db.run("DELETE FROM bank_transactions WHERE bank_account_id = ?", [bankId]);
        
        // Delete the account
        db.run("DELETE FROM bank_accounts WHERE id = ?", [bankId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: "Bank account not found" });
            res.json({ message: "Bank account deleted successfully" });
        });
    });
});

// Recalculate Balance
router.post('/banks/:id/recalculate', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });
    const bankId = req.params.id;

    db.all("SELECT * FROM bank_transactions WHERE bank_account_id = ? ORDER BY transaction_date ASC, id ASC", [bankId], (err, transactions) => {
        if (err) return res.status(500).json({ error: err.message });

        let currentBalance = 0;
        const promises = transactions.map(t => {
            const amount = parseFloat(t.amount);
            if (t.type === 'Deposit') {
                currentBalance += amount;
            } else {
                currentBalance -= amount;
            }
            return new Promise((resolve, reject) => {
                db.run("UPDATE bank_transactions SET running_balance = ? WHERE id = ?", [currentBalance, t.id], (err) => {
                     if (err) reject(err);
                     else resolve();
                });
            });
        });

        Promise.all(promises).then(() => {
            db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", [currentBalance, bankId], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Balance recalculated successfully", new_balance: currentBalance });
            });
        }).catch(err => {
            res.status(500).json({ error: "Failed to recalculate: " + err.message });
        });
    });
});

module.exports = router;