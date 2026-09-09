// =============================================
// CRM Sales — Notify Service
// Notifica al asesor por WhatsApp + Socket.IO
// =============================================
'use strict';

const axios = require('axios');
const { pool } = require('../config/db');
const { sendPush } = require('./pushService');

const WA_API_URL = 'https://graph.facebook.com/v19.0';

// ── Enviar mensaje WhatsApp ──────────────────────────────────────────────────

async function sendWhatsApp(toPhone, message, companyId) {
  try {
    // Obtener credenciales de la empresa
    const { rows } = await pool.query(
      `SELECT c.wa_phone_id, c.wa_token
         FROM companies c WHERE c.id = $1`,
      [companyId]
    );
    const company = rows[0];
    if (!company?.wa_phone_id || !company?.wa_token) {
      console.warn(`[notify] Empresa ${companyId} sin credenciales WhatsApp`);
      return false;
    }

    const phone = normPhone(toPhone);
    const url   = `${WA_API_URL}/${company.wa_phone_id}/messages`;

    await axios.post(url, {
      messaging_product: 'whatsapp',
      to:   phone,
      type: 'text',
      text: { body: message },
    }, {
      headers: {
        Authorization: `Bearer ${company.wa_token}`,
        'Content-Type': 'application/json',
      },
    });

    return true;
  } catch (err) {
    console.error('[notify] Error enviando WhatsApp:', err.response?.data || err.message);
    return false;
  }
}

// ── Notificar al asesor asignado ─────────────────────────────────────────────

