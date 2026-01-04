const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const { db, resetDatabase } = require('./database');

const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for restore
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = `SELECT u.id, u.username, u.role, u.company_id, c.name as company_name, c.prefix 
                 FROM users u 
                 LEFT JOIN companies c ON u.company_id = c.id 
                 WHERE u.username = ? AND u.password = ?`;
    
    db.get(sql, [username, password], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });
        
        res.json({
            id: user.id,
            username: user.username,
            role: user.role,
            company_id: user.company_id,
            company_name: user.company_name,
            prefix: user.prefix
        });
    });
});

// Get Companies (For Admin or general info)
app.get('/api/companies', (req, res) => {
    db.all("SELECT * FROM companies", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create Company
app.post('/api/companies', (req, res) => {
    const { name, prefix, address, contact } = req.body;
    if (!name || !prefix) return res.status(400).json({ error: "Name and Prefix are required" });

    db.run("INSERT INTO companies (name, prefix, address, contact) VALUES (?, ?, ?, ?)", 
        [name, prefix, address, contact], 
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: "Company prefix must be unique" });
                }
                return res.status(500).json({ error: err.message });
            }
            
            // Seed default categories for the new company
            // const companyId = this.lastID;
            // const defaultCategories = ['Sales', 'Refund', 'Wages', 'Benefits', 'Govt Contribution', 'Payroll', 'Other'];
            // const stmt = db.prepare("INSERT OR IGNORE INTO categories (company_id, name) VALUES (?, ?)");
            // defaultCategories.forEach(cat => {
            //     stmt.run(companyId, cat);
            // });
            // stmt.finalize();

            res.json({ id: this.lastID, message: "Company created successfully" });
        }
    );
});

// Delete Company
app.delete('/api/companies/:id', (req, res) => {
    const { id } = req.params;
    const { password, admin_id } = req.body;

    // 1. Verify Admin Password
    db.get("SELECT id FROM users WHERE id = ? AND password = ? AND role = 'admin'", [admin_id, password], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(403).json({ error: "Invalid admin password" });

        // 2. Delete Company and related data
        db.serialize(() => {
            // Delete Vouchers
            db.run("DELETE FROM vouchers WHERE company_id = ?", [id]);
            // Delete Users
            db.run("DELETE FROM users WHERE company_id = ?", [id]);
            // Delete Categories
            db.run("DELETE FROM categories WHERE company_id = ?", [id]);
            // Delete Bank Accounts
            db.run("DELETE FROM bank_accounts WHERE company_id = ?", [id]);
            // Delete Company
            db.run("DELETE FROM companies WHERE id = ?", [id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Company deleted successfully" });
            });
        });
    });
});

