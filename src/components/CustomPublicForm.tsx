'use client';

import React, { useState } from 'react';
import { 
  CustomFormConfig, 
  FormFieldConfig, 
  FormFieldResponse,
  FormFieldType,
  FormFieldValue 
} from '@/types/custom-forms';
import { useConditionalLogic } from '@/hooks/useConditionalLogic';
// Importações removidas - não utilizadas no componente final
import { CheckCircle, AlertCircle, ExternalLink, UserPlus, User, Mail, CreditCard, Phone, Lock, Hash } from 'lucide-react';

// Tipo para dados do formulário - mais específico
type FormData = Record<string, string | string[] | boolean>;

// Helpers removidos - não utilizados

interface CustomPublicFormProps {
  eventId: string;
  config: CustomFormConfig;
  onSubmit?: (responses: Record<string, FormFieldResponse>) => Promise<void>;
}

// Mapa de ícones para cada tipo de campo
const FIELD_ICONS: Record<FormFieldType, React.ReactNode> = {
  text: <User className="inline h-5 w-5 mr-2" />,
  email: <Mail className="inline h-5 w-5 mr-2" />,
  phone: <Phone className="inline h-5 w-5 mr-2" />,
  cpf: <CreditCard className="inline h-5 w-5 mr-2" />,
  password: <Lock className="inline h-5 w-5 mr-2" />,
  textarea: <User className="inline h-5 w-5 mr-2" />,
  select: <Hash className="inline h-5 w-5 mr-2" />,
  'multi-select': <Hash className="inline h-5 w-5 mr-2" />,
  radio: <Hash className="inline h-5 w-5 mr-2" />,
  checkbox: <Hash className="inline h-5 w-5 mr-2" />,
  number: <Hash className="inline h-5 w-5 mr-2" />,
  date: <Hash className="inline h-5 w-5 mr-2" />,
  terms: <Hash className="inline h-5 w-5 mr-2" />,
};

// Função para obter classes de largura baseada na configuração do campo
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