async function notifyAdvisor(leadId, reason, app) {
  try {
    // Obtener datos del lead + asesor asignado
    const { rows } = await pool.query(
      `SELECT l.id, l.nombre, l.telefono, l.nivel, l.score,
              l.bot_msg_count, l.company_id,
              u.name  AS asesor_name,
              u.phone AS asesor_phone,
              u.id    AS asesor_id
         FROM leads l
         LEFT JOIN users u ON u.id = l.advisor_id
        WHERE l.id = $1`,
      [leadId]
    );
    const lead = rows[0];
    if (!lead) return;

    const semaforo =
      lead.nivel === 'caliente' ? '🟢' :
      lead.nivel === 'tibio'    ? '🟡' : '🔴';

    const nivelLabel =
      lead.nivel === 'caliente' ? '¡A cerrar!' :
      lead.nivel === 'tibio'    ? 'En seguimiento' : 'Rescatar';

    // ── 1. Notificación por Socket.IO (en tiempo real en el CRM) ──
    if (app) {
      const io = app.get('io');
      if (io) {
        io.to(String(lead.company_id)).emit('lead:promoted', {
          leadId:    lead.id,
          nombre:    lead.nombre,
          nivel:     lead.nivel,
          score:     lead.score,
          asesorId:  lead.asesor_id,
          reason,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // ── 2. Guardar notificación en BD ──
    await pool.query(
      `INSERT INTO notifications (user_id, company_id, type, title, body, data, created_at)
       VALUES ($1, $2, 'lead_promoted', $3, $4, $5, NOW())
       ON CONFLICT DO NOTHING`,
      [
        lead.asesor_id,
        lead.company_id,
        `${semaforo} Lead promovido: ${lead.nombre}`,
        `${lead.nombre} mostró interés anoche (${lead.bot_msg_count} respuestas). ¡Es el momento de llamar!`,
        JSON.stringify({ leadId: lead.id, nivel: lead.nivel, score: lead.score }),
      ]
    ).catch(() => {}); // la tabla puede no existir aún

    // ── 3. WhatsApp directo al asesor ──
    if (lead.asesor_phone) {
      const msg = [
        `${semaforo} *Lead rescatado — ${nivelLabel}*`,
        ``,
        `👤 *${lead.nombre}*`,
        `📱 ${lead.telefono}`,
        `💬 Respondió ${lead.bot_msg_count} veces al bot anoche`,
        `📊 Score: ${lead.score}/100`,
        ``,
        `👉 Llámale ahora — está esperando tu contacto.`,
      ].join('\n');

      await sendWhatsApp(lead.asesor_phone, msg, lead.company_id);
      console.log(`[notify] WhatsApp enviado al asesor ${lead.asesor_name} sobre ${lead.nombre}`);
    }

  } catch (err) {
    console.error('[notify] Error notifyAdvisor:', err.message);
  }
}

// ── Notificar a toda la empresa (resumen de 4am) ─────────────────────────────

async function sendNightSummary(companyId, promoted, app) {
  try {
    if (!promoted || promoted.length === 0) return;

    // Buscar supervisor o admin para enviar resumen
    const { rows } = await pool.query(
      `SELECT u.name, u.phone FROM users u
        WHERE u.company_id = $1
          AND u.role IN ('admin','supervisor','administrator')
          AND u.status = 'active'
        LIMIT 3`,
      [companyId]
    );

    const verde  = promoted.filter(l => l.nuevo_nivel === 'caliente').length;
    const ambar  = promoted.filter(l => l.nuevo_nivel === 'tibio').length;

    const msg = [
      `🌅 *Resumen de noche — Bot CRM*`,
      ``,
      `Se promovieron *${promoted.length} leads* esta noche:`,
      verde > 0 ? `🟢 ${verde} listos para cerrar` : null,
      ambar > 0 ? `🟡 ${ambar} en seguimiento` : null,
      ``,
      `Los asesores ya fueron notificados.`,
      `Revisa el dashboard para ver el detalle.`,
    ].filter(Boolean).join('\n');

    for (const admin of rows) {
      if (admin.phone) {
        await sendWhatsApp(admin.phone, msg, companyId);
      }
    }

    // Socket.IO — actualizar dashboard en tiempo real
    if (app) {
      const io = app.get('io');
      if (io) {
        io.to(String(companyId)).emit('night:summary', {
          total: promoted.length,
          verde, ambar,
          leads: promoted,
          timestamp: new Date().toISOString(),
        });
      }
    }

  } catch (err) {
    console.error('[notify] Error sendNightSummary:', err.message);
  }
}

// ── Normalizar teléfono para wa.me (Ecuador 593) ─────────────────────────────
function normPhone(p) {
  const r = (p || '').replace(/\D/g, '');
  if (r.startsWith('593')) return r;
  if (r.startsWith('0') && r.length === 10) return '593' + r.substring(1);
  if (r.length === 9) return '593' + r;
  return r;
}

const MODAL_LABEL = {
  mega_estrella:  'Mega Estrella',
  super_estrella: 'Súper Estrella',
  estrella:       'Estrella',
  contado:        'Contado',
};

function getModalidad(lead) {
  const key = lead?.metadata?.sm_modalidad;
  if (key && MODAL_LABEL[key]) return MODAL_LABEL[key];
  if (lead?.metadata?.producto) return lead.metadata.producto;
  if (lead?.intent) return lead.intent;
  return '—';
}

// ── Notificar al asesor cuando llega un cliente nuevo por WhatsApp ───────────
async function notifyAdvisorNewLead(lead, clientPhone, clientName, companyId) {
  if (!lead?.advisor_id) return;
  try {
    const { rows } = await pool.query(
      'SELECT name, phone FROM users WHERE id=$1', [lead.advisor_id]
    );
    const advisor = rows[0];
    if (!advisor?.phone) return;

    const waNum  = normPhone(clientPhone);
    const nivel  = lead?.nivel || 'nuevo';
    const nivelEmoji = nivel === 'caliente' ? '🔥' : nivel === 'tibio' ? '🌡️' : nivel === 'frio' ? '❄️' : '🆕';
    const modalidad  = getModalidad(lead);

    const msg = [
      `🔔 *Nuevo lead asignado — CRM*`,
      ``,
      `*Nombre:* ${clientName || 'Desconocido'}`,
      `*Celular:* https://wa.me/${waNum}`,
      `*Estado del lead:* ${nivelEmoji} ${nivel}`,
      `*Modalidad:* ${modalidad}`,
      ``,
      `_Toca el celular para escribirle por WhatsApp._`,
    ].join('\n');

    await sendWhatsApp(advisor.phone, msg, companyId);
    // Push al navegador
    sendPush(lead.advisor_id, {
      title: '🔔 Nuevo lead — CRM',
      body:  `${clientName || 'Desconocido'} · ${modalidad}`,
      tag:   `lead-${lead.id}`,
      url:   '/',
    }).catch(()=>{});
    console.log(`[notify] Asesor ${advisor.name} notificado — nuevo lead ${clientName} (${clientPhone})`);
  } catch (e) {
    console.error('[notify] Error notifyAdvisorNewLead:', e.message);
  }
}

// ── Notificar al asesor cuando hay HANDOFF (cliente listo para cierre) ───────
async function notifyAdvisorHandoff(lead, clientPhone, reason, companyId) {
  if (!lead?.advisor_id) return;
  try {
    const { rows } = await pool.query(
      'SELECT name, phone FROM users WHERE id=$1', [lead.advisor_id]
    );
    const advisor = rows[0];
    if (!advisor?.phone) return;

    const waNum  = normPhone(clientPhone);
    const nivel  = lead?.nivel || 'tibio';
    const nivelEmoji = nivel === 'caliente' ? '🔥' : nivel === 'tibio' ? '🌡️' : '❄️';
    const modalidad  = getModalidad(lead);

    const motivoMap = {
      cliente_caliente:   '🔥 Cliente listo para avanzar',
      atencion_detallada: '📋 Necesita atención personalizada',
      fuera_alcance:      '❓ Consulta fuera del alcance del bot',
      sin_respuesta:      '⏳ Sin respuesta al bot (2 horas)',
    };

    const msg = [
      `🚨 *Lead requiere tu atención — CRM*`,
      ``,
      `*Nombre:* ${lead.nombre || 'Desconocido'}`,
      `*Celular:* https://wa.me/${waNum}`,
      `*Estado del lead:* ${nivelEmoji} ${nivel}`,
      `*Modalidad:* ${modalidad}`,
      ``,
      `📋 ${motivoMap[reason] || reason}`,
      `_Toca el celular para escribirle por WhatsApp._`,
    ].join('\n');

    await sendWhatsApp(advisor.phone, msg, companyId);
    sendPush(lead.advisor_id, {
      title: '🚨 Lead urgente — CRM',
      body:  `${lead.nombre || 'Cliente'} · ${motivoMap[reason] || reason}`,
      tag:   `handoff-${lead.id}`,
      url:   '/',
    }).catch(()=>{});
    console.log(`[notify] Asesor ${advisor.name} notificado — HANDOFF: ${reason}`);
  } catch (e) {
    console.error('[notify] Error notifyAdvisorHandoff:', e.message);
  }
}

// ── Notificar regestión al asesor y supervisor (máx 2 por lead) ─────────────
// Al 3er intento, elimina las notificaciones anteriores para liberar espacio.
async function notifyAdvisorReengagement(lead, app) {
  try {
    const dias = Math.floor(
      (Date.now() - new Date(lead.last_inbound).getTime()) / (1000 * 60 * 60 * 24)
    );
    const leadIdStr = String(lead.id);

    // ── Verificar cuántas notificaciones ya existen para este lead ───────────
    const { rows: existing } = await pool.query(
      `SELECT id FROM notifications
       WHERE type = 'reengagement'
         AND (data->>'leadId') = $1
       ORDER BY created_at ASC`,
      [leadIdStr]
    );

    // Al llegar al límite: solo eliminar las notificaciones del panel, no tocar el lead
    if (existing.length >= 2) {
      await pool.query(
        `DELETE FROM notifications
         WHERE type = 'reengagement' AND (data->>'leadId') = $1`,
        [leadIdStr]
      );
      console.log(`[reengagement] Límite 2 alcanzado para "${lead.nombre}" — notificaciones eliminadas`);
      return;
    }

    const notifNum = existing.length + 1; // 1 o 2
    const data     = JSON.stringify({ leadId: lead.id, nivel: lead.nivel, score: lead.score, dias, notifNum });
    const semaforo = lead.nivel === 'caliente' ? '🟢' : lead.nivel === 'tibio' ? '🟡' : '🔴';

    // ── 1. Notificación al ASESOR ─────────────────────────────────────────────
    await pool.query(
      `INSERT INTO notifications (user_id, company_id, type, title, body, data, read, created_at)
       VALUES ($1,$2,'reengagement',$3,$4,$5,FALSE,NOW())`,
      [
        lead.asesor_id,
        lead.company_id,
        `Regestión #${notifNum}: ${lead.nombre}`,
        `${lead.nombre} lleva ${dias} días sin responder. Contáctale por otro medio.`,
        data,
      ]
    ).catch(() => {});

    // ── 2. Notificación al SUPERVISOR / ADMIN de la empresa ──────────────────
    const { rows: supervisores } = await pool.query(
      `SELECT id FROM users
       WHERE company_id = $1
         AND role IN ('supervisor','admin','administrator')
         AND status = 'active'`,
      [lead.company_id]
    );

    for (const sup of supervisores) {
      await pool.query(
        `INSERT INTO notifications (user_id, company_id, type, title, body, data, read, created_at)
         VALUES ($1,$2,'reengagement',$3,$4,$5,FALSE,NOW())`,
        [
          sup.id,
          lead.company_id,
          `Regestión #${notifNum} — Asesor: ${lead.asesor_name}`,
          `${lead.nombre} lleva ${dias} días sin responder. Asesor asignado: ${lead.asesor_name}.`,
          data,
        ]
      ).catch(() => {});
    }

    // ── 3. Socket.IO — alerta en tiempo real ─────────────────────────────────
    if (app) {
      const io = app.get('io');
      if (io) {
        io.to(String(lead.company_id)).emit('lead:reengagement', {
          leadId:    lead.id,
          nombre:    lead.nombre,
          telefono:  lead.telefono,
          nivel:     lead.nivel,
          score:     lead.score,
          asesorId:  lead.asesor_id,
          asesorName:lead.asesor_name,
          dias,
          notifNum,
          timestamp: new Date().toISOString(),
        });
      }
    }

    console.log(`[reengagement] #${notifNum} enviada — ${lead.nombre} (${dias}d) → ${lead.asesor_name} + ${supervisores.length} supervisor(es)`);

  } catch (err) {
    console.error('[reengagement] Error:', err.message);
  }
}

module.exports = { sendWhatsApp, notifyAdvisor, sendNightSummary, notifyAdvisorNewLead, notifyAdvisorHandoff, notifyAdvisorReengagement };
