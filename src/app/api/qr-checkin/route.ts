import { NextRequest, NextResponse } from 'next/server';
import { getEvent, getRegistration, updateRegistration } from '@/lib/firestore';
import { rateLimit, getUserIdentifier, RATE_LIMIT_CONFIGS, createRateLimitHeaders } from '@/lib/rate-limit';
import { sanitizeInput } from '@/lib/validators';
import { logError, logInfo, logAudit, AuditAction } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string = '';
  
  try {
    const body = await request.json();
    const { eventId, userId: bodyUserId, userEmail } = body;
    userId = bodyUserId;

    // Rate limiting baseado no usuário
    const identifier = getUserIdentifier(userId, request);
    const rateLimitResult = rateLimit(identifier, RATE_LIMIT_CONFIGS.GENERAL);
    
    if (!rateLimitResult.success) {
      logInfo('Rate limit excedido para QR check-in', { 
        userId, 
        eventId,
        retryAfter: rateLimitResult.retryAfter 
      });
      
      return NextResponse.json(
        { error: 'Muitas tentativas de check-in. Tente novamente em alguns minutos.' },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    logInfo('Tentativa de QR check-in', { 
      eventId, 
      userId,
      userEmail: userEmail?.substring(0, 3) + '***'
    });

    if (!eventId || !userId) {
      logInfo('Dados obrigatórios faltando para QR check-in');
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Sanitizar inputs
    const sanitizedEventId = sanitizeInput(eventId);
    const sanitizedUserId = sanitizeInput(userId);

    // Verificar se o evento existe
    const event = await getEvent(sanitizedEventId);
    if (!event) {
      logInfo('Evento não encontrado para QR check-in', { eventId: sanitizedEventId });
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { 
          status: 404,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Verificar se o evento ainda não começou (30 minutos antes)
    const now = new Date();
    const eventStartWithBuffer = new Date(event.startTime.getTime() - 30 * 60 * 1000); // 30 min antes
    
    if (now < eventStartWithBuffer) {
      const timeUntilCheckin = Math.ceil((eventStartWithBuffer.getTime() - now.getTime()) / (1000 * 60));
      return NextResponse.json(
        { 
          error: `Check-in ainda não está disponível. Você poderá fazer check-in ${timeUntilCheckin} minuto(s) antes do início do evento.`,
          timeUntilCheckin 
        },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Verificar se o evento já terminou
    if (now > event.endTime) {
      return NextResponse.json(
        { error: 'Este evento já terminou. Não é possível fazer check-in.' },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Buscar a inscrição do usuário
    const registration = await getRegistration(sanitizedEventId, sanitizedUserId);
    if (!registration) {
      logInfo('Usuário não inscrito tentando QR check-in', { eventId: sanitizedEventId, userId: sanitizedUserId });
      return NextResponse.json(
        { error: 'Você não está inscrito neste evento' },
        { 
          status: 404,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Verificar se já fez check-in
    if (registration.checkedIn) {
      const checkinTime = registration.checkInTime 
        ? registration.checkInTime.toLocaleString('pt-BR')
        : 'anteriormente';
        
      return NextResponse.json(
        { 
          error: `Você já fez check-in neste evento em ${checkinTime}`,
          alreadyCheckedIn: true,
          checkInTime: registration.checkInTime
        },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Fazer o check-in
    const checkInTime = new Date();
    await updateRegistration(registration.id, {
      checkedIn: true,
      checkInTime: checkInTime,
    });

    // Log de auditoria
    logAudit(AuditAction.CHECKIN, userId, true, {
      eventId: sanitizedEventId,
      registrationId: registration.id,
      method: 'qr_code',
      checkInTime: checkInTime.toISOString()
    });

    const duration = Date.now() - startTime;
    logInfo('QR Check-in realizado com sucesso', {
      userId,
      eventId: sanitizedEventId,
      registrationId: registration.id,
      duration
    });

    return NextResponse.json({
      success: true,
      message: `Check-in realizado com sucesso no evento "${event.name}"!`,
      eventName: event.name,
      checkInTime: checkInTime,
      registration: {
        id: registration.id,
        userName: registration.userName,
        userEmail: registration.userEmail,
        checkedIn: true,
        checkInTime: checkInTime
      }
    }, {
      headers: createRateLimitHeaders(rateLimitResult)
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Erro no QR check-in', error as Error, {
      userId,
      duration
    });

    // Log de auditoria para falha
    if (userId) {
      logAudit(AuditAction.CHECKIN, userId, false, {
        method: 'qr_code',
        error: (error as Error).message
      });
    }

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
