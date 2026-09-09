require('dotenv').config();
const { query } = require('./config/db');

async function check() {
  try {
    const r = await query("SELECT email, role, status FROM users WHERE email='superadmin@crm.com'");
    console.log('Usuario:', JSON.stringify(r.rows));
    console.log('JWT_SECRET:', (process.env.JWT_SECRET||'dev_secret').substring(0,15)+'...');
  } catch(e) {
    console.log('ERROR:', e.message);
  } finally {
    process.exit(0);
  }
}
check();
