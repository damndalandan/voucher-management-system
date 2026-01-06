const express = require('express');
const router = express.Router();
const { db } = require('../database');
const authenticateToken = require('../middleware/auth');

// Update Check Status
router.post('/checks/:id/status', authenticateToken, (req, res) => {
    const { status, date, received_by } = req.body; // 'Claimed', 'Cleared', 'Cancelled', date is optional
    const { id } = req.params;

    db.get("SELECT * FROM checks WHERE id = ?", [id], (err, check) => {
        if (err || !check) return res.status(404).json({ error: "Check not found" });

        if (status === 'Cleared' && check.status !== 'Cleared') {
            db.get("SELECT current_balance FROM bank_accounts WHERE id = ?", [check.bank_account_id], (err, account) => {
                if (err || !account) return res.status(404).json({ error: "Bank account not found" });
                
                db.get("SELECT category FROM vouchers WHERE id = ?", [check.voucher_id], (err, voucher) => {
                    const category = (voucher && voucher.category) ? voucher.category : 'Check Issuance';
                    const newBalance = account.current_balance - check.amount;
                    
                    const transactionDate = date || new Date().toISOString();

                    db.serialize(() => {
                        db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", [newBalance, check.bank_account_id], (err) => {
                            if (err) console.error("Error updating balance:", err);
                        });
                        db.run("INSERT INTO bank_transactions (bank_account_id, voucher_id, type, category, amount, description, check_no, running_balance, transaction_date) VALUES (?, ?, 'Withdrawal', ?, ?, ?, ?, ?, ?)",
                            [check.bank_account_id, check.voucher_id, category, check.amount, `Check Cleared: ${check.payee}`, check.check_number, newBalance, transactionDate], (err) => {
                                if (err) console.error("Error inserting transaction:", err);
                            });
                        db.run("UPDATE checks SET status = 'Cleared', date_cleared = ? WHERE id = ?", [transactionDate, id], (err) => {
                            if (err) console.error("Error updating check status:", err);
                        });
                    });
                    res.json({ message: "Check cleared and balance updated" });
                });
            });
        } else if (status === 'Bounced') {
            db.run("UPDATE checks SET status = 'Bounced' WHERE id = ?", [id]);
            db.run("UPDATE vouchers SET status = 'Bounced' WHERE id = ?", [check.voucher_id]);

            if (check.status === 'Cleared') {
                db.get("SELECT current_balance FROM bank_accounts WHERE id = ?", [check.bank_account_id], (err, account) => {
                    if (!err && account) {
                        const newBalance = account.current_balance + check.amount;
                        db.serialize(() => {
                            db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", [newBalance, check.bank_account_id]);
                            db.run("INSERT INTO bank_transactions (bank_account_id, voucher_id, type, category, amount, description, check_no, running_balance) VALUES (?, ?, 'Deposit', 'Check Bounced (Reversal)', ?, ?, ?, ?)",
                                [check.bank_account_id, check.voucher_id, check.amount, `Bounced Check: ${check.payee}`, check.check_number, newBalance]);
                        });
                    }
                });
            } else {
                db.get("SELECT current_balance FROM bank_accounts WHERE id = ?", [check.bank_account_id], (err, account) => {
                    if (!err && account) {
                         db.run("INSERT INTO bank_transactions (bank_account_id, voucher_id, type, category, amount, description, check_no, running_balance) VALUES (?, ?, 'Bounced', 'Check Bounced', 0, ?, ?, ?)",
                                [check.bank_account_id, check.voucher_id, `Bounced Check: ${check.payee}`, check.check_number, account.current_balance]);
                    }
                });
            }
            res.json({ message: "Check marked as Bounced" });
        } else if (status === 'Voided') {
            db.run("UPDATE checks SET status = 'Voided' WHERE id = ?", [id]);
            db.run("UPDATE vouchers SET status = 'Voided' WHERE id = ?", [check.voucher_id]);

            if (check.status === 'Cleared') {
                db.get("SELECT current_balance FROM bank_accounts WHERE id = ?", [check.bank_account_id], (err, account) => {
                    if (!err && account) {
                        const newBalance = account.current_balance + check.amount;
                        db.serialize(() => {
                            db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", [newBalance, check.bank_account_id]);
                            db.run("INSERT INTO bank_transactions (bank_account_id, voucher_id, type, category, amount, description, check_no, running_balance) VALUES (?, ?, 'Deposit', 'Void Refund', ?, ?, ?, ?)",
                                [check.bank_account_id, check.voucher_id, check.amount, `Voided Check: ${check.payee}`, check.check_number, newBalance]);
                        });
                    }
                });
            }
            res.json({ message: "Check marked as Voided" });
        } else {
            db.serialize(() => {
                 db.run("UPDATE checks SET status = ? WHERE id = ?", [status, id]);
                 if (status === 'Claimed') {
                     const voucherUpdates = ["status = 'Claimed'"];
                     const params = [];
                     if (received_by) {
                         voucherUpdates.push("received_by = ?");
                         params.push(received_by);
                     }
                     params.push(check.voucher_id);
                     db.run(`UPDATE vouchers SET ${voucherUpdates.join(', ')} WHERE id = ?`, params);
                 }
            });
            res.json({ message: `Check marked as ${status}` });
        }
    });
});

// Update Check Details
router.put('/checks/:id', authenticateToken, (req, res) => {
    const { date_issued } = req.body;
    const { id } = req.params;
    const { role } = req.user;

    if (role !== 'admin') {
        return res.status(403).json({ error: "Only admins can edit check details" });
    }

    db.run("UPDATE checks SET date_issued = ? WHERE id = ?", [date_issued, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Check details updated successfully" });
    });
});

module.exports = router;