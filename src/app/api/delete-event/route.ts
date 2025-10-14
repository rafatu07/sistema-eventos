import { NextRequest, NextResponse } from 'next/server';
import { deleteEvent } from '@/lib/firestore';
import { logError, logInfo } from '@/lib/logger';

// Senha fixa solicitada pelo usuário
const REQUIRED_PASSWORD = '!Reifiner1';

export async function POST(request: NextRequest) {
  try {
    const { eventId, password } = await request.json();

    if (!eventId || !password) {
      return NextResponse.json({ error: 'eventId e password são obrigatórios' }, { status: 400 });
    }

    if (password !== REQUIRED_PASSWORD) {
      logInfo('Tentativa de exclusão com senha inválida', { eventId });
      return NextResponse.json({ error: 'Senha inválida' }, { status: 401 });
    }

    logInfo('Iniciando exclusão de evento com verificação de senha', { eventId });
    await deleteEvent(eventId);
    logInfo('Evento excluído com sucesso', { eventId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Erro ao excluir evento via API', error as Error);
    return NextResponse.json({ error: 'Erro interno ao excluir evento' }, { status: 500 });
  }
}


