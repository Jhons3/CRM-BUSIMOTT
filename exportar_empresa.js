'use strict';

/**
 * Exportar datos completos de una empresa
 * Uso: node exportar_empresa.js "NOMBRE DE LA EMPRESA"
 *      node exportar_empresa.js "a9575932-01c0-4340-aac1-b47491d1035b"
 *
 * Genera dos carpetas dentro de exports/<empresa>/:
 *   /csv/  — un archivo .csv por tabla
 *   empresa_completa.sql — script SQL listo para importar en otra BD
 */

const { Pool } = require('pg');
const fs        = require('fs');
const path      = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'crm_sales',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
});

// ── Orden de tablas respetando foreign keys ───────────────────────────────────
// messages no tiene company_id directo → se exporta via JOIN con conversations
const TABLAS = [
  { name: 'companies',         filter: 'WHERE id = $1' },
  { name: 'users',             filter: 'WHERE company_id = $1' },
  { name: 'bot_config',        filter: 'WHERE company_id = $1' },
  { name: 'bots',              filter: 'WHERE company_id = $1' },
  { name: 'employees',         filter: 'WHERE company_id = $1' },
  { name: 'leads',             filter: 'WHERE company_id = $1' },
  { name: 'clients',           filter: 'WHERE company_id = $1' },
  { name: 'conversations',     filter: 'WHERE company_id = $1' },
  {
    name: 'messages',
    filter: `WHERE conversation_id IN
               (SELECT id FROM conversations WHERE company_id = $1)`,
  },
  { name: 'bot_conversations', filter: 'WHERE company_id = $1' },
  { name: 'bot_sessions',      filter: 'WHERE company_id = $1' },
  { name: 'bot_activity',      filter: 'WHERE company_id = $1' },
  { name: 'activities',        filter: 'WHERE company_id = $1' },
  { name: 'assignments',       filter: 'WHERE company_id = $1' },
  { name: 'calendar_events',   filter: 'WHERE company_id = $1' },
  { name: 'internal_messages', filter: 'WHERE company_id = $1' },
  { name: 'notifications',     filter: 'WHERE company_id = $1' },
  { name: 'payments',          filter: 'WHERE company_id = $1' },
  { name: 'audit_log',         filter: 'WHERE company_id = $1' },
];

// ── Utilidades ────────────────────────────────────────────────────────────────
function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function rowsToCsv(columns, rows) {
  const header = columns.join(',');
  const lines  = rows.map(row =>
    columns.map(c => escapeCsv(row[c])).join(',')
  );
  return [header, ...lines].join('\n');
}

function escapeSQL(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function rowsToInserts(tableName, columns, rows) {
  if (rows.length === 0) return `-- (sin registros en ${tableName})\n`;
  const cols = columns.join(', ');
  const inserts = rows.map(row => {
    const vals = columns.map(c => escapeSQL(row[c])).join(', ');
    return `INSERT INTO ${tableName} (${cols}) VALUES (${vals});`;
  });
  return inserts.join('\n');
}

// ── Resolución de empresa ─────────────────────────────────────────────────────
async function resolveCompany(arg) {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let row;
  if (uuidRe.test(arg)) {
    const r = await pool.query('SELECT id, name FROM companies WHERE id = $1', [arg]);
    row = r.rows[0];
  } else {
    const r = await pool.query(
      'SELECT id, name FROM companies WHERE LOWER(name) LIKE LOWER($1)',
      [`%${arg}%`]
    );
    if (r.rows.length > 1) {
      console.log('Empresas encontradas:');
      r.rows.forEach(e => console.log(` - ${e.name}  (${e.id})`));
      console.log('Ejecuta el script con el UUID exacto.');
      process.exit(1);
    }
    row = r.rows[0];
  }
  if (!row) {
    console.error(`ERROR: No se encontró la empresa "${arg}"`);
    process.exit(1);
  }
  return row;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.log('Uso: node exportar_empresa.js "NOMBRE O UUID DE LA EMPRESA"');
    console.log('');
    const { rows } = await pool.query('SELECT id, name, plan FROM companies ORDER BY name');
    console.log('Empresas disponibles:');
    rows.forEach(e => console.log(`  ${e.name.padEnd(30)} ${e.id}  [${e.plan}]`));
    await pool.end();
    return;
  }

  const empresa = await resolveCompany(arg);
  console.log(`\nEmpresa: ${empresa.name}`);
  console.log(`UUID:    ${empresa.id}`);
  console.log('');

  // Crear carpetas de salida
  const safeName  = empresa.name.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 40);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const outDir    = path.join(__dirname, '..', '..', 'exports', `${safeName}_${timestamp}`);
  const csvDir    = path.join(outDir, 'csv');
  fs.mkdirSync(csvDir, { recursive: true });

  const sqlParts = [];

  // Cabecera del archivo SQL
  sqlParts.push(`-- ============================================================`);
  sqlParts.push(`-- Exportación de empresa: ${empresa.name}`);
  sqlParts.push(`-- UUID: ${empresa.id}`);
  sqlParts.push(`-- Fecha: ${new Date().toLocaleString('es-EC')}`);
  sqlParts.push(`-- Base origen: crm_sales (PostgreSQL 17)`);
  sqlParts.push(`-- ============================================================`);
  sqlParts.push('');
  sqlParts.push('BEGIN;');
  sqlParts.push('');

  let totalRegistros = 0;

  for (const tabla of TABLAS) {
    const query = `SELECT * FROM ${tabla.name} ${tabla.filter}`;
    const { rows, fields } = await pool.query(query, [empresa.id]);
    const columns = fields.map(f => f.name);

    console.log(`  ${tabla.name.padEnd(20)} ${rows.length} registros`);
    totalRegistros += rows.length;

    // ── CSV ────────────────────────────────────────────────────────────────
    const csvContent = rowsToCsv(columns, rows);
    fs.writeFileSync(path.join(csvDir, `${tabla.name}.csv`), csvContent, 'utf8');

    // ── SQL ────────────────────────────────────────────────────────────────
    sqlParts.push(`-- ── Tabla: ${tabla.name} (${rows.length} registros) ──`);
    sqlParts.push(rowsToInserts(tabla.name, columns, rows));
    sqlParts.push('');
  }

  sqlParts.push('COMMIT;');
  sqlParts.push('');
  sqlParts.push(`-- Fin de exportación: ${empresa.name} — ${totalRegistros} registros totales`);

  // Guardar SQL
  const sqlPath = path.join(outDir, `${safeName}_completo.sql`);
  fs.writeFileSync(sqlPath, sqlParts.join('\n'), 'utf8');

  // Guardar resumen
  const resumen = {
    empresa:    empresa.name,
    uuid:       empresa.id,
    exportado:  new Date().toISOString(),
    total_registros: totalRegistros,
    archivos_csv: TABLAS.map(t => `csv/${t.name}.csv`),
    archivo_sql: `${safeName}_completo.sql`,
  };
  fs.writeFileSync(
    path.join(outDir, 'RESUMEN.json'),
    JSON.stringify(resumen, null, 2),
    'utf8'
  );

  await pool.end();

  console.log('');
  console.log('━'.repeat(55));
  console.log(`Exportación completada — ${totalRegistros} registros totales`);
  console.log(`Carpeta:  ${outDir}`);
  console.log(`CSV:      ${TABLAS.length} archivos en /csv/`);
  console.log(`SQL:      ${safeName}_completo.sql`);
  console.log('━'.repeat(55));
}

main().catch(err => {
  console.error('ERROR FATAL:', err.message);
  process.exit(1);
});
