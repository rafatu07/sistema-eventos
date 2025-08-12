import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { rateLimit, getUserIdentifier, RATE_LIMIT_CONFIGS, createRateLimitHeaders } from '@/lib/rate-limit';
import { logError, logInfo } from '@/lib/logger';

const COLLECTIONS = {
  REGISTRATIONS: 'registrations',
};

export async function GET(request: NextRequest) {
  let userId: string = '';
  
  try {
    const url = new URL(request.url);
    userId = url.searchParams.get('userId') || '';
    
    if (!userId) {
      return NextResponse.json(
        { error: 'UserId é obrigatório' },
        { status: 400 }
      );
    }

    // Rate limiting
    const identifier = getUserIdentifier(userId, request);
    const rateLimitResult = rateLimit(identifier, RATE_LIMIT_CONFIGS.GENERAL);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    logInfo('Buscando CPF do usuário', { userId });

    // Buscar uma registration do usuário para obter o CPF
    const registrationsRef = collection(db, COLLECTIONS.REGISTRATIONS);
    const q = query(
      registrationsRef, 
      where('userId', '==', userId),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      logInfo('Nenhuma registration encontrada para o usuário', { userId });
      return NextResponse.json(
        { cpf: null },
        { 
          status: 200,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    const registration = querySnapshot.docs[0].data();
    const cpf = registration.userCPF;

    logInfo('CPF encontrado para o usuário', { 
      userId, 
      cpfExists: !!cpf 
    });

    return NextResponse.json(
      { cpf: cpf || null },
      {
        status: 200,
        headers: createRateLimitHeaders(rateLimitResult)
      }
    );

  } catch (error) {
    logError('Erro ao buscar CPF do usuário', error as Error, { userId });
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
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
