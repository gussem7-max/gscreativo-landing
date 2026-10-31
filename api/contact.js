// api/contact.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { nombre, email, mensaje } = req.body;

    // Validaciones básicas
    if (!nombre || !email || !mensaje) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Aquí puedes integrar el servicio de email que prefieras
    // Ejemplo con Nodemailer (requiere configurar SMTP)
    // O con servicios como SendGrid, Resend, etc.

    // Por ahora, solo registramos en logs de Vercel
    console.log('Nuevo mensaje recibido:', { nombre, email, mensaje });

    // Simulación de envío exitoso
    res.status(200).json({ 
      success: true, 
      message: 'Mensaje recibido correctamente' 
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al procesar el mensaje' });
  }
}
