import { NextRequest, NextResponse } from 'next/server';
import { getRegistrationById, updateRegistration } from '@/lib/firestore';
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
    const { registrationId, userId: bodyUserId } = body;
    userId = bodyUserId;

    // Rate limiting baseado no usuário
    const identifier = getUserIdentifier(userId, request);
    const rateLimitResult = rateLimit(identifier, RATE_LIMIT_CONFIGS.ADMIN);
    
    if (!rateLimitResult.success) {
      logInfo('Rate limit excedido para exclusão individual de certificado', { 
        userId, 
        registrationId,
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

    logInfo('🗑️ Iniciando exclusão individual de certificado', { 
      registrationId, 
      userId 
    });

    // Validações básicas
    if (!registrationId || !userId) {
      logInfo('Dados obrigatórios faltando para exclusão individual de certificado');
      return NextResponse.json(
        { error: 'RegistrationId e UserId são obrigatórios' },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Buscar o registro específico
    logInfo('🔍 Buscando registro específico...', { registrationId });
    const registration = await getRegistrationById(registrationId);

    if (!registration) {
      return NextResponse.json(
        { error: 'Registro não encontrado' },
        { 
          status: 404,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    if (!registration.certificateGenerated || !registration.certificateUrl) {
      return NextResponse.json(
        { error: 'Este usuário não possui certificado gerado' },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    logInfo(`🔄 Processando exclusão do certificado de ${registration.userName}`, {
      certificateUrl: registration.certificateUrl?.substring(0, 50) + '...'
    });

    // Extrair public_id da URL do Cloudinary
    const publicId = extractPublicIdFromCloudinaryUrl(registration.certificateUrl);
    
    if (publicId) {
      logInfo(`🗂️ Deletando do Cloudinary: ${publicId}`);
      
      // Deletar do Cloudinary
      try {
        const cloudinaryResult = await cloudinary.uploader.destroy(publicId);
        logInfo('☁️ Resultado do Cloudinary:', cloudinaryResult);
        
        if (cloudinaryResult.result === 'ok') {
          logInfo(`✅ Certificado deletado com sucesso do Cloudinary: ${publicId}`);
        } else {
          logInfo(`⚠️ Cloudinary retornou: ${cloudinaryResult.result} para ${publicId}`);
        }
      } catch (cloudinaryError) {
        logError('Erro ao deletar do Cloudinary', cloudinaryError as Error, { publicId });
        // Continue mesmo se falhar no Cloudinary - ainda atualizar o Firestore
      }
    } else {
      logInfo('⚠️ Não foi possível extrair public_id da URL do Cloudinary');
    }

    // Atualizar registro no Firestore - remover certificado
    await updateRegistration(registration.id, {
      certificateGenerated: false,
      certificateUrl: undefined
    });

    // Log de auditoria
    logAudit(
      AuditAction.SYSTEM_ERROR, // Usando como ação de administração
      userId,
      true,
      {
        action: 'DELETE_INDIVIDUAL_CERTIFICATE',
        registrationId,
        userName: registration.userName,
        publicId,
        duration: Date.now() - startTime
      }
    );

    const duration = Date.now() - startTime;
    logInfo(`✅ Certificado de ${registration.userName} removido com sucesso`, {
      registrationId,
      duration
    });

    return NextResponse.json({
      success: true,
      message: `Certificado de ${registration.userName} removido com sucesso`,
      userName: registration.userName
    }, {
      headers: createRateLimitHeaders(rateLimitResult)
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = (error as Error).message || 'Erro interno do servidor';
    
    logError('Erro na exclusão individual de certificado', error as Error, {
      userId,
      duration
    });
    
    // Log de auditoria para falha
    logAudit(AuditAction.SYSTEM_ERROR, userId || 'unknown', false, {
      action: 'DELETE_INDIVIDUAL_CERTIFICATE',
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
    // Padrão mais robusto para URLs do Cloudinary
    const patterns = [
      // Padrão com versão: /v1234567890/path/to/file.ext
      /\/(?:v\d+\/)?(.*?)\.[^.\/]+$/,
      // Padrão sem versão: /path/to/file.ext
      /\/([^\/]+)\.[^.\/]+$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Remove folders do path se houver (ex: certificates/filename -> filename)
        const publicId = match[1];
        logInfo(`🔍 Public ID extraído: ${publicId} da URL: ${url.substring(0, 50)}...`);
        return publicId;
      }
    }

    return null;
  } catch (error) {
    logError('Erro ao extrair public_id da URL do Cloudinary', error as Error, { url });
    return null;
  }
}
