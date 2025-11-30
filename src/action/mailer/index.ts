'use server'
import nodemailer from 'nodemailer'

//Función mejorada para envío de emails con templates HTML
export const sendEmail = async (
  to: string | string[],
  subject: string,
  htmlContent: string,
  textContent?: string
) => {

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.NODE_MAILER_EMAIL,
      pass: process.env.NODE_MAILER_GMAIL_APP_PASSWORD,
    },
  })

  const mailOptions = {
    from: `"Lunari AI - Sistema de Citas" <${process.env.NODE_MAILER_EMAIL}>`, // Nombre más específico
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html: htmlContent,
    text: textContent || htmlContent.replace(/<[^>]*>/g, ''), // Fallback a texto plano
    // Headers para mejorar la entrega
    headers: {
      'X-Priority': '1', // Alta prioridad
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
      'X-Mailer': 'Lunari AI System',
      'Reply-To': process.env.NODE_MAILER_EMAIL
    }
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    return { success: true, messageId: info.messageId, response: info.response }
  } catch (error) {
    console.error('Error al enviar email:', error)
    console.error('Detalles del error:', {
      code: error.code,
      command: error.command,
      message: error.message
    })
    return { success: false, error }
  }
}

// Template para confirmación de cita
export const sendAppointmentConfirmation = async (
  customerEmail: string,
  customerName: string,
  appointmentDate: string,
  appointmentTime: string,
  companyName: string,
  companyOwnerEmail?: string
) => {
  const htmlContent = `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #FFA947 0%, #FFC989 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">📅 Cita Confirmada</h1>
        <p style="color: white; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${companyName}</p>
      </div>
      
      <div style="background: #F5F5F5; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #3F3F3F; margin-top: 0; font-weight: 600;">¡Hola ${customerName}!</h2>
        
        <p style="color: #636363; font-size: 16px; line-height: 1.6;">
          Tu cita ha sido confirmada exitosamente. Aquí están los detalles:
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FFA947; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="color: #3F3F3F; margin-top: 0; font-weight: 600;">📋 Detalles de la Cita</h3>
          <p style="margin: 8px 0; color: #4E4E4E;"><strong>📅 Fecha:</strong> ${appointmentDate}</p>
          <p style="margin: 8px 0; color: #4E4E4E;"><strong>🕐 Hora:</strong> ${appointmentTime}</p>
          <p style="margin: 8px 0; color: #4E4E4E;"><strong>🏢 Empresa:</strong> ${companyName}</p>
        </div>
        
        <div style="background: #FFE0BD; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 3px solid #FFA947;">
          <p style="margin: 0; color: #4E4E4E; font-size: 14px;">
            <strong>💡 Recordatorio:</strong> Te enviaremos un recordatorio 24 horas antes de tu cita.
          </p>
        </div>
        
        <p style="color: #636363; font-size: 14px; margin-top: 30px;">
          Si necesitas cambiar o cancelar tu cita, por favor contáctanos con anticipación.
        </p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E6E6E6;">
          <p style="color: #CDCDCD; font-size: 12px;">
            Este email fue enviado automáticamente por el sistema de Lunari AI
          </p>
        </div>
      </div>
    </div>
  `

  const textContent = `
    Cita Confirmada - ${companyName}
    
    ¡Hola ${customerName}!
    
    Tu cita ha sido confirmada exitosamente:
    
    📅 Fecha: ${appointmentDate}
    🕐 Hora: ${appointmentTime}
    🏢 Empresa: ${companyName}
    
    Te enviaremos un recordatorio 24 horas antes de tu cita.
    
    Si necesitas cambiar o cancelar tu cita, por favor contáctanos con anticipación.
    
    ---
    Este email fue enviado automáticamente por el sistema de Lunari AI
  `

  // Enviar al cliente
  const clientResult = await sendEmail(
    customerEmail,
    `📅 Cita Confirmada - ${companyName}`,
    htmlContent,
    textContent
  )

  // Si hay email del propietario, enviar notificación también
  if (companyOwnerEmail) {
    const ownerHtmlContent = `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4E4E4E 0%, #636363 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🔔 Nueva Cita Agendada</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${companyName}</p>
        </div>
        
        <div style="background: #F1F1F1; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #3F3F3F; margin-top: 0; font-weight: 600;">Nueva Reserva de Cita</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4E4E4E; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #3F3F3F; margin-top: 0; font-weight: 600;">📋 Detalles del Cliente</h3>
            <p style="margin: 8px 0; color: #4E4E4E;"><strong>👤 Cliente:</strong> ${customerName}</p>
            <p style="margin: 8px 0; color: #4E4E4E;"><strong>📧 Email:</strong> ${customerEmail}</p>
            <p style="margin: 8px 0; color: #4E4E4E;"><strong>📅 Fecha:</strong> ${appointmentDate}</p>
            <p style="margin: 8px 0; color: #4E4E4E;"><strong>🕐 Hora:</strong> ${appointmentTime}</p>
          </div>
          
          <div style="background: #FFE0BD; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 3px solid #FFA947;">
            <p style="margin: 0; color: #4E4E4E; font-size: 14px;">
              <strong>Confirmación:</strong> El cliente ha recibido una confirmación automática de su cita.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E6E6E6;">
            <p style="color: #CDCDCD; font-size: 12px;">
              Notificación automática del sistema Lunari AI
            </p>
          </div>
        </div>
      </div>
    `

    const ownerTextContent = `
      Nueva Cita Agendada - ${companyName}
      
      Nueva Reserva de Cita:
      
      👤 Cliente: ${customerName}
      📧 Email: ${customerEmail}
      📅 Fecha: ${appointmentDate}
      🕐 Hora: ${appointmentTime}
      
      El cliente ha recibido una confirmación automática de su cita.
    `

    await sendEmail(
      companyOwnerEmail,
      `[IMPORTANTE] Nueva Cita Reservada - ${customerName}`, // Asunto más directo
      ownerHtmlContent,
      ownerTextContent
    )

  }

  return clientResult
}

