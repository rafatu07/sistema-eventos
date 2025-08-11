import React from 'react';
import { useForm, UseFormProps, UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNotifications } from '@/components/NotificationSystem';
import { sanitizeFormData } from '@/lib/schemas';

interface UseValidatedFormOptions<TFormData extends FieldValues> extends UseFormProps<TFormData> {
  schema: z.ZodSchema<TFormData>;
  onSubmitSuccess?: (data: TFormData) => void;
  onSubmitError?: (error: Error) => void;
  showSuccessNotification?: boolean;
  showErrorNotification?: boolean;
}

interface UseValidatedFormReturn<TFormData extends FieldValues> extends UseFormReturn<TFormData> {
  isSubmitting: boolean;
  submitError: string | null;
  handleSubmit: (onSubmit: (data: TFormData) => Promise<void> | void) => (e?: React.BaseSyntheticEvent) => Promise<void>;
  getFieldError: (fieldName: Path<TFormData>) => string | undefined;
  hasFieldError: (fieldName: Path<TFormData>) => boolean;
  clearErrors: () => void;
  setFieldError: (fieldName: Path<TFormData>, message: string) => void;
}

export function useValidatedForm<TFormData extends FieldValues>({
  schema,
  onSubmitSuccess,
  onSubmitError,
  showSuccessNotification = false,
  showErrorNotification = true,
  ...formOptions
}: UseValidatedFormOptions<TFormData>): UseValidatedFormReturn<TFormData> {
  
  const notifications = useNotifications();
  
  const form = useForm<TFormData>({
    resolver: zodResolver(schema),
    mode: 'onChange', // Validar ao alterar
    reValidateMode: 'onChange',
    ...formOptions,
  });

  const {
    handleSubmit: rhfHandleSubmit,
    formState: { isSubmitting, errors },
    setError,
    clearErrors: rhfClearErrors,
  } = form;

  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Handler customizado para submit
  const handleSubmit = (onSubmit: (data: TFormData) => Promise<void> | void) => {
    return rhfHandleSubmit(async (data) => {
      setSubmitError(null);
      
      try {
        // Sanitizar dados antes do envio
        const sanitizedData = sanitizeFormData(data) as TFormData;
        
        // Executar função de submit
        await onSubmit(sanitizedData);
        
        // Executar callback de sucesso
        if (onSubmitSuccess) {
          onSubmitSuccess(sanitizedData);
        }
        
        // Mostrar notificação de sucesso se habilitado
        if (showSuccessNotification) {
          notifications.success('Sucesso!', 'Formulário enviado com sucesso.');
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro inesperado';
        setSubmitError(errorMessage);
        
        // Executar callback de erro
        if (onSubmitError) {
          onSubmitError(error as Error);
        }
        
        // Mostrar notificação de erro se habilitado
        if (showErrorNotification) {
          notifications.error('Erro', errorMessage);
        }
      }
    });
  };

  // Função para obter erro de um campo específico
  const getFieldError = (fieldName: Path<TFormData>): string | undefined => {
    const error = errors[fieldName];
    return error?.message as string;
  };

  // Função para verificar se um campo tem erro
  const hasFieldError = (fieldName: Path<TFormData>): boolean => {
    return !!errors[fieldName];
  };

  // Função para limpar erros
  const clearErrors = () => {
    setSubmitError(null);
    rhfClearErrors();
  };

  // Função para definir erro em campo específico
  const setFieldError = (fieldName: Path<TFormData>, message: string) => {
    setError(fieldName, {
      type: 'manual',
      message,
    });
  };

  return {
    ...form,
    isSubmitting,
    submitError,
    handleSubmit,
    getFieldError,
    hasFieldError,
    clearErrors,
    setFieldError,
  };
}

// Hook para validação de campo individual
export function useFieldValidation<TFormData extends FieldValues>(
  schema: z.ZodSchema<TFormData>,
  fieldName: Path<TFormData>
) {
  const [error, setError] = React.useState<string | null>(null);
  const [isValidating, setIsValidating] = React.useState(false);

  const validateField = React.useCallback(
    async (value: any, allData?: Partial<TFormData>) => {
      setIsValidating(true);
      
      try {
        // Se temos todos os dados, validar o objeto completo
        if (allData) {
          const result = schema.safeParse({ ...allData, [fieldName]: value });
          if (!result.success) {
            const fieldError = result.error.issues.find(
              (issue) => issue.path.includes(fieldName as string)
            );
            setError(fieldError?.message || null);
          } else {
            setError(null);
          }
        } else {
          // Validação simples do campo individual
          const fieldSchema = schema.shape[fieldName as keyof typeof schema.shape];
          if (fieldSchema) {
            const result = fieldSchema.safeParse(value);
            setError(result.success ? null : result.error.issues[0]?.message || 'Erro de validação');
          }
        }
      } catch (err) {
        setError('Erro durante validação');
      } finally {
        setIsValidating(false);
      }
    },
    [schema, fieldName]
  );

  return {
    error,
    isValidating,
    validateField,
  };
}

// Hook para debounce de validação
export function useDebouncedValidation<T>(
  value: T,
  validationFn: (value: T) => Promise<string | null>,
  delay = 300
) {
  const [error, setError] = React.useState<string | null>(null);
  const [isValidating, setIsValidating] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (value) {
        setIsValidating(true);
        try {
          const validationError = await validationFn(value);
          setError(validationError);
        } catch (err) {
          setError('Erro durante validação');
        } finally {
          setIsValidating(false);
        }
      } else {
        setError(null);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [value, validationFn, delay]);

  return { error, isValidating };
}

// Componente helper para exibir erros de campo
export function FieldError({ 
  error, 
  className = "text-sm text-red-600 mt-1" 
}: { 
  error?: string; 
  className?: string; 
}) {
  if (!error) return null;
  
  return (
    <p className={className} role="alert" aria-live="polite">
      {error}
    </p>
  );
}

// Componente helper para exibir status de validação
export function ValidationStatus({ 
  isValidating, 
  hasError, 
  className = "text-sm mt-1" 
}: { 
  isValidating: boolean; 
  hasError: boolean; 
  className?: string; 
}) {
  if (isValidating) {
    return (
      <p className={`${className} text-blue-600`}>
        Validando...
      </p>
    );
  }

  if (!hasError) {
    return (
      <p className={`${className} text-green-600`}>
        ✓ Válido
      </p>
    );
  }

  return null;
}