// Get Top 10 Urgent Vouchers
app.get('/api/vouchers/urgent', (req, res) => {
    const { role, company_id, sort } = req.query; // sort: 'urgency' or 'date'
    
    let statusFilter = "";
    if (role === 'liaison') {
        statusFilter = "v.status = 'Pending Liaison'";
    } else if (role === 'admin') {
        statusFilter = "v.status = 'Pending Admin'";
    } else {
        return res.json([]); // Staff doesn't see this view usually, or we can adapt
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
        // Default: Sort by Date (Deadline date ASC, then Date ASC)
        // Assuming "sort by date" means "what is due soonest"
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
app.get('/api/vouchers', (req, res) => {
    const { company_id, role, filter_type, filter_value, search, category } = req.query; 

    let sql = `SELECT v.*, c.name as company_name, u.username as created_by_user,
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

    // Admin and Liaison can see all. Staff can only see their company.
    // But Admin/Liaison can also filter by company if they choose to.
    if (role !== 'admin' && role !== 'liaison') {
        // Enforce restriction for staff
        if (company_id) {
            conditions.push(`v.company_id = ?`);
            params.push(company_id);
        }
    } else {
        // Optional filter for Admin/Liaison
        if (company_id) {
            conditions.push(`v.company_id = ?`);
            params.push(company_id);
        }
    }

    // Admin should not see 'Pending Liaison' vouchers
    if (role === 'admin') {
        conditions.push(`v.status != 'Pending Liaison'`);
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
        console.log(`Filtering by ${filter_type}: ${filter_value}`); // Debug log

        if (filter_type === 'day' || filter_type === 'exact') {
            conditions.push(`v.date = ?`);
            params.push(filter_value);
        } else if (filter_type === 'month') {
            // filter_value expected as 'YYYY-MM'
            conditions.push(`strftime('%Y-%m', v.date) = ?`);
            params.push(filter_value);
        } else if (filter_type === 'year') {
            // filter_value expected as 'YYYY'
            conditions.push(`strftime('%Y', v.date) = ?`);
            params.push(filter_value);
        } else if (filter_type === 'week') {
            // filter_value expected as 'YYYY-Www'
            const [yearStr, weekStr] = filter_value.split('-W');
            if (yearStr && weekStr) {
                const year = parseInt(yearStr, 10);
                const week = parseInt(weekStr, 10);
                
                // Calculate start and end of ISO week
                const jan4 = new Date(year, 0, 4);
                const day = jan4.getDay() || 7; // Mon=1, Sun=7
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
    
    // Support explicit date range (safer for weeks if the above fails)
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
app.post('/api/vouchers', upload.array('attachments', 50), (req, res) => {
    const { company_id, date, payee, description, amount, amount_in_words, payment_type, check_no, bank_name, category, created_by, role, urgency, deadline_date, is_pdc, check_date } = req.body;
    
    if (!company_id) return res.status(400).json({ error: "Company ID is required" });

    // Determine status based on role and payment type
    let status = 'Issued';
    
    if (role === 'staff') {
        // Staff creates request, Liaison processes it
        status = 'Pending Liaison';
    } else if (role === 'liaison' || role === 'hr') {
        // Liaison/HR creates it, needs Admin approval if check/encashment
        status = (payment_type === 'Check' || payment_type === 'Encashment') ? 'Pending Admin' : 'Issued';
    } else if (role === 'admin') {
        // Admin creates it, auto-issued
        status = 'Issued';
    }

    // 1. Get Company Prefix
    db.get("SELECT prefix FROM companies WHERE id = ?", [company_id], (err, company) => {
        if (err || !company) return res.status(500).json({ error: "Company not found" });

        const prefix = company.prefix;

        // 2. Generate Sequence Number
        db.get("SELECT count(*) as count FROM vouchers WHERE company_id = ?", [company_id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const nextNum = row.count + 1;
            const sequence = String(nextNum).padStart(5, '0'); // e.g., 00001
            const voucher_no = `${prefix}-${sequence}`;

            // Helper to insert voucher
            const insertVoucher = () => {
                // 3. Insert Voucher
                const sql = `INSERT INTO vouchers (voucher_no, company_id, date, payee, description, amount, amount_in_words, payment_type, check_no, bank_name, category, created_by, status, urgency, deadline_date, is_pdc, check_date) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                const params = [voucher_no, company_id, date, payee, description, amount, amount_in_words, payment_type, check_no, bank_name, category, created_by, status, urgency || 'Normal', deadline_date, (is_pdc === 'true' || is_pdc === '1' || is_pdc === 1) ? 1 : 0, check_date];

                db.run(sql, params, function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    const voucherId = this.lastID;

                    // 4. Insert Attachments
                    if (req.files && req.files.length > 0) {
                        const attachmentStmt = db.prepare("INSERT INTO voucher_attachments (voucher_id, file_path, original_name) VALUES (?, ?, ?)");
                        req.files.forEach(file => {
                            attachmentStmt.run(voucherId, `/uploads/${file.filename}`, file.originalname);
                        });
                        attachmentStmt.finalize();
                    }

                    // Log History
                    db.run("INSERT INTO voucher_history (voucher_id, user_id, action, details) VALUES (?, ?, ?, ?)",
                        [voucherId, created_by, 'Created', 'Voucher created']);

                    // 5. If Issued Check, Insert into Checks table
                    if (status === 'Issued' && payment_type === 'Check' && check_no && bank_name) {
                        db.get("SELECT id FROM bank_accounts WHERE bank_name = ?", [bank_name], (err, account) => {
                            if (!err && account) {
                                db.run(`INSERT INTO checks (bank_account_id, voucher_id, check_number, check_date, date_issued, payee, description, amount, status) 
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Issued')`,
                                        [account.id, voucherId, check_no, check_date || date, new Date().toISOString(), payee, description, amount],
                                        (err) => {
                                            if (err) console.error("Error inserting check:", err.message);
                                            // Update Checkbook usage
                                            db.run(`UPDATE checkbooks 
                                                    SET next_check_no = CASE WHEN CAST(? AS INTEGER) >= next_check_no THEN CAST(? AS INTEGER) + 1 ELSE next_check_no END
                                                    WHERE bank_account_id = ? 
                                                    AND CAST(? AS INTEGER) BETWEEN series_start AND series_end 
                                                    AND status = 'Active'`, 
                                                    [check_no, check_no, account.id, check_no]);
                                        });
                            }
                        });
                    } else if (status === 'Pending Admin' && payment_type === 'Check' && check_no && bank_name) {
                        // Reserve Check Number for Pending Admin
                        db.get("SELECT id FROM bank_accounts WHERE bank_name = ?", [bank_name], (err, account) => {
                            if (!err && account) {
                                db.run(`INSERT INTO checks (bank_account_id, voucher_id, check_number, check_date, date_issued, payee, description, amount, status) 
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
                                        [account.id, voucherId, check_no, check_date || date, new Date().toISOString(), payee, description, amount],
                                        (err) => {
                                            if (err) console.error("Error inserting pending check:", err.message);
                                            // Update Checkbook usage to reserve the number
                                            db.run(`UPDATE checkbooks 
                                                    SET next_check_no = CASE WHEN CAST(? AS INTEGER) >= next_check_no THEN CAST(? AS INTEGER) + 1 ELSE next_check_no END
                                                    WHERE bank_account_id = ? 
                                                    AND CAST(? AS INTEGER) BETWEEN series_start AND series_end 
                                                    AND status = 'Active'`, 
                                                    [check_no, check_no, account.id, check_no]);
                                        });
                            }
                        });
                    } else if (status === 'Issued' && payment_type === 'Encashment' && bank_name) {
                        // Handle Encashment Creation
                        db.get("SELECT id, current_balance FROM bank_accounts WHERE bank_name = ?", [bank_name], (err, account) => {
                            if (!err && account) {
                                const newBalance = account.current_balance - amount;
                                db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", [newBalance, account.id]);
                                db.run("INSERT INTO bank_transactions (bank_account_id, voucher_id, type, category, amount, description, running_balance) VALUES (?, ?, 'Withdrawal', ?, ?, ?, ?)",
                                    [account.id, voucherId, category || 'Encashment', amount, `Encashment: ${payee}`, newBalance]);
                            }
                        });
                    }

                    res.json({ 
                        id: voucherId, 
                        voucher_no, 
                        status,
                        message: "Voucher created successfully" 
                    });
                });
            };

            // Pre-check for duplicate check number
            if ((status === 'Issued' || status === 'Pending Admin') && payment_type === 'Check' && check_no && bank_name) {
                db.get("SELECT id FROM bank_accounts WHERE bank_name = ?", [bank_name], (err, account) => {
                    if (err || !account) {
                        // Bank not found, proceed (will fail later or just insert voucher without check record)
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

// Get Voucher History
app.get('/api/vouchers/:id/history', (req, res) => {
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

// Update Voucher (Status or Details)
app.put('/api/vouchers/:id', upload.array('attachments', 50), (req, res) => {
    const { id } = req.params;
    // Extract fields. Note: with multer, req.body fields are strings.
    const { 
        status, check_no, bank_name, payment_type, check_date, category, 
        urgency, deadline_date, is_pdc, void_reason,
        date, payee, description, amount, amount_in_words,
        removed_attachments, // JSON string of array of IDs
        user_id, role // Current user info for permission checks and history
    } = req.body;
    
    db.get("SELECT * FROM vouchers WHERE id = ?", [id], (err, currentVoucher) => {
        if (err || !currentVoucher) return res.status(404).json({ error: "Voucher not found" });

        // Permission Checks
        if (role === 'staff') {
            // Staff cannot edit check details
            if (check_no && check_no !== currentVoucher.check_no) return res.status(403).json({ error: "Staff cannot edit check number" });
            if (bank_name && bank_name !== currentVoucher.bank_name) return res.status(403).json({ error: "Staff cannot edit bank name" });
            // Staff can edit other fields
        } else if (role === 'liaison') {
            // Liaison can edit check details ONLY if not approved by Admin yet
            // Assuming 'Issued' means approved/finalized by Admin for Check payments
            // Or 'Pending Admin' means waiting.
            // If status is 'Issued' and payment is Check, it's likely approved.
            // User said: "liaison can only edit the check number if it is not approved yet with the admin"
            
            // If current status is 'Issued' (Admin approved), prevent check_no change?
            // Or if it was 'Pending Admin' and now becoming 'Issued', that's fine (Liaison processing).
            // But if it is ALREADY 'Issued', Liaison shouldn't change check number?
            // Let's assume 'Issued' means Admin Approved.
            
            if (currentVoucher.status === 'Issued' && check_no && check_no !== currentVoucher.check_no) {
                 return res.status(403).json({ error: "Cannot edit check number after Admin approval" });
            }
        }

        // Prepare Updates
        let sql = "UPDATE vouchers SET ";
        const params = [];
        const updates = [];
        const changes = [];

        // Helper to add update if changed
        const addUpdate = (field, newValue, oldValue) => {
            if (newValue !== undefined && newValue != oldValue) { // Loose equality for string/number diffs
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
        
        // Staff editable fields
        addUpdate('date', date, currentVoucher.date);
        addUpdate('payee', payee, currentVoucher.payee);
        addUpdate('description', description, currentVoucher.description);
        addUpdate('amount', amount, currentVoucher.amount);
        addUpdate('amount_in_words', amount_in_words, currentVoucher.amount_in_words);

        // Handle Attachments
        // 1. Remove deleted attachments
        if (removed_attachments) {
            try {
                const idsToRemove = JSON.parse(removed_attachments);
                if (Array.isArray(idsToRemove) && idsToRemove.length > 0) {
                    // Get paths to delete files (optional, maybe keep for audit?)
                    // For now just delete from DB
                    const placeholders = idsToRemove.map(() => '?').join(',');
                    db.run(`DELETE FROM voucher_attachments WHERE id IN (${placeholders})`, idsToRemove);
                    changes.push(`Removed ${idsToRemove.length} attachment(s)`);
                }
            } catch (e) {
                console.error("Error parsing removed_attachments", e);
            }
        }

        // 2. Add new attachments
        if (req.files && req.files.length > 0) {
            const attachmentStmt = db.prepare("INSERT INTO voucher_attachments (voucher_id, file_path, original_name) VALUES (?, ?, ?)");
            req.files.forEach(file => {
                attachmentStmt.run(id, `/uploads/${file.filename}`, file.originalname);
            });
            attachmentStmt.finalize();
            changes.push(`Added ${req.files.length} attachment(s)`);
        }

        // Execute Update
        const executeUpdate = () => {
            if (updates.length === 0 && changes.length === 0) {
                return res.json({ message: "No changes detected" });
            }

            if (updates.length > 0) {
                sql += updates.join(", ") + " WHERE id = ?";
                params.push(id);
                
                db.run(sql, params, function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    // Log History
                    if (changes.length > 0) {
                        db.run("INSERT INTO voucher_history (voucher_id, user_id, action, details) VALUES (?, ?, ?, ?)",
                            [id, user_id || null, 'Updated', changes.join(', ')]);
                    }
                    
                    res.json({ message: "Voucher updated successfully" });
                });
            } else {
                // Only attachments changed
                 if (changes.length > 0) {
                        db.run("INSERT INTO voucher_history (voucher_id, user_id, action, details) VALUES (?, ?, ?, ?)",
                            [id, user_id || null, 'Updated', changes.join(', ')]);
                }
                res.json({ message: "Voucher updated successfully" });
            }
        };

        // Check Logic (Same as before, but wrapped)
        if ((status === 'Issued' || status === 'Pending Admin') && payment_type === 'Check' && check_no && bank_name && (status !== currentVoucher.status || check_no !== currentVoucher.check_no)) {
             // ... (Existing Check Issuance Logic) ...
             // For brevity, I'll simplify: If issuing check, do the check logic, then update voucher.
             // But we need to be careful not to duplicate checks if just editing description.
             // Only run check logic if status BECOMES Issued or Check No changes while Issued.
             
             // Find the bank account
            db.get("SELECT id, current_balance FROM bank_accounts WHERE bank_name = ?", [bank_name], (err, account) => {
                if (err || !account) return res.status(404).json({ error: "Bank account not found" });

                // Insert into Checks table (Do not deduct balance yet)
                // Check if check already exists for this voucher?
                db.get("SELECT id, status FROM checks WHERE voucher_id = ?", [id], (err, existingCheck) => {
                    if (!existingCheck) {
                         const checkStatus = status === 'Issued' ? 'Issued' : 'Pending';
                         db.run(`INSERT INTO checks (bank_account_id, voucher_id, check_number, check_date, date_issued, payee, description, amount, status) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [account.id, id, check_no, check_date || date, new Date().toISOString(), payee || currentVoucher.payee, description || currentVoucher.description, amount || currentVoucher.amount, checkStatus],
                                function(err) {
                                    if (err) {
                                        if (err.message.includes('UNIQUE constraint failed')) {
                                            return res.status(400).json({ error: `Check number ${check_no} is already used for this bank.` });
                                        }
                                        return res.status(500).json({ error: err.message });
                                    }
                                    
                                    // Update Checkbook usage
                                    db.run(`UPDATE checkbooks 
                                            SET next_check_no = CASE WHEN CAST(? AS INTEGER) >= next_check_no THEN CAST(? AS INTEGER) + 1 ELSE next_check_no END
                                            WHERE bank_account_id = ? 
                                            AND CAST(? AS INTEGER) BETWEEN series_start AND series_end 
                                            AND status = 'Active'`, 
                                            [check_no, check_no, account.id, check_no]);

                                    executeUpdate();
                                });
                    } else {
                        // Check exists, maybe update it?
                        // If check number changed, we might need to update the check record.
                        if (check_no !== currentVoucher.check_no) {
                             db.run("UPDATE checks SET check_number = ?, status = ? WHERE id = ?", [check_no, status === 'Issued' ? 'Issued' : 'Pending', existingCheck.id], (err) => {
                                 if (err) return res.status(400).json({ error: "Check number already in use" });
                                 executeUpdate();
                             });
                        } else {
                            // If status changed from Pending Admin to Issued, update check status
                            if (status === 'Issued' && existingCheck.status === 'Pending') {
                                db.run("UPDATE checks SET status = 'Issued' WHERE id = ?", [existingCheck.id], (err) => {
                                    executeUpdate();
                                });
                            } else {
                                executeUpdate();
                            }
                        }
                    }
                });
            });
        } else if (status === 'Issued' && payment_type === 'Encashment' && bank_name && status !== currentVoucher.status) {
             // ... (Existing Encashment Logic) ...
             // Only if status BECOMES Issued
             db.get("SELECT id, current_balance FROM bank_accounts WHERE id = (SELECT id FROM bank_accounts WHERE bank_name = ?)", [bank_name], (err, account) => {
                if (!err && account) {
                    const amt = amount || currentVoucher.amount;
                    const newBalance = account.current_balance - amt;
                    db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", [newBalance, account.id]);
                    db.run("INSERT INTO bank_transactions (bank_account_id, voucher_id, type, category, amount, description, running_balance) VALUES (?, ?, 'Withdrawal', ?, ?, ?, ?)",
                        [account.id, id, category || currentVoucher.category || 'Encashment', amt, `Encashment: ${payee || currentVoucher.payee}`, newBalance]);
                }
            });
            executeUpdate();
        } else if (status === 'Voided' && status !== currentVoucher.status) {
             // ... (Existing Void Logic) ...
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
            executeUpdate();
        }
    });
});