export const onMailer = async (email: string, customerName?: string, customerEmail?: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.NODE_MAILER_EMAIL,
      pass: process.env.NODE_MAILER_GMAIL_APP_PASSWORD,
    },
  })

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Cliente Solicita Atención Humana</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
                <strong>¡Atención!</strong> Uno de tus clientes ha solicitado hablar contigo directamente.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
                <h3 style="color: #28a745; margin-top: 0;">📋 Información del Cliente:</h3>
                <p style="margin: 5px 0;"><strong>Nombre:</strong> ${customerName || 'No proporcionado'}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${customerEmail || 'No proporcionado'}</p>
                <p style="margin: 5px 0;"><strong>Estado:</strong> <span style="color: #dc3545; font-weight: bold;">Esperando atención humana</span></p>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffeaa7; margin: 20px 0;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                    <strong>💡 Acción requerida:</strong> Ve a tu panel de Lunari para atender a este cliente en tiempo real.
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/conversation" 
                   style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Ir al Panel de Conversaciones
                </a>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
            <p>Este email fue enviado automáticamente por Lunari AI</p>
        </div>
    </div>
    `

  const mailOptions = {
    from: `"Lunari AI - Sistema de Soporte" <${process.env.NODE_MAILER_EMAIL}>`,
    to: email,
    subject: '🚨 Cliente Solicita Atención Humana - Lunari AI',
    html: htmlContent,
    text: `Cliente ${customerName || 'desconocido'} (${customerEmail || 'sin email'}) ha solicitado atención humana. Ve a tu panel de Lunari para atenderlo.`,
    headers: {
      'X-Priority': '1',
      'Importance': 'high',
      'Reply-To': process.env.NODE_MAILER_EMAIL
    }
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error enviando email de escalación:', error)
    return { success: false, error: error }
  }
}