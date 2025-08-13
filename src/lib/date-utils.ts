/**
 * Utilitários para formatação de datas com fuso horário correto do Brasil
 * Corrige o problema de certificados mostrarem horários 3 horas adiantados
 */

export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Formata uma data para o padrão brasileiro (DD de mês de AAAA)
 * com fuso horário do Brasil
 */
export function formatDateBrazil(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: BRAZIL_TIMEZONE
  });
}

/**
 * Formata uma hora para o padrão brasileiro (HH:mm)
 * com fuso horário do Brasil
 */
export function formatTimeBrazil(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BRAZIL_TIMEZONE
  });
}

/**
 * Formata um intervalo de tempo (HH:mm às HH:mm)
 * com fuso horário do Brasil
 */
export function formatTimeRangeBrazil(startTime?: Date, endTime?: Date): string {
  if (!startTime || !endTime) {
    return '13:00 às 17:00'; // horário padrão
  }
  
  const start = formatTimeBrazil(startTime);
  const end = formatTimeBrazil(endTime);
  return `${start} às ${end}`;
}

/**
 * Converte uma data UTC para o fuso horário do Brasil
 * Útil quando recebemos dados do Firestore em UTC
 */
export function convertToBrazilTime(utcDate: Date): Date {
  // Criar uma nova instância da data para não modificar a original
  const brazilTime = new Date(utcDate);
  
  // Obter o offset do Brasil em relação ao UTC
  const brazilOffset = getBrazilTimezoneOffset(utcDate);
  
  // Ajustar a data para o fuso horário do Brasil
  brazilTime.setMinutes(brazilTime.getMinutes() - brazilOffset);
  
  return brazilTime;
}

/**
 * Obtém o offset do Brasil em relação ao UTC em minutos
 * Considera horário de verão quando aplicável
 */
function getBrazilTimezoneOffset(date: Date): number {
  // Criar uma data temporária formatada para o Brasil
  const tempDate = new Date(date.toLocaleString("en-US", {timeZone: BRAZIL_TIMEZONE}));
  
  // Calcular a diferença em minutos
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const localTime = tempDate.getTime();
  
  return (utcTime - localTime) / 60000;
}

/**
 * Utilitários para debug - ajuda a identificar problemas de fuso horário
 */
export function debugTimezone(date: Date, label = 'Date') {
  console.log(`🕒 ${label} Debug:`, {
    original: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toLocaleString(),
    brazil: date.toLocaleString('pt-BR', { timeZone: BRAZIL_TIMEZONE }),
    brazilTime: formatTimeBrazil(date),
    brazilDate: formatDateBrazil(date)
  });
}
