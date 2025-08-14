import { FormFieldValue, FormFieldType } from '@/types/custom-forms';

/**
 * Converte valor do formulário para string segura para validação
 */
export const toValidationString = (value: FormFieldValue | undefined): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value.toString();
  if (Array.isArray(value)) return value.join(',');
  return String(value);
};

/**
 * Verifica se o valor está vazio baseado no tipo do campo
 */
export const isFieldEmpty = (value: FormFieldValue | undefined, fieldType: FormFieldType): boolean => {
  if (value === undefined || value === null) return true;
  
  switch (fieldType) {
    case 'checkbox':
    case 'multi-select':
      return Array.isArray(value) ? value.length === 0 : true;
    case 'terms':
      return value !== true;
    default:
      return value === '' || value === false;
  }
};

/**
 * Obtém o valor padrão para um tipo de campo
 */
export const getDefaultFieldValue = (fieldType: FormFieldType): FormFieldValue => {
  switch (fieldType) {
    case 'checkbox':
    case 'multi-select':
      return [];
    case 'terms':
      return false;
    default:
      return '';
  }
};

/**
 * Valida se o valor é do tipo correto para o campo
 */
export const isValidValueType = (value: FormFieldValue | undefined, fieldType: FormFieldType): boolean => {
  if (value === undefined) return true; // undefined é sempre válido (campo vazio)
  
  switch (fieldType) {
    case 'checkbox':
    case 'multi-select':
      return Array.isArray(value);
    case 'terms':
      return typeof value === 'boolean';
    default:
      return typeof value === 'string';
  }
};

/**
 * Converte valor para o tipo correto baseado no tipo do campo
 */
export const normalizeFieldValue = (value: unknown, fieldType: FormFieldType): FormFieldValue => {
  switch (fieldType) {
    case 'checkbox':
    case 'multi-select':
      if (Array.isArray(value)) return value;
      if (typeof value === 'string' && value) return [value];
      return [];
    case 'terms':
      return Boolean(value);
    default:
      return String(value || '');
  }
};

/**
 * Verifica se um campo com valor específico pode ser usado em regex
 */
export const canUseRegex = (value: FormFieldValue | undefined): value is string => {
  return typeof value === 'string';
};

/**
 * Verifica se um campo tem propriedade length
 */
export const hasLength = (value: FormFieldValue | undefined): value is string | string[] => {
  return typeof value === 'string' || Array.isArray(value);
};

/**
 * Obtém o comprimento de um valor de campo
 */
export const getFieldLength = (value: FormFieldValue | undefined): number => {
  if (typeof value === 'string') return value.length;
  if (Array.isArray(value)) return value.length;
  return 0;
};
