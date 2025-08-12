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
    // 🚀 ESTRATÉGIA CORRIGIDA: Testar múltiplas abordagens para máxima compatibilidade
    console.log('📤 Iniciando upload de PDF para Cloudinary...');
    console.log('📏 Tamanho do buffer:', pdfBuffer.length, 'bytes');
    
    let result;
    const uploadOptions = {
      folder: folder,
      public_id: fileName,
      access_mode: 'public' as const,
      type: 'upload' as const,
      overwrite: true,
    };
    
    // Tentativa 1: resource_type "raw" (padrão para PDFs)
    try {
      console.log('🔄 Tentativa 1: Upload como RAW...');
      result = await cloudinary.uploader.upload(
        `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
        {
          ...uploadOptions,
          resource_type: 'raw',
          format: 'pdf',
        }
      );
      console.log('✅ Upload RAW bem-sucedido!');
      
    } catch (rawError) {
      console.warn('❌ Upload RAW falhou, tentando como IMAGE:', rawError);
      
      // Tentativa 2: resource_type "image" (para contornar restrições)
      try {
        console.log('🔄 Tentativa 2: Upload como IMAGE...');
        result = await cloudinary.uploader.upload(
          `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
          {
            ...uploadOptions,
            resource_type: 'image',
            format: 'pdf',
          }
        );
        console.log('✅ Upload IMAGE bem-sucedido!');
        
      } catch (imageError) {
        console.error('❌ Ambas as tentativas falharam:', { rawError, imageError });
        throw new Error(`Upload falhou: RAW(${(rawError as Error).message}) IMAGE(${(imageError as Error).message})`);
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

    return {
      publicId: result.public_id,
      url: result.secure_url,
      secureUrl: result.secure_url,
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
  } catch (rawError) {
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

