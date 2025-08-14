import { NextResponse } from 'next/server';
import { getAllEvents, autoCheckoutEventParticipants, getEventRegistrations, updateRegistration } from '@/lib/firestore';
import { sendCertificateEmailsBatch, isEmailServiceConfigured, CertificateEmailData } from '@/lib/email-service';
import { generateCertificatePDF } from '@/lib/certificate-pdf-generator';
import { uploadPDFToCloudinary } from '@/lib/upload';
import { logInfo, logError, logAudit, AuditAction } from '@/lib/logger';
import { getBaseUrl } from '@/lib/url-detector';

interface ProcessedEvent {
  eventId: string;
  eventName: string;
  endTime: string;
  checkedOutCount: number;
  certificatesGenerated: number;
  emailsSent: number;
  error?: string;
}

interface ProcessingResult {
  success: boolean;
  message: string;
  eventsProcessed: number;
  totalCheckedOut: number;
  totalCertificatesGenerated: number;
  totalEmailsSent: number;
  processedEvents: ProcessedEvent[];
  emailConfigured: boolean;
}

/**
 * Processa eventos finalizados com auto-checkout, geração de certificados e envio por email
 * Mantém a funcionalidade manual de baixar certificados
 */
export async function POST(): Promise<NextResponse<ProcessingResult>> {
  const startTime = Date.now();
  
  try {
    logInfo('🚀 Iniciando processamento automático de eventos finalizados');

    // Verificar configuração de email
    const emailConfigured = isEmailServiceConfigured();
    logInfo('📧 Configuração de email:', { configured: emailConfigured });

    // Buscar todos os eventos
    const events = await getAllEvents();
    const now = new Date();
    
    // Filtrar eventos que terminaram
    const endedEvents = events.filter(event => now >= event.endTime);
    
    if (endedEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum evento necessita processamento automático',
        eventsProcessed: 0,
        totalCheckedOut: 0,
        totalCertificatesGenerated: 0,
        totalEmailsSent: 0,
        processedEvents: [],
        emailConfigured,
      });
    }

    logInfo('📅 Eventos finalizados encontrados:', { 
      count: endedEvents.length,
      events: endedEvents.map(e => ({ id: e.id, name: e.name, endTime: e.endTime }))
    });

    let totalCheckedOut = 0;
    let totalCertificatesGenerated = 0;
    let totalEmailsSent = 0;
    const processedEvents: ProcessedEvent[] = [];

    // Processar cada evento finalizado
    for (const event of endedEvents) {
      const eventStartTime = Date.now();
      logInfo(`🎯 Processando evento: ${event.name}`, { eventId: event.id });

      try {
        // PASSO 1: Auto-checkout dos participantes
        logInfo(`1️⃣ Executando auto-checkout para evento ${event.id}`);
        const checkedOutCount = await autoCheckoutEventParticipants(event.id);
        totalCheckedOut += checkedOutCount;

        if (checkedOutCount === 0) {
          logInfo(`ℹ️ Nenhum participante para checkout no evento ${event.id}`);
          processedEvents.push({
            eventId: event.id,
            eventName: event.name,
            endTime: event.endTime.toISOString(),
            checkedOutCount: 0,
            certificatesGenerated: 0,
            emailsSent: 0,
          });
          continue;
        }

        // PASSO 2: Buscar participantes que fizeram checkout mas não têm certificado
        logInfo(`2️⃣ Buscando participantes que precisam de certificado no evento ${event.id}`);
        const registrations = await getEventRegistrations(event.id);
        const participantsNeedingCertificates = registrations.filter(reg => 
          reg.checkedOut && !reg.certificateGenerated
        );

        logInfo(`📊 Participantes encontrados:`, {
          eventId: event.id,
          total: registrations.length,
          checkedOut: registrations.filter(r => r.checkedOut).length,
          needingCertificates: participantsNeedingCertificates.length,
          alreadyHaveCertificates: registrations.filter(r => r.certificateGenerated).length
        });

        if (participantsNeedingCertificates.length === 0) {
          logInfo(`✅ Todos os participantes já possuem certificados no evento ${event.id}`);
          processedEvents.push({
            eventId: event.id,
            eventName: event.name,
            endTime: event.endTime.toISOString(),
            checkedOutCount,
            certificatesGenerated: 0,
            emailsSent: 0,
          });
          continue;
        }

        // PASSO 3: Gerar certificados para participantes
        logInfo(`3️⃣ Gerando certificados para ${participantsNeedingCertificates.length} participantes`);
        
        let certificatesGenerated = 0;
        const certificatesForEmail: CertificateEmailData[] = [];

        for (const registration of participantsNeedingCertificates) {
          try {
            logInfo(`📄 Gerando certificado para ${registration.userName}`, { 
              registrationId: registration.id,
              eventId: event.id 
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

            // Fazer upload para Cloudinary
            const cacheBreaker = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const uploadResult = await uploadPDFToCloudinary(
              certificateBuffer, 
              `certificate_auto_${registration.userId}_${event.id}_${cacheBreaker}`
            );

            const certificateUrl = uploadResult.secureUrl;

            // Atualizar registro com certificado gerado
            await updateRegistration(registration.id, {
              certificateGenerated: true,
              certificateUrl: certificateUrl,
            });

            certificatesGenerated++;

            // Preparar dados para email (se configurado)
            if (emailConfigured) {
              certificatesForEmail.push({
                userEmail: registration.userEmail,
                userName: registration.userName,
                eventName: event.name,
                eventDate: event.date,
                certificateUrl: certificateUrl,
                eventId: event.id,
              });
            }

            logInfo(`✅ Certificado gerado com sucesso`, { 
              userName: registration.userName,
              certificateUrl: certificateUrl.substring(0, 50) + '...'
            });

            // Log de auditoria
            logAudit(AuditAction.CERTIFICATE_GENERATE, registration.userId, true, {
              eventId: event.id,
              registrationId: registration.id,
              certificateUrl,
              generationType: 'auto-process',
              trigger: 'event-end-automation'
            });

          } catch (certError) {
            logError(`❌ Erro ao gerar certificado para ${registration.userName}`, certError as Error, {
              registrationId: registration.id,
              eventId: event.id,
              userName: registration.userName
            });

            // Log de auditoria para falha
            logAudit(AuditAction.CERTIFICATE_GENERATE, registration.userId, false, {
              eventId: event.id,
              registrationId: registration.id,
              error: (certError as Error).message,
              trigger: 'event-end-automation'
            });
          }
        }

        totalCertificatesGenerated += certificatesGenerated;

        // PASSO 4: Enviar emails com certificados (se configurado e houver certificados)
        let emailsSent = 0;
        
        if (emailConfigured && certificatesForEmail.length > 0) {
          logInfo(`4️⃣ Enviando ${certificatesForEmail.length} emails com certificados`);
          
          try {
            const emailResult = await sendCertificateEmailsBatch(certificatesForEmail, {
              subject: `🎖️ Certificado de Participação - ${event.name}`,
              fromName: 'Sistema de Eventos'
            });

            emailsSent = emailResult.sent;
            totalEmailsSent += emailsSent;

            logInfo('📧 Resultado do envio de emails:', {
              eventId: event.id,
              total: certificatesForEmail.length,
              sent: emailResult.sent,
              failed: emailResult.failed,
              successRate: `${((emailResult.sent / certificatesForEmail.length) * 100).toFixed(1)}%`
            });

            // Log de auditoria para emails
            logAudit(AuditAction.CERTIFICATE_GENERATE, 'system', true, {
              eventId: event.id,
              action: 'batch_email_send',
              emailsSent: emailResult.sent,
              emailsFailed: emailResult.failed,
              trigger: 'event-end-automation'
            });

          } catch (emailError) {
            logError('❌ Erro no envio em lote de emails', emailError as Error, {
              eventId: event.id,
              certificatesCount: certificatesForEmail.length
            });
          }
        } else if (!emailConfigured) {
          logInfo('📧 Email não configurado - certificados disponíveis apenas para download manual');
        }

        // Adicionar resultado do evento processado
        processedEvents.push({
          eventId: event.id,
          eventName: event.name,
          endTime: event.endTime.toISOString(),
          checkedOutCount,
          certificatesGenerated,
          emailsSent,
        });

        const eventDuration = Date.now() - eventStartTime;
        logInfo(`✅ Evento processado com sucesso em ${eventDuration}ms`, {
          eventId: event.id,
          eventName: event.name,
          checkedOut: checkedOutCount,
          certificatesGenerated,
          emailsSent
        });

      } catch (eventError) {
        logError(`❌ Erro ao processar evento ${event.id}`, eventError as Error, {
          eventId: event.id,
          eventName: event.name
        });

        processedEvents.push({
          eventId: event.id,
          eventName: event.name,
          endTime: event.endTime.toISOString(),
          checkedOutCount: 0,
          certificatesGenerated: 0,
          emailsSent: 0,
          error: (eventError as Error).message,
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const result: ProcessingResult = {
      success: true,
      message: `Processamento automático concluído para ${endedEvents.length} eventos em ${totalDuration}ms`,
      eventsProcessed: endedEvents.length,
      totalCheckedOut,
      totalCertificatesGenerated,
      totalEmailsSent,
      processedEvents,
      emailConfigured,
    };

    logInfo('🎉 Processamento automático concluído com sucesso', {
      duration: `${totalDuration}ms`,
      eventsProcessed: endedEvents.length,
      totalCheckedOut,
      totalCertificatesGenerated,
      totalEmailsSent,
      emailConfigured
    });

    return NextResponse.json(result);

  } catch (error) {
    const duration = Date.now() - startTime;
    logError('💥 Erro crítico no processamento automático', error as Error, { duration });

    return NextResponse.json(
      {
        success: false,
        message: 'Erro interno no processamento automático',
        eventsProcessed: 0,
        totalCheckedOut: 0,
        totalCertificatesGenerated: 0,
        totalEmailsSent: 0,
        processedEvents: [],
        emailConfigured: isEmailServiceConfigured(),
      } as ProcessingResult,
      { status: 500 }
    );
  }
}

/**
 * GET endpoint para verificar status do serviço
 */
export async function GET() {
  try {
    const emailConfigured = isEmailServiceConfigured();
    const baseUrl = getBaseUrl();
    
    return NextResponse.json({
      status: 'ok',
      service: 'Auto Process Events',
      timestamp: new Date().toISOString(),
      emailConfigured,
      baseUrl,
      endpoints: {
        process: `${baseUrl}/api/auto-process-events`,
        manualCheckout: `${baseUrl}/api/auto-checkout-all`,
        generateCertificate: `${baseUrl}/api/generate-certificate`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Service health check failed',
        error: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
