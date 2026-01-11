const { db } = require('../database');

const logAction = (req, action, entityType, entityId, details) => {
    try {
        const userId = req.user ? req.user.id : null;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        let detailsStr = details;
        if (typeof details === 'object') {
            detailsStr = JSON.stringify(details);
        }

        const sql = `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [userId, action, entityType, entityId, detailsStr, ip], (err) => {
            if(err) console.error("Audit Log Error:", err);
        });
    } catch (e) {
        console.error("Audit Log Exception:", e);
    }
};

module.exports = { logAction };
