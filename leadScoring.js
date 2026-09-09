'use strict';

// =============================================
// CRM Sales — Lead Scoring por Hitos
// El score refleja cuánto avanzó el cliente en el proceso de venta.
// =============================================

const { pool } = require('../config/db');

// ── Puntos por cada hito alcanzado ───────────────────────────────────────────
const HITOS = {
  primer_contacto: 5,   // Escribió por primera vez
  nombre:         20,   // Dio su nombre
  modalidad:      20,   // Eligió modalidad (Estrella / Súper / Mega)
  valor:          15,   // Dio el valor del vehículo o presupuesto
  cotizacion:     15,   // Recibió la cotización
  ciudad:          5,   // Mencionó su ciudad
  cierre:         10,   // Eligió cómo cerrar (visita o contrato)
  requisitos:      5,   // Recibió info de requisitos / cuenta de pago
  handoff:         5,   // Asesor fue notificado
};
// Máximo posible: 100 puntos
// Niveles:
//   frio    (🔴)  0–39   → contacto inicial, sin datos clave
//   tibio   (🟡) 40–69   → avanzó (modalidad + valor), sin cotización
//   caliente(🟢) 70–100  → cotización enviada o más

// ── Detectar intención para el log (simplificado) ────────────────────────────
function detectIntent(text = '') {
  const t = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/no\s*(me\s*interesa|quiero|gracias)|cancelar|bloquear/.test(t)) return 'rechazo';
  if (/cita|visita|agendar|ir\s*a\s*ver/.test(t))                      return 'cita';
  if (/contrato|correo|email|enviame/.test(t))                          return 'cierre';
  if (/cuanto|valor|precio|cotiz|abono|mensual/.test(t))               return 'cotizacion';
  if (/credito|financ|entrada|modalidad|estrella/.test(t))             return 'credito';
  if (/foto|catálogo|catalogo|modelo|imagen/.test(t))                  return 'info';
  if (/me llamo|soy|mi nombre/.test(t))                                return 'nombre';
  if (/hola|buenos|buenas|saludos/.test(t))                            return 'saludo';
  return 'otro';
}

// ── Calcular score total por hitos alcanzados ─────────────────────────────────
async function calcularScorePorHitos(leadId, metadata = {}) {
  let score = HITOS.primer_contacto;

  // Nombre: en metadata o en la tabla leads
  const meta = metadata || {};
  if (meta.sm_nombre) score += HITOS.nombre;

  // Modalidad elegida
  if (meta.sm_modalidad) score += HITOS.modalidad;

  // Valor del vehículo dado
  if (meta.sm_valor || meta.sm_presupuesto) score += HITOS.valor;

  // Ciudad mencionada
  if (meta.sm_ciudad) score += HITOS.ciudad;

  // Forma de cierre elegida (visita o contrato)
  if (meta.sm_cierre) score += HITOS.cierre;

  // Cotización enviada (buscar en outbound)
  try {
    const { rows: cot } = await pool.query(
      `SELECT 1 FROM bot_conversations
        WHERE lead_id=$1 AND direction='outbound'
          AND (message_text LIKE '%🟡%' OR message_text ILIKE '%activación de servicio%'
               OR message_text LIKE '%🏍️%')
        LIMIT 1`,
      [leadId]
    );
    if (cot.length) score += HITOS.cotizacion;

    // Requisitos / cuenta de pago enviada
    const { rows: req } = await pool.query(
      `SELECT 1 FROM bot_conversations
        WHERE lead_id=$1 AND direction='outbound'
          AND (message_text ILIKE '%cuenta corriente%' OR message_text ILIKE '%Banco del Pichincha%'
               OR message_text ILIKE '%cédula de identidad%')
        LIMIT 1`,
      [leadId]
    );
    if (req.length) score += HITOS.requisitos;
  } catch { /* no bloquear si falla */ }

  // HANDOFF activado
  try {
    const { rows: ho } = await pool.query(
      `SELECT handoff FROM leads WHERE id=$1 LIMIT 1`, [leadId]
    );
    if (ho[0]?.handoff) score += HITOS.handoff;
  } catch { /* no bloquear */ }

  return Math.min(100, score);
}

// ── Nivel semáforo ────────────────────────────────────────────────────────────
function scoreToNivel(score) {
  if (score >= 70) return 'caliente'; // 🟢 Cotizó o más — listo para cerrar
  if (score >= 40) return 'tibio';    // 🟡 Avanzó (modalidad + valor)
  return 'frio';                       // 🔴 Inicio — solo contacto o nombre
}

// ── Actualizar score del lead en BD ──────────────────────────────────────────
async function updateLeadScore(leadId, score) {
  const nivel = scoreToNivel(score);
  const { rows } = await pool.query(
    `UPDATE leads
        SET score         = $1,
            bot_score     = $1,
            bot_msg_count = COALESCE(bot_msg_count, 0) + 1,
            last_bot_msg  = NOW(),
            nivel         = $2,
            updated_at    = NOW()
      WHERE id = $3
  RETURNING id, score, nivel, bot_score, bot_msg_count`,
    [score, nivel, leadId]
  );
  return rows[0] || null;
}

// ── Proceso completo: calcular hitos → actualizar score ──────────────────────
async function processMessage(leadId, messageText, dbClient = null) {
  const intent = detectIntent(messageText);

  // Leer metadata actual del lead para calcular hitos
  let metadata = {};
  try {
    const { rows } = await pool.query(
      `SELECT metadata, nombre FROM leads WHERE id=$1 LIMIT 1`, [leadId]
    );
    metadata = rows[0]?.metadata || {};
    // Si ya tiene nombre en la tabla pero no en metadata, contarlo
    if (!metadata.sm_nombre && rows[0]?.nombre && !/^\d+$/.test(rows[0].nombre)) {
      metadata.sm_nombre = rows[0].nombre;
    }
  } catch { /* no bloquear */ }

  const score = await calcularScorePorHitos(leadId, metadata);
  const delta = 0; // mantenemos delta=0; el score es absoluto, no acumulativo
  const updated = await updateLeadScore(leadId, score);

  return { intent, delta, lead: updated };
}

// ── Verificar promoción para el cron ─────────────────────────────────────────
async function checkPromotion(leadId) {
  const { rows } = await pool.query(
    `SELECT id, score, nivel, bot_msg_count, bot_score FROM leads WHERE id=$1`, [leadId]
  );
  if (!rows[0]) return null;
  const lead = rows[0];
  const merecido = lead.score >= 40 && (lead.bot_msg_count || 0) >= 2 && lead.nivel !== 'caliente';
  return { lead, merecido };
}

module.exports = { detectIntent, scoreToNivel, updateLeadScore, processMessage, checkPromotion };
