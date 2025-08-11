/**
 * Utilitários para manipulação de texto
 */

/**
 * Sanitiza texto para uso em PDFs removendo emojis e caracteres especiais
 * que podem causar problemas de codificação WinAnsi
 */
export const sanitizeTextForPDF = (text: string): string => {
  return text
    // Remover emojis
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    // Substituir caracteres especiais problemáticos
    .replace(/[^\x00-\x7F]/g, function(char) {
      const replacements: {[key: string]: string} = {
        // Acentos em a
        'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
        'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'Ä': 'A',
        // Acentos em e
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
        // Acentos em i
        'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
        'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
        // Acentos em o
        'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
        'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O', 'Ö': 'O',
        // Acentos em u
        'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
        'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
        // Caracteres especiais
        'ç': 'c', 'Ç': 'C',
        'ñ': 'n', 'Ñ': 'N',
        // Símbolos comuns - usando códigos Unicode
        '\u201C': '"', '\u201D': '"', // aspas duplas curvas
        '\u2018': "'", '\u2019': "'", // aspas simples curvas
        '\u2013': '-', '\u2014': '-', // en dash e em dash
        '\u2026': '...', // reticências
        '\u20AC': 'EUR', // símbolo do Euro
        '\u00A3': 'GBP', // símbolo da Libra
        '\u00A5': 'JPY', // símbolo do Yen
        '\u00A9': '(C)', // copyright
        '\u00AE': '(R)', // marca registrada
        '\u2122': 'TM',  // trademark
      };
      return replacements[char] || '';
    })
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