// Approve Voucher (Legacy Endpoint - kept for compatibility if needed, but PUT /api/vouchers/:id covers it)
app.put('/api/vouchers/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, void_reason, user_id } = req.body;
    
    db.get("SELECT * FROM vouchers WHERE id = ?", [id], (err, voucher) => {
        if (err || !voucher) return res.status(404).json({ error: "Voucher not found" });

        console.log(`[Status Update] Voucher ${id}: Current Status=${voucher.status}, New Status=${status}, Type=${voucher.payment_type}, CheckNo=${voucher.check_no}, Bank=${voucher.bank_name}`);

        // Function to execute the status update
        const executeStatusUpdate = () => {
            let sql = "UPDATE vouchers SET status = ?";
            const params = [status];
            
            if (void_reason) {
                sql += ", void_reason = ?";
                params.push(void_reason);
            }
            
            sql += " WHERE id = ?";
            params.push(id);

            db.run(sql, params, function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                // Log History
                db.run("INSERT INTO voucher_history (voucher_id, user_id, action, details) VALUES (?, ?, ?, ?)",
                    [id, user_id || null, 'Status Change', `Status updated to ${status}`]);

                res.json({ message: "Status updated successfully" });
            });
        };

        // Handle Void Logic
        if (status === 'Voided') {
            db.get("SELECT * FROM checks WHERE voucher_id = ?", [id], (err, check) => {
                if (!err && check) {
                    // Update check status
                    db.run("UPDATE checks SET status = 'Voided' WHERE id = ?", [check.id]);

                    // If it was cleared, refund the amount
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
            executeStatusUpdate();
            return;
        }

        // Validation: Cannot issue Check voucher without details
        if (status === 'Issued' && voucher.payment_type === 'Check' && (!voucher.check_no || !voucher.bank_name)) {
            console.error(`[Status Update] Attempted to issue Check voucher ${id} without details. CheckNo=${voucher.check_no}, Bank=${voucher.bank_name}`);
            return res.status(400).json({ error: "Cannot issue check voucher without Check Number and Bank Name. Please edit the voucher to add these details." });
        }

        // Check Issuance Logic (Strict Check)
        if (status === 'Issued' && voucher.status !== 'Issued' && voucher.payment_type === 'Check') {
             console.log(`[Status Update] Processing Check Issuance for Voucher ${id}. Check No: ${voucher.check_no}, Bank: ${voucher.bank_name}`);
             db.get("SELECT id FROM bank_accounts WHERE bank_name = ?", [voucher.bank_name], (err, account) => {
                if (err || !account) {
                    console.error(`[Status Update] Bank account not found for name: ${voucher.bank_name}`);
                    return res.status(400).json({ error: `Bank account '${voucher.bank_name}' not found.` });
                }

                // Check for duplicate check number
                db.get("SELECT id, voucher_id, status FROM checks WHERE bank_account_id = ? AND check_number = ?", [account.id, voucher.check_no], (err, existingCheck) => {
                    if (existingCheck) {
                        // If check exists, check if it is the reserved one for this voucher
                        if (existingCheck.voucher_id == id && existingCheck.status === 'Pending') {
                            console.log(`[Status Update] Found reserved check for Voucher ${id}. Updating status to Issued.`);
                            db.run("UPDATE checks SET status = 'Issued' WHERE id = ?", [existingCheck.id], (err) => {
                                if (err) return res.status(500).json({ error: "Failed to update check status: " + err.message });
                                executeStatusUpdate();
                            });
                            return;
                        } else {
                            console.error(`[Status Update] Duplicate check number: ${voucher.check_no}`);
                            return res.status(400).json({ error: `Check number ${voucher.check_no} is already used.` });
                        }
                    }

                    // Insert Check
                    db.run(`INSERT INTO checks (bank_account_id, voucher_id, check_number, check_date, date_issued, payee, description, amount, status) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Issued')`,
                            [account.id, id, voucher.check_no, voucher.check_date || voucher.date, new Date().toISOString(), voucher.payee, voucher.description, voucher.amount],
                            (err) => {
                                if (err) {
                                    console.error("[Status Update] Error inserting check:", err.message);
                                    return res.status(500).json({ error: "Failed to create check record: " + err.message });
                                }
                                
                                console.log(`[Status Update] Check inserted. Updating checkbook for Account ${account.id}`);
                                // Update Checkbook usage
                                db.run(`UPDATE checkbooks 
                                        SET next_check_no = CASE WHEN CAST(? AS INTEGER) >= next_check_no THEN CAST(? AS INTEGER) + 1 ELSE next_check_no END
                                        WHERE bank_account_id = ? 
                                        AND CAST(? AS INTEGER) BETWEEN series_start AND series_end 
                                        AND status = 'Active'`, 
                                        [voucher.check_no, voucher.check_no, account.id, voucher.check_no],
                                        function(err) {
                                            if (err) console.error("[Status Update] Error updating checkbook:", err.message);
                                            else {
                                                console.log(`[Status Update] Checkbook updated. Rows affected: ${this.changes}`);
                                                if (this.changes === 0) {
                                                    console.warn(`[Status Update] WARNING: Checkbook not updated! Check number ${voucher.check_no} might be out of range or checkbook inactive.`);
                                                }
                                            }
                                        });
                                
                                // Proceed to update voucher status
                                executeStatusUpdate();
                            });
                });
            });
        } else {
            if (status === 'Issued' && voucher.payment_type === 'Check') {
                // Should be caught by validation above, but just in case
                console.log(`[Status Update] Skipping Check Issuance logic (unexpected path).`);
            }
            
            if (status === 'Issued' && voucher.status !== 'Issued' && voucher.payment_type === 'Encashment' && voucher.bank_name) {
             // Handle Encashment Logic
             db.get("SELECT id, current_balance FROM bank_accounts WHERE bank_name = ?", [voucher.bank_name], (err, account) => {
                if (!err && account) {
                    const newBalance = account.current_balance - voucher.amount;
                    db.run("UPDATE bank_accounts SET current_balance = ? WHERE id = ?", [newBalance, account.id]);
                    db.run("INSERT INTO bank_transactions (bank_account_id, voucher_id, type, category, amount, description, running_balance) VALUES (?, ?, 'Withdrawal', ?, ?, ?, ?)",
                        [account.id, id, voucher.category || 'Encashment', voucher.amount, `Encashment: ${voucher.payee}`, newBalance]);
                }
                executeStatusUpdate();
            });
        } else {
            // Normal update
            executeStatusUpdate();
        }
    }
    });
});

// Get Stats
app.get('/api/stats', (req, res) => {
    const { role, company_id } = req.query;
    
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
        if (role === 'admin' || role === 'liaison') {
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

// User Management
app.get('/api/users', (req, res) => {
    db.all("SELECT u.id, u.username, u.role, u.company_id, c.name as company_name FROM users u LEFT JOIN companies c ON u.company_id = c.id", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/users', (req, res) => {
    let { username, password, role, company_id } = req.body;

    // Force company_id to null if not staff
    if (role !== 'staff') {
        company_id = null;
    }
    
    // Handle empty string as null
    if (company_id === '') company_id = null;

    db.run("INSERT INTO users (username, password, role, company_id) VALUES (?, ?, ?, ?)", [username, password, role, company_id], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "Username already exists" });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: "User created successfully" });
    });
});

