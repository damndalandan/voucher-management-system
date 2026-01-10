const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { db } = require('./database');

async function fixVoucherNumbers() {
    console.log('Starting voucher number fix...');

    const getCompanies = () => new Promise((resolve, reject) => {
        db.all("SELECT id, prefix FROM companies", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    const getVouchers = () => new Promise((resolve, reject) => {
        db.all("SELECT id, company_id, voucher_no FROM vouchers ORDER BY id ASC", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    // Wait a moment for DB connection
    await new Promise(r => setTimeout(r, 1000));

    try {
        const companies = await getCompanies();
        const vouchers = await getVouchers();

        const companyPrefixMap = {};
        companies.forEach(c => {
            companyPrefixMap[c.id] = c.prefix;
        });

        const companyCounters = {}; 
        const updates = [];

        console.log(`Found ${companies.length} companies and ${vouchers.length} vouchers.`);

        for (const voucher of vouchers) {
            const prefix = companyPrefixMap[voucher.company_id];
            
            if (!prefix) {
                console.warn(`    Warning: Voucher ${voucher.id} has company ${voucher.company_id} (No Prefix). Skipping.`);
                continue;
            }

            if (!companyCounters[voucher.company_id]) {
                companyCounters[voucher.company_id] = 1;
            } else {
                companyCounters[voucher.company_id]++;
            }

            const newNumber = companyCounters[voucher.company_id];
            const newVoucherNo = `${prefix}-${String(newNumber).padStart(5, '0')}`;

            if (voucher.voucher_no !== newVoucherNo) {
                console.log(`    Fixing Voucher ID ${voucher.id}: ${voucher.voucher_no} -> ${newVoucherNo}`);
                updates.push(new Promise((resolve, reject) => {
                    db.run("UPDATE vouchers SET voucher_no = ? WHERE id = ?", [newVoucherNo, voucher.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                }));
            }
        }

        if (updates.length > 0) {
            await Promise.all(updates);
            console.log(`    Successfully fixed ${updates.length} voucher numbers.`);
        } else {
            console.log("    No vouchers needed fixing.");
        }

    } catch (error) {
        console.error("    Error fixing vouchers:", error);
    } finally {
        // We need to close the connection properly
        // Assuming database.js exposes a close method, or we just exit
        console.log("Done.");
        process.exit(0);
    }
}

fixVoucherNumbers();


