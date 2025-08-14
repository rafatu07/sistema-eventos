// Types para formulários personalizáveis de eventos

export interface FormFieldBase {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  description?: string;
  order: number;
  width: 'full' | 'half' | 'third' | 'two-thirds';
  conditionalLogic?: ConditionalLogic;
}

// Tipos para lógica condicional
export interface ConditionalLogic {
  enabled: boolean;
  conditions: ConditionalRule[];
  action: 'show' | 'hide';
  operator: 'and' | 'or'; // Para múltiplas condições
}

export interface ConditionalRule {
  fieldId: string; // ID do campo que será verificado
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
  value: string | string[]; // Valor(es) para comparação
}

// Interface para campos que podem triggerar condições
export interface ConditionalTrigger {
  fieldId: string;
  fieldLabel: string;
  fieldType: FormFieldType;
  options?: FormFieldOption[]; // Para selects, radios, etc.
}

export type FormFieldType = 
  | 'text' 
  | 'email' 
  | 'phone' 
  | 'textarea' 
  | 'select' 
  | 'radio' 
  | 'checkbox' 
  | 'multi-select'
  | 'number'
  | 'date'
  | 'cpf'
  | 'terms'
  | 'password';

export interface TextFieldConfig extends FormFieldBase {
  type: 'text' | 'email' | 'phone' | 'cpf';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  mask?: string;
}

export interface PasswordFieldConfig extends FormFieldBase {
  type: 'password';
  minLength?: number;
  maxLength?: number;
}

export interface TextareaFieldConfig extends FormFieldBase {
  type: 'textarea';
  minLength?: number;
  maxLength?: number;
  rows?: number;
}

export interface SelectFieldConfig extends FormFieldBase {
  type: 'select' | 'multi-select';
  options: FormFieldOption[];
  allowOther?: boolean;
}

export interface RadioFieldConfig extends FormFieldBase {
  type: 'radio';
  options: FormFieldOption[];
  allowOther?: boolean;
}

export interface CheckboxFieldConfig extends FormFieldBase {
  type: 'checkbox';
  options: FormFieldOption[];
  minSelected?: number;
  maxSelected?: number;
}

export interface NumberFieldConfig extends FormFieldBase {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

export interface DateFieldConfig extends FormFieldBase {
  type: 'date';
  minDate?: string;
  maxDate?: string;
}

export interface TermsFieldConfig extends FormFieldBase {
  type: 'terms';
  termsText: string;
  termsUrl?: string;
}

export interface FormFieldOption {
  id: string;
  label: string;
  value: string;
}

export type FormFieldConfig = 
  | TextFieldConfig
  | PasswordFieldConfig
  | TextareaFieldConfig
  | SelectFieldConfig
  | RadioFieldConfig
  | CheckboxFieldConfig
  | NumberFieldConfig
  | DateFieldConfig
  | TermsFieldConfig;

export interface CustomFormConfig {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  fields: FormFieldConfig[];
  settings: {
    allowMultipleSubmissions: boolean;
    requireLogin: boolean;
    showProgressBar: boolean;
    confirmationMessage: string;
    redirectUrl?: string;
    emailNotifications: boolean;
    saveResponsesToFirestore: boolean;
  };
  styling: {
    theme: 'default' | 'modern' | 'minimal' | 'colorful';
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface FormResponse {
  id: string;
  formId: string;
  eventId: string;
  userId?: string;
  userEmail: string;
  userName: string;
  responses: Record<string, FormFieldResponse>;
  submittedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Tipos específicos de valor para cada tipo de campo
export type FormFieldValue = 
  | string      // text, email, phone, cpf, password, textarea, number, date
  | string[]    // multi-select, checkbox
  | boolean;    // terms

export interface FormFieldResponse {
  fieldId: string;
  fieldType: FormFieldType;
  value: FormFieldValue;
  label: string;
}

// Validation schemas para diferentes tipos de campos
export interface FieldValidation {
  isValid: boolean;
  message?: string;
}

// Default field configs para diferentes tipos
export const DEFAULT_FIELD_CONFIGS: Record<FormFieldType, Partial<FormFieldConfig>> = {
  text: {
    type: 'text',
    placeholder: 'Digite seu texto',
    maxLength: 100,
    width: 'half',
  },
  email: {
    type: 'email',
    placeholder: 'seu@email.com',
    pattern: '^[^@]+@[^@]+\.[^@]+$',
    width: 'half',
  },
  phone: {
    type: 'phone',
    placeholder: '(11) 99999-9999',
    mask: '(99) 99999-9999',
    width: 'half',
  },
  cpf: {
    type: 'cpf',
    placeholder: '000.000.000-00',
    mask: '999.999.999-99',
    width: 'half',
  },
  password: {
    type: 'password',
    placeholder: 'Digite sua senha',
    minLength: 6,
    maxLength: 50,
    width: 'half',
  },
  textarea: {
    type: 'textarea',
    placeholder: 'Digite sua mensagem',
    rows: 4,
    maxLength: 500,
    width: 'full',
  },
  select: {
    type: 'select',
    options: [
      { id: '1', label: 'Opção 1', value: 'opcao1' },
      { id: '2', label: 'Opção 2', value: 'opcao2' },
    ],
    width: 'half',
  },
  'multi-select': {
    type: 'multi-select',
    options: [
      { id: '1', label: 'Opção 1', value: 'opcao1' },
      { id: '2', label: 'Opção 2', value: 'opcao2' },
    ],
    width: 'half',
  },
  radio: {
    type: 'radio',
    options: [
      { id: '1', label: 'Sim', value: 'sim' },
      { id: '2', label: 'Não', value: 'nao' },
    ],
    width: 'full',
  },
  checkbox: {
    type: 'checkbox',
    options: [
      { id: '1', label: 'Opção 1', value: 'opcao1' },
      { id: '2', label: 'Opção 2', value: 'opcao2' },
    ],
    width: 'full',
  },
  number: {
    type: 'number',
    placeholder: '0',
    min: 0,
    width: 'half',
  },
  date: {
    type: 'date',
    placeholder: 'DD/MM/AAAA',
    width: 'half',
  },
  terms: {
    type: 'terms',
    termsText: 'Aceito os termos e condições',
    width: 'full',
  },
};

// Tipos para o editor de formulário
export interface FormBuilderState {
  config: CustomFormConfig;
  selectedFieldId: string | null;
  isDragging: boolean;
  previewMode: boolean;
}

export interface DraggedField {
  fieldType: FormFieldType;
  isNewField: boolean;
  existingFieldId?: string;
}
