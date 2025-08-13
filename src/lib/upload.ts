import cloudinary from './cloudinary';

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
}

export const uploadPDFToCloudinary = async (
  pdfBuffer: Buffer,
  fileName: string,
  folder: string = 'certificates'
): Promise<UploadResult> => {
  try {
    console.log('📤 Iniciando upload de PDF para Cloudinary...');
    console.log('📏 Tamanho do buffer:', pdfBuffer.length, 'bytes');
    
    // 🚨 VALIDAÇÃO CRÍTICA: Verificar se o buffer é válido
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Buffer PDF vazio ou inválido');
    }

    // Verificar assinatura PDF (deve começar com %PDF)
    const pdfSignature = pdfBuffer.subarray(0, 4).toString('ascii');
    if (pdfSignature !== '%PDF') {
      console.error('❌ Buffer não é um PDF válido. Assinatura:', pdfSignature);
      console.error('📊 Primeiros 50 bytes:', pdfBuffer.subarray(0, 50).toString('hex'));
      throw new Error(`Buffer não é um PDF válido. Assinatura encontrada: ${pdfSignature}`);
    }

    console.log('✅ PDF válido detectado, tamanho:', pdfBuffer.length, 'bytes');
    
    let result;
    const uploadOptions = {
      folder: folder,
      public_id: fileName,
      access_mode: 'public' as const,
      type: 'upload' as const,
      overwrite: true,
      invalidate: true, // Invalidar cache para garantir acesso imediato
    };
    
    // 🔄 ESTRATÉGIA CORRIGIDA: Usar AUTO (público por padrão)
    try {
      console.log('🔄 Upload como AUTO (resource_type: auto)...');
      result = await cloudinary.uploader.upload(
        `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
        {
          ...uploadOptions,
          resource_type: 'auto', // Deixar Cloudinary decidir e garantir acesso público
        }
      );
      console.log('✅ Upload AUTO bem-sucedido!');
      
    } catch (uploadError) {
      console.error('❌ Upload RAW falhou:', uploadError);
      console.error('🔍 Detalhes do erro:', {
        message: (uploadError as Error).message,
        name: (uploadError as Error & { name?: string }).name,
        http_code: (uploadError as Error & { http_code?: number }).http_code,
        api_response: (uploadError as Error & { api_response?: unknown }).api_response
      });
      
      // 🚨 FALLBACK: Tentar como IMAGE (garantidamente público)
      try {
        console.log('🔄 Tentativa FALLBACK: Upload como IMAGE...');
        result = await cloudinary.uploader.upload(
          `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
          {
            ...uploadOptions,
            resource_type: 'image', // Forçar como imagem para garantir acesso público
            format: 'pdf',
          }
        );
        console.log('✅ Upload IMAGE bem-sucedido!');
        
      } catch (autoError) {
        console.error('❌ Upload AUTO também falhou:', autoError);
        throw new Error(`Todos os uploads falharam: RAW(${(uploadError as Error).message}) AUTO(${(autoError as Error).message})`);
      }
    }

    // Log detalhado do resultado do upload de PDF
    console.log('📊 Resultado do upload PDF:', {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height
    });

    // 🔧 WORKAROUND: Gerar URL pública garantida
    let finalUrl = result.secure_url;
    
    if (result.resource_type === 'image') {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const publicId = result.public_id;
      
      // URL pública direta com fl_attachment para forçar download
      finalUrl = `https://res.cloudinary.com/${cloudName}/image/upload/fl_attachment/${publicId}.pdf`;
      
      console.log('🔧 URL corrigida para acesso público garantido:', {
        originalUrl: result.secure_url,
        publicUrl: finalUrl,
        strategy: 'Manual URL com fl_attachment flag'
      });
    }

    return {
      publicId: result.public_id,
      url: finalUrl,
      secureUrl: finalUrl,
    };
  } catch (error) {
    console.error('Error uploading PDF to Cloudinary:', error);
    throw new Error('Failed to upload PDF to Cloudinary');
  }
};

export const uploadImageToCloudinary = async (
  imageBuffer: Buffer,
  fileName: string,
  folder: string = 'certificates'
): Promise<UploadResult> => {
  try {
    const result = await cloudinary.uploader.upload(
      `data:image/png;base64,${imageBuffer.toString('base64')}`,
      {
        resource_type: 'image',
        folder: folder,
        public_id: fileName,
        format: 'png',
        access_mode: 'public',
        type: 'upload',
        quality: 'auto:best',
        fetch_format: 'auto',
      }
    );

    return {
      publicId: result.public_id,
      url: result.secure_url,
      secureUrl: result.secure_url,
    };
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

export const deletePDFFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    // Tentar deletar como RAW primeiro (padrão para PDFs)
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
    });
    console.log('✅ PDF deletado como RAW');
  } catch (rawError) {
    console.warn('❌ Falha ao deletar como RAW, tentando como IMAGE:', rawError);
    try {
      // Fallback: tentar deletar como IMAGE
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
      });
      console.log('✅ PDF deletado como IMAGE');
    } catch (imageError) {
      console.error('❌ Falha ao deletar PDF em ambos os resource_types:', { rawError, imageError });
      throw new Error(`Falha ao deletar PDF: RAW(${(rawError as Error).message}) IMAGE(${(imageError as Error).message})`);
    }
  }
};

/**
 * Gera URL assinada para acesso seguro a recursos do Cloudinary
 * Útil quando o acesso público falha (401 Unauthorized)
 */
export const generateSignedUrl = (publicId: string, resourceType: 'raw' | 'image' = 'raw'): string => {
  try {
    console.log('🔐 Gerando URL assinada para:', publicId);
    
    const signedUrl = cloudinary.utils.private_download_url(publicId, 'pdf', {
      resource_type: resourceType,
      expires_at: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 horas
    });
    
    console.log('✅ URL assinada gerada com sucesso');
    return signedUrl;
  } catch (error) {
    console.error('❌ Erro ao gerar URL assinada:', error);
    throw new Error('Falha ao gerar URL assinada');
  }
};

/**
 * Tenta gerar uma URL pública segura, com fallback para URL assinada
 */
export const getSecurePDFUrl = async (publicId: string, originalUrl: string): Promise<string> => {
  try {
    // Primeiro, testar se a URL original funciona
    console.log('🔍 Testando acesso à URL original...');
    const testResponse = await fetch(originalUrl, { method: 'HEAD' });
    
    if (testResponse.ok) {
      console.log('✅ URL original acessível');
      return originalUrl;
    } else {
      console.warn('❌ URL original retornou:', testResponse.status, testResponse.statusText);
    }
  } catch (error) {
    console.warn('❌ Erro ao testar URL original:', error);
  }
  
  // Fallback: gerar URL assinada
  console.log('🔐 Gerando URL assinada como fallback...');
  try {
    return generateSignedUrl(publicId, 'raw');
  } catch {
    console.warn('❌ URL assinada RAW falhou, tentando IMAGE...');
    return generateSignedUrl(publicId, 'image');
  }
};

export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

