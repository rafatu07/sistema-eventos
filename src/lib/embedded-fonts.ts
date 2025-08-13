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

// 🚀 CACHE para evitar detecções repetitivas - RESETADO para aplicar multipliers extremos
let _cachedEnvironmentResult: boolean | null = null;
let _environmentDetectionCount = 0;

/**
 * Detecta se está em ambiente serverless/produção (COM CACHE)
 */
export function isServerlessEnvironment(): boolean {
  // ✅ Se já detectamos antes, retorna o cache
  if (_cachedEnvironmentResult !== null) {
    return _cachedEnvironmentResult;
  }

  _environmentDetectionCount++;

  // Indicadores mais agressivos para Vercel
  const vercelIndicators = [
    process.env.VERCEL === '1',
    process.env.VERCEL_ENV,
    process.env.VERCEL_URL,
    process.env.VERCEL_REGION,
    // URL específicas do Vercel
    process.env.NEXTAUTH_URL?.includes('.vercel.app'),
    process.env.NEXT_PUBLIC_SITE_URL?.includes('.vercel.app'),
    // Headers típicos do Vercel
    process.env.NOW_REGION, // Vercel antigo
  ];

  const otherServerlessIndicators = [
    process.env.NETLIFY === 'true',
    process.env.AWS_LAMBDA_FUNCTION_NAME,
    process.env.AWS_EXECUTION_ENV?.includes('AWS_Lambda'),
  ];

  // Se NODE_ENV é production E temos qualquer indicador Vercel
  const isProduction = process.env.NODE_ENV === 'production';
  const hasVercelIndicator = vercelIndicators.some(Boolean);
  const hasOtherServerless = otherServerlessIndicators.some(Boolean);

  // Opção para forçar detecção (para testes)
  const forceServerless = process.env.FORCE_SERVERLESS_DETECTION === 'true';

  const isServerless = forceServerless || hasVercelIndicator || hasOtherServerless || (
    isProduction && (
      process.platform === 'linux' ||
      !process.env.PWD?.includes('node_modules') ||
      !process.env.USER
    )
  );

  // 🎯 CACHE o resultado para evitar repetições
  _cachedEnvironmentResult = isServerless;

  // 📝 Log apenas na PRIMEIRA detecção
  console.log('🔍 Detecção de ambiente (primeira vez):', {
    'NODE_ENV': process.env.NODE_ENV,
    'VERCEL': process.env.VERCEL,
    'VERCEL_URL': process.env.VERCEL_URL ? 'SET' : 'NOT_SET',
    'NEXTAUTH_URL': process.env.NEXTAUTH_URL ? 'SET' : 'NOT_SET',
    'FORCE_SERVERLESS': forceServerless,
    'platform': process.platform,
    'hasVercelIndicator': hasVercelIndicator,
    'isProduction': isProduction,
    'RESULTADO': isServerless ? '🏭 SERVERLESS' : '💻 LOCAL'
  });

  return isServerless;
}

// 🚀 CACHE para família de fonte - RESETADO para novos multipliers
let _cachedFontFamily: string | null = null;

/**
 * Retorna a família de fonte mais adequada para o ambiente (COM CACHE)
 */
export function getSafeFontFamily(): string {
  // ✅ Se já calculamos antes, retorna o cache
  if (_cachedFontFamily !== null) {
    return _cachedFontFamily;
  }

  const isServerless = isServerlessEnvironment();
  
  if (isServerless) {
    // Em produção/serverless, usar apenas sans-serif puro
    console.log('🔤 Fonte para serverless: sans-serif');
    _cachedFontFamily = SAFE_FONT_FAMILIES.minimal;
  } else {
    _cachedFontFamily = SAFE_FONT_FAMILIES.system;
  }
  
  return _cachedFontFamily;
}
