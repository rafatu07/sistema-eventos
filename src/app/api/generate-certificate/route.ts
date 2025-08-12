import { NextRequest, NextResponse } from 'next/server';
import { generateCertificatePDF } from '@/lib/pdf-generator';
import { generateCertificateImage } from '@/lib/certificate-image-generator';
import { uploadPDFToCloudinary, uploadImageToCloudinary, getSecurePDFUrl } from '@/lib/upload';
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
    
    // 🚀 ESTRATÉGIA RADICAL: PDF em produção (sabemos que Helvetica funciona)
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = !!(process.env.VERCEL || process.env.VERCEL_URL);

    if (isProduction || isVercel) {
      // 🏭 PRODUÇÃO/VERCEL: Usar apenas PDF com Helvetica (100% confiável)
      console.log('🏭 PRODUÇÃO/VERCEL DETECTADO - usando exclusivamente PDF com Helvetica');
      console.log('⚡ Pulando Canvas completamente para evitar problemas de fonte');
      
      try {
        const pdfBytes = await generateCertificatePDF(fullCertificateData);
        
        logInfo('PDF de produção gerado com sucesso', { 
          userId, 
          eventId, 
          pdfSize: pdfBytes.length 
        });

        const pdfBuffer = Buffer.from(pdfBytes);
        const uploadResult = await uploadPDFToCloudinary(pdfBuffer, `certificate_PROD_${userId}_${eventId}`);
        
        // 🔐 Gerar URL segura (testa acesso público + fallback para URL assinada se necessário)
        try {
          certificateUrl = await getSecurePDFUrl(uploadResult.publicId, uploadResult.secureUrl);
          console.log('✅ URL segura gerada para produção');
        } catch (urlError) {
          console.warn('❌ Falha ao gerar URL segura, usando URL original:', urlError);
          certificateUrl = uploadResult.secureUrl;
        }
        
        generationType = 'pdf';
        
        logInfo('Certificado (PDF PRODUÇÃO) enviado para Cloudinary', { 
          userId, 
          eventId, 
          publicId: uploadResult.publicId,
          certificateUrl: certificateUrl.substring(0, 50) + '...'
        });

      } catch (pdfError) {
        // Em produção, se PDF falhar, usar SVG básico
        console.error('PDF de produção falhou, usando SVG emergencial:', pdfError);
        
        try {
          console.log('🆘 Usando SVG de emergência para produção...');
          
          const svgResponse = await fetch(`${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'https://sistema-eventos-nu.vercel.app'}/api/certificate-fallback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userName: fullCertificateData.userName,
              eventName: fullCertificateData.eventName,
              eventDate: fullCertificateData.eventDate,
              eventStartTime: fullCertificateData.eventStartTime,
              eventEndTime: fullCertificateData.eventEndTime,
            }),
          });
          
          if (!svgResponse.ok) {
            throw new Error(`SVG de emergência falhou: ${svgResponse.status}`);
          }
          
          const svgContent = await svgResponse.text();
          const svgBuffer = Buffer.from(svgContent, 'utf-8');
          const uploadResult = await uploadPDFToCloudinary(svgBuffer, `certificate_SVG_EMERGENCY_${userId}_${eventId}`);
          certificateUrl = uploadResult.secureUrl;
          generationType = 'svg-fallback';
          
          logInfo('Certificado SVG de emergência gerado', { 
            userId, 
            eventId, 
            certificateUrl: certificateUrl.substring(0, 50) + '...'
          });
          
        } catch (svgError) {
          console.error('FALHA COMPLETA EM PRODUÇÃO:', { pdfError, svgError });
          throw new Error(`FALHA CRÍTICA EM PRODUÇÃO: PDF - ${(pdfError as Error).message}; SVG - ${(svgError as Error).message}`);
        }
      }
      
    } else {
      // 💻 DESENVOLVIMENTO: Tentar imagem primeiro, depois PDF
      console.log('💻 DESENVOLVIMENTO - tentando imagem PNG primeiro');
      
      try {
        const imageBuffer = await generateCertificateImage(fullCertificateData);
        
        logInfo('Imagem PNG gerada com sucesso', { 
          userId, 
          eventId, 
          imageSize: imageBuffer.length 
        });

        const uploadResult = await uploadImageToCloudinary(imageBuffer, `certificate_DEV_${userId}_${eventId}`);
        certificateUrl = uploadResult.secureUrl;
        generationType = 'image';
        
        logInfo('Certificado (imagem dev) enviado para Cloudinary', { 
          userId, 
          eventId, 
          certificateUrl: certificateUrl.substring(0, 50) + '...'
        });

      } catch (imageError) {
        console.warn('Falha em imagem no desenvolvimento, usando PDF:', imageError);
        
        try {
          const pdfBytes = await generateCertificatePDF(fullCertificateData);
          
          logInfo('PDF de fallback gerado com sucesso', { 
            userId, 
            eventId, 
            pdfSize: pdfBytes.length 
          });

          const pdfBuffer = Buffer.from(pdfBytes);
          const uploadResult = await uploadPDFToCloudinary(pdfBuffer, `certificate_DEV_PDF_${userId}_${eventId}`);
          
          // Usar URL segura também em desenvolvimento para consistência
          try {
            certificateUrl = await getSecurePDFUrl(uploadResult.publicId, uploadResult.secureUrl);
            console.log('✅ URL segura gerada para desenvolvimento');
          } catch (urlError) {
            console.warn('❌ Falha ao gerar URL segura, usando URL original:', urlError);
            certificateUrl = uploadResult.secureUrl;
          }
          
          generationType = 'pdf';
          
          logInfo('Certificado (PDF fallback dev) enviado para Cloudinary', { 
            userId, 
            eventId, 
            publicId: uploadResult.publicId,
            certificateUrl: certificateUrl.substring(0, 50) + '...'
          });

        } catch (pdfError) {
          console.error('Erro completo no desenvolvimento:', { imageError, pdfError });
          throw new Error(`Erro no desenvolvimento - Imagem: ${(imageError as Error).message}, PDF: ${(pdfError as Error).message}`);
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

