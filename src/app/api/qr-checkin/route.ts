import { NextResponse } from 'next/server';
import { getEvent, getRegistration, updateRegistration } from '@/lib/firestore';
import { logInfo, logError, logAudit, AuditAction } from '@/lib/logger';

export async function POST(request: Request) {
  let eventId: string = '';
  let userId: string = '';
  
  try {
    logInfo('Iniciando processo de QR Check-in...');
    
    // Parse do body com tratamento de erro
    let requestBody;
    try {
      requestBody = await request.json();
      logInfo('Body da requisição parseado com sucesso');
    } catch (parseError) {
      logError('Erro ao fazer parse do JSON da requisição', parseError as Error);
      return NextResponse.json(
        { success: false, error: 'Dados da requisição inválidos' },
        { status: 400 }
      );
    }
    
    ({ eventId, userId } = requestBody);

    // Validações básicas
    if (!eventId || !userId) {
      logError('QR Check-in: parâmetros faltando', new Error('Missing parameters'), { 
        eventId: eventId || 'missing', 
        userId: userId || 'missing' 
      });
      return NextResponse.json(
        { success: false, error: 'EventId e UserId são obrigatórios' },
        { status: 400 }
      );
    }

    logInfo(`QR Check-in iniciado: usuário ${userId} para evento ${eventId}`);

    // Verificar se o evento existe
    let event;
    try {
      logInfo(`Buscando evento ${eventId}...`);
      event = await getEvent(eventId);
      if (event) {
        logInfo(`Evento encontrado: ${event.name}`);
      }
    } catch (eventError) {
      logError(`Erro ao buscar evento ${eventId}`, eventError as Error);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar evento' },
        { status: 500 }
      );
    }
    
    if (!event) {
      logError(`QR Check-in: evento ${eventId} não encontrado`, new Error('Event not found'));
      return NextResponse.json(
        { success: false, error: 'Evento não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o usuário está inscrito no evento
    let registration;
    try {
      logInfo(`Buscando registro do usuário ${userId} no evento ${eventId}...`);
      registration = await getRegistration(eventId, userId);
      if (registration) {
        logInfo(`Registro encontrado: usuário ${registration.userName}`);
      }
    } catch (registrationError) {
      logError(`Erro ao buscar registro para usuário ${userId} e evento ${eventId}`, registrationError as Error);
      return NextResponse.json(
        { success: false, error: 'Erro ao verificar inscrição' },
        { status: 500 }
      );
    }
    
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

    // Verificar timing do evento
    try {
      logInfo('Verificando timing do evento...');
      const now = new Date();
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      
      logInfo(`Horário atual: ${now.toLocaleString('pt-BR')}`);
      logInfo(`Evento termina: ${eventEnd.toLocaleString('pt-BR')}`);

      // Não permitir check-in APÓS o evento terminar
      if (now > eventEnd) {
        logInfo(`QR Check-in: tentativa após fim do evento ${eventId}`);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Este evento já terminou, check-in não é mais permitido',
            eventName: event.name 
          },
          { status: 400 }
        );
      }
    } catch (timingError) {
      logError('Erro ao verificar timing do evento', timingError as Error);
      return NextResponse.json(
        { success: false, error: 'Erro ao verificar horário do evento' },
        { status: 500 }
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
    try {
      logInfo(`Realizando check-in para usuário ${userId}...`);
      
      // Passar apenas os campos que precisam ser atualizados
      const updateData = {
        checkedIn: true,
        checkInTime: new Date(),
      };

      await updateRegistration(registration.id, updateData);
      logInfo(`Check-in atualizado com sucesso no banco de dados`);
      
      // Criar objeto completo para retorno
      const updatedRegistration = {
        ...registration,
        ...updateData,
      };

      // Log de auditoria
      try {
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
        logInfo('Log de auditoria gravado com sucesso');
      } catch (auditError) {
        logError('Erro no log de auditoria (não crítico)', auditError as Error);
        // Não falhar a operação por causa do log de auditoria
      }

      logInfo(`QR Check-in realizado com sucesso: usuário ${userId} no evento ${eventId}`);

      return NextResponse.json({
        success: true,
        message: `Check-in realizado com sucesso no evento "${event.name}"!`,
        eventName: event.name,
        checkInTime: new Date().toLocaleString('pt-BR'),
        registration: updatedRegistration,
      });
      
    } catch (updateError) {
      logError('Erro ao atualizar registro de check-in', updateError as Error, {
        registrationId: registration.id,
        eventId,
        userId
      });
      return NextResponse.json(
        { success: false, error: 'Erro ao realizar check-in' },
        { status: 500 }
      );
    }

  } catch (error) {
    logError('Erro geral no QR Check-in', error as Error, {
      eventId: eventId || 'unknown',
      userId: userId || 'unknown'
    });
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}