// ── Test de notificación WhatsApp ─────────────────────────────────────────────
// Ejecutar en VPS2: node test-notify.js <telefono_asesor>
// Ejemplo:          node test-notify.js 0984123456
'use strict';
require('dotenv').config();

const { pool } = require('./config/db');

// ── normPhone (mismo que notifyService) ──────────────────────────────────────
function normPhone(p) {
  const r = (p || '').replace(/\D/g, '');
  if (r.startsWith('593')) return r;
  if (r.startsWith('0') && r.length === 10) return '593' + r.substring(1);
  if (r.length === 9) return '593' + r;
  return r;
}

async function runTest() {
  const telefonoArg = process.argv[2];
  if (!telefonoArg) {
    console.error('❌  Uso: node test-notify.js <telefono_asesor>');
    console.error('    Ej:  node test-notify.js 0984123456');
    process.exit(1);
  }

  const telefonoNorm = normPhone(telefonoArg);
  console.log(`\n📱 Teléfono ingresado : ${telefonoArg}`);
  console.log(`📱 Normalizado (593)  : ${telefonoNorm}`);

  // ── 1. Buscar asesor por teléfono ─────────────────────────────────────────
  console.log('\n🔍 Buscando asesor en la BD...');
  const { rows: users } = await pool.query(
    `SELECT id, name, phone, role, company_id FROM users
      WHERE replace(replace(replace(phone,'+',''),' ',''),'-','') = $1
         OR replace(replace(replace(phone,'+',''),' ',''),'-','') = $2
      LIMIT 1`,
    [telefonoNorm, telefonoArg.replace(/\D/g,'')]
  );

  if (!users[0]) {
    console.error(`❌  No se encontró ningún usuario con teléfono "${telefonoArg}" en la BD.`);
    console.error('    Verifica que el número esté registrado en el perfil del asesor/supervisor.');
    await pool.end(); process.exit(1);
  }

  const user = users[0];
  console.log(`✅  Asesor encontrado : ${user.name} (${user.role})`);
  console.log(`    company_id        : ${user.company_id}`);
  console.log(`    Teléfono en BD    : ${user.phone}`);

  // ── 2. Obtener credenciales WA de la empresa ──────────────────────────────
  console.log('\n🔍 Verificando credenciales WhatsApp de la empresa...');
  const { rows: companies } = await pool.query(
    `SELECT id, name, wa_phone_id,
            LEFT(wa_token, 12) || '...' AS wa_token_preview
       FROM companies WHERE id = $1`,
    [user.company_id]
  );

  if (!companies[0]) {
    console.error('❌  No se encontró la empresa del asesor.');
    await pool.end(); process.exit(1);
  }

  const co = companies[0];
  console.log(`✅  Empresa           : ${co.name}`);
  console.log(`    wa_phone_id       : ${co.wa_phone_id || '❌ VACÍO'}`);
  console.log(`    wa_token          : ${co.wa_token_preview || '❌ VACÍO'}`);

  if (!co.wa_phone_id || co.wa_token_preview === '...' || co.wa_token_preview.startsWith('❌')) {
    console.error('\n❌  La empresa no tiene credenciales WhatsApp configuradas.');
    console.error('    Configúralas desde el panel de SuperAdmin.');
    await pool.end(); process.exit(1);
  }

  // ── 3. Obtener token completo y enviar mensaje de prueba ──────────────────
  const { rows: fullCo } = await pool.query(
    `SELECT wa_phone_id, wa_token FROM companies WHERE id = $1`, [user.company_id]
  );
  const { wa_phone_id, wa_token } = fullCo[0];

  const axios = require('axios');
  const msg = [
    `🧪 *Prueba de notificación — CRM JISMART*`,
    ``,
    `✅ Hola ${user.name}, este es un mensaje de prueba.`,
    `Si ves esto, las notificaciones automáticas están funcionando correctamente.`,
    ``,
    `_Sistema CRM · ${new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}_`,
  ].join('\n');

  console.log(`\n📤 Enviando mensaje de prueba a ${telefonoNorm}...`);

  try {
    const resp = await axios.post(
      `https://graph.facebook.com/v19.0/${wa_phone_id}/messages`,
      {
        messaging_product: 'whatsapp',
        to:   telefonoNorm,
        type: 'text',
        text: { body: msg },
      },
      {
        headers: {
          Authorization: `Bearer ${wa_token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log(`✅  ¡Mensaje enviado exitosamente!`);
    console.log(`    message_id : ${resp.data?.messages?.[0]?.id}`);
    console.log(`\n👀 Revisa el WhatsApp de ${user.name} (${telefonoArg})`);
    console.log('   Si llegó → el sistema funciona correctamente.');
    console.log('   Si no llegó → el número no tiene conversación activa con el WA de la empresa.');

  } catch (err) {
    const errData = err.response?.data?.error;
    console.error(`\n❌  Error al enviar:`);
    if (errData) {
      console.error(`    Código    : ${errData.code}`);
      console.error(`    Mensaje   : ${errData.message}`);
      console.error(`    Subtipo   : ${errData.error_subcode || '—'}`);
      console.error(`    FbTraceId : ${errData.fbtrace_id || '—'}`);
    } else {
      console.error(`    ${err.message}`);
    }

    if (errData?.code === 131047) {
      console.error('\n⚠️  CAUSA: La ventana de 24h está cerrada.');
      console.error('   El asesor debe escribirle primero al número de la empresa en WhatsApp');
      console.error('   para abrir la ventana, o usa una plantilla aprobada por Meta.');
    } else if (errData?.code === 100 || errData?.message?.includes('phone')) {
      console.error('\n⚠️  CAUSA: Número de teléfono inválido para la API de Meta.');
      console.error(`   Se envió: ${telefonoNorm}`);
    }
  }

  await pool.end();
}

runTest().catch(err => {
  console.error('Error inesperado:', err.message);
  process.exit(1);
});
