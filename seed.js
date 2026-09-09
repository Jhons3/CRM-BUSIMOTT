require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'crm_sales',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Iniciando seed...');

    await client.query(`
      INSERT INTO companies (id, name, plan, assignment_strategy, settings)
      VALUES ($1, 'Empresa Demo', 'professional', 'least_loaded', '{"primaryColor":"#6366f1"}')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `, [COMPANY_ID]);
    console.log('Empresa creada');

    const pass = await bcrypt.hash('demo123', 10);
    const users = [
      [COMPANY_ID, 'Super Admin',    'superadmin@crm.com',    pass, 'admin'],
      [COMPANY_ID, 'Administrador',  'admin@empresa.com',     pass, 'admin'],
      [COMPANY_ID, 'Rosa Pena',      'supervisor@empresa.com',pass, 'supervisor'],
      [COMPANY_ID, 'Maria Gonzalez', 'maria@empresa.com',     pass, 'advisor'],
      [COMPANY_ID, 'Carlos Ruiz',    'carlos@empresa.com',    pass, 'advisor'],
      [COMPANY_ID, 'Ana Jimenez',    'ana@empresa.com',       pass, 'advisor'],
      [COMPANY_ID, 'Luis Mendoza',   'luis@empresa.com',      pass, 'advisor'],
    ];
    for (const u of users) {
      await client.query(`
        INSERT INTO users (company_id, name, email, password_hash, role)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      `, u);
    }
    console.log('Usuarios creados - password: demo123');

    await client.query(`
      CREATE TABLE IF NOT EXISTS internal_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        from_id UUID NOT NULL REFERENCES users(id),
        from_name VARCHAR(255),
        from_role VARCHAR(50),
        to_id UUID REFERENCES users(id),
        to_role VARCHAR(50),
        texto TEXT NOT NULL,
        leido BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Tabla internal_messages creada');

    await client.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS heat VARCHAR(20) DEFAULT 'tibio';
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS score INT DEFAULT 50;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_msg TEXT;
    `);
    console.log('Columnas de leads agregadas');

    await client.query('COMMIT');
    console.log('');
    console.log('=== SEED COMPLETADO ===');
    console.log('superadmin@crm.com     - demo123');
    console.log('admin@empresa.com      - demo123');
    console.log('supervisor@empresa.com - demo123');
    console.log('maria@empresa.com      - demo123');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
