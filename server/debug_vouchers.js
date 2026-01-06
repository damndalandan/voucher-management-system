const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./vouchers.db');

db.all("SELECT id, voucher_no, status, payment_type, created_by, company_id FROM vouchers ORDER BY created_at DESC LIMIT 5", [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Recent Vouchers:");
        console.log(JSON.stringify(rows, null, 2));
    }
});

db.all("SELECT * FROM users", [], (err, rows) => {
    if (err) console.error(err);
    else {
        console.log("Users:");
        console.log(JSON.stringify(rows.map(u => ({id: u.id, username: u.username, role: u.role})), null, 2));
    }
    db.close();
});
