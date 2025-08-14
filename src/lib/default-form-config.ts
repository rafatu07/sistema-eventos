import { CustomFormConfig, FormFieldConfig } from '@/types/custom-forms';

/**
 * Configuração do formulário padrão baseado no formulário original
 * Estes campos são essenciais para o funcionamento do sistema de registro/login
 */
export const createDefaultFormConfig = (eventId: string, userId: string): CustomFormConfig => {
  const defaultFields: FormFieldConfig[] = [
    {
      id: 'name',
      type: 'text',
      label: 'Nome Completo',
      placeholder: 'Digite seu nome completo',
      required: true,
      description: 'Digite seu nome completo para identificação no evento',
      order: 0,
      width: 'half',
      minLength: 3,
      maxLength: 100,
    },
    {
      id: 'email',
      type: 'email',
      label: 'Email',
      placeholder: 'Digite seu email',
      required: true,
      description: 'Será usado para login no sistema e comunicações do evento',
      order: 1,
      width: 'half',
      pattern: '^[^@]+@[^@]+\\.[^@]+$',
    },
    {
      id: 'cpf',
      type: 'cpf',
      label: 'CPF',
      placeholder: '000.000.000-00',
      required: true,
      description: 'Necessário para emissão de certificados e identificação',
      order: 2,
      width: 'half',
      mask: '999.999.999-99',
    },
    {
      id: 'phone',
      type: 'phone',
      label: 'Telefone',
      placeholder: '(11) 99999-9999',
      required: false,
      description: 'Opcional - para contato em caso de necessidade',
      order: 3,
      width: 'half',
      mask: '(99) 99999-9999',
    },
    {
      id: 'password',
      type: 'password',
      label: 'Senha',
      placeholder: 'Digite uma senha com pelo menos 6 caracteres',
      required: true,
      description: 'Será sua senha de acesso ao sistema',
      order: 4,
      width: 'half',
      minLength: 6,
    },
    {
      id: 'confirmPassword',
      type: 'password',
      label: 'Confirmar Senha',
      placeholder: 'Digite a senha novamente',
      required: true,
      description: 'Confirme sua senha para prosseguir',
      order: 5,
      width: 'half',
      minLength: 6,
    },
  ];

  return {
    id: '',
    eventId,
    title: 'Formulário de Inscrição',
    description: 'Preencha seus dados para confirmar sua participação no evento',
    fields: defaultFields,
    settings: {
      allowMultipleSubmissions: false,
      requireLogin: false, // Já que é para criar conta
      showProgressBar: false,
      confirmationMessage: 'Inscrição realizada com sucesso! Você receberá acesso ao seu dashboard.',
      emailNotifications: false,
      saveResponsesToFirestore: true,
    },
    styling: {
      theme: 'default',
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      borderRadius: 8,
    },
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  };
};

/**
 * Campos que são obrigatórios para o funcionamento do sistema
 * Estes não podem ser removidos do formulário
 */
export const REQUIRED_SYSTEM_FIELDS = [
  'name',
  'email', 
  'password',
  'confirmPassword'
];

/**
 * Verifica se um campo é obrigatório do sistema
 */
export const isSystemRequiredField = (fieldId: string): boolean => {
  return REQUIRED_SYSTEM_FIELDS.includes(fieldId);
};

/**
 * Valida se o formulário possui todos os campos obrigatórios do sistema
 */
export const validateFormHasRequiredFields = (fields: FormFieldConfig[]): { 
  isValid: boolean; 
  missingFields: string[] 
} => {
  const fieldIds = fields.map(f => f.id);
  const missingFields = REQUIRED_SYSTEM_FIELDS.filter(required => 
    !fieldIds.includes(required)
  );
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};
