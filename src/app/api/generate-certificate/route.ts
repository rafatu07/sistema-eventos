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
      config: certificateConfig || undefined // Converter null para undefined
    };

    let certificateUrl: string;
    let generationType: 'image' | 'pdf' | 'svg-fallback' = 'pdf';
    
    // 🚀 NOVO FLUXO UNIFICADO: SEMPRE PNG PRIMEIRO (sugestão do usuário implementada)
    console.log('🖼️  Implementando fluxo unificado: PNG com multipliers extremos');

    // ✅ NOVO MÉTODO: Gerar PNG usando exatamente o mesmo código do preview
    console.log('🎯 PASSO 1: Gerando PNG via HTML (IDÊNTICO ao preview)');
    
    try {
      // NOVA ABORDAGEM: Usar API HTML que replica 100% o preview
      const htmlResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/certificate-html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: fullCertificateData.userName,
          eventName: fullCertificateData.eventName,
          eventDate: fullCertificateData.eventDate,
          eventStartTime: fullCertificateData.eventStartTime,
          eventEndTime: fullCertificateData.eventEndTime,
          config: fullCertificateData.config
        })
      });

      if (!htmlResponse.ok) {
        throw new Error(`API HTML falhou: ${htmlResponse.status}`);
      }

      const imageBuffer = Buffer.from(await htmlResponse.arrayBuffer());
      
      logInfo('✅ PNG gerado via HTML (100% idêntico ao preview)', { 
        userId, 
        eventId, 
        imageSize: imageBuffer.length,
        note: 'Usando exato mesmo código do preview - garantia total'
      });

      console.log('🎯 PASSO 2: Salvando PNG no Cloudinary com cache-buster');
      
      // SEMPRE salvar PNG no Cloudinary (único fonte da verdade)
      const cacheBreaker = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const uploadResult = await uploadImageToCloudinary(imageBuffer, `certificate_${userId}_${eventId}_${cacheBreaker}`);
      certificateUrl = uploadResult.secureUrl;
      generationType = 'image';
      
      logInfo('✅ Certificado PNG salvo no Cloudinary', { 
        userId, 
        eventId, 
        publicId: uploadResult.publicId,
        certificateUrl: certificateUrl.substring(0, 50) + '...',
        success: 'Fontes grandes preservadas!'
      });

      console.log('🎯 PASSO 3: URL será salva no Firebase (próximo)');
      
    } catch (htmlError) {
      console.error('❌ FALHA na geração HTML:', htmlError);
      
      // FALLBACK 1: Canvas tradicional (com correções de layout)
      console.warn('🆘 FALLBACK 1: Tentando Canvas tradicional...');
      
      try {
        const imageBuffer = await generateCertificateImage(fullCertificateData);
        
        logInfo('⚠️  PNG Canvas de emergência gerado', { 
          userId, 
          eventId, 
          imageSize: imageBuffer.length,
          warning: 'Usando Canvas - pode ter pequenas diferenças do preview'
        });

        const cacheBreaker = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const uploadResult = await uploadImageToCloudinary(imageBuffer, `certificate_CANVAS_${userId}_${eventId}_${cacheBreaker}`);
        certificateUrl = uploadResult.secureUrl;
        generationType = 'image';
        
        logInfo('✅ FALLBACK Canvas salvo no Cloudinary', { 
          userId, 
          eventId, 
          publicId: uploadResult.publicId,
          certificateUrl: certificateUrl.substring(0, 50) + '...'
        });
        
      } catch (canvasError) {
        console.error('❌ FALLBACK Canvas também falhou:', canvasError);
        
        // FALLBACK 2: PDF tradicional (última opção)
        console.warn('🆘 FALLBACK 2: Tentando PDF tradicional...');
        
        try {
          const pdfBytes = await generateCertificatePDF(fullCertificateData);
          
          logInfo('⚠️  PDF de emergência gerado', { 
            userId, 
            eventId, 
            pdfSize: pdfBytes.length,
            warning: 'Sistema antigo - fontes menores que configurado'
          });

          const cacheBreaker = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const pdfBuffer = Buffer.from(pdfBytes);
          const uploadResult = await uploadPDFToCloudinary(pdfBuffer, `certificate_PDF_${userId}_${eventId}_${cacheBreaker}`);
          certificateUrl = uploadResult.secureUrl;
          generationType = 'pdf';
          
        } catch (pdfError) {
          console.error('💀 FALHA TOTAL - HTML, Canvas E PDF falharam:', { htmlError, canvasError, pdfError });
          throw new Error(`FALHA TOTAL: HTML(${(htmlError as Error).message}) + Canvas(${(canvasError as Error).message}) + PDF(${(pdfError as Error).message})`);
        }
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
      message: `Certificado gerado com sucesso como ${
        generationType === 'image' ? 'imagem PNG' : 
        generationType === 'pdf' ? 'PDF' : 
        'SVG de fallback'
      }!`,
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

