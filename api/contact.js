// api/contact.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper para sanitizar HTML y prevenir inyección
const escapeHTML = (str) => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

// Rate limiting simple en memoria
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutos
const RATE_LIMIT_MAX = 3; 

function checkRateLimit(ip) {
  const now = Date.now();
  const records = rateLimitMap.get(ip) || [];
  const recent = records.filter(t => now - t < RATE_LIMIT_WINDOW);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { nombre, email, mensaje, website } = req.body;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

    // 🍯 Honeypot
    if (website) {
      console.log(`🍯 Bot detectado y descartado (honeypot) desde IP: ${clientIp}`);
      return res.status(200).json({ success: true, message: 'Mensaje recibido correctamente' });
    }

    // 🛡️ Rate limiting
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' });
    }

    // Validaciones
    if (!nombre || !email || !mensaje) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    if (nombre.length > 100 || mensaje.length > 2000) {
      return res.status(400).json({ error: 'Los campos exceden la longitud permitida' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'El email no es válido' });
    }

    // Sanitizar datos
    const safeNombre = escapeHTML(nombre);
    const safeEmail = escapeHTML(email);
    const safeMensaje = escapeHTML(mensaje).replace(/\n/g, '<br>');

    // =========================================================
    // 1. CORREO PARA TI (Notificación de Lead)
    // =========================================================
    const { error: adminError } = await resend.emails.send({
      from: 'GS CREATIVO <contacto@gscreativo.com>',
      to: ['gussem7@gmail.com'],
      replyTo: email,
      subject: `🚀 Nuevo contacto de ${safeNombre} - GS CREATIVO`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #9333ea, #4f46e5); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
            .value { margin-top: 4px; }
            .message-box { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #9333ea; }
            .footer { margin-top: 20px; font-size: 11px; color: #9ca3af; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">🚀 Nuevo mensaje desde GS CREATIVO</h2>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Nombre</div>
                <div class="value">${safeNombre}</div>
              </div>
              <div class="field">
                <div class="label">Email</div>
                <div class="value"><a href="mailto:${safeEmail}">${safeEmail}</a></div>
              </div>
              <div class="field">
                <div class="label">Mensaje</div>
                <div class="message-box">${safeMensaje}</div>
              </div>
              <div class="footer">
                Enviado desde gscreativo.com • IP: ${clientIp || 'desconocida'}
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (adminError) {
      console.error('Error al enviar a Admin:', adminError);
      return res.status(500).json({ error: 'Error al enviar el email principal' });
    }
    console.log(`✅ Lead enviado a gussem7@gmail.com desde IP: ${clientIp}`);

    // =========================================================
    // 2. AUTO-RESPONDER PARA EL CLIENTE (Confirmación)
    // =========================================================
    try {
      await resend.emails.send({
        from: 'GS CREATIVO <contacto@gscreativo.com>',
        to: [email], // Usamos el email original sin sanitizar para el envío
        subject: '¡Hemos recibido tu mensaje! 🚀 - GS CREATIVO',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #334155; background-color: #f8fafc; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #9333ea, #4f46e5); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
            .content { padding: 40px 30px; }
            .content h2 { color: #0f172a; margin-top: 0; font-size: 20px; }
            .message-box { background: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid #9333ea; margin: 25px 0; font-style: italic; color: #475569; }
            .cta { text-align: center; margin-top: 30px; }
            .btn { display: inline-block; background: linear-gradient(135deg, #9333ea, #4f46e5); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(147, 51, 234, 0.3); }
            .footer { text-align: center; padding: 25px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
          </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>¡Hemos recibido tu mensaje! 🚀</h1>
              </div>
              <div class="content">
                <h2>Hola, ${safeNombre},</h2>
                <p>Gracias por contactar a <strong>GS CREATIVO</strong>. Queremos confirmarte que hemos recibido correctamente los detalles de tu proyecto.</p>
                <p>Nuestro equipo lo revisará y te responderemos en un plazo máximo de <strong>24 horas</strong> (¡generalmente mucho antes!).</p>
                
                <div class="message-box">
                  <strong>Tu mensaje:</strong><br>
                  "${safeMensaje}"
                </div>

                <p>Si tienes más detalles que quieras agregar o archivos que mostrar, simplemente puedes <strong>responder a este correo</strong> y me llegará directamente.</p>
                
                <div class="cta">
                  <a href="https://gscreativo.com" class="btn">Volver al sitio web</a>
                </div>
              </div>
              <div class="footer">
                © 2026 GS CREATIVO. Todos los derechos reservados.<br>
                Desarrollo Web & Soluciones Digitales.
              </div>
            </div>
          </body>
          </html>
        `
      });
      console.log(`📧 Auto-responder enviado correctamente a ${email}`);
    } catch (clientErr) {
      // Si falla el auto-responder (ej. el cliente puso un email falso), 
      // solo lo registramos en los logs pero NO detenemos el éxito del formulario.
      console.error(`⚠️ No se pudo enviar el auto-responder a ${email}:`, clientErr);
    }

    // Respuesta final al Frontend
    res.status(200).json({ success: true, message: 'Mensaje enviado correctamente' });

  } catch (error) {
    console.error('Error interno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
