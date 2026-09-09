'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Borrar números para que el bot los atienda de nuevo
//
// Un número:   node delete_phone.js 0999000111
// Todos:       node delete_phone.js --all
// ─────────────────────────────────────────────────────────────────────────────
const { pool } = require('./config/db');

async function deletePhone(phone) {
  const clean = phone.replace(/\D/g, '');

  const { rows: leads } = await pool.query(
    `SELECT id, nombre, telefono FROM leads WHERE telefono=$1 OR telefono=$2 OR telefono=$3`,
    [clean, `+${clean}`, `593${clean.replace(/^0/, '')}`]
  );

  if (!leads.length) {
    console.log(`⚠️  No se encontró ningún lead con teléfono: ${phone}`);
    return;
  }

  for (const lead of leads) {
    const { rowCount: convDel } = await pool.query(
      `DELETE FROM bot_conversations WHERE lead_id=$1`, [lead.id]
    );
    await pool.query(
      `DELETE FROM assignments WHERE client_id=(
         SELECT id FROM clients WHERE phone=$1 OR phone=$2 OR phone=$3 LIMIT 1
       )`, [clean, `+${clean}`, `593${clean.replace(/^0/, '')}`]
    );
    await pool.query(
      `DELETE FROM bot_sessions WHERE phone=$1 OR phone=$2 OR phone=$3`,
      [clean, `+${clean}`, `593${clean.replace(/^0/, '')}`]
    );
    await pool.query(`DELETE FROM leads WHERE id=$1`, [lead.id]);
    const { rowCount: clientDel } = await pool.query(
      `DELETE FROM clients WHERE phone=$1 OR phone=$2 OR phone=$3`,
      [clean, `+${clean}`, `593${clean.replace(/^0/, '')}`]
    );

    console.log(`✅ Borrado: ${lead.nombre} (${lead.telefono})`);
    console.log(`   - ${convDel} mensaje(s) de bot eliminados`);
    console.log(`   - ${clientDel} cliente(s) eliminado(s)`);
  }
}

async function deleteAll() {
  // Contar antes de borrar
  const { rows: [{ total }] } = await pool.query(`SELECT COUNT(*) AS total FROM leads`);
  console.log(`\n🗑️  Borrando ${total} leads y todas sus conversaciones...\n`);

  const { rowCount: convDel }    = await pool.query(`DELETE FROM bot_conversations`);
  const { rowCount: sessionsDel } = await pool.query(`DELETE FROM bot_sessions`).catch(() => ({ rowCount: 0 }));
  const { rowCount: assignDel }  = await pool.query(`DELETE FROM assignments`);
  const { rowCount: clientDel }  = await pool.query(`DELETE FROM clients`);
  const { rowCount: leadsDel }   = await pool.query(`DELETE FROM leads`);

  console.log(`✅ Listo. Todo borrado:`);
  console.log(`   - ${leadsDel} leads`);
  console.log(`   - ${clientDel} clientes`);
  console.log(`   - ${convDel} mensajes de bot`);
  console.log(`   - ${assignDel} asignaciones`);
  console.log(`   - ${sessionsDel} sesiones\n`);
  console.log(`🤖 El bot atenderá a todos como nuevos cuando vuelvan a escribir.`);
}

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.error('\nUso:');
    console.error('  node delete_phone.js 0999000111   ← borrar un número');
    console.error('  node delete_phone.js --all        ← borrar todos\n');
    process.exit(1);
  }

  if (arg === '--all') {
    await deleteAll();
  } else {
    await deletePhone(arg);
  }

  await pool.end();
}

main().catch(e => { console.error('Error:', e.message); pool.end(); });
