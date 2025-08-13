import { NextRequest, NextResponse } from 'next/server';
import { getRegistrationById, getEvent } from '@/lib/firestore';
import { getCertificateConfig } from '@/lib/certificate-config';
import { generateCertificatePDF } from '@/lib/certificate-pdf-generator';
import { logInfo, logError } from '@/lib/logger';
import { rateLimit, getUserIdentifier } from '@/lib/rate-limit';

/**
 * 📄 API DINÂMICO - Gera certificado PDF em tempo real sem storage
 * 
 * URL: /api/certificate/download?registrationId=xxx
 * 
 * Vantagens:
 * - ✅ Sem dependência de storage externo
 * - ✅ Sempre atualizado com configurações mais recentes
 * - ✅ Zero custos de storage
 * - ✅ Puppeteer + @sparticuz/chromium para Vercel
 * 
 * Desvantagens:
 * - ⚠️ Mais lento (gera a cada acesso)
 * - ⚠️ Maior uso de servidor
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const userIp = getUserIdentifier('anonymous', request);

  try {
    // 🔒 Rate limiting - configuração simplificada para API dinâmica
    const rateLimitConfig = { windowMs: 60000, maxRequests: 10 }; // 10 requests por minuto
    const rateLimitResult = await rateLimit(userIp, rateLimitConfig);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // 🔍 Extrair registrationId da URL
    const { searchParams } = new URL(request.url);
    let registrationId = searchParams.get('registrationId');

    // 🧹 Limpar e validar registrationId
    if (registrationId) {
      // Remove qualquer parâmetro extra anexado
      const cleanedId = registrationId.split('?')[0]?.split('&')[0]?.trim();
      if (cleanedId) {
        registrationId = cleanedId;
        console.log('🔍 Processando registrationId:', { 
          original: searchParams.get('registrationId'), 
          cleaned: registrationId,
          length: registrationId.length
        });
      }
    }

    if (!registrationId) {
      return NextResponse.json(
        { error: 'Missing registrationId parameter' },
        { status: 400 }
      );
    }

    console.log('📄 Gerando certificado dinâmico para:', registrationId);

    // 📋 Buscar dados da inscrição
    const registration = await getRegistrationById(registrationId);
    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    // 🎪 Buscar dados do evento
    const event = await getEvent(registration.eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // 🕒 DEBUG: Verificar dados de data/hora do evento
    console.log('🕒 Dados de data/hora do evento:', {
      eventId: registration.eventId,
      eventName: event.name,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      dateType: typeof event.date,
      startTimeType: typeof event.startTime,
      endTimeType: typeof event.endTime,
      dateValid: event.date instanceof Date,
      startTimeValid: event.startTime instanceof Date,
      endTimeValid: event.endTime instanceof Date
    });

    // 🎨 Buscar configurações do certificado
    const certificateConfig = await getCertificateConfig(registration.eventId);
    
    console.log('✅ Dados carregados:', {
      userName: registration.userName,
      eventName: event.name,
      eventId: registration.eventId,
      hasConfig: !!certificateConfig
    });

    // 🔄 Gerar PDF dinamicamente com Puppeteer + @sparticuz/chromium
    const pdfBuffer = await generateCertificatePDF({
      userName: registration.userName,
      eventName: event.name,
      eventDate: event.date,
      eventStartTime: event.startTime,
      eventEndTime: event.endTime,
      eventId: registration.eventId,
      config: certificateConfig
    });

    const duration = Date.now() - startTime;
    logInfo('Certificado PDF gerado dinamicamente', {
      registrationId,
      userId: registration.userId,
      eventId: registration.eventId,
      duration,
      size: pdfBuffer.length
    });

    // 📤 Retornar PDF diretamente
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificado-${registration.userName.replace(/\s+/g, '-')}.pdf"`,
        'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
        'X-Generation-Time': `${duration}ms`,
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Erro na geração dinâmica do certificado:', error);
    
    logError('Erro na geração dinâmica de certificado', error as Error, {
      duration,
      registrationId: request.url.includes('registrationId=') 
        ? new URL(request.url).searchParams.get('registrationId') 
        : 'unknown'
    });

    return NextResponse.json(
      { 
        error: 'Failed to generate certificate',
        message: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
