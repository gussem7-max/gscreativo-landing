// api/contact.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Solo permitir método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { nombre, email, mensaje } = req.body;

    // Validaciones
    if (!nombre || !email || !mensaje) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'El email no es válido' });
    }

    // Enviar email con Resend
    const { data, error } = await resend.emails.send({
      from: 'GS CREATIVO <onboarding@resend.dev>', // Cambia esto si verificas tu dominio
      to: ['contacto@gscreativo.com'], // ⚠️ CAMBIA ESTO por tu email real
      replyTo: email,
      subject: `Nuevo contacto de ${nombre} - GS CREATIVO`,
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
                <div class="value">${nombre}</div>
              </div>
              <div class="field">
                <div class="label">Email</div>
                <div class="value"><a href="mailto:${email}">${email}</a></div>
              </div>
              <div class="field">
                <div class="label">Mensaje</div>
                <div class="message-box">${mensaje}</div>
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

    console.log('Email enviado:', data);
    res.status(200).json({ success: true, message: 'Mensaje enviado correctamente' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
