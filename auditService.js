// =============================================
// Audit Log Helper
// =============================================
'use strict';

const { pool } = require('../config/db');

async function logAction({ userId, companyId, action, entity, entityId, details, ip }) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, company_id, action, entity, entity_id, details, ip_address, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [userId || null, companyId || null, action, entity || null, entityId || null, details || null, ip || null]
    );
  } catch(e) {
    console.warn('[audit] Error registrando accion:', e.message);
  }
}

module.exports = { logAction };
