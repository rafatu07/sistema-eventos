import { NextRequest, NextResponse } from 'next/server';
import { getEvent, getEventRegistrations, updateRegistration } from '@/lib/firestore';
import { generateCertificatePDF } from '@/lib/certificate-pdf-generator';
import { uploadPDFToCloudinary } from '@/lib/upload';
import { logInfo, logError, logAudit, AuditAction } from '@/lib/logger';
import { getBaseUrl } from '@/lib/url-detector';

export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json();

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID é obrigatório' },
        { status: 400 }
      );
    }

    logInfo('🚀 Iniciando geração de certificados pendentes', { eventId });

    // Buscar evento
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      );
    }

    // Buscar participantes que fizeram checkout mas não têm certificado
    const registrations = await getEventRegistrations(eventId);
    const pendingCertificates = registrations.filter(
      reg => reg.checkedOut && !reg.certificateGenerated
    );

    if (pendingCertificates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Todos os participantes elegíveis já possuem certificados',
        certificatesGenerated: 0,
        totalPending: 0
      });
    }

    logInfo(`📊 Encontrados ${pendingCertificates.length} certificados pendentes`);

    let certificatesGenerated = 0;
    const errors: string[] = [];
    const baseUrl = getBaseUrl();

    // Gerar certificado para cada participante pendente
    for (const registration of pendingCertificates) {
      try {
        logInfo(`📄 Gerando certificado para ${registration.userName}`, {
          registrationId: registration.id
        });

        // Gerar certificado PDF
        const certificateBuffer = await generateCertificatePDF({
          userName: registration.userName,
          eventName: event.name,
          eventDate: event.date,
          eventStartTime: event.startTime,
          eventEndTime: event.endTime,
          eventId: event.id,
        });

        // Determinar estratégia (dinâmica ou storage)
        const useDynamic = process.env.USE_DYNAMIC_CERTIFICATES !== 'false';
        let certificateUrl: string;

        if (useDynamic) {
          // URL dinâmica
          certificateUrl = `${baseUrl}/api/certificate/download?registrationId=${registration.id}`;
        } else {
          // Upload para Cloudinary
          const cacheBreaker = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const uploadResult = await uploadPDFToCloudinary(
            certificateBuffer, 
            `certificate_batch_${registration.userId}_${event.id}_${cacheBreaker}`
          );
          certificateUrl = uploadResult.secureUrl;
        }

        // Atualizar registro
        await updateRegistration(registration.id, {
          certificateGenerated: true,
          certificateUrl: certificateUrl,
        });

        certificatesGenerated++;

        // Log de auditoria
        logAudit(AuditAction.CERTIFICATE_GENERATE, registration.userId, true, {
          eventId: event.id,
          registrationId: registration.id,
          certificateUrl,
          generationType: 'batch-pending',
          trigger: 'admin-batch-generate'
        });

        logInfo(`✅ Certificado gerado para ${registration.userName}`);

      } catch (error) {
        const errorMsg = `Erro ao gerar certificado para ${registration.userName}: ${(error as Error).message}`;
        logError(errorMsg, error as Error);
        errors.push(errorMsg);
      }
    }

    const response = {
      success: true,
      message: `Processamento concluído: ${certificatesGenerated} certificados gerados`,
      certificatesGenerated,
      totalPending: pendingCertificates.length,
      errors: errors.length > 0 ? errors : undefined,
      strategy: process.env.USE_DYNAMIC_CERTIFICATES !== 'false' ? 'Dinâmico' : 'Cloudinary'
    };

    logInfo('🎉 Geração em lote de certificados concluída', response);

    return NextResponse.json(response);

  } catch (error) {
    logError('❌ Erro na geração em lote de certificados', error as Error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
