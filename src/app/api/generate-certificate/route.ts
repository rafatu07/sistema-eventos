import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary, uploadPDFToCloudinary } from '@/lib/upload';
import { updateRegistration } from '@/lib/firestore';
import { rateLimit, getUserIdentifier, RATE_LIMIT_CONFIGS, createRateLimitHeaders } from '@/lib/rate-limit';
import { sanitizeInput } from '@/lib/validators';
import { logError, logInfo, logAudit, AuditAction } from '@/lib/logger';

// import { getCertificateConfig } from '@/lib/certificate-config'; // Temporariamente comentado

// Configurações da API para Vercel (sem vercel.json)
export const runtime = 'nodejs';
export const maxDuration = 60; // máximo 60s sem vercel.json
export const dynamic = 'force-dynamic';

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

    // ✅ BUSCAR CONFIGURAÇÕES PERSONALIZADAS DO EVENTO
    console.log('🔍 Buscando configurações personalizadas para evento:', eventId);
    let certificateConfig = null;
    
    try {
      // Importar getCertificateConfig dinamicamente 
      const { getCertificateConfig } = await import('@/lib/certificate-config');
      certificateConfig = await getCertificateConfig(eventId);
      
      if (certificateConfig) {
        console.log('✅ Configuração personalizada encontrada:', {
          template: certificateConfig.template,
          colors: { primary: certificateConfig.primaryColor, secondary: certificateConfig.secondaryColor },
          hasLogo: !!certificateConfig.logoUrl,
          hasQR: certificateConfig.includeQRCode
        });
      } else {
        console.log('💡 Nenhuma configuração personalizada, usando padrão');
      }
    } catch (configError) {
      console.warn('⚠️ Erro ao buscar configurações, usando padrão:', configError);
    }
    
    // 🚨 LOGS CRÍTICOS PARA DEBUG DE PRODUÇÃO
    // 🚨 PROBLEMA IDENTIFICADO: As aspas estão sendo ADICIONADAS aqui nos logs!
    console.log('🎯 DADOS DO CERTIFICADO COMPLETOS:', {
      userName: certificateData.userName,  // ✅ SEM aspas extras nos logs
      eventName: certificateData.eventName,  // ✅ SEM aspas extras nos logs
      hasConfig: !!certificateConfig,
      template: certificateConfig?.template,
      environment: process.env.NODE_ENV,
      forceASCII: process.env.FORCE_ASCII_ONLY
    });

    // Dados serão passados diretamente para os geradores

    let generationType: 'image' | 'pdf' | 'svg-fallback' = 'pdf';
    
    // 🚀 NOVO FLUXO UNIFICADO: SEMPRE PNG PRIMEIRO (sugestão do usuário implementada)
    console.log('🖼️  Implementando fluxo unificado: PNG com multipliers extremos');

    // 🚀 NOVA ESTRATÉGIA VERCEL-OPTIMIZED: Fallback inteligente
    console.log('🎯 PASSO 1: Tentando método otimizado para Vercel');
    
    let imageBuffer: Buffer | null = null;
    let generationMethod = '';
    
    // 🚫 CANVAS PNG TEMPORARIAMENTE DESABILITADO - problemas no Vercel
    console.log('🚫 Canvas PNG desabilitado devido a problemas de renderização no Vercel');
    console.log('🔄 Mudando para geração PDF direta usando componente reutilizável');
    
    try {
      console.log('🎨 Gerando certificado PDF...');
      
      // Importar gerador de PDF de certificado
      const { generateCertificatePDF } = await import('@/lib/certificate-pdf-generator');
      
      imageBuffer = await generateCertificatePDF({
        userName: certificateData.userName,
        eventName: certificateData.eventName,
        eventDate: certificateData.eventDate,
        eventStartTime: certificateData.eventStartTime,
        eventEndTime: certificateData.eventEndTime,
        eventId: eventId,
        config: certificateConfig
      });
      
      generationMethod = 'PDF_DIRECT';
      console.log('🎉 Certificado PDF gerado com componente reutilizável!');
      
      logInfo('✅ Certificado PDF gerado', { 
        userId, 
        eventId, 
        pdfSize: imageBuffer.length,
        method: 'PDF - geração direta com componente reutilizável'
      });
      
    } catch (pdfError) {
      console.error('❌ Geração PDF falhou:', pdfError);
      console.error('🔍 Detalhes do erro PDF:', {
        message: (pdfError as Error).message,
        stack: (pdfError as Error).stack?.substring(0, 500)
      });
      
      // 🚨 FALLBACK AUTOMÁTICO: Voltar para Canvas PNG se PDF falhar
      console.log('🔄 FALLBACK AUTOMÁTICO: Tentando Canvas PNG...');
      
      try {
        // Re-habilitar Canvas temporariamente como fallback
        const { generateCertificateImage } = await import('@/lib/certificate-image-generator');
        
        imageBuffer = await generateCertificateImage({
          userName: certificateData.userName,
          eventName: certificateData.eventName,
          eventDate: certificateData.eventDate,
          eventStartTime: certificateData.eventStartTime,
          eventEndTime: certificateData.eventEndTime,
          eventId: eventId,
          config: certificateConfig || undefined
        });
        
        generationMethod = 'CANVAS_PNG_FALLBACK';
        console.log('✅ FALLBACK bem-sucedido: Canvas PNG funcionou');
        
        logInfo('✅ Certificado gerado via FALLBACK', { 
          userId, 
          eventId, 
          imageSize: imageBuffer.length,
          method: 'Canvas PNG - fallback após falha do PDF'
        });
        
      } catch (fallbackError) {
        console.error('❌ FALLBACK também falhou:', fallbackError);
        throw new Error(`PDF falhou: ${(pdfError as Error).message}. Fallback PNG também falhou: ${(fallbackError as Error).message}`);
      }
    }
    
    if (!imageBuffer) {
      throw new Error('Falha em gerar imagem via HTML/browsers');
    }

    console.log('🎯 PASSO 2: Definindo estratégia de URL...');
    
    // 🔄 NOVA OPÇÃO: API Dinâmico ou Cloudinary?
    // TEMPORÁRIO: Forçando API dinâmico para teste
    const USE_DYNAMIC_API = true; // FORÇADO PARA TESTE
    
    console.log('🔍 DIAGNÓSTICO DE ESTRATÉGIA:', {
      USE_DYNAMIC_CERTIFICATES: process.env.USE_DYNAMIC_CERTIFICATES || 'undefined',
      FORCED_MODE: 'API_DINAMICO_FORCADO',
      parsed: USE_DYNAMIC_API,
      strategy: USE_DYNAMIC_API ? '🌐 API DINÂMICO (FORÇADO)' : 'CLOUDINARY STORAGE'
    });
    
    let certificateUrl: string | undefined;
    
    if (USE_DYNAMIC_API) {
      // ✅ ESTRATÉGIA SIMPLIFICADA: Sempre gerar fresh, não salvar URLs
      console.log('✅ Certificado disponível via API dinâmica - sempre fresh');
      
      logInfo('✅ Certificado configurado para geração dinâmica', {
        userId,
        eventId,
        registrationId,
        strategy: 'Fresh generation sempre'
      });
      
      // Não precisamos de URL salva, sempre geramos fresh
      certificateUrl = undefined;
      
    } else {
      // 📁 ESTRATÉGIA TRADICIONAL: Cloudinary storage
      console.log('📁 Usando estratégia de storage (Cloudinary)...');
      
      const cacheBreaker = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let uploadResult;
      
      if (generationMethod.includes('PDF')) {
        console.log('📄 Salvando como PDF...');
        uploadResult = await uploadPDFToCloudinary(imageBuffer, `certificate_${generationMethod}_${userId}_${eventId}_${cacheBreaker}`);
        generationType = 'pdf';
      } else {
        console.log('🖼️ Salvando como PNG (fallback)...');
        uploadResult = await uploadImageToCloudinary(imageBuffer, `certificate_${generationMethod}_${userId}_${eventId}_${cacheBreaker}`);
        generationType = 'image';
      }
      
      certificateUrl = uploadResult.secureUrl;
      
      logInfo(`✅ Certificado ${generationType.toUpperCase()} salvo no Cloudinary`, { 
        userId, 
        eventId, 
        publicId: uploadResult.publicId,
        certificateUrl: certificateUrl.substring(0, 50) + '...',
        generationMethod: generationMethod,
        success: `Certificado ${generationType.toUpperCase()} gerado com sucesso!`
      });
    }
    
    console.log('🎯 PASSO 3: URL será salva no Firebase (próximo)');

    // Update registration to mark certificate as generated
    await updateRegistration(registrationId, {
      certificateGenerated: true,
      certificateUrl: certificateUrl, // null para dinâmico, URL real para storage
    });

    // Log de auditoria
    logAudit(AuditAction.CERTIFICATE_GENERATE, userId, true, {
      eventId,
      registrationId,
      certificateUrl: certificateUrl ?? `Dynamic API: /api/certificate/download?registrationId=${registrationId}`,
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
      certificateType: USE_DYNAMIC_API ? 'dynamic-pdf' : generationType,
      strategy: USE_DYNAMIC_API ? 'API Dinâmico' : 'Cloudinary Storage',
      message: USE_DYNAMIC_API 
        ? 'Certificado configurado como dinâmico (sem storage)!'
        : `Certificado gerado com sucesso como ${
            generationType === 'pdf' ? 'PDF' : 
            generationType === 'image' ? 'imagem PNG' : 
            'formato alternativo'
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

