import { z } from 'zod';

// === SCHEMAS DE VALIDAÇÃO ===

// Schema para CPF
const cpfSchema = z
  .string()
  .min(1, 'CPF é obrigatório')
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, 'CPF deve ter formato válido (000.000.000-00)')
  .refine((cpf) => {
    // Validação de CPF
    const digits = cpf.replace(/\D/g, '');
    
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false; // CPFs inválidos conhecidos
    
    // Validar dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits.charAt(i)) * (10 - i);
    }
    
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(digits.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits.charAt(i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    
    return remainder === parseInt(digits.charAt(10));
  }, 'CPF inválido');

// Schema para email
const emailSchema = z
  .string()
  .min(1, 'Email é obrigatório')
  .email('Email deve ter formato válido')
  .max(254, 'Email muito longo')
  .toLowerCase();

// Schema para senha
const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Senha deve conter: minúscula, maiúscula, número e símbolo'
  )
  .max(128, 'Senha muito longa');

// Schema para nome completo
const fullNameSchema = z
  .string()
  .min(1, 'Nome é obrigatório')
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(100, 'Nome muito longo')
  .regex(/^[A-Za-zÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços')
  .refine((name) => {
    const words = name.trim().split(/\s+/);
    return words.length >= 2 && words.every(word => word.length >= 2);
  }, 'Nome deve ter pelo menos 2 palavras com 2+ caracteres cada');

// Schema para telefone
const phoneSchema = z
  .string()
  .optional()
  .refine((phone) => {
    if (!phone) return true;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  }, 'Telefone deve ter 10 ou 11 dígitos');

// === SCHEMAS PRINCIPAIS ===

// Schema para autenticação - Login
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória'),
});

// Schema para autenticação - Cadastro
export const registerSchema = z
  .object({
    displayName: fullNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  });

