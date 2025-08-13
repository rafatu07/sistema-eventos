import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary } from '@/lib/upload';
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

    let generationType: 'image' | 'pdf' | 'svg-fallback' = 'pdf';
    
    // 🚀 NOVO FLUXO UNIFICADO: SEMPRE PNG PRIMEIRO (sugestão do usuário implementada)
    console.log('🖼️  Implementando fluxo unificado: PNG com multipliers extremos');

    // 🚀 NOVA ESTRATÉGIA VERCEL-OPTIMIZED: Fallback inteligente
    console.log('🎯 PASSO 1: Tentando método otimizado para Vercel');
    
    let imageBuffer: Buffer | null = null;
    let generationMethod = '';
    
    // TENTATIVA 1: Cloudinary Transformations (mais confiável para Vercel)
    try {
      console.log('☁️ Tentando Cloudinary Transformations...');
      const cloudinaryResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/certificate-cloudinary`, {
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

      if (cloudinaryResponse.ok) {
        imageBuffer = Buffer.from(await cloudinaryResponse.arrayBuffer());
        generationMethod = 'CLOUDINARY';
        console.log('🎉 Cloudinary Transformations funcionou!');
        
        logInfo('☁️ PNG gerado via Cloudinary Transformations', { 
          userId, 
          eventId, 
          imageSize: imageBuffer.length,
          method: 'Cloudinary - 100% compatível com Vercel'
        });
      } else {
        throw new Error(`Cloudinary falhou: ${cloudinaryResponse.status}`);
      }
      
    } catch (cloudinaryError) {
      console.warn('⚠️ Cloudinary falhou, tentando Playwright...', cloudinaryError);
      
      // TENTATIVA 2: Playwright (apenas como fallback)
      try {
        console.log('🎭 Tentando Playwright...');
        const playwrightResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/certificate-playwright`, {
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

        if (playwrightResponse.ok) {
          imageBuffer = Buffer.from(await playwrightResponse.arrayBuffer());
          generationMethod = 'PLAYWRIGHT_FALLBACK';
          console.log('🎉 Playwright fallback funcionou!');
          
          logInfo('🎭 PNG gerado via Playwright (fallback)', { 
            userId, 
            eventId, 
            imageSize: imageBuffer.length,
            method: 'Playwright - fallback apenas'
          });
        } else {
          throw new Error(`Playwright falhou: ${playwrightResponse.status}`);
        }
        
      } catch (playwrightError) {
        console.warn('⚠️ Playwright também falhou:', playwrightError);
        throw new Error(`Cloudinary E Playwright falharam: ${(cloudinaryError as Error).message} | ${(playwrightError as Error).message}`);
      }
    }
    
    if (!imageBuffer) {
      throw new Error('Falha em gerar imagem via HTML/browsers');
    }

    console.log('🎯 PASSO 2: Salvando PNG no Cloudinary...');
    
    // SEMPRE salvar PNG no Cloudinary (único fonte da verdade)
    const cacheBreaker = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const uploadResult = await uploadImageToCloudinary(imageBuffer, `certificate_${generationMethod}_${userId}_${eventId}_${cacheBreaker}`);
    const certificateUrl = uploadResult.secureUrl;
    generationType = 'image';
    
    logInfo('✅ Certificado PNG salvo no Cloudinary', { 
      userId, 
      eventId, 
      publicId: uploadResult.publicId,
      certificateUrl: certificateUrl.substring(0, 50) + '...',
      generationMethod: generationMethod,
      success: 'Certificado perfeito gerado!'
    });

    console.log('🎯 PASSO 3: URL será salva no Firebase (próximo)');

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

