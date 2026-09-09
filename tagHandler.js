'use strict';

const axios  = require('axios');
const { pool } = require('../config/db');
const { generarCotizacion, generarTablaPlazos, detectModalidad, TABLA } = require('../data/cotizacion');
const { notifyAdvisorHandoff } = require('./notifyService');

// ── Contenido estático de los tags de envío ──────────────────────────────────

const TEXTO_SALUDO = `Hola, bienvenid@ a Busimott Cía Ltda su comercializadora confiable ⭐ para encontrar su vehículo perfecto a crédito. 🚗
Le saluda CLAUDIA 👩🏻‍💼
¿Ayúdeme con su nombre y número de cédula?`;

const TEXTO_MODALIDADES = `Así funciona cada modalidad:
⭐ Mega Estrella:  Entrada del 70% para acceder a beneficios preferenciales.
⭐ Súper Estrella: Empieza hoy y pague una entrada mínima del 35% en el 4to mes.
⭐ Estrella: Accede a tu vehículo con pagos flexibles.

¿Indíqueme con qué modalidad de pago adquiere su vehículo?`;

const TEXTO_BENEFICIOS = `🔖 Beneficios y servicios incluidos al elegirnos:

▫️ 24 meses de garantía ⚙️
▫️ Mantenimientos preventivos a su elección 🔩🚘
▫️ Certificación de kilometraje y originalidad de su vehículo
▫️ Detailing y limpieza completa 🫧
▫️ Mano de obra sin costo por 1 año
▫️ Talleres técnicos y mecánicos propios ⚙️🛠️

✨🎁 ¡Refiera y gane!
Por cada referido llévese fabulosos premios.`;

const TEXTO_DIRECCION = `📍 *Oficinas Busimott Cía. Ltda.*

🏢 Av. Eloy Alfaro E7-103 y De Los Eucaliptos, Quito
📞 023 50 0328
✉️ bussimott.info@gmail.com

📋 *Requisitos para iniciar:*
❇️ Cédula de identidad y papeleta de votación
❇️ Correo electrónico vigente
❇️ Valor de activación según el plan elegido

¿Qué día y hora le viene mejor para visitarnos? 🤝`;

function buildTextoCuentaPago(activLine = null) {
  const activLine_ = activLine || `❇️ Valor de activación de servicios según su plan`;
  return `📋 *Requisitos para iniciar el negocio:*

❇️ Cédula de identidad y papeleta de votación
❇️ Correo electrónico vigente
${activLine_}

💳 *Cuenta para registrar su pago:*

👤 Titular: Business Motors Busimott. Cía. Ltda.
🏦 Banco: Banco del Pichincha
📋 Tipo: Cuenta Corriente
🔢 N° de cuenta: 2100247020
🆔 RUC: 1793140491001

⚠️ Una vez realizado el pago, envíenos el comprobante por este chat.
Al confirmar el pago procedemos con el envío de su contrato. 🚗`;
}

function TEXTO_ANTIFRAUDE(nombre) {
  const n = nombre ? `, ${nombre}` : '';
  return `Entiendo tu preocupación${n}. Somos Business Motors Busimott Cía Ltda con registro en la SUPER DE COMPAÑÍAS, REGISTRO DE MUCHO MEJOR ECUADOR Y RUC ACTIVO SRI CON NUMERO: 1793140491001.

Nuestras más de 800 entregas a nivel nacional respaldan nuestra garantía. Puedes verificarnos en nuestras redes sociales, te envío nuestros links:
Facebook: facebook.com/Busimott
Youtube: youtube.com/@busimottcialtda
Pagina Web: busimott.com.`;
}



// ── Regex de detección de tags ────────────────────────────────────────────────
const TAG_REGEX = /\[([A-Z_]+(?::[^\]]*)?)\]/g;

/**
 * Extrae y ejecuta todos los tags del texto de respuesta de Claude.
 * Devuelve el texto limpio (sin tags) para enviar al cliente.
 */
async function processTags(rawText, context) {
  const tags = [];
  let match;
  TAG_REGEX.lastIndex = 0;
  while ((match = TAG_REGEX.exec(rawText)) !== null) {
    tags.push(match[1]);
  }

  const cleanText = String(rawText || '').replace(TAG_REGEX, '').replace(/\s{2,}/g, ' ').trim();

  for (const tag of tags) {
    try {
      await executeTag(tag, context);
    } catch (e) {
      console.error(`[tags] Error ejecutando [${tag}]:`, e.message);
    }
  }

  return cleanText;
}

