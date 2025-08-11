import { NextResponse } from 'next/server';
import { getEvent, getRegistration, updateRegistration } from '@/lib/firestore';
import { logInfo, logError, logAudit, AuditAction } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { eventId, userId } = await request.json();

    // Validações básicas
    if (!eventId || !userId) {
      logError('QR Check-in: parâmetros faltando', new Error('Missing parameters'));
      return NextResponse.json(
        { success: false, error: 'EventId e UserId são obrigatórios' },
        { status: 400 }
      );
    }

    logInfo(`QR Check-in iniciado: usuário ${userId} para evento ${eventId}`);

    // Verificar se o evento existe
    const event = await getEvent(eventId);
    if (!event) {
      logError(`QR Check-in: evento ${eventId} não encontrado`, new Error('Event not found'));
      return NextResponse.json(
        { success: false, error: 'Evento não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o usuário está inscrito no evento
    const registration = await getRegistration(eventId, userId);
    if (!registration) {
      logError(`QR Check-in: usuário ${userId} não inscrito no evento ${eventId}`, new Error('User not registered'));
      return NextResponse.json(
        { 
          success: false, 
          error: 'Você não está inscrito neste evento',
          eventName: event.name 
        },
        { status: 400 }
      );
    }

    // Verificar se o check-in está aberto (30 minutos antes do início)
    const now = new Date();
    const eventStart = new Date(event.startTime);
    const checkInOpenTime = new Date(eventStart.getTime() - 30 * 60 * 1000); // 30 minutos antes

    if (now < checkInOpenTime) {
      const openTimeStr = checkInOpenTime.toLocaleString('pt-BR');
      logInfo(`QR Check-in: tentativa prematura para evento ${eventId}. Abre em ${openTimeStr}`);
      return NextResponse.json(
        { 
          success: false, 
          error: `Check-in estará disponível a partir de ${openTimeStr}`,
          eventName: event.name 
        },
        { status: 400 }
      );
    }

    // Verificar se o evento já terminou
    const eventEnd = new Date(event.endTime);
    if (now > eventEnd) {
      logInfo(`QR Check-in: tentativa após fim do evento ${eventId}`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Este evento já terminou',
          eventName: event.name 
        },
        { status: 400 }
      );
    }

    // Verificar se já fez check-in
    if (registration.checkedIn) {
      const checkinTimeStr = registration.checkInTime 
        ? new Date(registration.checkInTime).toLocaleString('pt-BR')
        : 'anterior';
      
      logInfo(`QR Check-in: usuário ${userId} já fez check-in no evento ${eventId}`);
      return NextResponse.json(
        { 
          success: true, 
          message: `Você já fez check-in neste evento em ${checkinTimeStr}`,
          alreadyCheckedIn: true,
          eventName: event.name,
          registration 
        }
      );
    }

    // Realizar check-in
    const updatedRegistration = {
      ...registration,
      checkedIn: true,
      checkInTime: new Date(),
    };

    await updateRegistration(registration.id, updatedRegistration);

    // Log de auditoria
    logAudit(
      AuditAction.CHECKIN,
      userId,
      true,
      {
        resourceId: registration.id,
        eventId,
        eventName: event.name,
        checkInMethod: 'qr_code',
        checkInTime: new Date().toISOString(),
      }
    );

    logInfo(`QR Check-in realizado com sucesso: usuário ${userId} no evento ${eventId}`);

    return NextResponse.json({
      success: true,
      message: `Check-in realizado com sucesso no evento "${event.name}"!`,
      eventName: event.name,
      checkInTime: new Date().toLocaleString('pt-BR'),
      registration: updatedRegistration,
    });

  } catch (error) {
    logError('Erro no QR Check-in', error as Error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}