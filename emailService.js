const nodemailer = require('nodemailer');

// Configurar transporter
// Soporta Gmail, Outlook, SMTP personalizado
function createTransporter() {
  const provider = process.env.EMAIL_PROVIDER || 'gmail';
  
  if (provider === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // App Password de Gmail
      },
    });
  }

  // SMTP generico (Hostinger, etc)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// Enviar email de reset de contraseña
async function sendPasswordResetEmail({ toEmail, toName, newPassword, companyName, resetBy }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[email] EMAIL_USER o EMAIL_PASS no configurados — email no enviado');
    return false;
  }

  const transporter = createTransporter();
  
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(79,110,247,0.10);">
    <div style="background:linear-gradient(135deg,#4f6ef7,#7c8ff7);padding:32px 36px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">${companyName || 'CRM JISMART'}</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Notificación de seguridad</p>
    </div>
    <div style="padding:32px 36px;">
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:18px;">Contraseña actualizada</h2>
      <p style="color:#64748b;font-size:14px;line-height:1.6;">Hola <strong>${toName}</strong>, tu contraseña ha sido restablecida por <strong>${resetBy || 'un administrador'}</strong>.</p>
      
      <div style="background:#f0f4ff;border-radius:12px;padding:20px 24px;margin:24px 0;border-left:4px solid #4f6ef7;">
        <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Tu nueva contraseña</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:#4f6ef7;letter-spacing:4px;font-family:monospace;">${newPassword}</p>
      </div>
      
      <div style="background:#fff7ed;border-radius:10px;padding:16px 20px;margin:0 0 24px;border:1px solid #fed7aa;">
        <p style="margin:0;font-size:13px;color:#92400e;">
          <strong>Importante:</strong> Por seguridad, cambia esta contraseña después de iniciar sesión.
        </p>
      </div>
      
      <p style="color:#64748b;font-size:13px;">Si no solicitaste este cambio, contacta a tu administrador inmediatamente.</p>
    </div>
    <div style="padding:20px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
        CRM JISMART · ${companyName} · Este es un mensaje automático
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${companyName || 'CRM JISMART'}" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `🔐 Tu contraseña ha sido restablecida — ${companyName || 'CRM'}`,
      html,
    });
    console.log(`[email] Reset password enviado a ${toEmail}`);
    return true;
  } catch (err) {
    console.error('[email] Error enviando email:', err.message);
    return false;
  }
}

// Enviar email de bienvenida para nuevo usuario
async function sendWelcomeEmail({ toEmail, toName, password, companyName, role }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return false;

  const transporter = createTransporter();
  const roleLabel = role === 'supervisor' ? 'Supervisor' : role === 'admin' ? 'Administrador' : 'Asesor';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(79,110,247,0.10);">
    <div style="background:linear-gradient(135deg,#4f6ef7,#7c8ff7);padding:32px 36px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">${companyName || 'CRM JISMART'}</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Bienvenido al equipo</p>
    </div>
    <div style="padding:32px 36px;">
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:18px;">Hola ${toName}, tu cuenta está lista</h2>
      <p style="color:#64748b;font-size:14px;line-height:1.6;">Has sido registrado como <strong>${roleLabel}</strong> en <strong>${companyName}</strong>. Aquí están tus credenciales de acceso:</p>
      
      <div style="background:#f0f4ff;border-radius:12px;padding:20px 24px;margin:24px 0;border-left:4px solid #4f6ef7;">
        <p style="margin:0 0 10px;font-size:13px;color:#64748b;">Email: <strong style="color:#1e293b;">${toEmail}</strong></p>
        <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Contraseña temporal</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:#4f6ef7;letter-spacing:4px;font-family:monospace;">${password}</p>
      </div>
      
      <p style="color:#64748b;font-size:13px;">Cambia tu contraseña después de tu primer inicio de sesión.</p>
    </div>
    <div style="padding:20px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">CRM JISMART · ${companyName}</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${companyName || 'CRM JISMART'}" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Bienvenido a ${companyName} — Tus credenciales de acceso`,
      html,
    });
    console.log(`[email] Bienvenida enviada a ${toEmail}`);
    return true;
  } catch (err) {
    console.error('[email] Error enviando bienvenida:', err.message);
    return false;
  }
}

