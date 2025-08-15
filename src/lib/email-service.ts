import nodemailer from 'nodemailer';
import { logInfo, logError } from './logger';

// Configuração do transportador de email
const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER || '';
  
  // Configuração manual para Hotmail/Outlook
  if (emailUser.includes('@hotmail.com') || emailUser.includes('@outlook.com') || emailUser.includes('@live.com')) {
    return nodemailer.createTransport({
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false, // true para 465, false para outras portas
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });
  }
  
  // Gmail padrão
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Interface para dados do certificado por email
export interface CertificateEmailData {
  userEmail: string;
  userName: string;
  eventName: string;
  eventDate: Date;
  certificateUrl: string;
  eventId: string;
}

// Interface para configuração de email
export interface EmailConfig {
  subject?: string;
  template?: 'certificate' | 'notification';
  fromName?: string;
}

/**
 * Envia certificado por email para um participante
 */
export const sendCertificateEmail = async (
  data: CertificateEmailData,
  config: EmailConfig = {}
): Promise<boolean> => {
  try {
    logInfo('Iniciando envio de certificado por email', {
      userEmail: data.userEmail,
      userName: data.userName,
      eventId: data.eventId,
      eventName: data.eventName.substring(0, 30) + '...'
    });

    const transporter = createTransporter();

    const { 
      subject = `🎖️ Seu Certificado - ${data.eventName}`,
      fromName = 'Sistema de Eventos'
    } = config;

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Certificado de Participação</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 0;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .content {
            padding: 30px;
          }
          .content h2 {
            color: #333;
            font-size: 22px;
            margin-bottom: 20px;
          }
          .event-info {
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
          }
          .download-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
          }
          .download-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .certificate-icon {
            font-size: 48px;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="certificate-icon">🎖️</div>
            <h1>Certificado Disponível!</h1>
          </div>
          
          <div class="content">
            <h2>Olá, ${data.userName}!</h2>
            
            <p>Parabéns! Seu certificado de participação já está disponível para download.</p>
            
            <div class="event-info">
              <h3>📅 Detalhes do Evento:</h3>
              <p><strong>Evento:</strong> ${data.eventName}</p>
              <p><strong>Data:</strong> ${formatDate(data.eventDate)}</p>
              <p><strong>Participante:</strong> ${data.userName}</p>
            </div>
            
            <p>Clique no botão abaixo para baixar seu certificado:</p>
            
            <div style="text-align: center;">
              <a href="${data.certificateUrl}" class="download-button" 
                 style="color: white; text-decoration: none;">
                📥 Baixar Certificado
              </a>
            </div>
            
            <p><em>O certificado também permanece disponível em sua conta no sistema para futuro download.</em></p>
            
            <p>Muito obrigado pela sua participação!</p>
          </div>
          
          <div class="footer">
            <p>Sistema de Eventos Automatizado</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
      Certificado Disponível - ${data.eventName}
      
      Olá, ${data.userName}!
      
      Parabéns! Seu certificado de participação já está disponível.
      
      Evento: ${data.eventName}
      Data: ${formatDate(data.eventDate)}
      Participante: ${data.userName}
      
      Link para download: ${data.certificateUrl}
      
      Muito obrigado pela sua participação!
      
      ---
      Sistema de Eventos Automatizado
      Este é um email automático, por favor não responda.
    `;

    const mailOptions = {
      from: `"${fromName}" <${process.env.EMAIL_USER}>`,
      to: data.userEmail,
      subject,
      text: emailText,
      html: emailHtml,
    };

    logInfo('Enviando email...', {
      to: data.userEmail,
      subject,
      certificateUrl: data.certificateUrl
    });

    const result = await transporter.sendMail(mailOptions);
    
    logInfo('Email enviado com sucesso', {
      messageId: result.messageId,
      userEmail: data.userEmail,
      eventId: data.eventId
    });

    return true;

  } catch (error) {
    logError('Erro ao enviar certificado por email', error as Error, {
      userEmail: data.userEmail,
      eventId: data.eventId,
      eventName: data.eventName
    });
    
    return false;
  }
};

/**
 * Envia emails de certificado para múltiplos participantes
 */
export const sendCertificateEmailsBatch = async (
  certificates: CertificateEmailData[],
  config: EmailConfig = {}
): Promise<{ sent: number; failed: number; results: Array<{ email: string; success: boolean; error?: string }> }> => {
  logInfo('Iniciando envio em lote de certificados por email', {
    totalCertificates: certificates.length
  });

  const results = [];
  let sent = 0;
  let failed = 0;

  for (const cert of certificates) {
    try {
      const success = await sendCertificateEmail(cert, config);
      
      if (success) {
        sent++;
        results.push({ email: cert.userEmail, success: true });
      } else {
        failed++;
        results.push({ email: cert.userEmail, success: false, error: 'Falha no envio' });
      }

      // Delay pequeno entre envios para não sobrecarregar o servidor SMTP
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      failed++;
      results.push({ 
        email: cert.userEmail, 
        success: false, 
        error: (error as Error).message 
      });
    }
  }

  logInfo('Envio em lote concluído', {
    total: certificates.length,
    sent,
    failed,
    successRate: `${((sent / certificates.length) * 100).toFixed(1)}%`
  });

  return { sent, failed, results };
};

/**
 * Verifica se o serviço de email está configurado corretamente
 */
export const isEmailServiceConfigured = (): boolean => {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

/**
 * Testa a configuração de email
 */
export const testEmailConfiguration = async (): Promise<boolean> => {
  try {
    if (!isEmailServiceConfigured()) {
      logError('Configuração de email não encontrada', new Error('EMAIL_USER ou EMAIL_PASS não configurados'));
      return false;
    }

    const transporter = createTransporter();
    
    // Log detalhado da configuração
    console.log('🔍 CONFIGURAÇÃO EMAIL DEBUG:', {
      emailUser: process.env.EMAIL_USER,
      emailPassLength: process.env.EMAIL_PASS?.length,
      emailPassSample: process.env.EMAIL_PASS?.substring(0, 4) + '...'
    });
    
    await transporter.verify();
    
    logInfo('Configuração de email verificada com sucesso');
    return true;
    
  } catch (error) {
    const smtpError = error as Error & {
      code?: string;
      command?: string;
      response?: string;
    };
    
    console.log('❌ ERRO SMTP DETALHADO:', {
      message: smtpError.message,
      code: smtpError.code,
      command: smtpError.command,
      response: smtpError.response
    });
    
    logError('Erro na verificação da configuração de email', error as Error);
    return false;
  }
};
