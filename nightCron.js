// =============================================
// CRM Sales — Night Cron Job
// Se ejecuta a las 4am:
//  1. Revisa leads activos del bot durante la noche
//  2. Sube de nivel (rojo→ámbar, ámbar→verde) si hubo interés
//  3. Notifica al asesor asignado por WhatsApp + CRM
// =============================================
'use strict';

const cron = require('node-cron');
const { pool } = require('../config/db');
const { notifyAdvisor, sendNightSummary, notifyAdvisorReengagement } = require('../services/notifyService');

// ── Job de seguimiento: cada 30 min verifica leads sin respuesta ──────────────
// Flujo: cliente escribe → bot responde → si no hay respuesta:
//   2 horas después  → seguimiento 1
//   Día siguiente    → seguimiento 2
//   Sin respuesta    → silencio total

function startFollowUpCron(app) {
  const cron         = require('node-cron');
  const { pool }     = require('../config/db');
  const { sendWAMessage } = require('../services/botService');

  const MSG_1 = (nombre) =>
    `${nombre}, ¿pudo revisar la información sobre los vehículos que le compartí? Quedo a su disposición para cualquier consulta. 😊`;

  const MSG_2 = (nombre) =>
    `${nombre}, le saluda Claudia de Busimott. ¿Mantiene interés en adquirir su vehículo? Tenemos opciones disponibles y podemos coordinar todo hoy. 🚗`;

  async function enviarSeguimiento(lead, wa, msg, paso) {
    const sent = await sendWAMessage(wa.wa_phone_id, wa.wa_token, lead.telefono, msg);
    if (!sent) return;

    await pool.query(
      `INSERT INTO bot_conversations (lead_id, company_id, wa_phone, direction, message_text, bot_active, created_at)
       VALUES ($1, $2, $3, 'outbound', $4, TRUE, NOW())`,
      [lead.id, lead.company_id, lead.telefono, msg]
    );

    const col = paso === 1 ? 'followup_1_at' : 'followup_2_at';
    await pool.query(`UPDATE leads SET ${col}=NOW(), updated_at=NOW() WHERE id=$1`, [lead.id]);

    console.log(`[followup] Seguimiento ${paso} enviado a ${lead.nombre}`);
  }

  cron.schedule('*/30 * * * *', async () => {
    try {
      const { rows: waMap } = await pool.query(
        `SELECT id, wa_phone_id, wa_token FROM companies WHERE wa_phone_id IS NOT NULL AND wa_token IS NOT NULL`
      );
      const wa = {};
      waMap.forEach(r => { wa[r.id] = r; });

      // ── SEGUIMIENTO 1: 2h sin respuesta del cliente, aún no se envió F1 ──────
      const { rows: f1 } = await pool.query(`
        SELECT l.id, l.nombre, l.telefono, l.company_id
        FROM leads l
        JOIN bot_config cfg ON cfg.company_id = l.company_id
        JOIN (
          SELECT lead_id,
                 MAX(CASE WHEN direction='inbound'  THEN created_at END) AS last_in,
                 MAX(CASE WHEN direction='outbound' THEN created_at END) AS last_out
          FROM bot_conversations GROUP BY lead_id
        ) bc ON bc.lead_id = l.id
        WHERE cfg.bot_enabled = TRUE
          AND l.followup_1_at IS NULL
          AND l.handoff IS NOT TRUE
          AND l.nivel != 'perdido'
          AND bc.last_out IS NOT NULL
          AND bc.last_out > NOW() - INTERVAL '48 hours'
          AND bc.last_out < NOW() - INTERVAL '2 hours'
          AND (bc.last_in IS NULL OR bc.last_in < bc.last_out)
      `);

      for (const lead of f1) {
        const w = wa[lead.company_id];
        if (!w) continue;
        const nombre = lead.nombre?.split(' ')[0] || 'Estimado cliente';
        await enviarSeguimiento(lead, w, MSG_1(nombre), 1);
        await new Promise(r => setTimeout(r, 600));
      }

      // ── SEGUIMIENTO 2: al día siguiente de F1, cliente sigue sin responder ───
      const { rows: f2 } = await pool.query(`
        SELECT l.id, l.nombre, l.telefono, l.company_id
        FROM leads l
        JOIN bot_config cfg ON cfg.company_id = l.company_id
        JOIN (
          SELECT lead_id,
                 MAX(CASE WHEN direction='inbound' THEN created_at END) AS last_in
          FROM bot_conversations GROUP BY lead_id
        ) bc ON bc.lead_id = l.id
        WHERE cfg.bot_enabled = TRUE
          AND l.followup_1_at IS NOT NULL
          AND l.followup_2_at IS NULL
          AND l.handoff IS NOT TRUE
          AND l.nivel != 'perdido'
          AND l.followup_1_at < NOW() - INTERVAL '20 hours'
          AND (bc.last_in IS NULL OR bc.last_in < l.followup_1_at)
      `);

      for (const lead of f2) {
        const w = wa[lead.company_id];
        if (!w) continue;
        const nombre = lead.nombre?.split(' ')[0] || 'Estimado cliente';
        await enviarSeguimiento(lead, w, MSG_2(nombre), 2);
        await new Promise(r => setTimeout(r, 600));
      }

      if (f1.length + f2.length > 0) {
        console.log(`[followup] Ciclo: F1=${f1.length} F2=${f2.length}`);
      }

    } catch(err) {
      console.error('[followup] Error:', err.message);
    }
  }, { timezone: process.env.TZ || 'America/Guayaquil' });

  console.log('⏰ [followup] Seguimiento activo: F1=2h | F2=día siguiente | luego silencio');
}

