'use strict';
const { pool } = require('../config/db');

let webpush;
try {
  webpush = require('web-push');
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:admin@jismart.net',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
} catch (e) {
  console.warn('[push] web-push no instalado — push desactivado');
}

// ── Crear tabla si no existe ─────────────────────────────────────────────────
async function initTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id          SERIAL PRIMARY KEY,
      user_id     UUID NOT NULL,
      company_id  UUID NOT NULL,
      subscription JSONB NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, (subscription->>'endpoint'))
    )
  `).catch(() => {});
}
initTable();

// ── Guardar suscripción ──────────────────────────────────────────────────────
async function saveSubscription(userId, companyId, subscription) {
  await pool.query(`
    INSERT INTO push_subscriptions (user_id, company_id, subscription)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, (subscription->>'endpoint'))
    DO UPDATE SET subscription = $3, created_at = NOW()
  `, [userId, companyId, JSON.stringify(subscription)]);
}

// ── Enviar push a un usuario ─────────────────────────────────────────────────
async function sendPush(userId, payload) {
  if (!webpush || !process.env.VAPID_PUBLIC_KEY) return;
  try {
    const { rows } = await pool.query(
      `SELECT subscription FROM push_subscriptions WHERE user_id = $1`, [userId]
    );
    for (const row of rows) {
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify(payload));
      } catch (err) {
        // Suscripción vencida — eliminar
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query(
            `DELETE FROM push_subscriptions WHERE user_id=$1 AND subscription->>'endpoint'=$2`,
            [userId, row.subscription.endpoint]
          ).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.error('[push] Error sendPush:', e.message);
  }
}

module.exports = { saveSubscription, sendPush };
