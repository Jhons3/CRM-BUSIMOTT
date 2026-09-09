// =============================================
// CRM Sales — Webhook WhatsApp (Meta Cloud API)
// =============================================
'use strict';

const express  = require('express');
const crypto   = require('crypto');
const router   = express.Router();
const axios    = require('axios');
const FormData = require('form-data');
const { handleIncoming } = require('../services/botService');
const { runManual }      = require('../jobs/nightCron');
const { pool }           = require('../config/db');

// ══════════════════════════════════════════════════════════════════════════════
// PROTECCIÓN ANTI-FLOOD Y ANTI-ATAQUE
// ══════════════════════════════════════════════════════════════════════════════

// 1. FIRMA META — verifica que el request viene realmente de Meta (HMAC-SHA256)
//    Un atacante externo NO puede generar esta firma sin el App Secret de Meta.
function verifyMetaSignature(req) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return true; // si no está configurado, omitir verificación

  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return false;

  const rawBody = req.rawBody; // necesita express con rawBody habilitado
  if (!rawBody) return true;   // si no hay rawBody disponible, omitir

  const expected = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch { return false; }
}

// 2. RATE LIMIT GLOBAL — máximo 60 webhooks por minuto en total
//    Protege contra flood masivo (DDoS de mensajes)
const globalWindow = { count: 0, resetAt: Date.now() + 60000 };
function globalRateLimit() {
  const now = Date.now();
  if (now > globalWindow.resetAt) {
    globalWindow.count   = 0;
    globalWindow.resetAt = now + 60000;
  }
  globalWindow.count++;
  return globalWindow.count > 60; // más de 60/min → bloquear
}

// 3. RATE LIMIT POR TELÉFONO — máximo 5 mensajes por número por minuto
//    Evita que un solo número sature el sistema
const phoneWindows = new Map();
function phoneRateLimit(phone) {
  const now = Date.now();
  const w   = phoneWindows.get(phone) || { count: 0, resetAt: now + 60000 };
  if (now > w.resetAt) { w.count = 0; w.resetAt = now + 60000; }
  w.count++;
  phoneWindows.set(phone, w);
  // Limpiar entradas viejas cada 500 teléfonos
  if (phoneWindows.size > 500) {
    for (const [k, v] of phoneWindows)
      if (now > v.resetAt) phoneWindows.delete(k);
  }
  return w.count > 5; // más de 5 msg/min por número → bloquear
}

// 4. COLA PERSISTENTE — procesa hasta 15 clientes en paralelo
//    Si la cola supera 300 tareas pendientes descarta la nueva con aviso.
const msgQueue    = [];
let   processing  = 0;
const MAX_WORKERS = 15;
const MAX_QUEUE   = 300;

function enqueue(task) {
  if (msgQueue.length >= MAX_QUEUE) {
    console.warn(`[webhook] ⚠️  Cola llena (${msgQueue.length}) — descartando tarea`);
    return;
  }
  msgQueue.push(task);
  drainQueue();
}

async function drainQueue() {
  while (msgQueue.length > 0 && processing < MAX_WORKERS) {
    const task = msgQueue.shift();
    processing++;
    task().finally(() => {
      processing--;
      drainQueue();
    });
  }
}

// 5. DEBOUNCE INTELIGENTE POR CLIENTE
//    Espera 8s sin nuevo mensaje antes de procesar.
//    Simula "cliente dejó de escribir/grabar".
//    La API de Meta no expone el estado "escribiendo" del cliente,
//    pero 8s captura el 95% de los bursts de mensajes en WhatsApp.
//
//    Protección anti-colapso:
//    - Cada cliente tiene su propio timer independiente
//    - Lock por cliente: si ya se está procesando su mensaje anterior,
//      el nuevo espera en cola sin generar una segunda respuesta simultánea