app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "User deleted successfully" });
    });
});

// Update User
app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { username, password, role, company_id, full_name } = req.body;
    
    let sql = "UPDATE users SET ";
    const params = [];
    const updates = [];

    if (username) { updates.push("username = ?"); params.push(username); }
    if (password) { updates.push("password = ?"); params.push(password); }
    if (role) { updates.push("role = ?"); params.push(role); }
    
    // Handle company_id specifically to allow null
    if (company_id !== undefined) { 
        let finalCompanyId = company_id;
        // If role is being updated to non-staff, force null
        if (role && role !== 'staff') finalCompanyId = null;
        // Handle empty string
        if (finalCompanyId === '') finalCompanyId = null;
        
        updates.push("company_id = ?"); 
        params.push(finalCompanyId); 
    }
    
    if (full_name) { updates.push("full_name = ?"); params.push(full_name); }

    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

    sql += updates.join(", ") + " WHERE id = ?";
    params.push(id);

    db.run(sql, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "Username already exists" });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "User updated successfully" });
    });
});

// Company Requests
app.post('/api/company/request', (req, res) => {
    const { company_id, requested_by, new_name, new_address, new_contact } = req.body;
    db.run("INSERT INTO company_requests (company_id, requested_by, new_name, new_address, new_contact) VALUES (?, ?, ?, ?, ?)", 
        [company_id, requested_by, new_name, new_address, new_contact], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Request submitted successfully" });
        }
    );
});