// ── Job principal: 4:00am todos los días ────────────────────────────────────

function startNightCron(app) {
  cron.schedule('0 4 * * *', async () => {
    console.log('🌅 [cron] Iniciando proceso nocturno 4am...');
    await processNightLeads(app);
    await cleanOldMessages();
  }, {
    timezone: process.env.TZ || 'America/Guayaquil',
  });

  console.log('⏰ [cron] Job nocturno registrado: 4:00am diario (incluye limpieza de mensajes)');
}

// ── Limpieza automática de mensajes por retención configurada ────────────────
// Lee msg_retention_months de bot_config por empresa.
// Si está en NULL → no borra nada (por defecto).
// Busimott tiene 2 meses configurado.

async function cleanOldMessages() {
  console.log('[cleanup] Iniciando limpieza de mensajes...');
  const client = await pool.connect();
  try {
    const { rows: empresas } = await client.query(`
      SELECT c.id, c.name, bc.msg_retention_months
      FROM companies c
      JOIN bot_config bc ON bc.company_id = c.id
      WHERE bc.msg_retention_months IS NOT NULL
        AND bc.msg_retention_months > 0
    `);

    if (empresas.length === 0) {
      console.log('[cleanup] Ninguna empresa con retención configurada.');
      return;
    }

    for (const emp of empresas) {
      const meses = emp.msg_retention_months;
      const corte = `NOW() - INTERVAL '${meses} months'`;

      // 1. Mensajes del bot (bot_conversations)
      const { rowCount: bcDel } = await client.query(`
        DELETE FROM bot_conversations
        WHERE company_id = $1
          AND created_at < ${corte}
      `, [emp.id]);

      // 2. Mensajes de asesor (messages → via conversations)
      const { rowCount: msgDel } = await client.query(`
        DELETE FROM messages
        WHERE conversation_id IN (
          SELECT id FROM conversations WHERE company_id = $1
        )
        AND created_at < ${corte}
      `, [emp.id]);

      console.log(`[cleanup] ${emp.name} (${meses} meses): bot_conversations -${bcDel} | messages -${msgDel}`);
    }

    console.log('[cleanup] Limpieza de mensajes completada.');
  } catch (err) {
    console.error('[cleanup] Error:', err.message);
  } finally {
    client.release();
  }
}

// ── Proceso principal ────────────────────────────────────────────────────────