const DEBOUNCE_MS    = 8_000; // 8 segundos sin nuevo mensaje → procesar
const pendingClients = new Map(); // timers de debounce  key: companyId:phone
const processingLock = new Set(); // clientes en proceso  key: companyId:phone

function debouncedEnqueue(snap) {
  const key = `${snap.companyId}:${snap.phone}`;

  // ✔✔ Azul inmediato — el cliente ve que fue leído
  if (snap.businessPhoneId && snap.waToken && snap.messageId) {
    markAsRead(snap.businessPhoneId, snap.waToken, snap.messageId).catch(() => {});
  }

  if (pendingClients.has(key)) {
    const pending = pendingClients.get(key);
    clearTimeout(pending.timer);
    if (snap.messageText) pending.parts.push(snap.messageText);
    if (snap.imageData && !pending.imageData) pending.imageData = snap.imageData;
    pending.lastSnap = snap;
  } else {
    pendingClients.set(key, {
      parts:     snap.messageText ? [snap.messageText] : [],
      imageData: snap.imageData || null,
      lastSnap:  snap,
      timer:     null,
    });
  }

  const pending = pendingClients.get(key);
  const count   = pending.parts.length;
  if (count > 1) console.log(`[webhook] ⏳ ${snap.name}: ${count} msgs acumulados`);

  pending.timer = setTimeout(() => {
    pendingClients.delete(key);

    // Si ya hay una respuesta en curso para este cliente, esperar 8s más
    if (processingLock.has(key)) {
      console.log(`[webhook] 🔒 ${snap.name}: en proceso — reintentando en 8s`);
      const retry = { ...pending.lastSnap, messageText: pending.parts.join('\n'), imageData: pending.imageData };
      setTimeout(() => debouncedEnqueue(retry), 8_000);
      return;
    }

    const combined = {
      ...pending.lastSnap,
      messageText: pending.parts.join('\n'),
      imageData:   pending.imageData,
    };
    console.log(`[webhook] 🚀 ${snap.name}: procesando ${count} msg(s) — cola:${msgQueue.length} workers:${processing}/${MAX_WORKERS}`);

    processingLock.add(key);
    enqueue(() =>
      handleIncoming(combined)
        .catch(e => console.error('[webhook] Error procesando:', e.message))
        .finally(() => processingLock.delete(key))
    );
  }, DEBOUNCE_MS);
}

let activeWebhooks = 0;

// ── Transcribir audio de WhatsApp con Groq Whisper (Key1 → Key2) ─────────────
async function transcribirAudio(mediaId, waToken) {
  // 1. Obtener URL del audio desde Meta
  const metaRes = await axios.get(
    `https://graph.facebook.com/v19.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${waToken}` }, timeout: 10000 }
  );
  const audioUrl = metaRes.data?.url;
  if (!audioUrl) throw new Error('URL de audio no disponible');

  // 2. Descargar el audio
  const audioRes = await axios.get(audioUrl, {
    headers: { Authorization: `Bearer ${waToken}` },
    responseType: 'arraybuffer',
    timeout: 15000,
  });

  const audioBuffer = Buffer.from(audioRes.data);

  // 3. Intentar con Key1 → Key2 en cascada
  const groqKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
  ].filter(Boolean);

  let lastError = null;
  for (let ki = 0; ki < groqKeys.length; ki++) {
    try {
      const form = new FormData();
      form.append('file', audioBuffer, { filename: 'audio.ogg', contentType: 'audio/ogg' });
      form.append('model', 'whisper-large-v3-turbo');
      form.append('language', 'es');
      form.append('response_format', 'text');

      const groqRes = await axios.post(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        form,
        {
          headers: { Authorization: `Bearer ${groqKeys[ki]}`, ...form.getHeaders() },
          timeout: 20000,
        }
      );

      const texto = (typeof groqRes.data === 'string' ? groqRes.data : groqRes.data?.text || '').trim();
      if (ki > 0) console.log(`[webhook] Audio transcrito con Groq Key${ki+1}`);
      return texto || '[Audio no entendible]';
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      if ((status === 429 || status === 413) && ki < groqKeys.length - 1) {
        console.warn(`[webhook] Groq Whisper Key${ki+1} agotada → probando Key${ki+2}`);
        continue;
      }
      break;
    }
  }

  console.error('[webhook] Groq Whisper falló en todas las keys:', lastError?.message);
  return '[No se pudo transcribir el audio]';
}

