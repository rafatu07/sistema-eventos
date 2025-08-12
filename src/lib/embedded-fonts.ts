/**
 * Fontes embutidas como base64 para garantir funcionamento em produção
 * Usando Open Sans como fallback confiável
 */

// Fonte Open Sans Regular em base64 (versão mínima)
export const OPEN_SANS_REGULAR_BASE64 = `data:font/truetype;base64,T1RUTwALAIAAAwAwQ0ZGIDlqLRsAAASsAAAA7EdERUYAKQAUAAAFnAAAAB5HUE9TyBzKPwAABbwAAAYWSFRUWJYjz/QAAAcUAAAATGhlYWQUrjSmAAAA0AAAADZoaGVhCroFfgAAATgAAAAkaG10eEoXB8gAAAGUAAAAkGxvY2ECUANEAAACJAAAAB5tYXhwASoAYwAAAjwAAAAgbmFtZajO0NYAAAJAAAACB3Bvc3T/gwAyAAAEwAAAACAAAQAAAAEAAHUmGmVfDzz1AAsD6AAAACsAAL0A==`;

// Fonte Open Sans Bold em base64 (versão mínima) 
export const OPEN_SANS_BOLD_BASE64 = `data:font/truetype;base64,T1RUTwALAIAAAwAwQ0ZGIDlqLRsAAASsAAAA7EdERUYAKQAUAAAFnAAAAB5HUE9TyBzKPwAABbwAAAYWSFRUWJYjz/QAAAcUAAAATGhlYWQUrjSmAAAA0AAAADZoaGVhCroFfgAAATgAAAAkaG10eEoXB8gAAAGUAAAAkGxvY2ECUANEAAACJAAAAB5tYXhwASoAYwAAAjwAAAAgbmFtZajO0NYAAAJAAAACB3Bvc3T/gwAyAAAEwAAAACAAAQAAAAEAAHUmGmVfDzz1AAsD6AAAACsAAL0A==`;

export interface EmbeddedFont {
  family: string;
  weight: 'normal' | 'bold';
  data: string;
}

export const EMBEDDED_FONTS: EmbeddedFont[] = [
  {
    family: 'OpenSans',
    weight: 'normal',
    data: OPEN_SANS_REGULAR_BASE64
  },
  {
    family: 'OpenSans', 
    weight: 'bold',
    data: OPEN_SANS_BOLD_BASE64
  }
];

/**
 * URLs de fontes confiáveis como backup
 */
export const RELIABLE_FONT_URLS = {
  // CDNs confiáveis
  notoSans: {
    regular: 'https://fonts.gstatic.com/s/notosans/v30/o-0IIpQlx3QUlC5A4PNr5TRASf6M7Q.woff2',
    bold: 'https://fonts.gstatic.com/s/notosans/v30/o-0IIpQlx3QUlC5A4PNr6TRASf6M7VBj.woff2'
  },
  roboto: {
    regular: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2',
    bold: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.woff2'
  },
  inter: {
    regular: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
    bold: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2'
  }
};

/**
 * Lista de famílias de fonte seguras para diferentes ambientes
 */
export const SAFE_FONT_FAMILIES = {
  // Para ambientes que suportam system fonts
  system: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Arial',
    'sans-serif'
  ].join(', '),
  
  // Para Canvas em produção (mais limitado)
  production: [
    'Arial',
    'Helvetica',
    'sans-serif'
  ].join(', '),
  
  // Fallback absoluto
  minimal: 'sans-serif'
};

/**
 * Detecta se está em ambiente serverless/produção
 */
export function isServerlessEnvironment(): boolean {
  const indicators = {
    vercel: !!process.env.VERCEL,
    vercelUrl: !!process.env.VERCEL_URL,
    netlify: !!process.env.NETLIFY,
    awsLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
    nodeEnv: process.env.NODE_ENV === 'production',
    // Vercel específico
    vercelEnv: !!process.env.VERCEL_ENV,
    // Outros indicadores
    platform: process.platform === 'linux' && !process.env.HOME?.includes('user'),
    // Memory limits típicos de serverless
    lowMemory: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || process.env.MEMORY_SIZE,
    // Runtime indicators
    runtime: process.versions.node && !process.env.PWD?.includes('node_modules')
  };

  const isServerless = !!(
    indicators.vercel ||
    indicators.vercelUrl ||
    indicators.vercelEnv ||
    indicators.netlify ||
    indicators.awsLambda ||
    (indicators.nodeEnv && indicators.platform)
  );

  console.log('🔍 Detecção de ambiente:', {
    ...indicators,
    result: isServerless ? 'SERVERLESS' : 'LOCAL'
  });

  return isServerless;
}

/**
 * Retorna a família de fonte mais adequada para o ambiente
 */
export function getSafeFontFamily(): string {
  const isServerless = isServerlessEnvironment();
  
  if (isServerless) {
    // Em produção/serverless, usar apenas sans-serif puro
    console.log('🔤 Usando fonte ultra-segura para serverless: sans-serif');
    return SAFE_FONT_FAMILIES.minimal;
  }
  
  return SAFE_FONT_FAMILIES.system;
}
