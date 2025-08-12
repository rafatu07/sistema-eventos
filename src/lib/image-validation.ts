/**
 * Utilitários para validação de URLs e imagens
 */

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  contentType?: string;
  size?: number;
}

/**
 * Valida se uma URL aponta para uma imagem válida e acessível
 */
export const validateImageUrl = async (
  url: string,
  options: {
    maxSize?: number; // em bytes
    allowedTypes?: string[];
    timeout?: number; // em ms
  } = {}
): Promise<ImageValidationResult> => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB padrão
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    timeout = 10000, // 10 segundos
  } = options;

  try {
    // Validação básica da URL
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'URL inválida' };
    }

    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      return { isValid: false, error: 'Formato de URL inválido' };
    }

    // Verificar se é HTTP/HTTPS
    if (!['http:', 'https:'].includes(validUrl.protocol)) {
      return { isValid: false, error: 'URL deve usar protocolo HTTP ou HTTPS' };
    }

    // Fazer requisição HEAD para verificar o arquivo
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Accept': 'image/*',
          'User-Agent': 'Certificate-System/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          isValid: false,
          error: `Erro ao acessar imagem: ${response.status} ${response.statusText}`,
        };
      }

      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');

      // Validar tipo de conteúdo
      if (!contentType || !allowedTypes.some(type => contentType.toLowerCase().includes(type))) {
        return {
          isValid: false,
          error: `Tipo de arquivo não suportado. Tipos permitidos: ${allowedTypes.join(', ')}`,
        };
      }

      // Validar tamanho se disponível
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        if (size > maxSize) {
          const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
          return {
            isValid: false,
            error: `Imagem muito grande. Tamanho máximo: ${maxSizeMB}MB`,
          };
        }

        return {
          isValid: true,
          contentType,
          size,
        };
      }

      return {
        isValid: true,
        contentType,
      };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          return { isValid: false, error: 'Timeout ao verificar imagem' };
        }
        return { isValid: false, error: `Erro de rede: ${fetchError.message}` };
      }
      
      return { isValid: false, error: 'Erro desconhecido ao verificar imagem' };
    }

  } catch (error) {
    console.error('Erro na validação de URL de imagem:', error);
    return {
      isValid: false,
      error: 'Erro interno na validação da imagem',
    };
  }
};

/**
 * Valida múltiplas URLs de imagem em paralelo
 */
export const validateImageUrls = async (
  urls: string[],
  options?: Parameters<typeof validateImageUrl>[1]
): Promise<ImageValidationResult[]> => {
  const promises = urls.map(url => validateImageUrl(url, options));
  return Promise.all(promises);
};

/**
 * Valida se uma URL de imagem é do Cloudinary (mais confiável)
 */
export const isCloudinaryUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('cloudinary.com') || 
           urlObj.hostname.includes('res.cloudinary.com');
  } catch {
    return false;
  }
};

/**
 * Otimiza uma URL do Cloudinary para tamanho específico
 */
export const optimizeCloudinaryUrl = (
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'jpg' | 'png' | 'webp';
  } = {}
): string => {
  if (!isCloudinaryUrl(url)) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Encontrar a parte da URL onde inserir transformações
    const uploadIndex = pathParts.findIndex(part => part === 'upload');
    if (uploadIndex === -1) {
      return url;
    }

    // Construir transformações
    const transformations: string[] = [];
    
    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.quality) transformations.push(`q_${options.quality}`);
    if (options.format) transformations.push(`f_${options.format}`);

    if (transformations.length === 0) {
      return url;
    }

    // Inserir transformações na URL
    pathParts.splice(uploadIndex + 1, 0, transformations.join(','));
    urlObj.pathname = pathParts.join('/');
    
    return urlObj.toString();
  } catch {
    return url;
  }
};

/**
 * Gera uma versão otimizada de uma URL de imagem para preview
 */
export const getOptimizedPreviewUrl = (url: string): string => {
  if (isCloudinaryUrl(url)) {
    return optimizeCloudinaryUrl(url, {
      width: 200,
      height: 200,
      quality: 'auto',
      format: 'auto',
    });
  }
  
  return url;
};