// ── GET /api/webhook — Verificación de Meta ──────────────────────────────────
router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'micrm2025secreto';

  console.log('[webhook] Verificación Meta:');
  console.log('  mode:', mode);
  console.log('  token recibido:', token);
  console.log('  token esperado:', VERIFY_TOKEN);
  console.log('  challenge:', challenge);

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ [webhook] Verificado correctamente');
    return res.status(200).send(challenge);
  }
  console.warn('❌ [webhook] Token no coincide');
  return res.sendStatus(403);
});

// ── Obtener imagen desde Meta y convertir a base64 ───────────────────────────
async function getMediaBase64(mediaId, token) {
  try {
    // Paso 1: obtener la URL real de la imagen
    const { data: mediaData } = await axios.get(
      `https://graph.facebook.com/v19.0/${mediaId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      }
    );
    const mediaUrl = mediaData.url;
    if (!mediaUrl) return null;

    // Paso 2: descargar la imagen como buffer
    const response = await axios.get(mediaUrl, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
      timeout: 15000,
    });

    // Paso 3: convertir a base64
    const base64 = Buffer.from(response.data).toString('base64');
    const mimeType = response.headers['content-type'] || 'image/jpeg';

    console.log(`[webhook] Imagen descargada: ${mimeType} (${Math.round(response.data.byteLength/1024)}KB)`);
    return { base64, mimeType };

  } catch (err) {
    console.error('[webhook] Error descargando imagen:', err.response?.data || err.message);
    return null;
  }
}

// ── POST /api/webhook — Mensajes entrantes ───────────────────────────────────
router.post('/', async (req, res) => {
  // Responder 200 inmediato a Meta (obligatorio — si tarda >20s Meta reintenta)
  res.sendStatus(200);

  // ── Capa 1: Firma Meta ──────────────────────────────────────────────────────
  if (!verifyMetaSignature(req)) {
    console.warn('[webhook] ⛔ Firma Meta inválida — request rechazado');
    return;
  }

  // ── Capa 2: Rate limit global ───────────────────────────────────────────────
  if (globalRateLimit()) {
    console.warn(`[webhook] ⛔ Flood global detectado (${globalWindow.count}/min) — descartado`);
    return;
  }

  activeWebhooks++;
  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;
        const value           = change.value;
        const metadata        = value.metadata;
        const businessPhoneId = metadata?.phone_number_id;

        const company = await getCompanyByPhoneId(businessPhoneId);
        if (!company) {
          console.warn(`[webhook] Sin empresa para phone_id: ${businessPhoneId}`);
          continue;
        }

        for (const message of value.messages || []) {
          const phone   = message.from;

          // ── Capa 4: Rate limit por teléfono ──────────────────────────────
          if (phoneRateLimit(phone)) {
            console.warn(`[webhook] ⛔ Flood del número ${phone} (>5 msg/min) — descartado`);
            continue;
          }
          const contact = value.contacts?.find(c => c.wa_id === phone);
          const name    = contact?.profile?.name || phone;

          // Detectar canal de origen desde referral de Meta
          // source_type posibles: 'ad', 'post', 'biz_profile', 'unknown'
          let canal = 'WhatsApp';
          const referral = message.referral;
          if (referral) {
            const sourceUrl  = referral.source_url  || '';
            const sourceType = referral.source_type || '';
            if (sourceUrl.includes('instagram') || sourceUrl.includes('ig.me')) {
              canal = 'Instagram';
            } else if (sourceUrl.includes('facebook') || sourceUrl.includes('fb.com') || sourceUrl.includes('fb.me')) {
              canal = 'Facebook';
            } else if (sourceUrl.includes('tiktok')) {
              canal = 'TikTok';
            } else {
              // Referral existe pero URL no identifica plataforma — viene de Meta (FB por defecto)
              canal = 'Facebook';
            }
            console.log(`[webhook] 📣 Referral detectado: ${canal} | type: ${sourceType} | URL: ${sourceUrl}`);
          }

          let messageText = '';
          let imageUrl    = null;

          if (message.type === 'text') {
            messageText = message.text?.body || '';

          } else if (message.type === 'image') {
            const mediaId = message.image?.id;
            messageText   = '[El cliente envió una imagen de un vehículo]';
            if (mediaId) {
              try {
                const imgData = await getMediaBase64(mediaId, company.wa_token);
                if (imgData) {
                  imageUrl    = imgData; // objeto {base64, mimeType}
                  messageText = '[El cliente envió una imagen de un vehículo para que identifiques el modelo]';
                  console.log(`[webhook] Imagen lista para Claude Vision de ${name}`);
                }
              } catch(e) {
                console.error('[webhook] Error procesando imagen:', e.message);
              }
            }

          } else if (message.type === 'audio') {
            const audioId = message.audio?.id;
            const groqDisponible = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_2;

            if (audioId && groqDisponible) {
              try {
                const transcripcion = await transcribirAudio(audioId, company.wa_token);

                // Si todas las keys fallaron → avisar al cliente y no pasar al bot
                if (transcripcion === '[No se pudo transcribir el audio]') {
                  console.warn(`[webhook] Audio sin transcripción (keys agotadas) — avisando a ${name}`);
                  try {
                    await axios.post(
                      `https://graph.facebook.com/v19.0/${businessPhoneId}/messages`,
                      { messaging_product: 'whatsapp', to: phone.replace(/\D/g,''),
                        type: 'text', text: { body: 'En este momento no logro escuchar su mensaje de voz.\n\n¿Podría escribir su consulta? Con gusto le atiendo.' } },
                      { headers: { Authorization: `Bearer ${company.wa_token}` }, timeout: 8000 }
                    );
                  } catch { /* silencioso */ }
                  continue;
                }

                messageText = transcripcion;
                console.log(`[webhook] 🎙️ Audio transcrito de ${name}: "${messageText.substring(0, 80)}"`);
              } catch (e) {
                console.error('[webhook] Error transcribiendo audio:', e.message);
                try {
                  await axios.post(
                    `https://graph.facebook.com/v19.0/${businessPhoneId}/messages`,
                    { messaging_product: 'whatsapp', to: phone.replace(/\D/g,''),
                      type: 'text', text: { body: 'En este momento no logro escuchar su mensaje de voz.\n\n¿Podría escribir su consulta? Con gusto le atiendo.' } },
                    { headers: { Authorization: `Bearer ${company.wa_token}` }, timeout: 8000 }
                  );
                } catch { /* silencioso */ }
                continue;
              }
            } else {
              // Sin keys de Groq configuradas
              try {
                await axios.post(
                  `https://graph.facebook.com/v19.0/${businessPhoneId}/messages`,
                  { messaging_product: 'whatsapp', to: phone.replace(/\D/g,''),
                    type: 'text', text: { body: 'En este momento no logro escuchar su mensaje de voz.\n\n¿Podría escribir su consulta? Con gusto le atiendo.' } },
                  { headers: { Authorization: `Bearer ${company.wa_token}` }, timeout: 8000 }
                );
              } catch { /* silencioso */ }
              continue;
            }

          } else if (message.type === 'document') {
            messageText = '[El cliente envió un documento.]';

          } else {
            continue;
          }

          console.log(`[webhook] 📩 ${name}: "${messageText.substring(0, 80)}"`);

          // Debounce 105s — acumula todos los mensajes del cliente antes de responder
          const snap = { phone, name, messageText, imageData: imageUrl,
                         messageId: message.id, companyId: company.id,
                         canal, app: req.app,
                         businessPhoneId, waToken: company.wa_token };
          debouncedEnqueue(snap);
        }
      }
    }
  } catch (err) {
    console.error('[webhook] Error:', err.message);
  } finally {
    activeWebhooks--;
  }
});

