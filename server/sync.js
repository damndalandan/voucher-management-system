const { db } = require('./database');

const syncData = () => {
    console.log("Starting Data Sync...");
    
    // 1. Sync Checks
    db.all(`SELECT v.* FROM vouchers v 
            WHERE v.status = 'Issued' 
            AND v.payment_type = 'Check' 
            AND v.check_no IS NOT NULL 
            AND v.check_no != ''
            AND v.bank_name IS NOT NULL`, [], (err, vouchers) => {
        if (err) return console.error("Error fetching check vouchers for sync:", err);
        
        vouchers.forEach(v => {
            db.get("SELECT id FROM checks WHERE voucher_id = ?", [v.id], (err, check) => {
                if (!check) {
                    console.log(`Syncing missing check for Voucher ${v.voucher_no}`);
                    db.get("SELECT id FROM bank_accounts WHERE bank_name = ?", [v.bank_name], (err, account) => {
                        if (account) {
                            db.run(`INSERT INTO checks (bank_account_id, voucher_id, check_number, check_date, date_issued, payee, description, amount, status) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Issued')`,
                                    [account.id, v.id, v.check_no, v.check_date || null, v.check_issued_date || v.created_at || new Date().toISOString(), v.payee, v.description, v.amount],
                                    (err) => {
                                        if (!err) {
                                            db.run(`UPDATE checkbooks 
                                                    SET next_check_no = CASE WHEN CAST(? AS INTEGER) >= next_check_no THEN CAST(? AS INTEGER) + 1 ELSE next_check_no END
                                                    WHERE bank_account_id = ? 
                                                    AND CAST(? AS INTEGER) BETWEEN series_start AND series_end 
                                                    AND status = 'Active'`, 
                                                    [v.check_no, v.check_no, account.id, v.check_no]);
                                        }
                                    });
                        }
                    });
                }
            });
        });
    });

    // 2. Sync Encashment Transactions
    db.all(`SELECT v.* FROM vouchers v 
            WHERE v.status = 'Issued' 
            AND v.payment_type = 'Encashment' 
            AND v.bank_name IS NOT NULL`, [], (err, vouchers) => {
        if (err) return console.error("Error fetching encashment vouchers for sync:", err);

        vouchers.forEach(v => {
            db.get("SELECT id FROM bank_transactions WHERE voucher_id = ?", [v.id], (err, tx) => {
                if (!tx) {
                    console.log(`Syncing missing transaction for Voucher ${v.voucher_no}`);
                    db.get("SELECT id, current_balance FROM bank_accounts WHERE bank_name = ?", [v.bank_name], (err, account) => {
                        if (account) {
                            const newBalance = account.current_balance - v.amount;
                            db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", [newBalance, account.id]);
                            db.run("INSERT INTO bank_transactions (bank_account_id, voucher_id, type, category, amount, description, running_balance) VALUES (?, ?, 'Withdrawal', ?, ?, ?, ?)",
                                [account.id, v.id, v.category || 'Encashment', v.amount, `Encashment: ${v.payee}`, newBalance]);
                        }
                    });
                }
            });
        });
    });

    // 3. Sync Cleared Check Transactions (Fix for missing transactions)
    db.all(`SELECT c.*, v.category FROM checks c 
            LEFT JOIN vouchers v ON c.voucher_id = v.id
            WHERE c.status = 'Cleared'`, [], (err, checks) => {
        if (err) return console.error("Error fetching cleared checks for sync:", err);

        checks.forEach(c => {
            // Check if transaction exists for this check
            db.get("SELECT id FROM bank_transactions WHERE check_no = ? AND type = 'Withdrawal'", [c.check_number], (err, tx) => {
                if (!tx) {
                    console.log(`Syncing missing transaction for Cleared Check ${c.check_number}`);
                    // Assume balance was already updated (since check is cleared), just insert record
                    db.get("SELECT current_balance FROM bank_accounts WHERE id = ?", [c.bank_account_id], (err, account) => {
                        if (account) {
                             // Use date_cleared if available, else fallback to now
                             const txDate = c.date_cleared || new Date().toISOString();
                             db.run("INSERT INTO bank_transactions (bank_account_id, voucher_id, type, category, amount, description, check_no, running_balance, transaction_date) VALUES (?, ?, 'Withdrawal', ?, ?, ?, ?, ?, ?)",
                                [c.bank_account_id, c.voucher_id, c.category || 'Check Issuance', c.amount, `Check Cleared: ${c.payee}`, c.check_number, account.current_balance, txDate]);
                        }
                    });
                }
            });
        });
    });
};

module.exports = syncData;
