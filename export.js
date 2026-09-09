const express = require('express');
const router  = express.Router();
const { query } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { requireRole }   = require('../middleware/roles');

const isAdmin = [authMiddleware, requireRole('admin','supervisor','super_admin')];
const cid = req => req.user.companyId;

// Helper: convertir array de objetos a CSV
function toCSV(rows, columns) {
  if (!rows.length) return '';
  const headers = columns.map(c => c.label);
  const lines = [headers.join(',')];
  rows.forEach(row => {
    const line = columns.map(c => {
      let val = row[c.key] ?? '';
      // Escapar comas y comillas
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('\n') || val.includes('"')) val = `"${val}"`;
      return val;
    });
    lines.push(line.join(','));
  });
  return lines.join('\n');
}

// Helper: convertir a Excel simple (CSV con BOM para Excel)
function toExcelCSV(rows, columns) {
  return '\uFEFF' + toCSV(rows, columns); // BOM para que Excel detecte UTF-8
}

// GET /api/export/leads?format=csv|excel
router.get('/leads', ...isAdmin, async (req, res) => {
  try {
    const fmt = req.query.format || 'csv';
    const { rows } = await query(`
      SELECT
        l.nombre           AS "Nombre",
        l.telefono         AS "Telefono",
        l.email            AS "Email",
        l.nivel            AS "Nivel",
        l.score            AS "Score",
        l.canal            AS "Canal",
        u.name             AS "Asesor asignado",
        l.msg_bot          AS "Primer mensaje",
        TO_CHAR(l.created_at AT TIME ZONE 'America/Guayaquil', 'DD/MM/YYYY HH24:MI') AS "Fecha"
      FROM leads l
      LEFT JOIN users u ON u.id = l.advisor_id
      WHERE l.company_id = $1
      ORDER BY l.created_at DESC
    `, [cid(req)]);

    const columns = [
      {key:'Nombre',           label:'Nombre'},
      {key:'Telefono',         label:'Telefono'},
      {key:'Email',            label:'Email'},
      {key:'Nivel',            label:'Nivel'},
      {key:'Score',            label:'Score'},
      {key:'Canal',            label:'Canal'},
      {key:'Asesor asignado',  label:'Asesor asignado'},
      {key:'Primer mensaje',   label:'Primer mensaje bot'},
      {key:'Fecha',            label:'Fecha'},
    ];

    const csv = toExcelCSV(rows, columns);
    const filename = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch(err) {
    console.error('[export/leads]', err.message);
    res.status(500).json({ error: 'Error exportando leads' });
  }
});

// GET /api/export/clients?format=csv
router.get('/clients', ...isAdmin, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        c.name                                    AS "Nombre",
        c.phone                                   AS "Telefono",
        c.email                                   AS "Email",
        COALESCE(c.metadata->>'result','En proceso') AS "Estado",
        COALESCE(c.metadata->>'heat','tibio')     AS "Temperatura",
        u.name                                    AS "Asesor",
        TO_CHAR(c.created_at AT TIME ZONE 'America/Guayaquil','DD/MM/YYYY') AS "Fecha registro",
        TO_CHAR(c.last_contact AT TIME ZONE 'America/Guayaquil','DD/MM/YYYY') AS "Ultimo contacto"
      FROM clients c
      LEFT JOIN users u ON u.id = c.assigned_advisor_id
      WHERE c.company_id = $1
      ORDER BY c.created_at DESC
    `, [cid(req)]);

    const columns = [
      {key:'Nombre',          label:'Nombre'},
      {key:'Telefono',        label:'Telefono'},
      {key:'Email',           label:'Email'},
      {key:'Estado',          label:'Estado'},
      {key:'Temperatura',     label:'Temperatura'},
      {key:'Asesor',          label:'Asesor'},
      {key:'Fecha registro',  label:'Fecha registro'},
      {key:'Ultimo contacto', label:'Ultimo contacto'},
    ];

    const csv = toExcelCSV(rows, columns);
    const filename = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch(err) {
    res.status(500).json({ error: 'Error exportando clientes' });
  }
});

// GET /api/export/ventas?format=csv
router.get('/ventas', ...isAdmin, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        c.name                                         AS "Cliente",
        c.phone                                        AS "Telefono",
        u.name                                         AS "Asesor",
        COALESCE(c.metadata->>'saleAmount','0')        AS "Monto venta",
        COALESCE(c.metadata->>'product','Sin detalle') AS "Producto",
        TO_CHAR(c.updated_at AT TIME ZONE 'America/Guayaquil','DD/MM/YYYY') AS "Fecha cierre"
      FROM clients c
      LEFT JOIN users u ON u.id = c.assigned_advisor_id
      WHERE c.company_id = $1
        AND c.metadata->>'result' = 'won'
      ORDER BY c.updated_at DESC
    `, [cid(req)]);

    const columns = [
      {key:'Cliente',      label:'Cliente'},
      {key:'Telefono',     label:'Telefono'},
      {key:'Asesor',       label:'Asesor'},
      {key:'Monto venta',  label:'Monto venta ($)'},
      {key:'Producto',     label:'Producto/Plan'},
      {key:'Fecha cierre', label:'Fecha cierre'},
    ];

    const csv = toExcelCSV(rows, columns);
    const filename = `ventas_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch(err) {
    res.status(500).json({ error: 'Error exportando ventas' });
  }
});

// GET /api/export/equipo?format=csv
router.get('/equipo', ...isAdmin, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        u.name    AS "Asesor",
        u.email   AS "Email",
        u.role    AS "Rol",
        COUNT(DISTINCT l.id)                                           AS "Leads asignados",
        COUNT(DISTINCT c.id)                                           AS "Clientes",
        COUNT(DISTINCT c.id) FILTER (WHERE c.metadata->>'result'='won') AS "Ventas cerradas",
        u.status  AS "Estado"
      FROM users u
      LEFT JOIN leads l   ON l.advisor_id = u.id
      LEFT JOIN clients c ON c.assigned_advisor_id = u.id
      WHERE u.company_id = $1
        AND u.role IN ('advisor','asesor','supervisor')
      GROUP BY u.id, u.name, u.email, u.role, u.status
      ORDER BY "Ventas cerradas" DESC
    `, [cid(req)]);

    const columns = [
      {key:'Asesor',           label:'Asesor'},
      {key:'Email',            label:'Email'},
      {key:'Rol',              label:'Rol'},
      {key:'Leads asignados',  label:'Leads asignados'},
      {key:'Clientes',         label:'Clientes'},
      {key:'Ventas cerradas',  label:'Ventas cerradas'},
      {key:'Estado',           label:'Estado'},
    ];

    const csv = toExcelCSV(rows, columns);
    const filename = `equipo_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch(err) {
    res.status(500).json({ error: 'Error exportando equipo' });
  }
});

// GET /api/export/reporte-ventas — reporte completo de ventas con resumen
router.get('/reporte-ventas', ...isAdmin, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const fechaDesde = desde || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const fechaHasta = hasta || new Date().toISOString().split('T')[0];

    const { rows: ventas } = await query(`
      SELECT
        c.name                                         AS "Cliente",
        c.phone                                        AS "Telefono",
        u.name                                         AS "Asesor",
        COALESCE(c.metadata->>'saleAmount','0')        AS "Monto",
        COALESCE(c.metadata->>'product','Sin detalle') AS "Producto",
        COALESCE(l.canal,'WhatsApp')                   AS "Canal",
        TO_CHAR(c.updated_at AT TIME ZONE 'America/Guayaquil','DD/MM/YYYY') AS "Fecha cierre"
      FROM clients c
      LEFT JOIN users u ON u.id = c.assigned_advisor_id
      LEFT JOIN leads l ON l.telefono = c.phone AND l.company_id = c.company_id
      WHERE c.company_id = $1
        AND c.metadata->>'result' = 'won'
        AND DATE(c.updated_at AT TIME ZONE 'America/Guayaquil') BETWEEN $2 AND $3
      ORDER BY c.updated_at DESC
    `, [cid(req), fechaDesde, fechaHasta]);

    // Resumen por asesor
    const { rows: porAsesor } = await query(`
      SELECT
        u.name AS asesor,
        COUNT(*)::int AS ventas,
        COALESCE(SUM((c.metadata->>'saleAmount')::numeric),0)::numeric AS total
      FROM clients c
      LEFT JOIN users u ON u.id = c.assigned_advisor_id
      WHERE c.company_id = $1
        AND c.metadata->>'result' = 'won'
        AND DATE(c.updated_at AT TIME ZONE 'America/Guayaquil') BETWEEN $2 AND $3
      GROUP BY u.name ORDER BY ventas DESC
    `, [cid(req), fechaDesde, fechaHasta]);

    // Resumen por canal
    const { rows: porCanal } = await query(`
      SELECT
        COALESCE(l.canal,'WhatsApp') AS canal,
        COUNT(*)::int AS ventas
      FROM clients c
      LEFT JOIN leads l ON l.telefono = c.phone AND l.company_id = c.company_id
      WHERE c.company_id = $1
        AND c.metadata->>'result' = 'won'
        AND DATE(c.updated_at AT TIME ZONE 'America/Guayaquil') BETWEEN $2 AND $3
      GROUP BY canal ORDER BY ventas DESC
    `, [cid(req), fechaDesde, fechaHasta]);

    const totalVentas = ventas.length;
    const totalMonto  = ventas.reduce((s,v)=>s+(parseFloat(v['Monto'])||0),0);

    // Construir CSV con secciones
    const bom = '\uFEFF';
    let csv = bom;

    csv += `REPORTE DE VENTAS,,,,,\n`;
    csv += `Período,${fechaDesde} al ${fechaHasta},,,,\n`;
    csv += `Total ventas,${totalVentas},,,,\n`;
    csv += `Monto total,$${totalMonto.toFixed(2)},,,,\n`;
    csv += `\n`;

    csv += `POR ASESOR,,,\n`;
    csv += `Asesor,Ventas,Monto total\n`;
    porAsesor.forEach(a => {
      csv += `${a.asesor},${a.ventas},$${parseFloat(a.total).toFixed(2)}\n`;
    });
    csv += `\n`;

    csv += `POR CANAL,\n`;
    csv += `Canal,Ventas\n`;
    porCanal.forEach(c => {
      csv += `${c.canal},${c.ventas}\n`;
    });
    csv += `\n`;

    csv += `DETALLE DE VENTAS,,,,,\n`;
    csv += `Cliente,Telefono,Asesor,Monto,Producto,Canal,Fecha cierre\n`;
    ventas.forEach(v => {
      csv += `${v['Cliente']},${v['Telefono']},${v['Asesor']},$${parseFloat(v['Monto']||0).toFixed(2)},${v['Producto']},${v['Canal']},${v['Fecha cierre']}\n`;
    });

    const filename = `reporte_ventas_${fechaDesde}_${fechaHasta}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch(err) {
    console.error('[export/reporte-ventas]', err.message);
    res.status(500).json({ error: 'Error generando reporte' });
  }
});


