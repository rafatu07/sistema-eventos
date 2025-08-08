/**
 * Sistema de Rate Limiting para APIs
 */

interface RequestRecord {
  timestamp: number;
  count: number;
}

// Map para armazenar registros de rate limiting em memória
// Em produção, considere usar Redis ou similar
const rateLimitStore = new Map<string, RequestRecord[]>();

/**
 * Configurações padrão de rate limiting
 */
export const RATE_LIMIT_CONFIGS = {
  // APIs de autenticação - mais restritivas
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 5, // 5 tentativas por IP
  },
  // APIs públicas de registro
  PUBLIC_REGISTRATION: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 3, // 3 registros por minuto por IP
  },
  // APIs de geração de certificados
  CERTIFICATE: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 2, // 2 certificados por minuto por usuário
  },
  // APIs gerais
  GENERAL: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 60, // 60 requests por minuto por IP
  },
  // APIs administrativas
  ADMIN: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 100, // 100 requests por minuto para admins
  }
};

/**
 * Verifica se uma requisição está dentro do limite de rate limiting
 * @param identifier - Identificador único (IP, userId, etc.)
 * @param windowMs - Janela de tempo em millisegundos
 * @param maxRequests - Número máximo de requisições na janela
 * @returns objeto com resultado e informações do rate limit
 */
export function checkRateLimit(
  identifier: string,
  windowMs: number,
  maxRequests: number
): {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Obter registros existentes ou criar novo array
  let records = rateLimitStore.get(identifier) || [];
  
  // Remover registros antigos (fora da janela)
  records = records.filter(record => record.timestamp > windowStart);
  
  // Calcular total de requests na janela atual
  const totalRequests = records.reduce((sum, record) => sum + record.count, 0);
  
  // Verificar se excedeu o limite
  if (totalRequests >= maxRequests) {
    // Encontrar o registro mais antigo para calcular retry-after
    const oldestRecord = records[0];
    const retryAfter = oldestRecord ? 
      Math.ceil((oldestRecord.timestamp + windowMs - now) / 1000) : 
      Math.ceil(windowMs / 1000);
    
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetTime: now + windowMs,
      retryAfter
    };
  }
  
  // Adicionar nova requisição
  records.push({
    timestamp: now,
    count: 1
  });
  
  // Atualizar store
  rateLimitStore.set(identifier, records);
  
  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - totalRequests - 1,
    resetTime: now + windowMs
  };
}

/**
 * Middleware para aplicar rate limiting em API routes
 * @param identifier - Identificador único
 * @param config - Configuração de rate limiting
 */
export function rateLimit(
  identifier: string,
  config: { windowMs: number; maxRequests: number }
) {
  return checkRateLimit(identifier, config.windowMs, config.maxRequests);
}

/**
 * Obter identificador da requisição (IP + User Agent)
 * @param request - Objeto NextRequest
 * @returns string identificadora
 */
export function getRequestIdentifier(request: Request): string {
  // Em produção, usar x-forwarded-for para obter IP real
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Criar hash simples do User Agent para não armazenar dados sensíveis
  const userAgentHash = btoa(userAgent).slice(0, 8);
  
  return `${ip}-${userAgentHash}`;
}

/**
 * Obter identificador baseado no usuário
 * @param userId - ID do usuário
 * @param request - Objeto NextRequest (opcional, para fallback)
 * @returns string identificadora
 */
export function getUserIdentifier(userId: string, request?: Request): string {
  if (userId && userId !== 'anonymous') {
    return `user-${userId}`;
  }
  
  // Fallback para identificador de IP se não houver usuário
  return request ? getRequestIdentifier(request) : 'anonymous';
}

/**
 * Limpar registros antigos periodicamente (garbage collection)
 * Deve ser chamado periodicamente em produção
 */
export function cleanupOldRecords(): void {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 horas
  
  for (const [identifier, records] of rateLimitStore.entries()) {
    const validRecords = records.filter(record => 
      now - record.timestamp < maxAge
    );
    
    if (validRecords.length === 0) {
      rateLimitStore.delete(identifier);
    } else {
      rateLimitStore.set(identifier, validRecords);
    }
  }
}

/**
 * Criar headers de resposta para rate limiting
 * @param rateLimitResult - Resultado do check de rate limiting
 * @returns Headers para incluir na resposta
 */
export function createRateLimitHeaders(rateLimitResult: {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': rateLimitResult.limit.toString(),
    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
  };
  
  if (rateLimitResult.retryAfter) {
    headers['Retry-After'] = rateLimitResult.retryAfter.toString();
  }
  
  return headers;
}

// Limpar registros antigos a cada hora
if (typeof window === 'undefined') { // Apenas no servidor
  setInterval(cleanupOldRecords, 60 * 60 * 1000);
}
