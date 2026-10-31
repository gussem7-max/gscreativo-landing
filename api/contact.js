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

// Rate limiting simple en memoria (para el plan Hobby de Vercel)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutos
const RATE_LIMIT_MAX = 3; // máximo 3 envíos por IP

function checkRateLimit(ip) {
  const now = Date.now();
  const records = rateLimitMap.get(ip) || [];
  const recent = records.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recent.length >= RATE_LIMIT_MAX) {
    return false;
  }
  
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

    // 🍯 Honeypot: si el campo oculto tiene contenido, es un bot
    if (website) {
      console.log(`🍯 Bot detectado y descartado (honeypot) desde IP: ${clientIp}`);
      return res.status(200).json({ success: true, message: 'Mensaje recibido correctamente' });
    }

    // 🛡️ Rate limiting
    if (!checkRateLimit(clientIp)) {
      console.log(`⚠️ Rate limit excedido desde IP: ${clientIp}`);
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

    // Sanitizar datos antes de usarlos en el HTML
    const safeNombre = escapeHTML(nombre);
    const safeEmail = escapeHTML(email);
    const safeMensaje = escapeHTML(mensaje).replace(/\n/g, '<br>');

    // ⚠️ IMPORTANTE: Cambia esto por la dirección de email que quieras usar de tu dominio
    // Ejemplos válidos: contacto@gscreativo.com, hola@gscreativo.com, info@gscreativo.com
    const FROM_EMAIL = 'GS CREATIVO <contacto@gscreativo.com>';

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
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

    if (error) {
      console.error('Error de Resend:', error);
      return res.status(500).json({ error: 'Error al enviar el email' });
    }

    console.log(`✅ Email enviado correctamente a gussem7@gmail.com desde IP: ${clientIp}`);
    res.status(200).json({ success: true, message: 'Mensaje enviado correctamente' });

  } catch (error) {
    console.error('Error interno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