// ── POST /api/webhook/test — Prueba manual ───────────────────────────────────
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production')
    return res.status(403).json({ error: 'Solo en desarrollo' });

  const { phone, name, message, companyId } = req.body;
  if (!phone || !message || !companyId)
    return res.status(400).json({ error: 'Faltan: phone, message, companyId' });

  try {
    await handleIncoming({
      phone, name: name || phone, messageText: message,
      messageId: `test_${Date.now()}`, companyId, app: req.app,
    });
    res.json({ ok: true, message: 'Mensaje procesado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/webhook/trigger-cron ───────────────────────────────────────────
router.post('/trigger-cron', async (req, res) => {
  const expected = `Bearer ${process.env.ADMIN_SECRET || 'micrm2025secreto'}`;
  if (req.headers.authorization !== expected)
    return res.status(403).json({ error: 'No autorizado' });
  res.json({ ok: true, message: 'Proceso nocturno iniciado' });
  runManual(req.app).catch(e => console.error('[cron-manual]', e.message));
});

// ── GET /api/webhook/status ───────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.name, c.wa_phone_id, c.whatsapp_number,
             LEFT(c.wa_token, 15) || '...' AS token_preview,
             bc.bot_enabled, bc.hora_inicio, bc.hora_fin,
             bc.bot_name, bc.timezone
      FROM companies c
      LEFT JOIN bot_config bc ON bc.company_id = c.id
      LIMIT 5
    `);
    res.json({ ok: true, companies: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/webhook/bot-config/:companyId ────────────────────────────────────
router.get('/bot-config/:companyId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM bot_config WHERE company_id=$1',
      [req.params.companyId]
    );
    res.json(rows[0] || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /api/webhook/bot-config/:companyId ────────────────────────────────────
router.put('/bot-config/:companyId', async (req, res) => {
  const { bot_enabled, hora_inicio, hora_fin, timezone, bot_name, welcome_msg, score_threshold } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO bot_config (company_id,bot_enabled,hora_inicio,hora_fin,timezone,bot_name,welcome_msg,score_threshold,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      ON CONFLICT (company_id) DO UPDATE SET
        bot_enabled=$2, hora_inicio=$3, hora_fin=$4, timezone=$5,
        bot_name=$6, welcome_msg=$7, score_threshold=$8, updated_at=NOW()
      RETURNING *`,
      [req.params.companyId, bot_enabled ?? true, hora_inicio ?? 0,
       hora_fin ?? 23, timezone ?? 'America/Guayaquil',
       bot_name ?? 'Claudia', welcome_msg ?? '', score_threshold ?? 35]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/webhook/conversations/:leadId ────────────────────────────────────
router.get('/conversations/:leadId', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT direction, message_text, intent, score_delta, created_at
      FROM bot_conversations WHERE lead_id=$1 ORDER BY created_at ASC`,
      [req.params.leadId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getCompanyByPhoneId(phoneId) {
  if (!phoneId) return null;
  try {
    const { rows } = await pool.query(
      'SELECT id, name, wa_token FROM companies WHERE wa_phone_id=$1 LIMIT 1',
      [phoneId]
    );
    return rows[0] || null;
  } catch { return null; }
}

async function markAsRead(phoneId, token, messageId) {
  if (!phoneId || !token || !messageId) return;
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
    );
  } catch { /* silencioso */ }
}

module.exports = router;

