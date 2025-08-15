import { NextRequest, NextResponse } from 'next/server';
import { sendCertificateEmail, isEmailServiceConfigured } from '@/lib/email-service';
import { logInfo, logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Verificar se email está configurado
    if (!isEmailServiceConfigured()) {
      return NextResponse.json(
        { error: 'Serviço de email não configurado' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { userEmail, userName, eventName, eventDate, certificateUrl, eventId } = body;

    // Validar campos obrigatórios
    if (!userEmail || !userName || !eventName || !certificateUrl) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: userEmail, userName, eventName, certificateUrl' },
        { status: 400 }
      );
    }

    logInfo('🚀 Enviando certificado por email (manual)', {
      userEmail,
      userName,
      eventName,
      certificateUrl: certificateUrl.substring(0, 50) + '...'
    });

    // Enviar email
    const success = await sendCertificateEmail({
      userEmail,
      userName,
      eventName,
      eventDate: new Date(eventDate || new Date()),
      certificateUrl,
      eventId: eventId || 'manual'
    }, {
      subject: `🎖️ Seu Certificado - ${eventName}`,
      fromName: 'Sistema de Eventos'
    });

    if (success) {
      logInfo('✅ Email enviado com sucesso', {
        userEmail,
        eventName
      });

      return NextResponse.json({
        success: true,
        message: `Email enviado com sucesso para ${userEmail}`,
        userEmail,
        userName,
        eventName
      });
    } else {
      logError('❌ Falha no envio do email', new Error('Send failed'), {
        userEmail,
        eventName
      });

      return NextResponse.json(
        { error: 'Falha no envio do email' },
        { status: 500 }
      );
    }

  } catch (error) {
    logError('❌ Erro na API de envio de email', error as Error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'API de envio de certificado por email',
    emailConfigured: isEmailServiceConfigured(),
    usage: {
      method: 'POST',
      body: {
        userEmail: 'email@exemplo.com',
        userName: 'Nome do Usuário',
        eventName: 'Nome do Evento',
        eventDate: '2025-08-15',
        certificateUrl: 'https://...',
        eventId: 'optional'
      }
    }
  });
}
