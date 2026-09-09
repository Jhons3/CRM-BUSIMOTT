'use strict';

const path = require('path');
const fs   = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ShadingType, PageBreak, Header, Footer,
} = require('docx');

// ── Colores ──────────────────────────────────────────────────────────────────
const AZUL   = '4472C4';
const AZUL_L = 'D6E4F7';
const BLANCO = 'FFFFFF';
const VERDE  = '375623';
const GRIS   = '808080';

// ── Helpers ───────────────────────────────────────────────────────────────────
function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 120 } });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } });
}
function h3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 60 } });
}
function normal(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 100 },
  });
}
function bullet(text) {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 60 },
  });
}
function pgbreak() {
  return new Paragraph({ children: [new PageBreak()] });
}
function codeBlock(text) {
  const lines = text.split('\n');
  return lines.map(line =>
    new Paragraph({
      children: [new TextRun({ text: line, font: 'Courier New', size: 18 })],
      spacing: { before: 0, after: 0 },
      shading: { type: ShadingType.SOLID, color: 'F2F2F2' },
      indent: { left: 360 },
    })
  );
}

// ── Tabla con encabezado azul ──────────────────────────────────────────────
function buildTable(headers, rows) {
  const colWidths = headers.map(() => Math.floor(9000 / headers.length));
  const headerRow = new TableRow({
    children: headers.map((h, i) =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, color: BLANCO, size: 20 })],
        })],
        shading: { type: ShadingType.SOLID, color: AZUL },
        width: { size: colWidths[i], type: WidthType.DXA },
      })
    ),
    tableHeader: true,
  });

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map((cell, ci) =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: String(cell), size: 18 })],
          })],
          shading: ri % 2 === 1 ? { type: ShadingType.SOLID, color: AZUL_L } : undefined,
          width: { size: colWidths[ci], type: WidthType.DXA },
        })
      ),
    })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 9000, type: WidthType.DXA },
  });
}

// ── DOCUMENTO ─────────────────────────────────────────────────────────────────
const children = [];

