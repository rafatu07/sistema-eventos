import { NextRequest, NextResponse } from 'next/server';
import { getEvent, getEventRegistrations } from '@/lib/firestore';
import { logInfo } from '@/lib/logger';
import { Event, Registration } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    logInfo(`🔍 Iniciando diagnóstico detalhado para evento: ${eventId}`);

    // Buscar dados do evento
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      );
    }

    // Buscar todas as registrations do evento
    const allRegistrations = await getEventRegistrations(eventId);

    // Análise detalhada dos participantes
    const analysis = {
      // Dados do evento
      eventInfo: {
        id: event.id,
        name: event.name,
        date: event.date.toISOString(),
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        location: event.location,
        hasEnded: new Date() >= event.endTime
      },

      // Estatísticas das registrations
      registrationStats: {
        total: allRegistrations.length,
        checkedIn: allRegistrations.filter(r => r.checkedIn).length,
        checkedOut: allRegistrations.filter(r => r.checkedOut).length,
        bothCheckedInAndOut: allRegistrations.filter(r => r.checkedIn && r.checkedOut).length,
        onlyCheckedIn: allRegistrations.filter(r => r.checkedIn && !r.checkedOut).length,
        neverCheckedIn: allRegistrations.filter(r => !r.checkedIn).length,
        certificatesGenerated: allRegistrations.filter(r => r.certificateGenerated).length
      },

      // Lista detalhada dos participantes (primeiros 10)
      participantsSample: allRegistrations.slice(0, 10).map(reg => ({
        id: reg.id,
        userName: reg.userName,
        userEmail: reg.userEmail,
        createdAt: reg.createdAt.toISOString(),
        checkedIn: reg.checkedIn,
        checkedOut: reg.checkedOut,
        checkInTime: reg.checkInTime?.toISOString() || null,
        checkOutTime: reg.checkOutTime?.toISOString() || null,
        certificateGenerated: reg.certificateGenerated
      })),

      // Participantes elegíveis para auto checkout (check-in SIM, check-out NÃO)
      eligibleForAutoCheckout: allRegistrations
        .filter(r => r.checkedIn && !r.checkedOut)
        .map(reg => ({
          id: reg.id,
          userName: reg.userName,
          userEmail: reg.userEmail,
          checkInTime: reg.checkInTime?.toISOString() || null
        })),

      // Análise temporal
      timeAnalysis: {
        now: new Date().toISOString(),
        eventHasEnded: new Date() >= event.endTime,
        timeUntilEnd: event.endTime.getTime() - new Date().getTime(),
        timeSinceEnd: new Date().getTime() - event.endTime.getTime()
      },

      // Razão provável do resultado de auto checkout
      autoCheckoutAnalysis: {
        eligibleCount: allRegistrations.filter(r => r.checkedIn && !r.checkedOut).length,
        reasonForZero: getReasonForZeroCheckout(allRegistrations, event)
      }
    };

    logInfo('🎯 Diagnóstico completo gerado', {
      eventId,
      eventName: event.name,
      totalRegistrations: analysis.registrationStats.total,
      eligibleForAutoCheckout: analysis.autoCheckoutAnalysis.eligibleCount
    });

    return NextResponse.json({
      success: true,
      eventId,
      analysis
    });

  } catch (error) {
    console.error('Erro no diagnóstico do evento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Função para determinar a razão provável de 0 checkout automático
function getReasonForZeroCheckout(registrations: Registration[], event: Event): string {
  if (registrations.length === 0) {
    return 'NENHUMA_INSCRICAO: Não há participantes inscritos neste evento';
  }

  const checkedInCount = registrations.filter(r => r.checkedIn).length;
  if (checkedInCount === 0) {
    return 'NENHUM_CHECKIN: Nenhum participante fez check-in';
  }

  const eligibleCount = registrations.filter(r => r.checkedIn && !r.checkedOut).length;
  if (eligibleCount === 0) {
    return 'TODOS_JA_FIZERAM_CHECKOUT: Todos que fizeram check-in já fizeram check-out';
  }

  const eventHasEnded = new Date() >= event.endTime;
  if (!eventHasEnded) {
    return 'EVENTO_NAO_TERMINOU: Evento ainda não terminou, checkout automático não deveria executar';
  }

  return `ELEGIVEL_PARA_CHECKOUT: ${eligibleCount} participantes deveriam ter feito checkout automático`;
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'API de diagnóstico de eventos disponível',
    usage: 'POST com { "eventId": "seu-event-id" }'
  });
}