app.get('/api/company/requests', (req, res) => {
    const sql = `SELECT r.*, c.name as current_name, u.username as requester 
                 FROM company_requests r 
                 JOIN companies c ON r.company_id = c.id 
                 JOIN users u ON r.requested_by = u.id 
                 WHERE r.status = 'Pending'`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/company/requests/:id/:action', (req, res) => {
    const { id, action } = req.params; // action: approve or reject
    
    if (action === 'reject') {
        db.run("UPDATE company_requests SET status = 'Rejected' WHERE id = ?", [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Request rejected" });
        });
    } else if (action === 'approve') {
        db.get("SELECT * FROM company_requests WHERE id = ?", [id], (err, reqData) => {
            if (err || !reqData) return res.status(404).json({ error: "Request not found" });
            
            const updates = [];
            const params = [];
            
            if (reqData.new_name) { updates.push("name = ?"); params.push(reqData.new_name); }
            if (reqData.new_address) { updates.push("address = ?"); params.push(reqData.new_address); }
            if (reqData.new_contact) { updates.push("contact = ?"); params.push(reqData.new_contact); }
            
            if (updates.length > 0) {
                const sql = "UPDATE companies SET " + updates.join(", ") + " WHERE id = ?";
                params.push(reqData.company_id);
                
                db.run(sql, params, function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    db.run("UPDATE company_requests SET status = 'Approved' WHERE id = ?", [id]);
                    res.json({ message: "Request approved and company updated" });
                });
            } else {
                res.json({ message: "Nothing to update" });
            }
        });
    } else {
        res.status(400).json({ error: "Invalid action" });
    }
});