// PORTADA
children.push(
  new Paragraph({
    children: [new TextRun({ text: 'DOCUMENTACIÓN DEL SISTEMA CRM SALES', bold: true, size: 52, color: AZUL })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 2000, after: 400 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Base de Datos y Gestión de Empresas', size: 36, color: GRIS })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Versión 1.0  —  Junio 2025', size: 24, color: GRIS })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Uso interno — Confidencial', size: 24, color: GRIS, italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }),
  pgbreak(),
);

// CONTENIDO
children.push(h1('CONTENIDO'));
[
  '1. Arquitectura General',
  '2. Tablas Principales',
  '3. Planes Disponibles',
  '4. Credenciales de Base de Datos',
  '5. Cómo Agregar una Empresa Nueva',
  '6. Cómo Agregar Usuarios a una Empresa',
  '7. Cómo Suspender o Eliminar una Empresa',
  '8. Consultas Útiles de Administración',
  '9. Seguridad de la Base de Datos',
  '10. Respaldo de la Base de Datos',
].forEach(t => children.push(bullet(t)));
children.push(pgbreak());

// 1. ARQUITECTURA
children.push(h1('1. ARQUITECTURA GENERAL'));
children.push(normal('El CRM utiliza una arquitectura multi-empresa en una sola base de datos. Todas las empresas comparten las mismas 19 tablas, pero cada registro tiene un campo company_id que lo aísla. Una empresa nunca puede ver ni acceder a los datos de otra.'));
children.push(h2('Estructura de Tablas'));
children.push(buildTable(
  ['Tabla', 'Descripción'],
  [
    ['companies',         'Registro de cada empresa cliente'],
    ['users',             'Todos los usuarios de todas las empresas'],
    ['leads',             'Prospectos por empresa'],
    ['clients',           'Clientes convertidos por empresa'],
    ['conversations',     'Conversaciones por empresa'],
    ['messages',          'Mensajes de cada conversación'],
    ['bot_config',        'Configuración del bot por empresa'],
    ['bot_conversations', 'Historial del bot por empresa'],
    ['bot_sessions',      'Sesiones activas del bot'],
    ['bot_activity',      'Registro de actividad del bot'],
    ['bots',              'Configuración avanzada de bots'],
    ['activities',        'Actividades y seguimiento por empresa'],
    ['assignments',       'Asignaciones de leads a asesores'],
    ['calendar_events',   'Eventos del calendario por empresa'],
    ['internal_messages', 'Mensajes internos entre usuarios'],
    ['notifications',     'Notificaciones por usuario'],
    ['payments',          'Pagos registrados por empresa'],
    ['employees',         'Empleados por empresa'],
    ['audit_log',         'Registro de auditoría'],
  ]
));
children.push(normal(''));
children.push(h2('Cómo funciona el aislamiento por empresa'));
children.push(normal('Cada consulta del backend filtra automáticamente por company_id del usuario autenticado. Es imposible que una empresa vea datos de otra.'));
children.push(...codeBlock(
`EMPRESA A (company_id = aaa-111-...)       EMPRESA B (company_id = bbb-222-...)
leads   WHERE company_id = aaa-111-...     leads   WHERE company_id = bbb-222-...
clients WHERE company_id = aaa-111-...     clients WHERE company_id = bbb-222-...
users   WHERE company_id = aaa-111-...     users   WHERE company_id = bbb-222-...`
));
children.push(normal(''));
children.push(pgbreak());

// 2. TABLAS PRINCIPALES
children.push(h1('2. TABLAS PRINCIPALES'));

children.push(h2('Tabla: companies (Empresas registradas)'));
children.push(buildTable(
  ['Campo', 'Tipo', 'Descripción'],
  [
    ['id',              'UUID',    'Identificador único generado automáticamente'],
    ['name',            'VARCHAR', 'Nombre de la empresa'],
    ['plan',            'VARCHAR', 'Plan contratado: starter, growth o enterprise'],
    ['status',          'VARCHAR', 'Estado: active o suspended'],
    ['contact_name',    'VARCHAR', 'Nombre del contacto principal'],
    ['contact_email',   'VARCHAR', 'Email del contacto'],
    ['contact_phone',   'VARCHAR', 'Teléfono del contacto'],
    ['city',            'VARCHAR', 'Ciudad de la empresa'],
    ['max_advisors',    'INT',     'Máximo de asesores permitidos según plan'],
    ['max_supervisors', 'INT',     'Máximo de supervisores permitidos'],
    ['bot_enabled',     'BOOL',    'Si el bot de WhatsApp está activo'],
    ['wa_phone_id',     'VARCHAR', 'ID del número de WhatsApp (Meta Cloud API)'],
    ['wa_token',        'TEXT',    'Token de acceso WhatsApp (Meta Cloud API)'],
    ['monthly_fee',     'DECIMAL', 'Tarifa mensual cobrada en USD'],
    ['next_payment',    'DATE',    'Fecha del próximo pago'],
    ['primary_color',   'VARCHAR', 'Color primario del CRM (personalización)'],
    ['logo_url',        'TEXT',    'URL del logo de la empresa'],
    ['bot_prompt',      'TEXT',    'Prompt personalizado del bot (opcional)'],
    ['product_info',    'TEXT',    'Información de productos para el bot'],
  ]
));
children.push(normal(''));

children.push(h2('Tabla: users (Usuarios del sistema)'));
children.push(buildTable(
  ['Campo', 'Tipo', 'Descripción'],
  [
    ['id',                    'UUID',    'Identificador único'],
    ['company_id',            'UUID',    'A qué empresa pertenece (FK)'],
    ['name',                  'VARCHAR', 'Nombre completo del usuario'],
    ['email',                 'VARCHAR', 'Email único en todo el sistema'],
    ['password_hash',         'VARCHAR', 'Contraseña encriptada con bcrypt'],
    ['role',                  'VARCHAR', 'Rol: super_admin, admin, supervisor, advisor'],
    ['status',                'VARCHAR', 'Estado: active, inactive, suspended'],
    ['force_password_change', 'BOOL',    'Si debe cambiar contraseña al entrar'],
  ]
));
children.push(normal(''));

children.push(h2('Roles disponibles'));
children.push(buildTable(
  ['Rol', 'Acceso'],
  [
    ['super_admin',    'Acceso total a todas las empresas (el dueño del CRM)'],
    ['admin',          'Acceso total a su propia empresa'],
    ['supervisor',     'Gestiona asesores y también puede atender leads'],
    ['advisor/asesor', 'Atiende los leads y clientes que le son asignados'],
  ]
));
children.push(normal(''));

children.push(h2('Tabla: bot_config (Configuración del bot)'));
children.push(buildTable(
  ['Campo', 'Tipo', 'Descripción'],
  [
    ['company_id',         'UUID',   'A qué empresa pertenece (FK)'],
    ['bot_enabled',        'BOOL',   'Si el bot está encendido'],
    ['timezone',           'VARCHAR','Zona horaria (ej: America/Guayaquil)'],
    ['hora_inicio',        'INT',    'Hora de inicio del bot en formato 24h'],
    ['hora_fin',           'INT',    'Hora de fin del bot en formato 24h'],
    ['score_threshold',    'INT',    'Puntaje mínimo para lead caliente'],
    ['monthly_input_tok',  'BIGINT', 'Tokens de entrada usados este mes'],
    ['monthly_output_tok', 'BIGINT', 'Tokens de salida usados este mes'],
  ]
));
children.push(normal(''));
children.push(pgbreak());

// 3. PLANES
children.push(h1('3. PLANES DISPONIBLES'));
children.push(buildTable(
  ['Plan', 'Max Asesores', 'Max Supervisores', 'Características'],
  [
    ['starter',    '5',         '1',         'Bot + CRM básico'],
    ['growth',     '15',        '3',         'Bot + CRM completo'],
    ['enterprise', 'Ilimitado', 'Ilimitado', 'Todo + personalización de marca'],
  ]
));
children.push(normal(''));
children.push(pgbreak());

// 4. CREDENCIALES
children.push(h1('4. CREDENCIALES DE BASE DE DATOS'));
children.push(...codeBlock(
`Host:     localhost  (solo acceso local, aislado de internet)
Puerto:   5432
Base:     crm_sales

-- Para la APLICACION (usar en .env de produccion):
Usuario:  crm_app
Password: CrmApp2025SecureKey

-- Solo para MANTENIMIENTO y administracion directa:
Usuario:  postgres
Password: 1234  <-- cambiar antes de subir a produccion en VPS`
));
children.push(normal(''));
children.push(normal('IMPORTANTE: Nunca uses el usuario postgres en el archivo .env de producción. El usuario crm_app tiene solo los permisos que la aplicación necesita (SELECT, INSERT, UPDATE, DELETE). No puede borrar tablas ni crear objetos nuevos, lo que protege la base de datos ante ataques de inyección SQL.', { bold: false }));
children.push(pgbreak());

// 5. AGREGAR EMPRESA
children.push(h1('5. CÓMO AGREGAR UNA EMPRESA NUEVA'));

children.push(h2('Método 1: Desde el panel Super Admin (recomendado)'));
[
  'Entra al CRM con tu cuenta super_admin.',
  'Ve al panel Super Admin.',
  'Sección Empresas → botón Nueva Empresa.',
  'Completa el formulario y guarda.',
  'El sistema crea automáticamente la empresa y el usuario admin.',
].forEach(t => children.push(bullet(t)));

children.push(h2('Método 2: Por SQL (control total)'));
children.push(normal('Abre PowerShell y conéctate a la base de datos:'));
children.push(...codeBlock(
`$env:PGPASSWORD='1234'
psql -U postgres -d crm_sales`
));
children.push(normal(''));

children.push(h3('PASO 1: Crear la empresa'));
children.push(...codeBlock(
`INSERT INTO companies (
  name, plan, status,
  contact_name, contact_email, contact_phone, city,
  max_advisors, max_supervisors,
  bot_enabled, monthly_fee, next_payment
) VALUES (
  'NOMBRE DE LA EMPRESA',
  'starter',          -- starter | growth | enterprise
  'active',
  'Nombre del Contacto',
  'email@empresa.com',
  '0999999999',
  'Quito',
  5,                  -- max asesores segun plan
  1,                  -- max supervisores segun plan
  false,              -- true si va a usar bot WhatsApp
  150.00,             -- tarifa mensual en USD
  CURRENT_DATE + INTERVAL '30 days'
)
RETURNING id, name;
-- Copia el UUID que devuelve este comando`
));
children.push(normal(''));

children.push(h3('PASO 2: Crear el usuario administrador de la empresa'));
children.push(normal('Reemplaza COMPANY_UUID con el id obtenido en el Paso 1.'));
children.push(...codeBlock(
`INSERT INTO users (
  company_id, name, email, password_hash,
  role, status, force_password_change
) VALUES (
  'COMPANY_UUID',
  'Nombre del Admin',
  'admin@empresa.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin', 'active', true
);
-- La contrasena por defecto es: password
-- El usuario DEBE cambiarla en el primer login`
));
children.push(normal(''));

children.push(h3('PASO 3: Crear configuración del bot'));
children.push(...codeBlock(
`INSERT INTO bot_config (
  company_id, bot_enabled, timezone,
  hora_inicio, hora_fin, score_threshold
) VALUES (
  'COMPANY_UUID',
  false,               -- false hasta que configuren WhatsApp
  'America/Guayaquil',
  9,                   -- bot activo desde las 9am
  18,                  -- bot activo hasta las 6pm
  35
);`
));
children.push(normal(''));

children.push(h3('PASO 4: Activar WhatsApp (si la empresa lo requiere)'));
children.push(normal('Una vez que la empresa tenga su número de WhatsApp Business aprobado en Meta:'));
children.push(...codeBlock(
`UPDATE companies SET
  wa_phone_id = 'ID_DEL_NUMERO_META',
  wa_token    = 'TOKEN_DE_ACCESO_META',
  bot_enabled = true
WHERE id = 'COMPANY_UUID';

UPDATE bot_config SET bot_enabled = true
WHERE company_id = 'COMPANY_UUID';`
));
children.push(normal(''));

children.push(h3('PASO 5: Verificar que todo quedó bien'));
children.push(...codeBlock(
`-- Ver empresa creada
SELECT id, name, plan, status, bot_enabled
FROM companies WHERE name = 'NOMBRE DE LA EMPRESA';

-- Ver usuario admin creado
SELECT name, email, role, status, force_password_change
FROM users WHERE company_id = 'COMPANY_UUID';

-- Ver configuracion del bot
SELECT bot_enabled, timezone, hora_inicio, hora_fin
FROM bot_config WHERE company_id = 'COMPANY_UUID';`
));
children.push(normal(''));
children.push(pgbreak());

// 6. AGREGAR USUARIOS
children.push(h1('6. CÓMO AGREGAR USUARIOS A UNA EMPRESA'));
children.push(normal('La contraseña por defecto es "password". Al entrar por primera vez el sistema obliga al usuario a cambiarla.'));

children.push(h2('Agregar un Asesor'));
children.push(...codeBlock(
`INSERT INTO users (
  company_id, name, email, password_hash, role, status, force_password_change
) VALUES (
  'COMPANY_UUID',
  'Nombre del Asesor',
  'asesor@empresa.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'advisor', 'active', true
);`
));
children.push(normal(''));

children.push(h2('Agregar un Supervisor'));
children.push(...codeBlock(
`INSERT INTO users (
  company_id, name, email, password_hash, role, status, force_password_change
) VALUES (
  'COMPANY_UUID',
  'Nombre del Supervisor',
  'supervisor@empresa.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'supervisor', 'active', true
);`
));
children.push(normal(''));
children.push(pgbreak());

// 7. SUSPENDER / ELIMINAR
children.push(h1('7. CÓMO SUSPENDER O ELIMINAR UNA EMPRESA'));

children.push(h2('Suspender empresa (temporal)'));
children.push(normal('El bot se detiene y los usuarios no pueden iniciar sesión mientras la empresa esté suspendida.'));
children.push(...codeBlock(
`UPDATE companies SET
  status = 'suspended',
  suspension_reason = 'Falta de pago',
  suspended_at = NOW()
WHERE id = 'COMPANY_UUID';`
));
children.push(normal(''));

children.push(h2('Reactivar empresa'));
children.push(...codeBlock(
`UPDATE companies SET
  status = 'active',
  suspension_reason = NULL,
  suspended_at = NULL
WHERE id = 'COMPANY_UUID';`
));
children.push(normal(''));

children.push(h2('Eliminar empresa completamente'));
children.push(new Paragraph({
  children: [new TextRun({ text: 'ADVERTENCIA: Esta operación es IRREVERSIBLE. Por el CASCADE configurado en la base de datos, al borrar la empresa se eliminan automáticamente todos sus leads, clientes, conversaciones, mensajes, configuración del bot y todas las actividades relacionadas.', bold: true, color: 'C00000' })],
  spacing: { after: 100 },
}));
children.push(...codeBlock(
`DELETE FROM companies WHERE id = 'COMPANY_UUID';`
));
children.push(normal(''));
children.push(pgbreak());

// 8. CONSULTAS ÚTILES
children.push(h1('8. CONSULTAS ÚTILES DE ADMINISTRACIÓN'));

children.push(h2('Ver todas las empresas activas'));
children.push(...codeBlock(
`SELECT name, plan, status, bot_enabled, monthly_fee, next_payment
FROM companies ORDER BY created_at DESC;`
));
children.push(normal(''));

children.push(h2('Ver cuántos leads tiene cada empresa'));
children.push(...codeBlock(
`SELECT c.name, COUNT(l.id) AS total_leads
FROM companies c
LEFT JOIN leads l ON l.company_id = c.id
GROUP BY c.name ORDER BY total_leads DESC;`
));
children.push(normal(''));

children.push(h2('Ver cuántos usuarios tiene cada empresa por rol'));
children.push(...codeBlock(
`SELECT c.name, u.role, COUNT(u.id) AS total
FROM companies c
JOIN users u ON u.company_id = c.id
GROUP BY c.name, u.role ORDER BY c.name;`
));
children.push(normal(''));

children.push(h2('Ver empresas con pago vencido'));
children.push(...codeBlock(
`SELECT name, contact_email, next_payment, monthly_fee
FROM companies
WHERE next_payment < CURRENT_DATE AND status = 'active';`
));
children.push(normal(''));

children.push(h2('Ver uso del bot por empresa este mes'));
children.push(...codeBlock(
`SELECT c.name, bc.monthly_input_tok, bc.monthly_output_tok, bc.usage_month
FROM bot_config bc
JOIN companies c ON c.id = bc.company_id
ORDER BY bc.monthly_input_tok DESC;`
));
children.push(normal(''));
children.push(pgbreak());

// 9. SEGURIDAD
children.push(h1('9. SEGURIDAD DE LA BASE DE DATOS'));
children.push(buildTable(
  ['Medida de Seguridad', 'Estado'],
  [
    ['listen_addresses = localhost (no expuesto a internet)', 'OK — Configurado'],
    ['Usuario crm_app con privilegios mínimos (app user)',   'OK — Activo'],
    ['crm_app NO puede DROP, CREATE ni TRUNCATE',            'OK — Verificado'],
    ['pg_hba.conf restringe acceso por usuario y base',      'OK — Configurado'],
    ['Contraseña fuerte en usuario de aplicación',           'OK — CrmApp2025SecureKey'],
    ['Contraseñas de usuarios encriptadas con bcrypt',       'OK — Siempre activo'],
    ['Aislamiento de datos por company_id en 19 tablas',     'OK — En todas las tablas'],
  ]
));
children.push(normal(''));
children.push(pgbreak());

// 10. RESPALDO
children.push(h1('10. RESPALDO DE LA BASE DE DATOS'));
children.push(normal('Se recomienda hacer un backup diario completo antes de pasar a producción. Guarda los archivos .dump en una ubicación segura fuera del servidor.'));

children.push(h2('Hacer backup completo'));
children.push(...codeBlock(
`$env:PGPASSWORD='1234'
$fecha = Get-Date -Format "yyyyMMdd_HHmm"
pg_dump -U postgres -d crm_sales -F c -f "backup_crm_$fecha.dump"`
));
children.push(normal(''));

children.push(h2('Restaurar backup'));
children.push(...codeBlock(
`$env:PGPASSWORD='1234'
pg_restore -U postgres -d crm_sales -c "backup_crm_FECHA.dump"`
));
children.push(normal(''));
children.push(normal(''));
children.push(new Paragraph({
  children: [new TextRun({ text: 'Documentación generada para CRM Sales — Sistema Multi-Empresa  |  Junio 2025  |  Uso interno — Confidencial', italics: true, color: GRIS, size: 18 })],
  alignment: AlignmentType.CENTER,
  spacing: { before: 400 },
}));

// ── Generar el archivo ─────────────────────────────────────────────────────
const doc = new Document({
  creator: 'CRM Sales',
  title: 'Documentación CRM Sales — Base de Datos',
  description: 'Guía de arquitectura, tablas y gestión de empresas',
  sections: [{
    properties: {
      page: { margin: { top: 720, bottom: 720, left: 864, right: 864 } },
    },
    children,
  }],
});

const outPath = path.join(__dirname, '..', '..', 'DOCUMENTACION_BASE_DE_DATOS.docx');
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log('OK — Documento creado:', outPath, '—', Math.round(buf.length / 1024), 'KB');
}).catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
