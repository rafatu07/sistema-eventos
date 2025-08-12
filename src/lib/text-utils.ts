/**
 * Utilitários para manipulação de texto
 */

/**
 * Sanitiza texto para uso em PDFs, preservando caracteres portugueses
 * Remove apenas emojis e caracteres problemáticos, mantendo acentos
 */
export const sanitizeTextForPDF = (text: string): string => {
  return text
    // Remover emojis
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    // Remover apenas caracteres problemáticos, preservando acentos portugueses
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle
    // Substituir apenas aspas e símbolos problemáticos, preservando acentos
    .replace(/[\u201C\u201D]/g, '"') // aspas duplas curvas
    .replace(/[\u2018\u2019]/g, "'") // aspas simples curvas
    .replace(/[\u2013\u2014]/g, '-') // en dash e em dash
    .replace(/\u2026/g, '...') // reticências
    .replace(/\u20AC/g, 'EUR') // símbolo do Euro
    .replace(/\u00A3/g, 'GBP') // símbolo da Libra
    .replace(/\u00A5/g, 'JPY') // símbolo do Yen
    .replace(/\u00A9/g, '(C)') // copyright
    .replace(/\u00AE/g, '(R)') // marca registrada
    .replace(/\u2122/g, 'TM')  // trademark
    .trim();
};

/**
 * Remove todos os emojis de uma string
 */
export const removeEmojis = (text: string): string => {
  return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
};

/**
 * Normaliza texto removendo acentos mas mantendo caracteres especiais
 */
export const normalizeText = (text: string): string => {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Sanitiza nome de arquivo removendo caracteres inválidos
 */
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[<>:"/\\|?*]/g, '') // Remove caracteres inválidos para arquivos
    .replace(/\s+/g, '-') // Substitui espaços por hífen
    .toLowerCase()
    .substring(0, 100); // Limita tamanho
};

/**
 * Valida se um texto contém apenas caracteres ASCII seguros
 */
export const isASCIISafe = (text: string): boolean => {
  return /^[\x00-\x7F]*$/.test(text);
};

/**
 * Converte texto para slug (URL-friendly)
 */
export const textToSlug = (text: string): string => {
  return normalizeText(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .replace(/[\s_-]+/g, '-') // Substitui espaços e underscores por hífen
    .replace(/^-+|-+$/g, ''); // Remove hífens do início e fim
};

/**
 * Trunca texto mantendo palavras inteiras
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
};

/**
 * Formata CPF para exibição
 */
export const formatCPF = (cpf: string): string => {
  const numbers = cpf.replace(/\D/g, '');
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Remove formatação do CPF
 */
export const unformatCPF = (cpf: string): string => {
  return cpf.replace(/\D/g, '');
};

/**
 * Formata telefone brasileiro
 */
export const formatPhone = (phone: string): string => {
  const numbers = phone.replace(/\D/g, '');
  
  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};

/**
 * Capitaliza primeira letra de cada palavra
 */
export const capitalizeWords = (text: string): string => {
  return text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};
