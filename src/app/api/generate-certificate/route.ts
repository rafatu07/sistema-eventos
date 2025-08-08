import { NextRequest, NextResponse } from 'next/server';
import { generateCertificatePDF } from '@/lib/pdf-generator';
import { uploadPDFToCloudinary } from '@/lib/upload';
import { updateRegistration } from '@/lib/firestore';
import { rateLimit, getUserIdentifier, RATE_LIMIT_CONFIGS, createRateLimitHeaders } from '@/lib/rate-limit';
import { sanitizeInput } from '@/lib/validators';
import { logError, logInfo, logAudit, AuditAction } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string = '';
  
  try {
    const body = await request.json();
    const { registrationId, eventId, userId: bodyUserId, userName, eventName, eventDate } = body;
    userId = bodyUserId;

    // Rate limiting baseado no usuário
    const identifier = getUserIdentifier(userId, request);
    const rateLimitResult = rateLimit(identifier, RATE_LIMIT_CONFIGS.CERTIFICATE);
    
    if (!rateLimitResult.success) {
      logInfo('Rate limit excedido para geração de certificado', { 
        userId, 
        eventId,
        retryAfter: rateLimitResult.retryAfter 
      });
      
      return NextResponse.json(
        { error: 'Muitas tentativas de geração de certificado. Tente novamente em alguns minutos.' },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    logInfo('Iniciando geração de certificado', { 
      registrationId, 
      eventId, 
      userId,
      eventName: eventName?.substring(0, 20) + '...'
    });

    if (!registrationId || !eventId || !userId || !userName || !eventName || !eventDate) {
      logInfo('Dados obrigatórios faltando para geração de certificado');
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Sanitizar inputs
    const sanitizedUserName = sanitizeInput(userName);
    const sanitizedEventName = sanitizeInput(eventName);

    // Generate PDF
    const pdfBytes = await generateCertificatePDF({
      userName: sanitizedUserName,
      eventName: sanitizedEventName,
      eventDate: new Date(eventDate),
    });

    logInfo('PDF gerado com sucesso', { 
      userId, 
      eventId, 
      pdfSize: pdfBytes.length 
    });

    // Convert Uint8Array to Buffer for upload
    const pdfBuffer = Buffer.from(pdfBytes);

    // Upload PDF to Cloudinary
    const certificateUrl = await uploadPDFToCloudinary(pdfBuffer, `certificate_${userId}_${eventId}`);

    logInfo('Certificado enviado para Cloudinary', { 
      userId, 
      eventId, 
      certificateUrl: certificateUrl.substring(0, 50) + '...'
    });

    // Update registration to mark certificate as generated
    await updateRegistration(registrationId, {
      certificateGenerated: true,
    });

    // Log de auditoria
    logAudit(AuditAction.CERTIFICATE_GENERATE, userId, true, {
      eventId,
      registrationId,
      certificateUrl
    });

    const duration = Date.now() - startTime;
    logInfo('Certificado gerado com sucesso', {
      userId,
      eventId,
      registrationId,
      duration
    });

    return NextResponse.json({
      success: true,
      certificateUrl,
      message: 'Certificado gerado com sucesso!',
    }, {
      headers: createRateLimitHeaders(rateLimitResult)
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Erro na geração de certificado', error as Error, {
      userId,
      duration
    });

    // Log de auditoria para falha
    if (userId) {
      logAudit(AuditAction.CERTIFICATE_GENERATE, userId, false, {
        error: (error as Error).message
      });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

