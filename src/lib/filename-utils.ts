/**
 * Utilitários para sanitização de nomes de arquivo
 * Compatível com Vercel e outros ambientes serverless
 */

/**
 * Sanitiza um nome de arquivo removendo caracteres especiais e acentos
 * para garantir compatibilidade com headers HTTP e sistemas de arquivo
 * 
 * @param fileName - Nome original do arquivo
 * @param prefix - Prefixo opcional para o arquivo
 * @param extension - Extensão do arquivo (sem ponto)
 * @returns Nome sanitizado do arquivo
 */
export function sanitizeFileName(
  fileName: string, 
  prefix: string = '', 
  extension: string = ''
): string {
  if (!fileName || typeof fileName !== 'string') {
    return 'arquivo';
  }

  // Normalizar e remover acentos
  let sanitized = fileName
    .normalize('NFD') // Decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Manter apenas letras, números, espaços e hífens
    .replace(/\s+/g, '-') // Substituir espaços por hífens
    .replace(/-+/g, '-') // Remover hífens duplicados
    .replace(/^-|-$/g, '') // Remover hífens do início e fim
    .toLowerCase(); // Converter para minúsculas

  // Se ficou vazio após sanitização, usar fallback
  if (!sanitized) {
    sanitized = 'arquivo';
  }

  // Adicionar prefixo se fornecido
  if (prefix) {
    sanitized = `${prefix}-${sanitized}`;
  }

  // Adicionar extensão se fornecida
  if (extension) {
    sanitized = `${sanitized}.${extension}`;
  }

  return sanitized;
}

/**
 * Gera um nome de arquivo para certificado baseado no nome do usuário
 * 
 * @param userName - Nome do usuário
 * @returns Nome sanitizado para o certificado
 */
export function generateCertificateFileName(userName: string): string {
  return sanitizeFileName(userName, 'certificado', 'pdf');
}

/**
 * Gera um nome de arquivo para relatório baseado no nome do evento
 * 
 * @param eventName - Nome do evento
 * @param type - Tipo do relatório (participantes, certificados, etc.)
 * @returns Nome sanitizado para o relatório
 */
export function generateReportFileName(eventName: string, type: string = 'relatorio'): string {
  return sanitizeFileName(eventName, type, 'xlsx');
}

/**
 * Valida se um nome de arquivo é seguro para uso em headers HTTP
 * 
 * @param fileName - Nome do arquivo para validar
 * @returns true se o nome é seguro, false caso contrário
 */
export function isFileNameSafe(fileName: string): boolean {
  if (!fileName || typeof fileName !== 'string') {
    return false;
  }

  // Verificar se contém apenas caracteres ASCII seguros
  const safePattern = /^[a-zA-Z0-9.-]+$/;
  return safePattern.test(fileName);
}

/**
 * Converte um nome de arquivo para formato seguro para headers HTTP
 * 
 * @param fileName - Nome original do arquivo
 * @returns Nome seguro para headers
 */
export function makeFileNameHeaderSafe(fileName: string): string {
  if (isFileNameSafe(fileName)) {
    return fileName;
  }
  
  return sanitizeFileName(fileName);
}