async function executeTag(tag, context) {
  const { phone, companyId, app, wa, lead, history, sendWA } = context;

  // Guarda en bot_conversations el mensaje enviado por tag
  async function saveTagMsg(texto) {
    if (!lead?.id) return;
    try {
      await pool.query(
        `INSERT INTO bot_conversations
           (lead_id, company_id, wa_phone, wa_name, direction, message_text, bot_active, created_at)
         VALUES ($1,$2,$3,'Claudia','outbound',$4,TRUE,NOW())`,
        [lead.id, companyId, phone, texto]
      );
    } catch (e) {
      console.error('[tags] Error guardando msg en BD:', e.message);
    }
  }

  // ── ENVIAR_SALUDO ──────────────────────────────────────────────────────────
  if (tag === 'ENVIAR_SALUDO') {
    await sendWA(wa.wa_phone_id, wa.wa_token, phone, TEXTO_SALUDO);
    await saveTagMsg(TEXTO_SALUDO);
    return;
  }

  // ── ENVIAR_MODALIDADES ─────────────────────────────────────────────────────
  if (tag === 'ENVIAR_MODALIDADES') {
    await sendWA(wa.wa_phone_id, wa.wa_token, phone, TEXTO_MODALIDADES);
    await saveTagMsg(TEXTO_MODALIDADES);
    return;
  }

  // ── ENVIAR_COTIZACION:VALOR ────────────────────────────────────────────────
  if (tag.startsWith('ENVIAR_COTIZACION:')) {
    const valor = parseFloat(tag.split(':')[1]);
    if (!valor || valor < 1000) return;
    // Usa la modalidad guardada; si no hay, genera las 3 cotizaciones
    const modalidad = context.modalidad || null;
    const cotizacion = generarCotizacion(valor, modalidad);
    await sendWA(wa.wa_phone_id, wa.wa_token, phone, cotizacion);
    await saveTagMsg(cotizacion);
    return;
  }

  // ── ENVIAR_BENEFICIOS ──────────────────────────────────────────────────────
  if (tag === 'ENVIAR_BENEFICIOS') {
    await sendWA(wa.wa_phone_id, wa.wa_token, phone, TEXTO_BENEFICIOS);
    await saveTagMsg(TEXTO_BENEFICIOS);
    return;
  }

  // ── ENVIAR_DIRECCION ───────────────────────────────────────────────────────
  if (tag === 'ENVIAR_DIRECCION') {
    await sendWA(wa.wa_phone_id, wa.wa_token, phone, TEXTO_DIRECCION);
    await saveTagMsg(TEXTO_DIRECCION);
    return;
  }

  // ── ENVIAR_CUENTA_PAGO ─────────────────────────────────────────────────────
  if (tag === 'ENVIAR_CUENTA_PAGO') {
    const smValor    = lead?.metadata?.sm_valor;
    const smModalidad = lead?.metadata?.sm_modalidad;
    const isMega     = smModalidad === 'mega_estrella';
    let activLine = null;
    if (smValor) {
      if (isMega) {
        const entrada = Math.round(Number(smValor) * 0.70).toLocaleString();
        activLine = `❇️ Valor de entrada (70%): *$${entrada}*`;
      } else {
        const base = Math.max(6000, Math.min(20000, Math.round(Number(smValor) / 1000) * 1000));
        const row  = TABLA[base];
        if (row?.tp) activLine = `❇️ Valor de activación de servicios: *$${row.tp.toFixed(2)}*`;
      }
    }
    const msg = buildTextoCuentaPago(activLine);
    await sendWA(wa.wa_phone_id, wa.wa_token, phone, msg);
    await saveTagMsg(msg);
    return;
  }

  // ── ENVIAR_ANTIFRAUDE ──────────────────────────────────────────────────────
  if (tag === 'ENVIAR_ANTIFRAUDE') {
    const msg = TEXTO_ANTIFRAUDE(lead?.nombre);
    await sendWA(wa.wa_phone_id, wa.wa_token, phone, msg);
    await saveTagMsg(msg);
    return;
  }

  // ── CATALOGO ───────────────────────────────────────────────────────────────
  if (tag.startsWith('CATALOGO:')) {
    // No reenviar el catálogo si ya fue enviado en esta conversación
    if (lead?.id) {
      const { rows: prev } = await pool.query(
        `SELECT 1 FROM bot_conversations
          WHERE lead_id=$1 AND direction='outbound'
            AND message_text LIKE '%drive.google.com%'
          LIMIT 1`,
        [lead.id]
      );
      if (prev.length) {
        console.log(`[tags] CATALOGO ya enviado a ${lead.nombre} — omitido para evitar bucle`);
        return;
      }
    }
    const msg = `Con gusto 📸 De clic en el siguiente link y podrá ver todos nuestros modelos disponibles:\n\nhttps://drive.google.com/drive/folders/1C9JZMIxEJDqFJLVS06VCLqxFQClhacM4?usp=drive_link\n\nRevíselos con calma y cuando encuentre el que le guste, indíqueme el valor del vehículo o el abono mensual que le acomoda y le genero la cotización de inmediato. ¿Cuál le llama la atención?`;
    await sendWA(wa.wa_phone_id, wa.wa_token, phone, msg);
    await saveTagMsg(msg);
    return;
  }

  // ── CEDULA:XXXXXXXXXX ─────────────────────────────────────────────────────
  if (tag.startsWith('CEDULA:')) {
    const cedula = (tag.split(':')[1] || '').replace(/\D/g, '').slice(0, 13);
    if (cedula.length >= 10 && lead?.id) {
      await pool.query('UPDATE leads SET cedula=$1, updated_at=NOW() WHERE id=$2', [cedula, lead.id]).catch(()=>{});
      console.log(`[tag] Cédula guardada: ${cedula} → lead ${lead.nombre} (${lead.id})`);
    }
    return;
  }

  // ── HANDOFF:* ──────────────────────────────────────────────────────────────
  if (tag.startsWith('HANDOFF:')) {
    const reason = tag.split(':')[1] || 'general';
    await executeHandoff(lead, companyId, reason, phone, app);
    return;
  }

  // ── FILTRO:NO_CALIFICADO ───────────────────────────────────────────────────
  if (tag === 'FILTRO:NO_CALIFICADO') {
    if (!lead?.id) return;
    const cleanPhone = phone.replace(/\D/g, '');
    await pool.query(
      `UPDATE leads SET nivel='frio', updated_at=NOW() WHERE id=$1`,
      [lead.id]
    );
    await pool.query(
      `UPDATE clients SET classification='no_info', updated_at=NOW()
       WHERE company_id=$1 AND (phone=$2 OR phone=$3)`,
      [companyId, cleanPhone, `+${cleanPhone}`]
    );
    console.log(`[tags] FILTRO:NO_CALIFICADO → lead ${lead.nombre}`);
    return;
  }
}

