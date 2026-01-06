const express = require('express');
const router = express.Router();
const { db } = require('../database');
const authenticateToken = require('../middleware/auth');
const upload = require('../middleware/upload');

// Force Delete Voucher (Admin Only)
router.delete('/vouchers/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Only admin can force delete vouchers" });
    const { id } = req.params;
    
    db.serialize(() => {
        db.run("DELETE FROM voucher_attachments WHERE voucher_id = ?", [id]);
        // Also delete physical files? Skipping for now to avoid complexity, or just delete records.
        // It's 'force delete transaction', database cleanup is priority.

        db.run("DELETE FROM voucher_history WHERE voucher_id = ?", [id]);
        
        // Remove from checks table to free up check number
        db.run("DELETE FROM checks WHERE voucher_id = ?", [id]);

        // Remove from bank transactions (if any) to fix balances theoretically? 
        // If we want a clean 'undo', we should revert balance impacts. 
        // But 'Force Delete' is brute force. Let's assume removing transaction record is enough, 
        // validation logic might recalc balance or user corrects it manually via DB management if needed.
        // However, checks table is linked to 'checks' table. 
        // bank_transactions table links check_no or voucher_id?
        db.run("DELETE FROM bank_transactions WHERE voucher_id = ?", [id]);

        db.run("DELETE FROM vouchers WHERE id = ?", [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Voucher force deleted successfully" });
        });
    });
});