// GET /api/export/mis-leads — Asesor: sus propios leads
router.get('/mis-leads', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        l.nombre   AS "Nombre",
        l.telefono AS "Telefono",
        l.nivel    AS "Nivel",
        l.score    AS "Score",
        COALESCE(l.canal,'WhatsApp') AS "Canal",
        TO_CHAR(l.created_at AT TIME ZONE 'America/Guayaquil','DD/MM/YYYY HH24:MI') AS "Fecha"
      FROM leads l
      WHERE l.company_id=$1 AND l.advisor_id=$2
      ORDER BY l.created_at DESC
    `, [req.user.companyId, req.user.id]);

    const columns = [
      {key:'Nombre',label:'Nombre'},{key:'Telefono',label:'Telefono'},
      {key:'Nivel',label:'Nivel'},{key:'Score',label:'Score'},
      {key:'Canal',label:'Canal'},{key:'Fecha',label:'Fecha'},
    ];
    const csv = toExcelCSV(rows, columns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mis_leads_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch(err) { res.status(500).json({ error:'Error exportando' }); }
});

// GET /api/export/mis-clientes — para asesor y supervisor (sus propios clientes)
router.get('/mis-clientes', [authMiddleware, requireRole('advisor','asesor','supervisor','admin','super_admin')], async (req, res) => {
  try {
    const uid = req.user.id;
    const role = req.user.role;
    // Admin/super_admin ve todos, asesor/supervisor ve los suyos
    const whereAdvisor = (role==='admin'||role==='super_admin') ? '' : 'AND c.assigned_advisor_id=$2';
    const params = (role==='admin'||role==='super_admin') ? [cid(req)] : [cid(req), uid];

    const { rows } = await query(`
      SELECT
        c.name           AS "Nombre",
        c.phone          AS "Telefono",
        c.email          AS "Email",
        COALESCE(c.metadata->>'result','En proceso') AS "Estado",
        COALESCE(c.metadata->>'heat','tibio')         AS "Temperatura",
        u.name                                         AS "Asesor",
        TO_CHAR(c.created_at AT TIME ZONE 'America/Guayaquil','DD/MM/YYYY') AS "Fecha registro"
      FROM clients c
      LEFT JOIN users u ON u.id = c.assigned_advisor_id
      WHERE c.company_id=$1 ${whereAdvisor}
      ORDER BY c.created_at DESC
    `, params);

    const columns = [
      {key:'Nombre',label:'Nombre'},{key:'Telefono',label:'Telefono'},
      {key:'Email',label:'Email'},{key:'Estado',label:'Estado'},
      {key:'Temperatura',label:'Temperatura'},{key:'Asesor',label:'Asesor'},
      {key:'Fecha registro',label:'Fecha registro'},
    ];

    let csv = '\uFEFF' + columns.map(c=>c.label).join(',') + '\n';
    rows.forEach(r => {
      csv += columns.map(c => {
        let v = String(r[c.key]||'').replace(/"/g,'""');
        if(v.includes(',')) v = `"${v}"`;
        return v;
      }).join(',') + '\n';
    });

    const filename = `mis_clientes_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
    res.send(csv);
  } catch(err) { res.status(500).json({ error:'Error exportando' }); }
});

module.exports = router;