// Schema para eventos
export const eventSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Nome do evento é obrigatório')
      .min(3, 'Nome deve ter pelo menos 3 caracteres')
      .max(100, 'Nome muito longo')
      .trim(),
    
    description: z
      .string()
      .min(1, 'Descrição é obrigatória')
      .min(10, 'Descrição deve ter pelo menos 10 caracteres')
      .max(1000, 'Descrição muito longa')
      .trim(),
    
    date: z
      .string()
      .min(1, 'Data é obrigatória')
      .refine((dateStr) => {
        try {
          // Criar data no timezone local usando meio-dia para evitar problemas de fuso horário
          const date = new Date(`${dateStr}T12:00:00`);
          
          // Verificar se a data é válida
          if (isNaN(date.getTime())) {
            return false;
          }
          
          // Criar data de hoje no timezone local
          const today = new Date();
          const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          
          // Comparar apenas as datas (ano, mês, dia)
          const eventDateLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          
          // Permitir data atual ou futura
          return eventDateLocal >= todayLocal;
        } catch {
          return false;
        }
      }, 'Data não pode ser passada'),
    
    startTime: z
      .string()
      .min(1, 'Horário de início é obrigatório')
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve estar no formato HH:MM'),
    
    endTime: z
      .string()
      .min(1, 'Horário de término é obrigatório')
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve estar no formato HH:MM'),
    
    location: z
      .string()
      .min(1, 'Local é obrigatório')
      .min(3, 'Local deve ter pelo menos 3 caracteres')
      .max(200, 'Local muito longo')
      .trim(),

    // Campos opcionais para limite de inscrição
    registrationDeadline: z
      .string()
      .optional()
      .refine((dateStr) => {
        if (!dateStr) return true; // Campo opcional
        try {
          const deadline = new Date(`${dateStr}T23:59:59`);
          return !isNaN(deadline.getTime());
        } catch {
          return false;
        }
      }, 'Data limite inválida'),
    
    registrationDeadlineMessage: z
      .string()
      .optional()
      .refine((msg) => {
        if (!msg) return true; // Campo opcional
        return msg.trim().length >= 10 && msg.trim().length <= 500;
      }, 'Mensagem deve ter entre 10 e 500 caracteres'),
    
    maxParticipants: z
      .union([
        z.number()
          .int('Deve ser um número inteiro')
          .min(1, 'Deve haver pelo menos 1 vaga')
          .max(10000, 'Limite máximo é 10.000 participantes'),
        z.literal(''),
        z.undefined()
      ])
      .optional()
      .transform((val) => {
        if (val === '' || val === undefined || val === null) {
          return undefined;
        }
        return val;
      }),
    
    maxParticipantsMessage: z
      .string()
      .optional()
      .refine((msg) => {
        if (!msg) return true; // Campo opcional
        return msg.trim().length >= 10 && msg.trim().length <= 500;
      }, 'Mensagem deve ter entre 10 e 500 caracteres'),
  })
  .refine(
    (data) => {
      const startDateTime = new Date(`${data.date}T${data.startTime}`);
      const endDateTime = new Date(`${data.date}T${data.endTime}`);
      return endDateTime > startDateTime;
    },
    {
      message: 'Horário de término deve ser após o horário de início',
      path: ['endTime'],
    }
  )
  .refine(
    (data) => {
      const startDateTime = new Date(`${data.date}T${data.startTime}`);
      const minDuration = 30 * 60 * 1000; // 30 minutos
      const endDateTime = new Date(`${data.date}T${data.endTime}`);
      return endDateTime.getTime() - startDateTime.getTime() >= minDuration;
    },
    {
      message: 'Evento deve ter pelo menos 30 minutos de duração',
      path: ['endTime'],
    }
  )
  .refine(
    (data) => {
      // Validar data limite de inscrição se fornecida
      if (!data.registrationDeadline) return true;
      
      const eventDate = new Date(`${data.date}T23:59:59`);
      const deadlineDate = new Date(`${data.registrationDeadline}T23:59:59`);
      
      return deadlineDate <= eventDate;
    },
    {
      message: 'Data limite de inscrição não pode ser após a data do evento',
      path: ['registrationDeadline'],
    }
  )
  .refine(
    (data) => {
      // Se tem limite de participantes (número válido), deve ter mensagem
      if (typeof data.maxParticipants === 'number' && data.maxParticipants > 0 && !data.maxParticipantsMessage?.trim()) {
        return false;
      }
      return true;
    },
    {
      message: 'Mensagem é obrigatória quando há limite de participantes',
      path: ['maxParticipantsMessage'],
    }
  )
  .refine(
    (data) => {
      // Se tem data limite, deve ter mensagem  
      if (data.registrationDeadline && !data.registrationDeadlineMessage?.trim()) {
        return false;
      }
      return true;
    },
    {
      message: 'Mensagem é obrigatória quando há data limite de inscrição',
      path: ['registrationDeadlineMessage'],
    }
  );

// Schema para inscrição pública
export const publicRegistrationSchema = z
  .object({
    name: fullNameSchema,
    email: emailSchema,
    cpf: cpfSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    eventId: z.string().min(1, 'ID do evento é obrigatório'),
    acceptTerms: z
      .boolean()
      .refine((val) => val === true, 'Você deve aceitar os termos e condições'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  });

// Schema para atualização de perfil
export const profileUpdateSchema = z.object({
  displayName: fullNameSchema.optional(),
  phone: phoneSchema,
  // Email não pode ser alterado pelo usuário
});

// Schema para reset de senha
export const passwordResetSchema = z.object({
  email: emailSchema,
});

// Schema para mudança de senha
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Nova senha deve ser diferente da atual',
    path: ['newPassword'],
  });

// Schema para contato/feedback
export const contactSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  email: emailSchema,
  subject: z
    .string()
    .min(1, 'Assunto é obrigatório')
    .max(200, 'Assunto muito longo'),
  message: z
    .string()
    .min(1, 'Mensagem é obrigatória')
    .min(10, 'Mensagem muito curta')
    .max(2000, 'Mensagem muito longa'),
});

