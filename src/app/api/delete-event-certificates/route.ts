import { NextRequest, NextResponse } from 'next/server';
import { getEventRegistrations, updateRegistration } from '@/lib/firestore';
import { rateLimit, getUserIdentifier, RATE_LIMIT_CONFIGS, createRateLimitHeaders } from '@/lib/rate-limit';
import { logError, logInfo, logAudit, AuditAction } from '@/lib/logger';
import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string = '';
  
  try {
    const body = await request.json();
    const { eventId, userId: bodyUserId } = body;
    userId = bodyUserId;

    // Rate limiting baseado no usuário
    const identifier = getUserIdentifier(userId, request);
    const rateLimitResult = rateLimit(identifier, RATE_LIMIT_CONFIGS.ADMIN);
    
    if (!rateLimitResult.success) {
      logInfo('Rate limit excedido para exclusão de certificados', { 
        userId, 
        eventId,
        retryAfter: rateLimitResult.retryAfter 
      });
      
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    logInfo('🗑️  Iniciando exclusão de certificados do evento', { 
      eventId, 
      userId 
    });

    // Validações básicas
    if (!eventId || !userId) {
      logInfo('Dados obrigatórios faltando para exclusão de certificados');
      return NextResponse.json(
        { error: 'EventId e UserId são obrigatórios' },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Buscar todas as inscrições do evento que possuem certificados
    logInfo('🔍 Buscando inscrições do evento com certificados...', { eventId });
    const registrations = await getEventRegistrations(eventId);
    const registrationsWithCertificates = registrations.filter(reg => 
      reg.certificateGenerated && reg.certificateUrl
    );

    logInfo(`📊 Encontradas ${registrationsWithCertificates.length} inscrições com certificados`, { 
      eventId,
      totalRegistrations: registrations.length 
    });

    if (registrationsWithCertificates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum certificado encontrado para este evento',
        deletedCount: 0
      }, {
        headers: createRateLimitHeaders(rateLimitResult)
      });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Processar cada certificado
    for (const registration of registrationsWithCertificates) {
      try {
        logInfo(`🔄 Processando certificado do usuário ${registration.userName}`, {
          registrationId: registration.id,
          certificateUrl: registration.certificateUrl?.substring(0, 50) + '...'
        });

        // Extrair public_id da URL do Cloudinary
        if (registration.certificateUrl) {
          const publicId = extractPublicIdFromCloudinaryUrl(registration.certificateUrl);
          
          if (publicId) {
            logInfo(`🗂️  Deletando do Cloudinary: ${publicId}`);
            
            // Deletar do Cloudinary
            try {
              const cloudinaryResult = await cloudinary.uploader.destroy(publicId);
              logInfo('☁️  Resultado do Cloudinary:', cloudinaryResult);
            } catch (cloudinaryError) {
              logError('Erro ao deletar do Cloudinary', cloudinaryError as Error, { publicId });
              // Continue mesmo se falhar no Cloudinary - ainda atualizar o Firestore
            }
          }
        }

        // Atualizar registro no Firestore - remover certificado
        await updateRegistration(registration.id, {
          certificateGenerated: false,
          certificateUrl: undefined
        });

        logInfo(`✅ Certificado removido com sucesso para ${registration.userName}`);
        successCount++;

      } catch (error) {
        logError(`❌ Erro ao processar certificado do usuário ${registration.userName}`, error as Error);
        errorCount++;
        errors.push(`Erro no usuário ${registration.userName}: ${(error as Error).message}`);
      }
    }

    // Log de auditoria
    logAudit(
      AuditAction.SYSTEM_ERROR, // Usando como ação de administração
      userId,
      successCount > 0,
      {
        action: 'DELETE_EVENT_CERTIFICATES',
        eventId,
        totalCertificates: registrationsWithCertificates.length,
        successCount,
        errorCount,
        duration: Date.now() - startTime
      }
    );

    const duration = Date.now() - startTime;
    logInfo(`🏁 Exclusão de certificados finalizada`, {
      eventId,
      successCount,
      errorCount,
      duration
    });

    return NextResponse.json({
      success: true,
      message: `Certificados processados: ${successCount} removidos, ${errorCount} erros`,
      deletedCount: successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    }, {
      headers: createRateLimitHeaders(rateLimitResult)
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = (error as Error).message || 'Erro interno do servidor';
    
    logError('Erro na exclusão de certificados', error as Error, {
      userId,
      duration
    });
    
    // Log de auditoria para falha
    logAudit(AuditAction.SYSTEM_ERROR, userId || 'unknown', false, {
      action: 'DELETE_EVENT_CERTIFICATES',
      error: errorMessage
    });
    
    return NextResponse.json(
      { error: errorMessage },
      { 
        status: 500,
        headers: createRateLimitHeaders({
          limit: RATE_LIMIT_CONFIGS.ADMIN.maxRequests,
          remaining: 0,
          resetTime: Date.now() + RATE_LIMIT_CONFIGS.ADMIN.windowMs
        })
      }
    );
  }
}

/**
 * Extrai o public_id de uma URL do Cloudinary
 * Exemplo: https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg
 * Retorna: sample
 */
function extractPublicIdFromCloudinaryUrl(url: string): string | null {
  try {
    const urlPattern = /\/(?:v\d+\/)?([^\/]+)\.[^\/]+$/;
    const match = url.match(urlPattern);
    return match && match[1] ? match[1] : null;
  } catch (error) {
    console.error('Erro ao extrair public_id da URL:', error);
    return null;
  }
}