async function processNightLeads(app) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener todas las empresas con bot activo
    const { rows: companies } = await client.query(
      `SELECT c.id, c.name, bc.score_threshold, bc.timezone
         FROM companies c
         JOIN bot_config bc ON bc.company_id = c.id
        WHERE bc.bot_enabled = TRUE`
    );

    console.log(`[cron] Procesando ${companies.length} empresas...`);

    for (const company of companies) {
      await processCompanyLeads(client, company, app);
    }

    await client.query('COMMIT');
    console.log('✅ [cron] Proceso nocturno completado');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [cron] Error en proceso nocturno:', err.message);
  } finally {
    client.release();
  }
}

// ── Procesar leads de una empresa ────────────────────────────────────────────

async function processCompanyLeads(client, company, app) {
  const threshold = company.score_threshold || 35;

  // Buscar leads que:
  // 1. Tuvieron actividad del bot en las últimas 8 horas (la noche)
  // 2. Su score actual justifica una promoción de nivel
  const { rows: leads } = await client.query(
    `SELECT l.id, l.nombre, l.telefono, l.nivel AS nivel_actual,
            l.score, l.bot_score, l.bot_msg_count,
            l.advisor_id,
            u.name  AS asesor_name,
            u.phone AS asesor_phone
       FROM leads l
       LEFT JOIN users u ON u.id = l.advisor_id
      WHERE l.company_id = $1
        AND l.last_bot_msg > NOW() - INTERVAL '8 hours'
        AND l.bot_msg_count >= 2
        AND l.score >= $2
      ORDER BY l.score DESC`,
    [company.id, threshold]
  );

  console.log(`[cron] Empresa ${company.name}: ${leads.length} leads candidatos a promoción`);

  // ── Reclasificar leads sin respuesta en 24h ──────────────────────────────
  const { rows: sinRespuesta } = await client.query(
    `SELECT l.id, l.nombre, l.nivel, l.score, l.advisor_id
       FROM leads l
      WHERE l.company_id = $1
        AND l.last_bot_msg IS NOT NULL
        AND l.last_bot_msg < NOW() - INTERVAL '24 hours'
        AND l.nivel != 'perdido'
        AND NOT EXISTS (
          SELECT 1 FROM bot_conversations bc
          WHERE bc.lead_id = l.id
            AND bc.direction = 'inbound'
            AND bc.created_at > NOW() - INTERVAL '24 hours'
        )`,
    [company.id]
  );

  for (const lead of sinRespuesta) {
    const nivelFinal = lead.score >= 30 ? 'tibio' : 'frio';
    await client.query(
      `UPDATE leads SET nivel=$1, updated_at=NOW() WHERE id=$2`,
      [nivelFinal, lead.id]
    );
    console.log(`[cron] Lead sin respuesta 24h: ${lead.nombre} → ${nivelFinal}`);
  }
  console.log(`[cron] ${sinRespuesta.length} leads reclasificados por inactividad 24h`);

  const promoted = [];

  for (const lead of leads) {
    const nivelActual = lead.nivel_actual;
    let   nivelNuevo  = nivelActual;

    // Determinar nuevo nivel según score
    if (lead.score >= 60) {
      nivelNuevo = 'caliente'; // 🟢
    } else if (lead.score >= 30 && nivelActual === 'frio') {
      nivelNuevo = 'tibio';   // 🟡 — el caso clave: rojo → ámbar
    }

    // Solo actualizar si realmente sube de nivel
    if (nivelNuevo !== nivelActual) {
      await client.query(
        `UPDATE leads
            SET nivel      = $1,
                updated_at = NOW()
          WHERE id = $2`,
        [nivelNuevo, lead.id]
      );

      // Registrar el ascenso en bot_sessions
      await client.query(
        `UPDATE bot_sessions
            SET nivel_fin  = $1,
                promoted   = TRUE,
                session_end = NOW()
          WHERE lead_id    = $2
            AND session_end IS NULL`,
        [nivelNuevo, lead.id]
      ).catch(() => {}); // OK si no existe la sesión

      promoted.push({
        ...lead,
        nivel_anterior: nivelActual,
        nuevo_nivel:    nivelNuevo,
      });

      console.log(`[cron] ✅ Promovido: ${lead.nombre} | ${nivelActual} → ${nivelNuevo} | score: ${lead.score}`);

      // Notificar al asesor individualmente
      await notifyAdvisor(lead.id, `Promovido de ${nivelActual} a ${nivelNuevo} por actividad nocturna`, app);

      // Pequeña pausa para no saturar la API de WhatsApp
      await sleep(500);
    } else {
      console.log(`[cron] Sin cambio: ${lead.nombre} | nivel: ${nivelActual} | score: ${lead.score}`);
    }
  }

  // Enviar resumen al admin/supervisor
  if (promoted.length > 0) {
    await sendNightSummary(company.id, promoted, app);
    console.log(`[cron] Empresa ${company.name}: ${promoted.length} leads promovidos`);
  }
}

