import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary } from '@/lib/upload';
import { rateLimit, getUserIdentifier, RATE_LIMIT_CONFIGS, createRateLimitHeaders } from '@/lib/rate-limit';
import { logError, logInfo } from '@/lib/logger';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let identifier = '';
  
  try {
    // Rate limiting
    identifier = getUserIdentifier('anonymous', request);
    const rateLimitResult = rateLimit(identifier, RATE_LIMIT_CONFIGS.GENERAL);
    
    if (!rateLimitResult.success) {
      logInfo('Rate limit excedido para upload de logo', { 
        identifier,
        retryAfter: rateLimitResult.retryAfter 
      });
      
      return NextResponse.json(
        { error: 'Muitas tentativas de upload. Tente novamente em alguns minutos.' },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    logInfo('Iniciando upload de logo', { identifier });

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo fornecido' },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Validar tipo de arquivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use PNG, JPG, GIF ou WebP.' },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 5MB.' },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    logInfo('Arquivo validado com sucesso', { 
      identifier,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size 
    });

    // Converter para Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, ''); // Sanitizar nome
    const fileName = `logo_${timestamp}_${originalName}`;

    // Upload para Cloudinary
    const uploadResult = await uploadImageToCloudinary(
      buffer, 
      fileName,
      'logos' // pasta específica para logos
    );

    logInfo('Logo enviado para Cloudinary com sucesso', { 
      identifier,
      fileName,
      publicId: uploadResult.publicId,
      imageUrl: uploadResult.secureUrl.substring(0, 50) + '...'
    });

    const duration = Date.now() - startTime;
    logInfo('Upload de logo concluído', {
      identifier,
      duration,
      fileSize: file.size
    });

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
      fileName: fileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
      message: 'Logo enviado com sucesso!',
    }, {
      headers: createRateLimitHeaders(rateLimitResult)
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Erro no upload de logo', error as Error, {
      identifier,
      duration
    });

    return NextResponse.json(
      { error: 'Erro interno do servidor ao fazer upload' },
      { 
        status: 500,
        headers: createRateLimitHeaders({
          limit: RATE_LIMIT_CONFIGS.GENERAL.maxRequests,
          remaining: 0,
          resetTime: Date.now() + RATE_LIMIT_CONFIGS.GENERAL.windowMs
        })
      }
    );
  }
}