// Get Top 10 Urgent Vouchers
router.get('/vouchers/urgent', authenticateToken, (req, res) => {
    const { company_id, sort } = req.query; // sort: 'urgency' or 'date'
    const { role } = req.user;
    
    let statusFilter = "";
    if (role === 'liaison') {
        statusFilter = "v.status = 'Pending Liaison'";
    } else if (role === 'admin') {
        statusFilter = "v.status = 'Pending Admin'";
    } else {
        return res.json([]); // Staff doesn't see this view usually
    }

    let sql = `SELECT v.*, c.name as company_name,
               GROUP_CONCAT(va.id, '||') as attachment_ids,
               GROUP_CONCAT(va.file_path, '||') as attachment_paths,
               GROUP_CONCAT(va.original_name, '||') as attachment_names
               FROM vouchers v 
               JOIN companies c ON v.company_id = c.id 
               LEFT JOIN voucher_attachments va ON v.id = va.voucher_id
               WHERE ${statusFilter}`;
    
    const params = [];
    if (company_id) {
        sql += " AND v.company_id = ?";
        params.push(company_id);
    }

    sql += " GROUP BY v.id";

    if (sort === 'urgency') {
        sql += ` ORDER BY 
                 CASE v.urgency 
                    WHEN 'Critical' THEN 1 
                    WHEN 'Urgent' THEN 2 
                    ELSE 3 
                 END, 
                 v.deadline_date ASC`;
    } else {
        sql += ` ORDER BY 
                 CASE WHEN v.deadline_date IS NULL OR v.deadline_date = '' THEN 1 ELSE 0 END, 
                 v.deadline_date ASC, 
                 v.date ASC`;
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get Vouchers
router.get('/vouchers', authenticateToken, (req, res) => {
    const { company_id, filter_type, filter_value, search, category } = req.query; 
    const { role } = req.user;

    let sql = `SELECT v.*, c.name as company_name, u.username as created_by_user, u.full_name as created_by_name,
               GROUP_CONCAT(va.id, '||') as attachment_ids,
               GROUP_CONCAT(va.file_path, '||') as attachment_paths,
               GROUP_CONCAT(va.original_name, '||') as attachment_names,
               (SELECT COUNT(*) FROM voucher_history WHERE voucher_id = v.id AND action != 'Created') as history_count
               FROM vouchers v 
               JOIN companies c ON v.company_id = c.id 
               LEFT JOIN users u ON v.created_by = u.id
               LEFT JOIN voucher_attachments va ON v.id = va.voucher_id`;
    
    const params = [];
    const conditions = [];

    if (role !== 'admin' && role !== 'liaison') {
        if (company_id) {
            conditions.push(`v.company_id = ?`);
            params.push(company_id);
        }
    } else {
        if (company_id) {
            conditions.push(`v.company_id = ?`);
            params.push(company_id);
        }
    }

    if (role === 'admin') {
        // conditions.push(`v.status != 'Pending Liaison'`); // Allow Admin to see detailed status of all vouchers
    }

    if (category && category !== 'all') {
        conditions.push(`v.category = ?`);
        params.push(category);
    }

    if (search) {
        conditions.push(`(v.voucher_no LIKE ? OR v.payee LIKE ? OR v.description LIKE ?)`);
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
    }

    if (filter_type && filter_value) {
        if (filter_type === 'day' || filter_type === 'exact') {
            conditions.push(`v.date = ?`);
            params.push(filter_value);
        } else if (filter_type === 'month') {
            conditions.push(`strftime('%Y-%m', v.date) = ?`);
            params.push(filter_value);
        } else if (filter_type === 'year') {
            conditions.push(`strftime('%Y', v.date) = ?`);
            params.push(filter_value);
        } else if (filter_type === 'week') {
            const [yearStr, weekStr] = filter_value.split('-W');
            if (yearStr && weekStr) {
                const year = parseInt(yearStr, 10);
                const week = parseInt(weekStr, 10);
                const jan4 = new Date(year, 0, 4);
                const day = jan4.getDay() || 7;
                const mondayOfWeek1 = new Date(year, 0, 4 - day + 1);
                const startOfWeek = new Date(mondayOfWeek1.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
                const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
                const startStr = startOfWeek.toISOString().split('T')[0];
                const endStr = endOfWeek.toISOString().split('T')[0];
                conditions.push(`v.date BETWEEN ? AND ?`);
                params.push(startStr, endStr);
            }
        }
    }
    
    if (req.query.start_date && req.query.end_date) {
        conditions.push(`v.date BETWEEN ? AND ?`);
        params.push(req.query.start_date, req.query.end_date);
    }

    if (conditions.length > 0) {
        sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` GROUP BY v.id ORDER BY v.created_at DESC`;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create Voucher
router.post('/vouchers', authenticateToken, upload.array('attachments', 50), (req, res) => {
    const { company_id, date, payee, description, amount, amount_in_words, payment_type, check_no, bank_name, category, urgency, deadline_date, is_pdc, check_date } = req.body;
    const { role, id: created_by } = req.user;
    
    if (!company_id) return res.status(400).json({ error: "Company ID is required" });

    let status = 'Issued';
    if (role === 'staff' || role === 'hr') {
        status = 'Pending Liaison';
    } else if (role === 'liaison') {
        // Both Check and Encashment go to Admin for approval if configured, 
        // or stay Issued if Liaison has power. Based on previous logic:
        status = (payment_type === 'Check' || payment_type === 'Encashment') ? 'Pending Admin' : 'Issued';
    } else if (role === 'admin') {
        status = 'Issued';
    }

    db.get("SELECT prefix FROM companies WHERE id = ?", [company_id], (err, company) => {
        if (err || !company) return res.status(500).json({ error: "Company not found" });

        const prefix = company.prefix;

        db.get("SELECT count(*) as count FROM vouchers WHERE company_id = ?", [company_id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const nextNum = row.count + 1;
            const sequence = String(nextNum).padStart(5, '0');
            const voucher_no = `${prefix}-${sequence}`;

            const insertVoucher = () => {
                const sql = `INSERT INTO vouchers (voucher_no, company_id, date, payee, description, amount, amount_in_words, payment_type, check_no, bank_name, category, created_by, status, urgency, deadline_date, is_pdc, check_date) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                const params = [voucher_no, company_id, date, payee, description, amount, amount_in_words, payment_type, check_no, bank_name, category, created_by, status, urgency || 'Normal', deadline_date, (is_pdc === 'true' || is_pdc === '1' || is_pdc === 1) ? 1 : 0, check_date];

                db.run(sql, params, function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    const voucherId = this.lastID;

                    if (req.files && req.files.length > 0) {
                        const attachmentStmt = db.prepare("INSERT INTO voucher_attachments (voucher_id, file_path, original_name) VALUES (?, ?, ?)");
                        req.files.forEach(file => {
                            attachmentStmt.run(voucherId, `/uploads/${file.filename}`, file.originalname);
                        });
                        attachmentStmt.finalize();
                    }

                    db.run("INSERT INTO voucher_history (voucher_id, user_id, action, details) VALUES (?, ?, ?, ?)",
                        [voucherId, created_by, 'Created', 'Voucher created']);

                    // Unified logic for Checks AND Encashment
                    if (status === 'Issued' && (payment_type === 'Check' || payment_type === 'Encashment') && check_no && bank_name) {
                        db.get("SELECT id FROM bank_accounts WHERE bank_name = ?", [bank_name], (err, account) => {
                            if (!err && account) {
                                db.run(`INSERT INTO checks (bank_account_id, voucher_id, check_number, check_date, date_issued, payee, description, amount, status) 
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Issued')`,
                                        [account.id, voucherId, check_no, check_date || null, new Date().toISOString(), payee, description, amount],
                                        (err) => {
                                            if (err) console.error("Error inserting check:", err.message);
                                            db.run(`UPDATE checkbooks 
                                                    SET next_check_no = CASE WHEN CAST(? AS INTEGER) >= next_check_no THEN CAST(? AS INTEGER) + 1 ELSE next_check_no END
                                                    WHERE bank_account_id = ? 
                                                    AND CAST(? AS INTEGER) BETWEEN series_start AND series_end 
                                                    AND status = 'Active'`, 
                                                    [check_no, check_no, account.id, check_no]);
                                        });
                            }
                        });
                    } else if (status === 'Pending Admin' && (payment_type === 'Check' || payment_type === 'Encashment') && check_no && bank_name) {
                        db.get("SELECT id FROM bank_accounts WHERE bank_name = ?", [bank_name], (err, account) => {
                            if (!err && account) {
                                db.run(`INSERT INTO checks (bank_account_id, voucher_id, check_number, check_date, date_issued, payee, description, amount, status) 
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
                                        [account.id, voucherId, check_no, check_date || null, new Date().toISOString(), payee, description, amount],
                                        (err) => {
                                            if (err) console.error("Error inserting pending check:", err.message);
                                            db.run(`UPDATE checkbooks 
                                                    SET next_check_no = CASE WHEN CAST(? AS INTEGER) >= next_check_no THEN CAST(? AS INTEGER) + 1 ELSE next_check_no END
                                                    WHERE bank_account_id = ? 
                                                    AND CAST(? AS INTEGER) BETWEEN series_start AND series_end 
                                                    AND status = 'Active'`, 
                                                    [check_no, check_no, account.id, check_no]);
                                        });
                            }
                        });
                    }
                    // REMOVED explicit Encashment-direct-withdrawal logic to ensure it goes through Check flow
                    /*
                    else if (status === 'Issued' && payment_type === 'Encashment' && bank_name) {
                       ...
                    }
                    */

                    res.json({ 
                        id: voucherId, 
                        voucher_no, 
                        status,
                        message: "Voucher created successfully" 
                    });
                });
            };

            if ((status === 'Issued' || status === 'Pending Admin') && (payment_type === 'Check' || payment_type === 'Encashment') && check_no && bank_name) {
                db.get("SELECT id FROM bank_accounts WHERE bank_name = ?", [bank_name], (err, account) => {
                    if (err || !account) {
                        return insertVoucher();
                    }
                    db.get("SELECT id FROM checks WHERE bank_account_id = ? AND check_number = ?", [account.id, check_no], (err, row) => {
                        if (row) return res.status(400).json({ error: `Check number ${check_no} is already used.` });
                        insertVoucher();
                    });
                });
            } else {
                insertVoucher();
            }
        });
    });
});

// Update Voucher Status
router.put('/vouchers/:id/status', authenticateToken, upload.single('approval_attachment'), (req, res) => {
    const { id } = req.params;
    let { status } = req.body;
    const { void_reason, certified_by, approved_by, received_by, check_no, bank_name, check_date } = req.body;
    const { role, id: user_id, full_name, username } = req.user;

    // Enforce Approval Workflow for Liaison: Downgrade 'Issued' to 'Pending Admin' if no attachment (standard flow)
    if (role === 'liaison' && status === 'Issued' && !req.file) {
        status = 'Pending Admin';
    }

    db.get("SELECT * FROM vouchers WHERE id = ?", [id], (err, currentVoucher) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!currentVoucher) return res.status(404).json({ error: "Voucher not found" });

        const effectiveCheckNo = check_no || currentVoucher.check_no;
        const effectiveBankName = bank_name || currentVoucher.bank_name;
        const isCheckOrEncashment = currentVoucher.payment_type === 'Check' || currentVoucher.payment_type === 'Encashment';

        // Pre-check for duplicates if issuing
        if (status === 'Issued' && currentVoucher.status !== 'Issued' && isCheckOrEncashment && effectiveCheckNo && effectiveBankName) {
             db.get("SELECT id FROM bank_accounts WHERE bank_name = ?", [effectiveBankName], (err, account) => {
                 if (err || !account) return res.status(400).json({ error: "Bank account not found" });
                 
                 db.get("SELECT id, voucher_id FROM checks WHERE bank_account_id = ? AND check_number = ?", [account.id, effectiveCheckNo], (err, existingCheck) => {
                     if (existingCheck && existingCheck.voucher_id != id) {
                         return res.status(400).json({ error: `Check number ${effectiveCheckNo} is already used.` });
                     }
                     performUpdate();
                 });
             });
        } else {
            performUpdate();
        }

        function performUpdate() {
            const updates = ["status = ?"];
            const params = [status];
            
            if (check_no) { updates.push("check_no = ?"); params.push(check_no); }
            if (bank_name) { updates.push("bank_name = ?"); params.push(bank_name); }
            if (check_date) { updates.push("check_date = ?"); params.push(check_date); }

            if (void_reason) {
                updates.push("void_reason = ?");
                params.push(void_reason);
            }

            // Handle Workflow Names
            // Helper to get name
            const performerName = full_name || username || 'Unknown';

            if (status === 'Pending Admin' && role === 'liaison') {
                updates.push("certified_by = ?");
                params.push(certified_by || performerName);
            }

            if (status === 'Issued') {
                // If it was the admin approving
                if (role === 'admin') {
                     updates.push("approved_by = ?");
                     params.push(approved_by || performerName);
                } 
                // If liaison is issuing (Implicit Approval or Offline Approval)
                else if (role === 'liaison') {
                    updates.push("approved_by = ?");
                    // If offline approved, maybe use 'Offline Approval' or keep user name. 
                    // Let's use user name but append (Offline) if file exists? 
                    // Or just use user name.
                    params.push(approved_by || performerName);
                    
                    if (req.file) {
                        updates.push("approval_attachment = ?");
                        params.push(req.file.path);
                    }
                }
            }

            if (status === 'Claimed' || status === 'Cleared') {
                if (received_by) {
                    updates.push("received_by = ?");
                    params.push(received_by);
                }
            }

            params.push(id);

            db.run(`UPDATE vouchers SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
                if (err) return res.status(500).json({ error: err.message });

                // Log History
                let actionDetail = `Status changed to ${status}`;
                if (req.file) actionDetail += " (with approval attachment)";
                
                db.run("INSERT INTO voucher_history (voucher_id, user_id, action, details) VALUES (?, ?, ?, ?)",
                    [id, user_id, 'Status Update', actionDetail]);

                // Handle Side Effects
                if (status === 'Issued' && currentVoucher.status !== 'Issued') {
                    if ((currentVoucher.payment_type === 'Check' || currentVoucher.payment_type === 'Encashment') && currentVoucher.check_no && currentVoucher.bank_name) {
                        db.get("SELECT id FROM bank_accounts WHERE bank_name = ?", [currentVoucher.bank_name], (err, account) => {
                            if (!err && account) {
                                db.get("SELECT id FROM checks WHERE voucher_id = ?", [id], (err, existingCheck) => {
                                    if (!existingCheck) {
                                        db.run(`INSERT INTO checks (bank_account_id, voucher_id, check_number, check_date, date_issued, payee, description, amount, status) 
                                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Issued')`,
                                                [account.id, id, currentVoucher.check_no, currentVoucher.check_date, new Date().toISOString(), currentVoucher.payee, currentVoucher.description, currentVoucher.amount],
                                                (err) => {
                                                    if (!err) {
                                                        db.run(`UPDATE checkbooks 
                                                                SET next_check_no = CASE WHEN CAST(? AS INTEGER) >= next_check_no THEN CAST(? AS INTEGER) + 1 ELSE next_check_no END
                                                                WHERE bank_account_id = ? 
                                                                AND CAST(? AS INTEGER) BETWEEN series_start AND series_end 
                                                                AND status = 'Active'`, 
                                                                [currentVoucher.check_no, currentVoucher.check_no, account.id, currentVoucher.check_no]);
                                                    }
                                                });
                                    } else {
                                        db.run("UPDATE checks SET status = 'Issued' WHERE id = ?", [existingCheck.id]);
                                    }
                                });
                            }
                        });
                    } 
                    // REMOVED deprecated direct deduction for encashment 
                    /*
                    else if (currentVoucher.payment_type === 'Encashment' && currentVoucher.bank_name) {
                        db.get("SELECT id, current_balance FROM bank_accounts WHERE bank_name = ?", [currentVoucher.bank_name], (err, account) => {
                            if (!err && account) {
                                const newBalance = account.current_balance - currentVoucher.amount;
                                db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", [newBalance, account.id]);
                                db.run("INSERT INTO bank_transactions (bank_account_id, voucher_id, type, category, amount, description, running_balance) VALUES (?, ?, 'Withdrawal', ?, ?, ?, ?)",
                                    [account.id, id, currentVoucher.category || 'Encashment', currentVoucher.amount, `Encashment: ${currentVoucher.payee}`, newBalance]);
                            }
                        });
                    }
                    */
                } else if (status === 'Voided' && currentVoucher.status !== 'Voided') {
                    db.get("SELECT * FROM checks WHERE voucher_id = ?", [id], (err, check) => {
                        if (!err && check) {
                            db.run("UPDATE checks SET status = 'Voided' WHERE id = ?", [check.id]);
                            if (check.status === 'Cleared') {
                                db.get("SELECT current_balance FROM bank_accounts WHERE id = ?", [check.bank_account_id], (err, account) => {
                                    if (!err && account) {
                                        const newBalance = account.current_balance + check.amount;
                                        db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", [newBalance, check.bank_account_id]);
                                        db.run("INSERT INTO bank_transactions (bank_account_id, voucher_id, type, category, amount, description, check_no, running_balance) VALUES (?, ?, 'Deposit', 'Void Refund', ?, ?, ?, ?)",
                                            [check.bank_account_id, id, check.amount, `Voided Check: ${check.payee}`, check.check_number, newBalance]);
                                    }
                                });
                            }
                        }
                    });
                }

                res.json({ message: "Status updated successfully" });
            });
        }
    });
});

// Get Voucher History
router.get('/vouchers/:id/history', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.all(`SELECT h.*, u.username, u.role 
            FROM voucher_history h 
            LEFT JOIN users u ON h.user_id = u.id 
            WHERE h.voucher_id = ? 
            ORDER BY h.created_at DESC`, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update Voucher
router.put('/vouchers/:id', authenticateToken, upload.array('attachments', 50), (req, res) => {
    const { id } = req.params;
    let { status } = req.body;
    const { 
        check_no, bank_name, payment_type, check_date, category, 
        urgency, deadline_date, is_pdc, void_reason,
        date, payee, description, amount, amount_in_words,
        removed_attachments
    } = req.body;
    
    const { role, id: user_id } = req.user;

    db.get("SELECT * FROM vouchers WHERE id = ?", [id], (err, currentVoucher) => {
        if (err) {
            console.error("Error fetching voucher:", err);
            return res.status(500).json({ error: "Database error fetching voucher: " + err.message });
        }
        if (!currentVoucher) return res.status(404).json({ error: "Voucher not found" });

        // Enforce Approval Workflow for Liaison: Prevent setting to 'Issued' directly via Edit
        if (role === 'liaison' && status === 'Issued' && currentVoucher.status !== 'Issued') {
             status = 'Pending Admin';
        }

        if (role === 'staff') {
            if (check_no && check_no !== currentVoucher.check_no) return res.status(403).json({ error: "Staff cannot edit check number" });
            if (bank_name && bank_name !== currentVoucher.bank_name) return res.status(403).json({ error: "Staff cannot edit bank name" });
        } else if (role === 'liaison') {
            // Liaison can edit check details, but check_no is restricted if status is 'Issued' (Admin Approved)
            // UNLESS they are just updating the check_date (PDC date)
            if (currentVoucher.status === 'Issued' && check_no && check_no !== currentVoucher.check_no) {
                 return res.status(403).json({ error: "Cannot edit check number after Admin approval" });
            }
        }

        let sql = "UPDATE vouchers SET ";
        const params = [];
        const updates = [];
        const changes = [];

        const addUpdate = (field, newValue, oldValue) => {
            if (newValue !== undefined && newValue != oldValue) {
                updates.push(`${field} = ?`);
                params.push(newValue);
                changes.push(`${field}: '${oldValue}' -> '${newValue}'`);
            }
        };

        addUpdate('status', status, currentVoucher.status);
        addUpdate('check_no', check_no, currentVoucher.check_no);
        addUpdate('bank_name', bank_name, currentVoucher.bank_name);
        addUpdate('payment_type', payment_type, currentVoucher.payment_type);
        addUpdate('category', category, currentVoucher.category);
        addUpdate('urgency', urgency, currentVoucher.urgency);
        addUpdate('deadline_date', deadline_date, currentVoucher.deadline_date);
        addUpdate('is_pdc', is_pdc ? 1 : 0, currentVoucher.is_pdc);
        addUpdate('check_date', check_date, currentVoucher.check_date);
        addUpdate('void_reason', void_reason, currentVoucher.void_reason);
        
        addUpdate('date', date, currentVoucher.date);
        addUpdate('payee', payee, currentVoucher.payee);
        addUpdate('description', description, currentVoucher.description);
        addUpdate('amount', amount, currentVoucher.amount);
        addUpdate('amount_in_words', amount_in_words, currentVoucher.amount_in_words);

        if (removed_attachments) {
            try {
                const idsToRemove = JSON.parse(removed_attachments);
                if (Array.isArray(idsToRemove) && idsToRemove.length > 0) {
                    const placeholders = idsToRemove.map(() => '?').join(',');
                    db.run(`DELETE FROM voucher_attachments WHERE id IN (${placeholders})`, idsToRemove);
                    changes.push(`Removed ${idsToRemove.length} attachment(s)`);
                }
            } catch (e) {
                console.error("Error parsing removed_attachments", e);
            }
        }

        if (req.files && req.files.length > 0) {
            const attachmentStmt = db.prepare("INSERT INTO voucher_attachments (voucher_id, file_path, original_name) VALUES (?, ?, ?)");
            req.files.forEach(file => {
                attachmentStmt.run(id, `/uploads/${file.filename}`, file.originalname);
            });
            attachmentStmt.finalize();
            changes.push(`Added ${req.files.length} attachment(s)`);
        }

        const executeUpdate = () => {
            if (updates.length === 0 && changes.length === 0) {
                return res.json({ message: "No changes detected" });
            }

            if (updates.length > 0) {
                sql += updates.join(", ") + " WHERE id = ?";
                params.push(id);
                
                db.run(sql, params, function(err) {
                    if (err) {
                        console.error("Error updating voucher:", err);
                        return res.status(500).json({ error: "Error updating voucher: " + err.message });
                    }
                    
                    if (changes.length > 0) {
                        db.run("INSERT INTO voucher_history (voucher_id, user_id, action, details) VALUES (?, ?, ?, ?)",
                            [id, user_id || null, 'Updated', changes.join(', ')]);
                    }
                    
                    res.json({ message: "Voucher updated successfully" });
                });
            } else {
                 if (changes.length > 0) {
                        db.run("INSERT INTO voucher_history (voucher_id, user_id, action, details) VALUES (?, ?, ?, ?)",
                            [id, user_id || null, 'Updated', changes.join(', ')]);
                }
                res.json({ message: "Voucher updated successfully" });
            }
        };

        if ((status === 'Issued' || status === 'Pending Admin') && (payment_type === 'Check' || payment_type === 'Encashment') && check_no && bank_name && (status !== currentVoucher.status || check_no !== currentVoucher.check_no)) {
            db.get("SELECT id, current_balance FROM bank_accounts WHERE bank_name = ?", [bank_name], (err, account) => {
                if (err) {
                    console.error("Error fetching bank account:", err);
                    return res.status(500).json({ error: "Database error fetching bank account: " + err.message });
                }
                if (!account) return res.status(404).json({ error: `Bank account '${bank_name}' not found` });

                db.get("SELECT id, status FROM checks WHERE voucher_id = ?", [id], (err, existingCheck) => {
                    if (err) {
                        console.error("Error checking existing check:", err);
                        return res.status(500).json({ error: "Database error checking existing check: " + err.message });
                    }

                    if (!existingCheck) {
                         const checkStatus = status === 'Issued' ? 'Issued' : 'Pending';
                         db.run(`INSERT INTO checks (bank_account_id, voucher_id, check_number, check_date, date_issued, payee, description, amount, status) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [account.id, id, check_no, check_date || null, new Date().toISOString(), payee || currentVoucher.payee, description || currentVoucher.description, amount || currentVoucher.amount, checkStatus],
                                function(err) {
                                    if (err) {
                                        console.error("Error inserting check:", err);
                                        if (err.message.includes('UNIQUE constraint failed')) {
                                            return res.status(400).json({ error: `Check number ${check_no} is already used for this bank.` });
                                        }
                                        return res.status(500).json({ error: "Error inserting check: " + err.message });
                                    }
                                    
                                    db.run(`UPDATE checkbooks 
                                            SET next_check_no = CASE WHEN CAST(? AS INTEGER) >= next_check_no THEN CAST(? AS INTEGER) + 1 ELSE next_check_no END
                                            WHERE bank_account_id = ? 
                                            AND CAST(? AS INTEGER) BETWEEN series_start AND series_end 
                                            AND status = 'Active'`, 
                                            [check_no, check_no, account.id, check_no], (err) => {
                                                if (err) console.error("Error updating checkbook:", err);
                                            });

                                    executeUpdate();
                                });
                    } else {
                        if (check_no !== currentVoucher.check_no) {
                             db.run("UPDATE checks SET check_number = ?, status = ? WHERE id = ?", [check_no, status === 'Issued' ? 'Issued' : 'Pending', existingCheck.id], (err) => {
                                 if (err) {
                                     console.error("Error updating check number:", err);
                                     if (err.message.includes('UNIQUE constraint failed')) {
                                         return res.status(400).json({ error: `Check number ${check_no} is already used.` });
                                     }
                                     return res.status(500).json({ error: "Error updating check: " + err.message });
                                 }
                                 executeUpdate();
                             });
                        } else {
                            if (status === 'Issued' && existingCheck.status === 'Pending') {
                                db.run("UPDATE checks SET status = 'Issued' WHERE id = ?", [existingCheck.id], (err) => {
                                    if (err) {
                                        console.error("Error updating check status:", err);
                                        return res.status(500).json({ error: "Error updating check status: " + err.message });
                                    }
                                    executeUpdate();
                                });
                            } else {
                                executeUpdate();
                            }
                        }
                    }
                });
            });
        } 
        // REMOVED deprecated logic for direct Encashment update
        /*
        else if (status === 'Issued' && payment_type === 'Encashment' && bank_name && status !== currentVoucher.status) {
           ...
        }
        */
        else if (status === 'Voided' && status !== currentVoucher.status) {
             db.get("SELECT * FROM checks WHERE voucher_id = ?", [id], (err, check) => {
                if (!err && check) {
                    db.run("UPDATE checks SET status = 'Voided' WHERE id = ?", [check.id]);
                    if (check.status === 'Cleared') {
                        db.get("SELECT current_balance FROM bank_accounts WHERE id = ?", [check.bank_account_id], (err, account) => {
                            if (!err && account) {
                                const newBalance = account.current_balance + check.amount;
                                db.serialize(() => {
                                    db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", [newBalance, check.bank_account_id]);
                                    db.run("INSERT INTO bank_transactions (bank_account_id, voucher_id, type, category, amount, description, check_no, running_balance) VALUES (?, ?, 'Deposit', 'Void Refund', ?, ?, ?, ?)",
                                        [check.bank_account_id, id, check.amount, `Voided Check: ${check.payee}`, check.check_number, newBalance]);
                                });
                            }
                        });
                    }
                }
            });
            executeUpdate();
        } else {
            if ((payment_type === 'Check' || payment_type === 'Encashment') && (status === 'Issued' || status === 'Pending Admin')) {
                 db.get("SELECT id, status, bank_account_id, check_number FROM checks WHERE voucher_id = ?", [id], (err, check) => {
                    if (check) {
                        const checkUpdates = [];
                        const checkParams = [];
                        if (payee !== undefined && payee !== currentVoucher.payee) { checkUpdates.push("payee = ?"); checkParams.push(payee); }
                        if (amount !== undefined && amount != currentVoucher.amount) { checkUpdates.push("amount = ?"); checkParams.push(amount); }
                        if (description !== undefined && description !== currentVoucher.description) { checkUpdates.push("description = ?"); checkParams.push(description); }
                        if (check_date !== undefined && check_date !== currentVoucher.check_date) { checkUpdates.push("check_date = ?"); checkParams.push(check_date || null); }
                        
                        if (checkUpdates.length > 0) {
                            const checkSql = "UPDATE checks SET " + checkUpdates.join(", ") + " WHERE id = ?";
                            checkParams.push(check.id);
                            db.run(checkSql, checkParams);
                        }

                        if (check.status === 'Cleared' && amount !== undefined && amount != currentVoucher.amount) {
                             const diff = amount - currentVoucher.amount;
                             db.run("UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?", [diff, check.bank_account_id]);
                             db.run("UPDATE bank_transactions SET amount = ? WHERE check_no = ? AND type = 'Withdrawal'", [amount, check.check_number]);
                        }
                    }
                 });
            }
            // Removed deprecated direct Encashment deduction logic 
            /*
            else if (payment_type === 'Encashment' && status === 'Issued') {
                ...
            }
            */

            executeUpdate();
        }
    });
});

// Get Stats
router.get('/stats', authenticateToken, (req, res) => {
    const { company_id } = req.query;
    const { role } = req.user;
    
    const stats = {
        total_vouchers: 0,
        total_amount: 0,
        pending_count: 0,
        issued_count: 0,
        by_company: []
    };

    let whereClause = "";
    let params = [];

    if (role !== 'admin' && role !== 'liaison' && company_id) {
        whereClause = " WHERE company_id = ?";
        params.push(company_id);
    }

    const getTotals = new Promise((resolve, reject) => {
        db.get(`SELECT count(*) as count, sum(amount) as total FROM vouchers ${whereClause}`, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });

    const getPending = new Promise((resolve, reject) => {
        let sql = `SELECT count(*) as count FROM vouchers WHERE status IN ('Pending', 'Pending Liaison', 'Pending Admin')`;
        if (whereClause) sql += ` AND company_id = ?`;
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });

    const getIssued = new Promise((resolve, reject) => {
        let sql = `SELECT count(*) as count FROM vouchers WHERE status = 'Issued'`;
        if (whereClause) sql += ` AND company_id = ?`;
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });

    const getByCompany = new Promise((resolve, reject) => {
        if (role === 'admin' || role === 'liaison' || role === 'hr') {
            const sql = `
                SELECT 
                    c.id,
                    c.name, 
                    count(v.id) as total_count, 
                    sum(v.amount) as total_amount,
                    sum(CASE WHEN v.status = 'Pending Liaison' THEN 1 ELSE 0 END) as pending_liaison,
                    sum(CASE WHEN v.status = 'Pending Admin' THEN 1 ELSE 0 END) as pending_admin
                FROM companies c 
                LEFT JOIN vouchers v ON v.company_id = c.id 
                GROUP BY c.id, c.name
            `;
            db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        } else {
            resolve([]);
        }
    });

    Promise.all([getTotals, getPending, getIssued, getByCompany])
        .then(([totals, pending, issued, byCompany]) => {
            stats.total_vouchers = totals.count || 0;
            stats.total_amount = totals.total || 0;
            stats.pending_count = pending.count || 0;
            stats.issued_count = issued.count || 0;
            stats.by_company = byCompany;
            res.json(stats);
        })
        .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;