// === TYPES DERIVADOS ===

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type EventFormData = z.infer<typeof eventSchema>;
export type PublicRegistrationFormData = z.infer<typeof publicRegistrationSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type CertificateConfigData = z.infer<typeof certificateConfigSchema>;

// Schema para configuração de certificados
export const certificateConfigSchema = z.object({
  // Configurações gerais
  template: z.enum(['modern', 'classic', 'elegant', 'minimalist', 'blank']).default('modern'),
  orientation: z.enum(['landscape', 'portrait']).default('landscape'),
  pageSize: z.enum(['A4', 'A3', 'A5', 'Letter', 'Legal']).default('A4'),
  pageMargin: z.enum(['narrow', 'normal', 'wide']).default('normal'),
  
  // Cores
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato #RRGGBB').default('#2563eb'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato #RRGGBB').default('#64748b'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato #RRGGBB').default('#ffffff'),
  borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato #RRGGBB').default('#e2e8f0'),
  
  // Tipografia
  titleFontSize: z.number().min(16).max(48).default(24),
  nameFontSize: z.number().min(14).max(36).default(18),
  bodyFontSize: z.number().min(10).max(20).default(12),
  fontFamily: z.enum(['helvetica', 'times', 'courier', 'DejaVuSans']).default('helvetica'),
  
  // Textos personalizáveis
  title: z.string().max(100).default(''),  // ✅ Título opcional - usuário define via Editor Visual
  subtitle: z.string().max(200).optional(),
  bodyText: z.string().min(10).max(500).default('Certificamos que {userName} participou do evento {eventName}, realizado em {eventDate} das {eventTime}.'),
  footer: z.string().max(200).optional(),
  
  // Posicionamento (percentuais)
  titlePosition: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100)
  }).default({ x: 50, y: 25 }),
  namePosition: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100)
  }).default({ x: 50, y: 45 }),
  bodyPosition: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100)
  }).default({ x: 50, y: 65 }),
  
  // Logo
  logoUrl: z.string().url().optional(),
  logoSize: z.number().min(20).max(200).default(80),
  logoPosition: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100)
  }).default({ x: 10, y: 10 }),
  
  // Imagem de fundo
  backgroundImageUrl: z.string().url().optional(),
  backgroundImageOpacity: z.number().min(0.1).max(1.0).default(0.3),
  backgroundImageSize: z.enum(['cover', 'contain', 'auto']).default('cover'),
  backgroundImagePosition: z.enum(['center', 'top', 'bottom', 'left', 'right']).default('center'),
  
  // Opções avançadas
  showBorder: z.boolean().default(true),
  borderWidth: z.number().min(1).max(10).default(2),
  showWatermark: z.boolean().default(false),
  watermarkText: z.string().max(50).default('CERTIFICADO'),
  watermarkOpacity: z.number().min(0.1).max(0.5).default(0.1),
  
  // Validação digital
  includeQRCode: z.boolean().default(false),
  qrCodeText: z.string().max(200).optional(),
  qrCodePosition: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100)
  }).default({ x: 85, y: 85 }),
  
  // Metadados
  eventId: z.string(),
  createdBy: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// === UTILITÁRIOS DE VALIDAÇÃO ===

// Função para validar dados parciais
export function validatePartial<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  return {
    success: result.success,
    data: result.success ? result.data : null,
    errors: result.success ? null : result.error.format(),
  };
}

// Função para extrair apenas os erros de campo
export function getFieldErrors<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (result.success) return null;

  const fieldErrors: Record<string, string> = {};
  
  result.error.issues.forEach((issue) => {
    const field = issue.path.join('.');
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  });

  return fieldErrors;
}

// Função para sanitizar dados antes da validação
export function sanitizeFormData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