// Database Management
app.get('/api/backup', (req, res) => {
    const dbPath = path.resolve(__dirname, 'vouchers.db');
    res.download(dbPath, 'vouchers_backup.db');
});

// --- Category Management ---

app.get('/api/categories', (req, res) => {
    const { company_id } = req.query;
    let sql = `SELECT cat.*, c.name as company_name 
               FROM categories cat 
               LEFT JOIN companies c ON cat.company_id = c.id`;
    const params = [];
    
    if (company_id) {
        sql += " WHERE cat.company_id = ?";
        params.push(company_id);
    }
    
    sql += " ORDER BY c.name, cat.name";
    
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/categories', (req, res) => {
    const { name, company_id } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });
    if (!company_id) return res.status(400).json({ error: "Company ID is required" });
    
    db.run("INSERT INTO categories (name, company_id) VALUES (?, ?)", [name, company_id], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "Category already exists for this company" });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, name, company_id, message: "Category added" });
    });
});

app.delete('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM categories WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Category deleted" });
    });
});

// --- Bank & Checkbook Management ---

// Get Bank Accounts
app.get('/api/banks', (req, res) => {
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
app.post('/api/banks', (req, res) => {
    const { company_id, bank_name, account_number, initial_balance } = req.body;
    db.run("INSERT INTO bank_accounts (company_id, bank_name, account_number, current_balance) VALUES (?, ?, ?, ?)", 
        [company_id, bank_name, account_number, initial_balance || 0], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            // Record initial deposit
            if (initial_balance > 0) {
                db.run("INSERT INTO bank_transactions (bank_account_id, type, amount, description, running_balance) VALUES (?, 'Deposit', ?, 'Initial Balance', ?)",
                    [this.lastID, initial_balance, initial_balance]);
            }
            res.json({ id: this.lastID, message: "Bank account created" });
        }
    );
});

// Get Checkbooks for an Account
app.get('/api/banks/:id/checkbooks', (req, res) => {
    db.all("SELECT * FROM checkbooks WHERE bank_account_id = ?", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add Checkbook
app.post('/api/banks/:id/checkbooks', (req, res) => {
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
app.get('/api/banks/:id/transactions', (req, res) => {
    db.all("SELECT * FROM bank_transactions WHERE bank_account_id = ? ORDER BY transaction_date DESC", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Record Transaction (Deposit/Withdrawal)
app.post('/api/banks/:id/transaction', (req, res) => {
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

// Record Deposit (Legacy wrapper)
app.post('/api/banks/:id/deposit', (req, res) => {
    const { amount, description } = req.body;
    // Redirect to new logic internally or just duplicate for now to keep it simple
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

// --- Check Management ---

// Get Checks
app.get('/api/banks/:id/checks', (req, res) => {
    db.all("SELECT * FROM checks WHERE bank_account_id = ? ORDER BY date_issued DESC", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update Check Status (Claim/Clear)
app.post('/api/checks/:id/status', (req, res) => {
    const { status, date } = req.body; // 'Claimed', 'Cleared', 'Cancelled', date is optional
    const { id } = req.params;

    db.get("SELECT * FROM checks WHERE id = ?", [id], (err, check) => {
        if (err || !check) return res.status(404).json({ error: "Check not found" });

        if (status === 'Cleared' && check.status !== 'Cleared') {
            // Deduct from bank balance
            db.get("SELECT current_balance FROM bank_accounts WHERE id = ?", [check.bank_account_id], (err, account) => {
                if (err || !account) return res.status(404).json({ error: "Bank account not found" });
                
                // Get voucher category
                db.get("SELECT category FROM vouchers WHERE id = ?", [check.voucher_id], (err, voucher) => {
                    const category = (voucher && voucher.category) ? voucher.category : 'Check Issuance';
                    const newBalance = account.current_balance - check.amount;
                    
                    // Use provided date or current timestamp
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
            // Handle Bounce Logic
            // 1. Update Check Status
            db.run("UPDATE checks SET status = 'Bounced' WHERE id = ?", [id]);
            
            // 2. Update Voucher Status
            db.run("UPDATE vouchers SET status = 'Bounced' WHERE id = ?", [check.voucher_id]);

            // 3. Handle Balance/Transaction
            if (check.status === 'Cleared') {
                // It was deducted, so we need to add it back (Reverse entry)
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
                // It wasn't deducted yet. Record the event in passbook with 0 amount for transparency.
                db.get("SELECT current_balance FROM bank_accounts WHERE id = ?", [check.bank_account_id], (err, account) => {
                    if (!err && account) {
                         db.run("INSERT INTO bank_transactions (bank_account_id, voucher_id, type, category, amount, description, check_no, running_balance) VALUES (?, ?, 'Bounced', 'Check Bounced', 0, ?, ?, ?)",
                                [check.bank_account_id, check.voucher_id, `Bounced Check: ${check.payee}`, check.check_number, account.current_balance]);
                    }
                });
            }
            res.json({ message: "Check marked as Bounced" });
        } else if (status === 'Voided') {
            // Handle Void Logic
            // 1. Update Check Status
            db.run("UPDATE checks SET status = 'Voided' WHERE id = ?", [id]);
            
            // 2. Update Voucher Status
            db.run("UPDATE vouchers SET status = 'Voided' WHERE id = ?", [check.voucher_id]);

            // 3. Handle Balance/Transaction (if it was cleared - unlikely but safe to handle)
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
            // Just update status (e.g. Claimed)
            db.run("UPDATE checks SET status = ? WHERE id = ?", [status, id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: `Check marked as ${status}` });
            });
        }
    });
});

// --- Profile Management ---

// Get Current User Profile
app.get('/api/profile/:id', (req, res) => {
    db.get("SELECT id, username, role, company_id, full_name FROM users WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

// Request Profile Update
app.post('/api/profile/request', (req, res) => {
    const { user_id, new_username, new_password, new_full_name } = req.body;
    db.run("INSERT INTO profile_update_requests (user_id, new_username, new_password, new_full_name) VALUES (?, ?, ?, ?)",
        [user_id, new_username, new_password, new_full_name],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Profile update request submitted for approval" });
        }
    );
});

// Get Pending Profile Requests (Admin)
app.get('/api/profile/requests', (req, res) => {
    const sql = `SELECT r.*, u.username as current_username, u.full_name as current_full_name 
                 FROM profile_update_requests r 
                 JOIN users u ON r.user_id = u.id 
                 WHERE r.status = 'Pending'`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Approve/Reject Profile Request
app.post('/api/profile/requests/:id/:action', (req, res) => {
    const { id, action } = req.params; // action: approve or reject
    
    if (action === 'reject') {
        db.run("UPDATE profile_update_requests SET status = 'Rejected' WHERE id = ?", [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Request rejected" });
        });
    } else if (action === 'approve') {
        db.get("SELECT * FROM profile_update_requests WHERE id = ?", [id], (err, reqData) => {
            if (err || !reqData) return res.status(404).json({ error: "Request not found" });
            
            const updates = [];
            const params = [];
            
            if (reqData.new_username) { updates.push("username = ?"); params.push(reqData.new_username); }
            if (reqData.new_password) { updates.push("password = ?"); params.push(reqData.new_password); }
            if (reqData.new_full_name) { updates.push("full_name = ?"); params.push(reqData.new_full_name); }
            
            if (updates.length > 0) {
                const sql = "UPDATE users SET " + updates.join(", ") + " WHERE id = ?";
                params.push(reqData.user_id);
                
                db.run(sql, params, function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    db.run("UPDATE profile_update_requests SET status = 'Approved' WHERE id = ?", [id]);
                    res.json({ message: "Request approved and profile updated" });
                });
            } else {
                db.run("UPDATE profile_update_requests SET status = 'Approved' WHERE id = ?", [id]);
                res.json({ message: "Request approved (no changes)" });
            }
        });
    } else {
        res.status(400).json({ error: "Invalid action" });
    }
});

app.post('/api/restore', (req, res) => {
    // Expecting raw binary or base64? For simplicity, let's assume client sends a file upload.
    // But body-parser json limit was increased. Let's assume client sends base64 string in JSON for simplicity in this environment.
    // Or better, just overwrite the file if we can.
    // Real implementation should use multer for file upload.
    // For this demo, let's skip complex upload and just provide Reset.
    res.status(501).json({ error: "Not implemented via JSON. Use Reset instead." });
});

app.post('/api/reset', (req, res) => {
    resetDatabase((err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Clear uploads folder
        const uploadDir = path.join(__dirname, 'uploads');
        fs.readdir(uploadDir, (err, files) => {
            if (err) console.error("Error reading uploads dir:", err);
            else {
                for (const file of files) {
                    // Delete all files
                    fs.unlink(path.join(uploadDir, file), err => {
                        if (err) console.error(`Error deleting ${file}:`, err);
                    });
                }
            }
        });

        res.json({ message: "System reset successfully. All data has been cleared and default data restored." });
    });
});

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
                                    [account.id, v.id, v.check_no, v.check_date || v.date, v.created_at || new Date().toISOString(), v.payee, v.description, v.amount],
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

// Run Sync on Start
setTimeout(syncData, 5000); // Delay slightly to ensure DB is ready

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