export const CustomPublicForm: React.FC<CustomPublicFormProps> = ({
  eventId,
  config,
  onSubmit,
}) => {

  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [countdown, setCountdown] = useState(3);
  
  // Usar lógica condicional para determinar campos visíveis
  const { visibleFields } = useConditionalLogic(config.fields, formData);

  // Controlar contador regressivo de redirecionamento
  React.useEffect(() => {
    if (isSubmitted && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isSubmitted && countdown === 0) {
      // Redirecionar quando contador chega a 0
      const redirectUrl = config.settings.redirectUrl || '/dashboard';
      window.location.href = redirectUrl;
    }
    return undefined; // Garantir que sempre retorna algo
  }, [isSubmitted, countdown, config.settings.redirectUrl]);

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

    // Se vazio e não obrigatório, não validar
    if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
      return null;
    }

    // Validações específicas por tipo
    switch (field.type) {
      case 'email':
        if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Por favor, digite um email válido.';
        }
        break;

      case 'phone':
        if (typeof value === 'string') {
          const cleanPhone = value.replace(/\D/g, '');
          const formattedPhone = cleanPhone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
          if (!/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(formattedPhone)) {
            return 'Por favor, digite um telefone válido.';
          }
        }
        break;

      case 'cpf':
        if (typeof value === 'string') {
          const digits = value.replace(/\D/g, '');
          if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
            return 'Por favor, digite um CPF válido.';
          }
          
          // Validação de dígitos verificadores do CPF
          let sum = 0;
          for (let i = 0; i < 9; i++) {
            sum += parseInt(digits.charAt(i)) * (10 - i);
          }
          let remainder = (sum * 10) % 11;
          if (remainder === 10 || remainder === 11) remainder = 0;
          if (remainder !== parseInt(digits.charAt(9))) {
            return 'Por favor, digite um CPF válido.';
          }
          
          sum = 0;
          for (let i = 0; i < 10; i++) {
            sum += parseInt(digits.charAt(i)) * (11 - i);
          }
          remainder = (sum * 10) % 11;
          if (remainder === 10 || remainder === 11) remainder = 0;
          if (remainder !== parseInt(digits.charAt(10))) {
            return 'Por favor, digite um CPF válido.';
          }
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

      case 'password':
        if (typeof value === 'string' && 'minLength' in field && field.minLength && value.length < field.minLength) {
          return `A senha deve ter pelo menos ${field.minLength} caracteres.`;
        }
        if (typeof value === 'string' && 'maxLength' in field && field.maxLength && value.length > field.maxLength) {
          return `A senha deve ter no máximo ${field.maxLength} caracteres.`;
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

  const formatPhoneInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const formatCPFInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        // Criar resposta do campo - converter para FormFieldValue
        let responseValue: FormFieldValue;
        if (field.type === 'checkbox' || field.type === 'multi-select') {
          responseValue = Array.isArray(value) ? value : (value ? [String(value)] : []);
        } else if (field.type === 'terms') {
          responseValue = Boolean(value);
        } else {
          responseValue = String(value || '');
        }

        responses[field.id] = {
          fieldId: field.id,
          fieldType: field.type,
          value: responseValue,
          label: field.label,
        };
      }
    });

    // Validação especial para confirmação de senha
    const password = formData['password'];
    const confirmPassword = formData['confirmPassword'];
    if (password && confirmPassword && password !== confirmPassword) {
      newErrors['confirmPassword'] = 'As senhas não coincidem.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll para o primeiro erro
      const firstErrorField = Object.keys(newErrors)[0];
      const element = document.getElementById(`field-${firstErrorField}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      if (onSubmit) {
        await onSubmit(responses);
      } else {
        // Submissão padrão via API usando formato esperado
        const response = await fetch('/api/public-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId,
            name: formData['name'] || '',
            email: formData['email'] || '',
            cpf: formData['cpf'] || '',
            phone: formData['phone'] || '',
            password: formData['password'] || '',
            formId: config.id,
            formResponses: responses,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setSubmitError(result.error || 'Erro ao enviar formulário');
          return;
        }
      }

      setIsSubmitted(true);

    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitError(error instanceof Error ? error.message : 'Erro ao enviar formulário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormFieldConfig) => {
    const fieldValue = formData[field.id];
    const fieldError = errors[field.id];

    const baseInputClass = `input w-full text-lg ${fieldError ? 'border-red-300 focus:border-red-500' : ''}`;
    const widthClass = getFieldWidthClass(field.width);

    const fieldWrapper = (children: React.ReactNode) => (
      <div key={field.id} id={`field-${field.id}`} className={widthClass}>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {FIELD_ICONS[field.type]}
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
        return fieldWrapper(
          <input
            type={field.type}
            value={typeof fieldValue === 'string' ? fieldValue : ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
            required={field.required}
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
            required={field.required}
          />
        );

      case 'phone':
        return fieldWrapper(
          <input
            type="tel"
            value={typeof fieldValue === 'string' ? fieldValue : ''}
            onChange={(e) => updateFieldValue(field.id, formatPhoneInput(e.target.value))}
            placeholder={field.placeholder || '(11) 99999-9999'}
            className={baseInputClass}
            maxLength={15}
          />
        );

      case 'cpf':
        return fieldWrapper(
          <input
            type="text"
            value={typeof fieldValue === 'string' ? fieldValue : ''}
            onChange={(e) => updateFieldValue(field.id, formatCPFInput(e.target.value))}
            placeholder={field.placeholder || '000.000.000-00'}
            className={baseInputClass}
            maxLength={14}
            required={field.required}
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
            required={field.required}
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
            required={field.required}
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
            required={field.required}
          />
        );

      case 'select':
        return fieldWrapper(
          <select
            value={typeof fieldValue === 'string' ? fieldValue : ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            className={baseInputClass}
            required={field.required}
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
            required={field.required}
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
                  required={field.required}
                />
                <span className="text-sm text-gray-700">
                  {option.label}
                </span>
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
                <span className="text-sm text-gray-700">
                  {option.label}
                </span>
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
              required={field.required}
            />
            <div className="text-sm text-gray-700">
              {termsField.termsText}
              {termsField.termsUrl && (
                <a 
                  href={termsField.termsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-1 text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center"
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

  // Se o formulário já foi enviado com sucesso
  if (isSubmitted) {
    return (
      <>
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-8 text-white">
          <div className="flex items-center mb-3">
            <CheckCircle className="h-8 w-8 mr-4" />
            <h2 className="text-3xl font-bold">Formulário Enviado!</h2>
          </div>
          <p className="text-green-100 text-lg">
            {config.settings.confirmationMessage}
          </p>
        </div>

        <div className="card">
          <div className="card-content text-center py-8">
            <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Inscrição Confirmada!
            </h3>
            <p className="text-gray-600 mb-4">
              {config.settings.redirectUrl 
                ? 'Redirecionando você agora...' 
                : 'Redirecionando para o dashboard...'}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Redirecionamento automático em <strong>{countdown}</strong> segundo{countdown !== 1 ? 's' : ''}
            </p>
            <button 
              onClick={() => window.location.href = config.settings.redirectUrl || '/dashboard'}
              className="btn-primary"
            >
              Ir Agora
            </button>
          </div>
        </div>
      </>
    );
  }

  const sortedFields = [...visibleFields].sort((a, b) => a.order - b.order);

  return (
    <>
      {/* Header igual ao formulário padrão */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-8 text-white">
        <div className="flex items-center mb-3">
          <UserPlus className="h-8 w-8 mr-4" />
          <h2 className="text-3xl font-bold">{config.title}</h2>
        </div>
        <p className="text-green-100 text-lg">
          {config.description}
        </p>
      </div>

      {/* Card do formulário igual ao padrão */}
      <div className="card">
        <div className="card-content">
          {/* Mensagens de erro/sucesso */}
          {submitError && (
            <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-800 font-semibold text-lg">{submitError}</p>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Grid responsivo igual ao formulário padrão */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedFields.map(renderField)}
            </div>

            {/* Botão de envio igual ao padrão */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center text-lg py-4"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                    Processando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5 mr-3" />
                    Confirmar Inscrição
                  </>
                )}
              </button>
            </div>

            {/* Nota informativa igual ao padrão */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
              <p className="text-blue-800 font-medium">
                Ao se inscrever, você receberá acesso ao seu dashboard pessoal para 
                acompanhar o evento.
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
