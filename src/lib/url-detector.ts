/**
 * 🌐 Detector automático de URL para produção e desenvolvimento
 */

/**
 * Detecta automaticamente a URL base correta
 */
export const getBaseUrl = (): string => {
  // 1. Se NEXT_PUBLIC_APP_URL está definida, usar ela
  if (process.env.NEXT_PUBLIC_APP_URL) {
    console.log('🌐 Usando NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // 2. Se estamos no Vercel (produção), usar VERCEL_URL
  if (process.env.VERCEL_URL) {
    const vercelUrl = `https://${process.env.VERCEL_URL}`;
    console.log('🌐 Usando VERCEL_URL detectada:', vercelUrl);
    return vercelUrl;
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
    NODE_ENV: process.env.NODE_ENV,
    detectedUrl: getBaseUrl(),
    timestamp: new Date().toISOString()
  });
};