async function executeHandoff(lead, companyId, reason, phone, app) {
  if (!lead?.id) {
    console.warn('[tags] HANDOFF sin lead ID');
    return;
  }

  const nivelMap = {
    cliente_caliente:   'caliente',
    atencion_detallada: 'caliente',
    cita_agendada:      'caliente',
    fuera_alcance:      'tibio',
    multiples_imagenes: 'tibio',
    limite_imagenes:    'tibio',
    sin_interes:        'frio',
  };
  const nivel     = nivelMap[reason] || 'tibio';
  const cleanPhone = phone.replace(/\D/g, '');

  // Marcar lead como handoff y subir nivel
  await pool.query(
    `UPDATE leads
     SET handoff=TRUE, handoff_reason=$1, handoff_at=NOW(),
         nivel=$2, bot_score=GREATEST(COALESCE(bot_score,0), 70), updated_at=NOW()
     WHERE id=$3`,
    [reason, nivel, lead.id]
  );

  // Actualizar clasificación del cliente
  await pool.query(
    `UPDATE clients SET classification='interested', updated_at=NOW()
     WHERE company_id=$1 AND (phone=$2 OR phone=$3)`,
    [companyId, cleanPhone, `+${cleanPhone}`]
  );

  // Notificar al CRM en tiempo real
  if (app) {
    const io = app.get('io');
    if (io) {
      io.to(String(companyId)).emit('lead:handoff', {
        leadId:    lead.id,
        nombre:    lead.nombre,
        telefono:  lead.telefono,
        reason,
        nivel,
        timestamp: new Date().toISOString(),
      });
    }
  }

  console.log(`[tags] HANDOFF: lead ${lead.nombre} → ${reason} (nivel: ${nivel})`);

  // Notificar al asesor por WhatsApp
  notifyAdvisorHandoff(lead, phone, reason, companyId)
    .catch(e => console.error('[tags] Error notify HANDOFF:', e.message));
}

async function sendWAImage(wa, phone, imageUrl) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${wa.wa_phone_id}/messages`,
      {
        messaging_product: 'whatsapp',
        to:   phone.replace(/\D/g, ''),
        type: 'image',
        image: { link: imageUrl },
      },
      {
        headers: { Authorization: `Bearer ${wa.wa_token}`, 'Content-Type': 'application/json' },
        timeout: 8000,
      }
    );
  } catch (e) {
    console.error('[tags] Error enviando imagen catálogo:', e.response?.data || e.message);
  }
}

module.exports = { processTags };
