import { useMemo } from 'react';
import { FormFieldConfig, ConditionalLogic, ConditionalRule } from '@/types/custom-forms';

/**
 * Hook para avaliar lógica condicional de campos
 */
export const useConditionalLogic = (
  fields: FormFieldConfig[],
  formData: Record<string, string | string[] | boolean>
) => {
  const visibleFields = useMemo(() => {
    return fields.filter(field => {
      // Se não tem lógica condicional, sempre visível
      if (!field.conditionalLogic?.enabled) {
        return true;
      }

      const logic = field.conditionalLogic;
      const conditionResults = logic.conditions.map(condition => 
        evaluateCondition(condition, formData)
      );

      // Aplicar operador (AND/OR)
      const finalResult = logic.operator === 'and' 
        ? conditionResults.every(result => result)
        : conditionResults.some(result => result);

      // Aplicar ação (show/hide)
      return logic.action === 'show' ? finalResult : !finalResult;
    });
  }, [fields, formData]);

  return { visibleFields };
};

/**
 * Avalia uma condição específica
 */
const evaluateCondition = (
  condition: ConditionalRule,
  formData: Record<string, string | string[] | boolean>
): boolean => {
  const fieldValue = formData[condition.fieldId];
  const conditionValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      if (Array.isArray(conditionValue)) {
        return conditionValue.includes(String(fieldValue || ''));
      }
      return String(fieldValue || '') === conditionValue;

    case 'not_equals':
      if (Array.isArray(conditionValue)) {
        return !conditionValue.includes(String(fieldValue || ''));
      }
      return String(fieldValue || '') !== conditionValue;

    case 'contains':
      if (Array.isArray(fieldValue)) {
        return Array.isArray(conditionValue) 
          ? conditionValue.some(val => fieldValue.includes(val))
          : fieldValue.includes(conditionValue);
      }
      return String(fieldValue || '').toLowerCase().includes(String(conditionValue).toLowerCase());

    case 'not_contains':
      if (Array.isArray(fieldValue)) {
        return Array.isArray(conditionValue) 
          ? !conditionValue.some(val => fieldValue.includes(val))
          : !fieldValue.includes(conditionValue);
      }
      return !String(fieldValue || '').toLowerCase().includes(String(conditionValue).toLowerCase());

    case 'is_empty':
      return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);

    case 'is_not_empty':
      return Boolean(fieldValue) && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);

    default:
      return false;
  }
};

/**
 * Obtém campos que podem ser usados como triggers para condições
 */
export const getConditionalTriggers = (fields: FormFieldConfig[], excludeFieldId?: string) => {
  return fields
    .filter(field => {
      // Excluir o próprio campo para evitar dependência circular
      if (field.id === excludeFieldId) return false;
      
      // Apenas campos que podem ser usados como triggers
      const triggerTypes = ['select', 'radio', 'checkbox', 'text', 'email', 'number'];
      return triggerTypes.includes(field.type);
    })
    .map(field => ({
      fieldId: field.id,
      fieldLabel: field.label,
      fieldType: field.type,
      options: 'options' in field ? field.options : undefined,
    }));
};

/**
 * Valida se as condições de um campo são válidas
 */
export const validateConditionalLogic = (
  logic: ConditionalLogic,
  allFields: FormFieldConfig[]
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!logic.enabled) {
    return { isValid: true, errors: [] };
  }

  if (logic.conditions.length === 0) {
    errors.push('Pelo menos uma condição deve ser definida');
  }

  logic.conditions.forEach((condition, index) => {
    const triggerField = allFields.find(f => f.id === condition.fieldId);
    
    if (!triggerField) {
      errors.push(`Condição ${index + 1}: Campo de trigger não encontrado`);
      return;
    }

    if (['equals', 'not_equals', 'contains', 'not_contains'].includes(condition.operator)) {
      if (!condition.value || (Array.isArray(condition.value) && condition.value.length === 0)) {
        errors.push(`Condição ${index + 1}: Valor é obrigatório para este operador`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};