// ── Trigger manual (para testing desde el CRM) ───────────────────────────────

async function runManual(app) {
  console.log('🔧 [cron] Ejecución manual del proceso nocturno...');
  await processNightLeads(app);
}

// ── Cron de regestión: 9:00am — leads sin respuesta N días ──────────────────
// Lee reengagement_days de bot_config por empresa.
// Busimott = 7 días. Notifica al asesor asignado.
// Evita spam: no renotifica si ya se envió en los últimos N días.

function startReengagementCron(app) {
  cron.schedule('0 9 * * *', async () => {
    console.log('[reengagement] Iniciando revisión de regestión 9am...');
    await checkReengagement(app);
  }, { timezone: process.env.TZ || 'America/Guayaquil' });

  console.log('⏰ [reengagement] Cron de regestión registrado: 9:00am diario');
}

async function checkReengagement(app) {
  try {
    // Buscar empresas con reengagement_days configurado
    const { rows: empresas } = await pool.query(`
      SELECT c.id, c.name, bc.reengagement_days
      FROM companies c
      JOIN bot_config bc ON bc.company_id = c.id
      WHERE bc.reengagement_days IS NOT NULL
        AND bc.reengagement_days > 0
        AND c.status = 'active'
    `);

    if (empresas.length === 0) {
      console.log('[reengagement] Ninguna empresa configurada.');
      return;
    }

    for (const emp of empresas) {
      const dias = emp.reengagement_days;

      // Leads con:
      // 1. Último mensaje inbound hace más de N días
      // 2. Asesor asignado activo
      // 3. No están perdidos
      // 4. Tuvieron al menos 1 mensaje inbound alguna vez
      // 5. No se les notificó en los últimos N días (evita spam)
      const { rows: leads } = await pool.query(`
        SELECT
          l.id, l.nombre, l.telefono, l.nivel, l.score,
          l.advisor_id, l.company_id,
          u.name    AS asesor_name,
          u.phone   AS asesor_phone,
          u.id      AS asesor_id,
          MAX(bc2.created_at) AS last_inbound
        FROM leads l
        JOIN users u ON u.id = l.advisor_id AND u.status = 'active'
        JOIN bot_conversations bc2
          ON bc2.lead_id = l.id AND bc2.direction = 'inbound'
        WHERE l.company_id = $1
          AND l.nivel NOT IN ('perdido')
          AND l.advisor_id IS NOT NULL
        GROUP BY l.id, l.nombre, l.telefono, l.nivel, l.score,
                 l.advisor_id, l.company_id,
                 u.name, u.phone, u.id
        HAVING
          MAX(bc2.created_at) < NOW() - ($2 || ' days')::INTERVAL
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.type = 'reengagement'
              AND (n.data->>'leadId') = l.id::text
              AND n.created_at > NOW() - ($2 || ' days')::INTERVAL
          )
      `, [emp.id, dias]);

      console.log(`[reengagement] ${emp.name}: ${leads.length} leads requieren regestión (${dias}d sin respuesta)`);

      for (const lead of leads) {
        await notifyAdvisorReengagement(lead, app);
        await sleep(800); // pausa entre mensajes WA
      }
    }

    console.log('[reengagement] Revisión completada.');
  } catch (err) {
    console.error('[reengagement] Error:', err.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { startNightCron, runManual, startFollowUpCron, startReengagementCron };