// Enviar código de recuperación de contraseña (flujo "olvidé mi contraseña")
async function sendRecoveryCodeEmail({ toEmail, toName, code }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[email] EMAIL_USER o EMAIL_PASS no configurados — código no enviado');
    return false;
  }

  const transporter = createTransporter();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(79,110,247,0.10);">
    <div style="background:linear-gradient(135deg,#dc2626,#7f1d1d);padding:32px 36px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">CRM JISMART</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Recuperación de contraseña</p>
    </div>
    <div style="padding:32px 36px;">
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:18px;">Hola ${toName || ''}</h2>
      <p style="color:#64748b;font-size:14px;line-height:1.6;">Recibimos una solicitud para restablecer tu contraseña. Usa este código para continuar:</p>

      <div style="background:#fef2f2;border-radius:12px;padding:20px 24px;margin:24px 0;border-left:4px solid #dc2626;text-align:center;">
        <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Tu código de recuperación</p>
        <p style="margin:0;font-size:34px;font-weight:800;color:#dc2626;letter-spacing:8px;font-family:monospace;">${code}</p>
      </div>

      <div style="background:#fff7ed;border-radius:10px;padding:16px 20px;margin:0 0 24px;border:1px solid #fed7aa;">
        <p style="margin:0;font-size:13px;color:#92400e;">
          <strong>Este código expira en 15 minutos</strong> y solo puede usarse una vez.
        </p>
      </div>

      <p style="color:#64748b;font-size:13px;">Si no solicitaste este cambio, ignora este mensaje — tu contraseña seguirá siendo la misma.</p>
    </div>
    <div style="padding:20px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
        CRM JISMART · Este es un mensaje automático, no respondas a este correo
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"CRM JISMART — Seguridad" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `🔐 Código de recuperación: ${code}`,
      html,
    });
    console.log(`[email] Código de recuperación enviado a ${toEmail}`);
    return true;
  } catch (err) {
    console.error('[email] Error enviando código de recuperación:', err.message);
    return false;
  }
}

// Enviar alerta de inicio de sesión (notificación de seguridad para todos los usuarios)
async function sendLoginAlertEmail({ toEmail, toName, ip, device, time }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return false;

  const transporter = createTransporter();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(79,110,247,0.10);">
    <div style="background:linear-gradient(135deg,#1d4ed8,#1e293b);padding:32px 36px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">CRM JISMART</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Alerta de inicio de sesión</p>
    </div>
    <div style="padding:32px 36px;">
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:18px;">Hola ${toName || ''}</h2>
      <p style="color:#64748b;font-size:14px;line-height:1.6;">Detectamos un inicio de sesión en tu cuenta:</p>

      <div style="background:#f8fafc;border-radius:12px;padding:18px 22px;margin:20px 0;border-left:4px solid #1d4ed8;">
        <p style="margin:0 0 6px;font-size:13px;color:#475569;"><strong>Fecha y hora:</strong> ${time}</p>
        <p style="margin:0 0 6px;font-size:13px;color:#475569;"><strong>Dirección IP:</strong> ${ip || 'Desconocida'}</p>
        <p style="margin:0;font-size:13px;color:#475569;"><strong>Dispositivo/navegador:</strong> ${device || 'Desconocido'}</p>
      </div>

      <div style="background:#fef2f2;border-radius:10px;padding:16px 20px;margin:0 0 24px;border:1px solid #fecaca;">
        <p style="margin:0;font-size:13px;color:#991b1b;">
          <strong>¿No fuiste tú?</strong> Cambia tu contraseña de inmediato desde "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión y avisa a tu administrador.
        </p>
      </div>

      <p style="color:#94a3b8;font-size:12px;">Si fuiste tú, no necesitas hacer nada más.</p>
    </div>
    <div style="padding:20px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
        CRM JISMART · Mensaje automático de seguridad — no respondas a este correo
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"CRM JISMART — Seguridad" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `🔔 Nuevo inicio de sesión en tu cuenta — ${time}`,
      html,
    });
    console.log(`[email] Alerta de inicio de sesión enviada a ${toEmail}`);
    return true;
  } catch (err) {
    console.error('[email] Error enviando alerta de login:', err.message);
    return false;
  }
}

module.exports = { sendPasswordResetEmail, sendWelcomeEmail, sendRecoveryCodeEmail, sendLoginAlertEmail };
