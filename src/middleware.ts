import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getRequestIdentifier, RATE_LIMIT_CONFIGS, createRateLimitHeaders } from '@/lib/rate-limit';

// Rotas que precisam de rate limiting específico
const RATE_LIMITED_ROUTES = {
  '/api/public-registration': RATE_LIMIT_CONFIGS.PUBLIC_REGISTRATION,
  '/api/generate-certificate': RATE_LIMIT_CONFIGS.CERTIFICATE,
  '/api/qr-checkin': RATE_LIMIT_CONFIGS.GENERAL,
  '/api/auth': RATE_LIMIT_CONFIGS.AUTH,
} as const;

// Rotas que devem ser protegidas com rate limiting geral
// const PROTECTED_API_ROUTES = ['/api/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Aplicar rate limiting apenas para APIs
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Obter identificador da requisição
  const identifier = getRequestIdentifier(request);
  
  // Verificar se é uma rota com rate limiting específico
  const specificConfig = RATE_LIMITED_ROUTES[pathname as keyof typeof RATE_LIMITED_ROUTES];
  
  let rateLimitResult;
  
  if (specificConfig) {
    // Usar configuração específica da rota
    rateLimitResult = rateLimit(identifier, specificConfig);
  } else {
    // Usar configuração geral para outras APIs
    rateLimitResult = rateLimit(identifier, RATE_LIMIT_CONFIGS.GENERAL);
  }
  
  // Se rate limit foi excedido
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        message: 'Muitas requisições. Tente novamente em alguns minutos.',
        retryAfter: rateLimitResult.retryAfter
      },
      { 
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult)
      }
    );
  }
  
  // Adicionar headers de rate limit na resposta
  const response = NextResponse.next();
  const headers = createRateLimitHeaders(rateLimitResult);
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

export const config = {
  // Aplicar middleware apenas para rotas de API
  matcher: [
    '/api/:path*'
  ],
};
