/**
 * Biblioteca de validadores para o sistema de eventos
 */

/**
 * Valida um CPF usando o algoritmo oficial
 * @param cpf - CPF a ser validado (com ou sem formatação)
 * @returns true se o CPF for válido, false caso contrário
 */
export const validateCPF = (cpf: string): boolean => {
  if (!cpf) return false;
  
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais (CPFs inválidos conhecidos)
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return false;
  }

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  
  if (remainder !== parseInt(cleanCPF.charAt(9))) {
    return false;
  }

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  
  return remainder === parseInt(cleanCPF.charAt(10));
};

/**
 * Formata um CPF para exibição
 * @param cpf - CPF a ser formatado
 * @returns CPF formatado (000.000.000-00)
 */
export const formatCPF = (cpf: string): string => {
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Valida um email
 * @param email - Email a ser validado
 * @returns true se o email for válido, false caso contrário
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
};

/**
 * Valida uma senha
 * @param password - Senha a ser validada
 * @param minLength - Comprimento mínimo (padrão: 6)
 * @returns objeto com resultado da validação e mensagens
 */
export const validatePassword = (password: string, minLength: number = 6) => {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Senha é obrigatória');
    return { isValid: false, errors };
  }
  
  if (password.length < minLength) {
    errors.push(`Senha deve ter pelo menos ${minLength} caracteres`);
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Valida um nome completo
 * @param name - Nome a ser validado
 * @returns true se o nome for válido, false caso contrário
 */
export const validateFullName = (name: string): boolean => {
  if (!name) return false;
  
  const trimmedName = name.trim();
  
  // Deve ter pelo menos 2 palavras
  const words = trimmedName.split(' ').filter(word => word.length > 0);
  if (words.length < 2) return false;
  
  // Cada palavra deve ter pelo menos 2 caracteres
  return words.every(word => word.length >= 2);
};

/**
 * Valida um telefone brasileiro
 * @param phone - Telefone a ser validado
 * @returns true se o telefone for válido, false caso contrário
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone) return false;
  
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Aceita telefones com 10 ou 11 dígitos (com ou sem 9 no celular)
  return cleanPhone.length === 10 || cleanPhone.length === 11;
};

/**
 * Formata um telefone para exibição
 * @param phone - Telefone a ser formatado
 * @returns Telefone formatado
 */
export const formatPhone = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};

/**
 * Sanitiza uma string removendo caracteres perigosos
 * @param input - String a ser sanitizada
 * @returns String sanitizada
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

/**
 * Valida se uma data está no futuro
 * @param date - Data a ser validada
 * @returns true se a data for futura, false caso contrário
 */
export const validateFutureDate = (date: Date): boolean => {
  const now = new Date();
  return date > now;
};

/**
 * Valida se um horário de fim é posterior ao horário de início
 * @param startTime - Horário de início
 * @param endTime - Horário de fim
 * @returns true se o horário de fim for posterior, false caso contrário
 */
export const validateTimeRange = (startTime: Date, endTime: Date): boolean => {
  return endTime > startTime;
};
