import { FormFieldConfig } from '@/types/custom-forms';

/**
 * Lista de campos que não devem aparecer em relatórios por questões de segurança
 */
const SENSITIVE_FIELDS = [
  'name',           // Já temos coluna separada
  'email',          // Já temos coluna separada  
  'cpf',            // Já temos coluna separada
  'phone',          // Já temos coluna separada
  'password',       // SENSÍVEL - nunca mostrar
  'confirmPassword',// SENSÍVEL - nunca mostrar
  'senha',          // SENSÍVEL - nunca mostrar
  'confirmSenha',   // SENSÍVEL - nunca mostrar
  'pwd',            // SENSÍVEL - nunca mostrar
  'pass'            // SENSÍVEL - nunca mostrar
];

/**
 * Verifica se um campo deve ser excluído dos relatórios
 * @param field - Campo do formulário a ser verificado
 * @returns true se o campo deve ser excluído, false caso contrário
 */
export const isFieldSensitive = (field: FormFieldConfig): boolean => {
  // Verificar se o tipo do campo é password
  if (field.type === 'password') {
    return true;
  }

  // Verificar se o ID do campo contém palavras sensíveis
  const fieldIdLower = field.id.toLowerCase();
  const isSensitiveById = SENSITIVE_FIELDS.some(sensitive => 
    fieldIdLower.includes(sensitive.toLowerCase())
  );

  // Verificar se o label do campo contém palavras sensíveis
  const fieldLabelLower = field.label.toLowerCase();
  const sensitiveKeywords = ['senha', 'password', 'pwd', 'pass'];
  const isSensitiveByLabel = sensitiveKeywords.some(keyword => 
    fieldLabelLower.includes(keyword)
  );

  return isSensitiveById || isSensitiveByLabel;
};

/**
 * Filtra campos sensíveis de uma lista de campos do formulário
 * @param fields - Lista de campos do formulário
 * @returns Lista de campos seguros (sem campos sensíveis)
 */
export const filterSensitiveFields = (fields: FormFieldConfig[]): FormFieldConfig[] => {
  return fields.filter(field => !isFieldSensitive(field));
};

/**
 * Obtém apenas os campos seguros para relatórios
 * @param fields - Lista de campos do formulário
 * @returns Lista de campos que podem ser incluídos em relatórios
 */
export const getSafeFieldsForReports = (fields: FormFieldConfig[]): FormFieldConfig[] => {
  return filterSensitiveFields(fields);
};

/**
 * Verifica se um campo deve ser incluído nos relatórios baseado no ID
 * @param fieldId - ID do campo
 * @param fieldType - Tipo do campo (opcional)
 * @returns true se o campo é seguro para relatórios
 */
export const isFieldSafeById = (fieldId: string, fieldType?: string): boolean => {
  if (fieldType === 'password') {
    return false;
  }

  const fieldIdLower = fieldId.toLowerCase();
  return !SENSITIVE_FIELDS.some(sensitive => 
    fieldIdLower.includes(sensitive.toLowerCase())
  );
};
