import { NextRequest, NextResponse } from 'next/server';
import { getEvent, getEventRegistrations } from '@/lib/firestore';
import { sendCertificateEmailsBatch, isEmailServiceConfigured } from '@/lib/email-service';
import { logInfo, logError } from '@/lib/logger';
import { getBaseUrl } from '@/lib/url-detector';

export async function POST(request: NextRequest) {
  try {
    // Verificar se email está configurado
    if (!isEmailServiceConfigured()) {
      return NextResponse.json(
        { error: 'Serviço de email não configurado' },
        { status: 400 }
      );
    }

    const { eventId } = await request.json();

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID é obrigatório' },
        { status: 400 }
      );
    }

    logInfo('📧 Iniciando envio em lote de certificados por email', { eventId });

    // Buscar evento
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      );
    }

    // Buscar participantes que têm certificados ou fizeram checkout
    const registrations = await getEventRegistrations(eventId);
    const eligibleParticipants = registrations.filter(reg => {
      // Incluir participantes que fizeram checkout (mesmo sem certificado gerado ainda)
      // pois o sistema pode gerar dinamicamente
      return reg.checkedOut;
    });

    if (eligibleParticipants.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum participante elegível encontrado (ninguém fez checkout)',
        emailsSent: 0,
        totalEligible: 0
      });
    }

    logInfo(`📊 Encontrados ${eligibleParticipants.length} participantes elegíveis para email`);

    // Preparar dados para envio de email
    const baseUrl = getBaseUrl();
    const certificatesForEmail = eligibleParticipants.map(registration => {
      // Usar URL dinâmica ou URL armazenada
      let certificateUrl: string;
      
      if (registration.certificateUrl) {
        // Certificado já existe
        certificateUrl = registration.certificateUrl;
      } else {
        // Usar URL dinâmica (será gerado on-demand)
        certificateUrl = `${baseUrl}/api/certificate/download?registrationId=${registration.id}`;
      }

      return {
        userEmail: registration.userEmail,
        userName: registration.userName,
        eventName: event.name,
        eventDate: event.date,
        certificateUrl,
        eventId: event.id,
      };
    });

    // Enviar emails em lote
    const emailResult = await sendCertificateEmailsBatch(certificatesForEmail, {
      subject: `🎖️ Seu Certificado - ${event.name}`,
      fromName: 'Sistema de Eventos'
    });

    const response = {
      success: true,
      message: `Envio concluído: ${emailResult.sent} emails enviados de ${eligibleParticipants.length} participantes`,
      emailsSent: emailResult.sent,
      emailsFailed: emailResult.failed,
      totalEligible: eligibleParticipants.length,
      successRate: `${((emailResult.sent / eligibleParticipants.length) * 100).toFixed(1)}%`,
      details: emailResult.results
    };

    logInfo('🎉 Envio em lote de emails concluído', {
      eventId,
      eventName: event.name,
      sent: emailResult.sent,
      failed: emailResult.failed,
      total: eligibleParticipants.length
    });

    return NextResponse.json(response);

  } catch (error) {
    logError('❌ Erro no envio em lote de certificados por email', error as Error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'API de envio em lote de certificados por email',
    emailConfigured: isEmailServiceConfigured()
  });
}
