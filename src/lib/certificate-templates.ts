import { CertificateConfigData } from './schemas';

export interface CertificateTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  config: Omit<CertificateConfigData, 'eventId' | 'createdBy'>;
}

export const CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
  {
    id: 'modern',
    name: 'Moderno',
    description: 'Design limpo e contemporâneo com linhas de destaque',
    preview: '/templates/modern-preview.png',
    config: {
      template: 'modern',
      orientation: 'landscape',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      titleFontSize: 28,
      nameFontSize: 20,
      bodyFontSize: 14,
      fontFamily: 'helvetica',
      title: 'Certificado de Participação',
      subtitle: '',
      bodyText: 'Certificamos que {userName} participou com êxito do evento {eventName}, realizado em {eventDate} das {eventTime}.',
      footer: '',
      titlePosition: { x: 50, y: 20 },
      namePosition: { x: 50, y: 40 },
      bodyPosition: { x: 50, y: 60 },
      logoUrl: undefined,
      logoSize: 80,
      logoPosition: { x: 10, y: 15 },
      showBorder: false,
      borderWidth: 2,
      showWatermark: false,
      watermarkText: 'CERTIFICADO',
      watermarkOpacity: 0.1,
      includeQRCode: false,
      qrCodeText: undefined,
      qrCodePosition: { x: 90, y: 90 },
    }
  },
  {
    id: 'classic',
    name: 'Clássico',
    description: 'Estilo tradicional e elegante com bordas ornamentais',
    preview: '/templates/classic-preview.png',
    config: {
      template: 'classic',
      orientation: 'landscape',
      primaryColor: '#7c2d12',
      secondaryColor: '#a3a3a3',
      backgroundColor: '#fefbf3',
      borderColor: '#d4af37',
      titleFontSize: 26,
      nameFontSize: 18,
      bodyFontSize: 12,
      fontFamily: 'times',
      title: 'Certificado de Participação',
      subtitle: 'Curso de Capacitação Profissional',
      bodyText: 'Certificamos que {userName} participou com aproveitamento do evento {eventName}, com carga horária total, realizado em {eventDate} das {eventTime}.',
      footer: 'Válido em todo território nacional',
      titlePosition: { x: 50, y: 25 },
      namePosition: { x: 50, y: 45 },
      bodyPosition: { x: 50, y: 65 },
      logoUrl: undefined,
      logoSize: 70,
      logoPosition: { x: 15, y: 15 },
      showBorder: true,
      borderWidth: 3,
      showWatermark: true,
      watermarkText: 'CERTIFICADO',
      watermarkOpacity: 0.1,
      includeQRCode: true,
      qrCodeText: 'Válido digitalmente',
      qrCodePosition: { x: 85, y: 15 },
    }
  },
  {
    id: 'elegant',
    name: 'Elegante',
    description: 'Sofisticado e refinado com elementos decorativos',
    preview: '/templates/elegant-preview.png',
    config: {
      template: 'elegant',
      orientation: 'landscape',
      primaryColor: '#7c3aed',
      secondaryColor: '#6b7280',
      backgroundColor: '#ffffff',
      borderColor: '#c4b5fd',
      titleFontSize: 24,
      nameFontSize: 18,
      bodyFontSize: 12,
      fontFamily: 'times',
      title: 'Certificado de Excelência',
      subtitle: 'Reconhecimento de Participação',
      bodyText: 'Por meio deste, certificamos que {userName} participou com distinção do evento {eventName}, demonstrando dedicação e comprometimento, realizado em {eventDate} das {eventTime}.',
      footer: 'Organização Certificada',
      titlePosition: { x: 50, y: 22 },
      namePosition: { x: 50, y: 42 },
      bodyPosition: { x: 50, y: 62 },
      logoUrl: undefined,
      logoSize: 75,
      logoPosition: { x: 12, y: 18 },
      showBorder: true,
      borderWidth: 2,
      showWatermark: false,
      watermarkText: 'ELEGANTE',
      watermarkOpacity: 0.08,
      includeQRCode: true,
      qrCodeText: 'Validação digital',
      qrCodePosition: { x: 88, y: 18 },
    }
  },
  {
    id: 'minimalist',
    name: 'Minimalista',
    description: 'Simplicidade e clareza com foco no conteúdo',
    preview: '/templates/minimalist-preview.png',
    config: {
      template: 'minimalist',
      orientation: 'landscape',
      primaryColor: '#111827',
      secondaryColor: '#6b7280',
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      titleFontSize: 22,
      nameFontSize: 16,
      bodyFontSize: 11,
      fontFamily: 'helvetica',
      title: 'Certificado',
      subtitle: '',
      bodyText: '{userName} participou do evento {eventName} em {eventDate} das {eventTime}.',
      footer: '',
      titlePosition: { x: 50, y: 30 },
      namePosition: { x: 50, y: 50 },
      bodyPosition: { x: 50, y: 70 },
      logoUrl: undefined,
      logoSize: 60,
      logoPosition: { x: 20, y: 20 },
      showBorder: true,
      borderWidth: 1,
      showWatermark: false,
      watermarkText: 'MINIMAL',
      watermarkOpacity: 0.05,
      includeQRCode: false,
      qrCodeText: undefined,
      qrCodePosition: { x: 80, y: 20 },
    }
  },
  {
    id: 'corporate',
    name: 'Corporativo',
    description: 'Profissional para ambiente empresarial',
    preview: '/templates/corporate-preview.png',
    config: {
      template: 'modern',
      orientation: 'landscape',
      primaryColor: '#1f2937',
      secondaryColor: '#4b5563',
      backgroundColor: '#ffffff',
      borderColor: '#d1d5db',
      titleFontSize: 24,
      nameFontSize: 18,
      bodyFontSize: 12,
      fontFamily: 'helvetica',
      title: 'Certificado de Participação',
      subtitle: 'Programa de Capacitação Empresarial',
      bodyText: 'A empresa certifica que {userName} participou com aproveitamento do programa {eventName}, com duração total conforme especificado, realizado em {eventDate} das {eventTime}.',
      footer: 'Certificado válido para fins profissionais',
      titlePosition: { x: 50, y: 25 },
      namePosition: { x: 50, y: 45 },
      bodyPosition: { x: 50, y: 65 },
      logoUrl: undefined,
      logoSize: 80,
      logoPosition: { x: 10, y: 10 },
      showBorder: true,
      borderWidth: 2,
      showWatermark: true,
      watermarkText: 'CORPORATIVO',
      watermarkOpacity: 0.08,
      includeQRCode: true,
      qrCodeText: 'Validação corporativa',
      qrCodePosition: { x: 90, y: 10 },
    }
  },
  {
    id: 'academic',
    name: 'Acadêmico',
    description: 'Formal para instituições de ensino',
    preview: '/templates/academic-preview.png',
    config: {
      template: 'classic',
      orientation: 'landscape',
      primaryColor: '#1e40af',
      secondaryColor: '#374151',
      backgroundColor: '#f9fafb',
      borderColor: '#3b82f6',
      titleFontSize: 26,
      nameFontSize: 19,
      bodyFontSize: 13,
      fontFamily: 'times',
      title: 'Certificado de Conclusão',
      subtitle: 'Instituição de Ensino Superior',
      bodyText: 'Certificamos que {userName} concluiu com aproveitamento o curso {eventName}, com carga horária total conforme programa pedagógico, realizado em {eventDate} das {eventTime}.',
      footer: 'Válido para fins acadêmicos e profissionais',
      titlePosition: { x: 50, y: 23 },
      namePosition: { x: 50, y: 43 },
      bodyPosition: { x: 50, y: 63 },
      logoUrl: undefined,
      logoSize: 85,
      logoPosition: { x: 15, y: 15 },
      showBorder: true,
      borderWidth: 3,
      showWatermark: true,
      watermarkText: 'ACADÊMICO',
      watermarkOpacity: 0.12,
      includeQRCode: true,
      qrCodeText: 'Validação acadêmica',
      qrCodePosition: { x: 85, y: 15 },
    }
  }
];

export const getTemplateById = (templateId: string): CertificateTemplate | undefined => {
  return CERTIFICATE_TEMPLATES.find(template => template.id === templateId);
};

export const getTemplateConfig = (templateId: string, eventId: string, createdBy: string): CertificateConfigData => {
  const template = getTemplateById(templateId);
  const defaultTemplate = CERTIFICATE_TEMPLATES[0];
  const configTemplate = template || defaultTemplate;
  
  if (!configTemplate) {
    throw new Error('No template configuration available');
  }

  return {
    ...configTemplate.config,
    eventId,
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export const getDefaultTemplate = (): CertificateTemplate => {
  const defaultTemplate = CERTIFICATE_TEMPLATES[0];
  if (!defaultTemplate) {
    throw new Error('No default template available');
  }
  return defaultTemplate;
};
