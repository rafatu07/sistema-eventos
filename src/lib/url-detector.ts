/**
 * 🌐 Detector automático de URL para produção e desenvolvimento
 */

/**
 * Detecta automaticamente a URL base correta
 */
export const getBaseUrl = (): string => {
  // 1. Se NEXT_PUBLIC_APP_URL está definida, usar ela (prioridade máxima)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    console.log('🌐 Usando NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // 2. Se estamos no Vercel, detectar produção vs preview
  if (process.env.VERCEL_URL) {
    const vercelUrl = process.env.VERCEL_URL;
    
    // 🎯 CORREÇÃO: Verificar se é URL de produção ou preview
    // URLs de produção terminam com .vercel.app e não têm hash
    // URLs de preview têm formato: projeto-hash.vercel.app
    
    // Se é ambiente de produção (VERCEL_ENV=production)
    if (process.env.VERCEL_ENV === 'production') {
      // Para produção, usar o domínio conhecido fixo
      const productionUrl = 'https://sistema-eventos-nu.vercel.app';
      console.log('🌐 Produção detectada - usando URL fixa:', productionUrl);
      return productionUrl;
    }
    
    // Para preview/desenvolvimento, usar a URL dinâmica
    const previewUrl = `https://${vercelUrl}`;
    console.log('🌐 Preview/desenvolvimento - usando VERCEL_URL:', previewUrl);
    return previewUrl;
  }

  // 3. Desenvolvimento local
  console.log('🌐 Usando localhost (desenvolvimento)');
  return 'http://localhost:3000';
};

/**
 * Gera URL completa da API de download do certificado
 */
export const getCertificateDownloadUrl = (registrationId: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/certificate/download?registrationId=${registrationId}`;
};

/**
 * Log de debug da configuração atual
 */
export const logUrlConfig = () => {
  console.log('🔍 Configuração de URL:', {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'undefined',
    VERCEL_URL: process.env.VERCEL_URL || 'undefined',
    VERCEL_ENV: process.env.VERCEL_ENV || 'undefined',
    NODE_ENV: process.env.NODE_ENV,
    detectedUrl: getBaseUrl(),
    environment: process.env.VERCEL_ENV === 'production' ? '🏭 PRODUÇÃO' : '🔧 PREVIEW/DEV',
    timestamp: new Date().toISOString()
  });
};
