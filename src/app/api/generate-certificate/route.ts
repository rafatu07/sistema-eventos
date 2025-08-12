import { NextRequest, NextResponse } from 'next/server';
import { generateCertificatePDF } from '@/lib/pdf-generator';
import { generateCertificateImage } from '@/lib/certificate-image-generator';
import { uploadPDFToCloudinary, uploadImageToCloudinary } from '@/lib/upload';
import { updateRegistration } from '@/lib/firestore';
import { rateLimit, getUserIdentifier, RATE_LIMIT_CONFIGS, createRateLimitHeaders } from '@/lib/rate-limit';
import { sanitizeInput } from '@/lib/validators';
import { logError, logInfo, logAudit, AuditAction } from '@/lib/logger';
import { getCertificateConfig } from '@/lib/certificate-config';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string = '';
  
  try {
    const body = await request.json();
    const { registrationId, eventId, userId: bodyUserId, userName, eventName, eventDate, eventStartTime, eventEndTime } = body;
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

    const certificateData = {
      userName: sanitizedUserName,
      eventName: sanitizedEventName,
      eventDate: new Date(eventDate),
      eventStartTime: eventStartTime ? new Date(eventStartTime) : undefined,
      eventEndTime: eventEndTime ? new Date(eventEndTime) : undefined,
      eventId: eventId,
    };

    // Buscar configurações personalizadas do certificado para este evento
    console.log('🔍 Buscando configurações do certificado para evento:', eventId);
    const certificateConfig = await getCertificateConfig(eventId);
    
    if (certificateConfig) {
      console.log('✅ Configurações personalizadas encontradas:', {
        template: certificateConfig.template,
        hasLogo: !!certificateConfig.logoUrl,
        includeQRCode: certificateConfig.includeQRCode
      });
    } else {
      console.log('⚠️  Nenhuma configuração personalizada encontrada, usando padrão');
    }

    // Preparar dados completos para geração
    const fullCertificateData = {
      ...certificateData,
      config: certificateConfig // Incluir configurações personalizadas
    };

    let certificateUrl: string;
    let generationType: 'image' | 'pdf' = 'image';

    try {
      // Tentar gerar como imagem PNG primeiro (mais confiável para web)
      console.log('🖼️  Tentando gerar certificado como imagem PNG com configurações:', {
        hasConfig: !!certificateConfig,
        template: certificateConfig?.template || 'default'
      });
      
      const imageBuffer = await generateCertificateImage(fullCertificateData);
      
      logInfo('Imagem PNG gerada com sucesso', { 
        userId, 
        eventId, 
        imageSize: imageBuffer.length 
      });

      // Upload imagem para Cloudinary
      const uploadResult = await uploadImageToCloudinary(imageBuffer, `certificate_${userId}_${eventId}`);
      certificateUrl = uploadResult.secureUrl;
      
      logInfo('Certificado (imagem) enviado para Cloudinary', { 
        userId, 
        eventId, 
        certificateUrl: certificateUrl.substring(0, 50) + '...'
      });

    } catch (imageError) {
      console.warn('Falha ao gerar como imagem, tentando PDF:', imageError);
      
      try {
        // Fallback: gerar como PDF
        console.log('📄 Gerando PDF como fallback com configurações personalizadas:', {
          hasConfig: !!certificateConfig,
          template: certificateConfig?.template || 'default'
        });
        
        const pdfBytes = await generateCertificatePDF(fullCertificateData);
        
        logInfo('PDF gerado com sucesso (fallback)', { 
          userId, 
          eventId, 
          pdfSize: pdfBytes.length 
        });

        // Convert Uint8Array to Buffer for upload
        const pdfBuffer = Buffer.from(pdfBytes);

        // Upload PDF to Cloudinary
        const uploadResult = await uploadPDFToCloudinary(pdfBuffer, `certificate_${userId}_${eventId}`);
        certificateUrl = uploadResult.secureUrl;
        generationType = 'pdf';
        
        logInfo('Certificado (PDF) enviado para Cloudinary', { 
          userId, 
          eventId, 
          certificateUrl: certificateUrl.substring(0, 50) + '...'
        });

      } catch (pdfError) {
        console.error('Falha tanto em imagem quanto PDF:', { imageError, pdfError });
        throw new Error(`Erro na geração: Imagem - ${(imageError as Error).message}; PDF - ${(pdfError as Error).message}`);
      }
    }

    // Update registration to mark certificate as generated
    await updateRegistration(registrationId, {
      certificateGenerated: true,
      certificateUrl: certificateUrl,
    });

    // Log de auditoria
    logAudit(AuditAction.CERTIFICATE_GENERATE, userId, true, {
      eventId,
      registrationId,
      certificateUrl,
      generationType
    });

    const duration = Date.now() - startTime;
    logInfo('Certificado gerado com sucesso', {
      userId,
      eventId,
      registrationId,
      duration,
      type: generationType
    });

    return NextResponse.json({
      success: true,
      certificateUrl,
      certificateType: generationType,
      message: `Certificado gerado com sucesso como ${generationType === 'image' ? 'imagem PNG' : 'PDF'}!`,
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
      { 
        status: 500,
        headers: createRateLimitHeaders({
          limit: RATE_LIMIT_CONFIGS.CERTIFICATE.maxRequests,
          remaining: 0,
          resetTime: Date.now() + RATE_LIMIT_CONFIGS.CERTIFICATE.windowMs
        })
      }
    );
  }
}

