'use client';

import React, { useState } from 'react';
import { 
  CustomFormConfig, 
  FormFieldConfig, 
  FormFieldResponse 
} from '@/types/custom-forms';
import { useConditionalLogic } from '@/hooks/useConditionalLogic';
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface FormPreviewProps {
  config: CustomFormConfig;
  className?: string;
  onSubmit?: (responses: Record<string, FormFieldResponse>) => void;
  isSubmitting?: boolean;
}

export const FormPreview: React.FC<FormPreviewProps> = ({
  config,
  className = '',
  onSubmit,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<Record<string, string | string[] | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Usar lógica condicional para determinar campos visíveis
  const { visibleFields } = useConditionalLogic(config.fields, formData);

  const updateFieldValue = (fieldId: string, value: string | string[] | boolean) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value,
    }));

    // Limpar erro quando usuário começa a corrigir
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateField = (field: FormFieldConfig, value: string | string[] | boolean | undefined): string | null => {
    // Validação de campo obrigatório
    if (field.required && (!value || value === '' || (Array.isArray(value) && value.length === 0))) {
      return `${field.label} é obrigatório.`;
    }

    // Validações específicas por tipo
    switch (field.type) {
      case 'email':
        if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Por favor, digite um email válido.';
        }
        break;

      case 'phone':
        if (typeof value === 'string' && !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(value)) {
          return 'Por favor, digite um telefone válido.';
        }
        break;

      case 'cpf':
        if (typeof value === 'string' && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
          return 'Por favor, digite um CPF válido.';
        }
        break;

      case 'text':
      case 'textarea':
        if (typeof value === 'string' && 'minLength' in field && field.minLength && value.length < field.minLength) {
          return `Mínimo de ${field.minLength} caracteres.`;
        }
        if (typeof value === 'string' && 'maxLength' in field && field.maxLength && value.length > field.maxLength) {
          return `Máximo de ${field.maxLength} caracteres.`;
        }
        break;

      case 'number':
        if (typeof value === 'string' && value !== '') {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            return 'Por favor, digite um número válido.';
          }
          if ('min' in field && field.min !== undefined && numValue < field.min) {
            return `Valor mínimo é ${field.min}.`;
          }
          if ('max' in field && field.max !== undefined && numValue > field.max) {
            return `Valor máximo é ${field.max}.`;
          }
        }
        break;

      case 'checkbox':
        if ('minSelected' in field && field.minSelected && Array.isArray(value) && value.length < field.minSelected) {
          return `Selecione pelo menos ${field.minSelected} opção(ões).`;
        }
        if ('maxSelected' in field && field.maxSelected && Array.isArray(value) && value.length > field.maxSelected) {
          return `Selecione no máximo ${field.maxSelected} opção(ões).`;
        }
        break;
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    const responses: Record<string, FormFieldResponse> = {};

    // Validar apenas os campos visíveis
    visibleFields.forEach(field => {
      const value = formData[field.id];
      const error = validateField(field, value);
      
      if (error) {
        newErrors[field.id] = error;
      } else {
        // Criar resposta do campo
        responses[field.id] = {
          fieldId: field.id,
          fieldType: field.type,
          value: value || (field.type === 'checkbox' ? [] : ''),
          label: field.label,
        };
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit?.(responses);
  };

  // Função para obter classes de largura
  const getFieldWidthClass = (width: 'full' | 'half' | 'third' | 'two-thirds') => {
    switch (width) {
      case 'full':
        return 'col-span-1 md:col-span-2';
      case 'half':
        return 'col-span-1';
      case 'third':
        return 'col-span-1 md:col-span-1';
      case 'two-thirds':
        return 'col-span-1 md:col-span-2';
      default:
        return 'col-span-1';
    }
  };

  const renderField = (field: FormFieldConfig) => {
    const fieldValue = formData[field.id];
    const fieldError = errors[field.id];
    const widthClass = getFieldWidthClass(field.width || 'half');

    const baseInputClass = `input w-full ${fieldError ? 'border-red-300 focus:border-red-500' : ''}`;

    const fieldWrapper = (children: React.ReactNode) => (
      <div key={field.id} className={widthClass}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.description && (
          <p className="text-sm text-gray-600 mb-2">{field.description}</p>
        )}
        {children}
        {fieldError && (
          <div className="flex items-center mt-1 text-red-600">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span className="text-sm">{fieldError}</span>
          </div>
        )}
      </div>
    );

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'cpf':
        return fieldWrapper(
          <input
            type={field.type === 'email' ? 'email' : field.type === 'phone' || field.type === 'cpf' ? 'tel' : 'text'}
            value={typeof fieldValue === 'string' ? fieldValue : ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        );

      case 'password':
        return fieldWrapper(
          <input
            type="password"
            value={typeof fieldValue === 'string' ? fieldValue : ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        );

      case 'textarea':
        return fieldWrapper(
          <textarea
            value={typeof fieldValue === 'string' ? fieldValue : ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={'rows' in field ? field.rows : 4}
            className={baseInputClass}
          />
        );

      case 'number':
        return fieldWrapper(
          <input
            type="number"
            value={typeof fieldValue === 'string' ? fieldValue : ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            min={'min' in field ? field.min : undefined}
            max={'max' in field ? field.max : undefined}
            step={'step' in field ? field.step : undefined}
            className={baseInputClass}
          />
        );

      case 'date':
        return fieldWrapper(
          <input
            type="date"
            value={typeof fieldValue === 'string' ? fieldValue : ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            min={'minDate' in field ? field.minDate : undefined}
            max={'maxDate' in field ? field.maxDate : undefined}
            className={baseInputClass}
          />
        );

      case 'select':
        return fieldWrapper(
          <select
            value={typeof fieldValue === 'string' ? fieldValue : ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            className={baseInputClass}
          >
            <option value="">Selecione uma opção...</option>
            {'options' in field && field.options?.map((option) => (
              <option key={option.id} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multi-select':
        return fieldWrapper(
          <select
            multiple
            value={Array.isArray(fieldValue) ? fieldValue : []}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => option.value);
              updateFieldValue(field.id, values);
            }}
            className={`${baseInputClass} h-32`}
          >
            {'options' in field && field.options?.map((option) => (
              <option key={option.id} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return fieldWrapper(
          <div className="space-y-2">
            {'options' in field && field.options?.map((option) => (
              <label key={option.id} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option.value}
                  checked={fieldValue === option.value}
                  onChange={(e) => updateFieldValue(field.id, e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return fieldWrapper(
          <div className="space-y-2">
            {'options' in field && field.options?.map((option) => (
              <label key={option.id} className="flex items-center">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={Array.isArray(fieldValue) && fieldValue.includes(option.value)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(fieldValue) ? fieldValue : [];
                    let newValues;
                    if (e.target.checked) {
                      newValues = [...currentValues, option.value];
                    } else {
                      newValues = currentValues.filter((v: string) => v !== option.value);
                    }
                    updateFieldValue(field.id, newValues);
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'terms':
        const termsField = field as FormFieldConfig & { termsText?: string; termsUrl?: string; };
        return fieldWrapper(
          <div className="flex items-start">
            <input
              type="checkbox"
              checked={Boolean(fieldValue)}
              onChange={(e) => updateFieldValue(field.id, e.target.checked)}
              className="mr-3 mt-1"
            />
            <div className="text-sm text-gray-700">
              {termsField.termsText}
              {termsField.termsUrl && (
                <a 
                  href={termsField.termsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-1 text-blue-600 hover:text-blue-700 inline-flex items-center"
                >
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const sortedFields = [...visibleFields].sort((a, b) => a.order - b.order);

  return (
    <div 
      className={`${className}`}
      style={{
        backgroundColor: config.styling.backgroundColor,
        color: config.styling.textColor,
        borderRadius: `${config.styling.borderRadius}px`,
      }}
    >
      <div className="p-6">
        {/* Header do Formulário */}
        <div className="mb-8">
          <h2 
            className="text-2xl font-bold mb-2"
            style={{ color: config.styling.primaryColor }}
          >
            {config.title}
          </h2>
          {config.description && (
            <p className="text-gray-600">{config.description}</p>
          )}
        </div>

        {/* Barra de Progresso (se habilitada) */}
        {config.settings.showProgressBar && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progresso do Formulário</span>
              <span>50%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  backgroundColor: config.styling.primaryColor,
                  width: '50%'
                }}
              />
            </div>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grid responsivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedFields.map(renderField)}
          </div>

          {/* Botão de Envio */}
          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center"
              style={{ 
                backgroundColor: config.styling.primaryColor,
                borderRadius: `${config.styling.borderRadius}px`,
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Enviar Formulário
                </>
              )}
            </button>
          </div>
        </form>

        {/* Mensagem de Confirmação (Preview) */}
        {config.settings.confirmationMessage && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800">{config.settings.confirmationMessage}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
