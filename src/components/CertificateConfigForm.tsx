'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useValidatedForm, FieldError } from '@/hooks/useValidatedForm';
import { certificateConfigSchema, CertificateConfigData } from '@/lib/schemas';
import { CertificateConfig } from '@/types';
import { useNotifications } from '@/components/NotificationSystem';
import { CERTIFICATE_TEMPLATES, getTemplateConfig } from '@/lib/certificate-templates';
import { getDefaultCertificateConfig } from '@/lib/certificate-config';
import {
  Palette,
  Type,
  Layout,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Settings,
  Sliders,
  QrCode,
  Shield
} from 'lucide-react';

interface CertificateConfigFormProps {
  eventId: string;
  config?: CertificateConfig;
  onSave?: (config: CertificateConfigData) => Promise<void>;
  onConfigChange?: (config: CertificateConfig | null) => void;
}

// Use templates from the templates file
const templatePreviews = CERTIFICATE_TEMPLATES.reduce((acc, template) => {
  acc[template.id] = {
    name: template.name,
    description: template.description,
    colors: [template.config.primaryColor, template.config.secondaryColor],
  };
  return acc;
}, {} as Record<string, { name: string; description: string; colors: string[] }>);

export const CertificateConfigForm: React.FC<CertificateConfigFormProps> = ({
  eventId,
  config,
  onSave,
  onConfigChange
}) => {
  const { user } = useAuth();
  const notifications = useNotifications();
  const [activeTab, setActiveTab] = React.useState<'template' | 'colors' | 'fonts' | 'layout' | 'advanced'>('template');
  const [forceUpdate, setForceUpdate] = React.useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  const form = useValidatedForm<CertificateConfigData>({
    schema: certificateConfigSchema,
    defaultValues: config || (user?.uid ? getDefaultCertificateConfig(eventId, user.uid) : undefined),
    onSubmitSuccess: () => {
      notifications.success('Configuração Salva', 'Configuração do certificado salva com sucesso!');
    },
    onSubmitError: (error) => {
      notifications.error('Erro ao Salvar', error.message);
    },
  });

  const { register, handleSubmit, isSubmitting, submitError, getFieldError, watch, reset, trigger } = form;
  const watchedValues = watch();

  // Watch for changes in form values to mark as unsaved
  React.useEffect(() => {
    if (config) {
      // Compare current form values with saved config to detect changes
      const hasChanges = Object.keys(watchedValues).some(key => {
        const currentValue = watchedValues[key as keyof typeof watchedValues];
        const savedValue = config[key as keyof typeof config];
        
        // Skip comparison for certain fields
        if (key === 'createdAt' || key === 'updatedAt' || key === 'id') {
          return false;
        }
        
        return JSON.stringify(currentValue) !== JSON.stringify(savedValue);
      });
      
      setHasUnsavedChanges(hasChanges);
    }
  }, [watchedValues, config]);

  const onSubmit = async (data: CertificateConfigData) => {
    if (onSave) {
      await onSave(data);
      setHasUnsavedChanges(false); // Clear unsaved changes after successful save
    }
  };

  const resetToDefaults = () => {
    if (!user?.uid) return;
    
    // Use the centralized default configuration function
    const defaults = getDefaultCertificateConfig(eventId, user.uid);
    console.log('Resetting to defaults:', defaults);
    
    // Reset the form with the default values
    reset(defaults);
    
    // Update the preview immediately
    if (onConfigChange) {
      const updatedConfig: CertificateConfig = {
        ...defaults,
        id: config?.id || 'temp',
        createdAt: config?.createdAt || new Date(),
        updatedAt: new Date(),
      };
      onConfigChange(updatedConfig);
    }
    
    setForceUpdate(prev => prev + 1); // Force re-render
    notifications.success('Resetado', 'Configurações restauradas para os valores padrão');
  };

  const applyTemplate = (templateId: string) => {
    if (!user?.uid) return;
    
    try {
      const templateConfig = getTemplateConfig(templateId, eventId, user.uid);
      if (templateConfig) {
        console.log('Applying template config:', templateConfig);
        
        // Reset the entire form with the new template configuration
        reset(templateConfig, { 
          keepDefaultValues: false,
          keepValues: false,
          keepDirty: false
        });
        
        // Update the preview immediately
        if (onConfigChange) {
          const updatedConfig: CertificateConfig = {
            ...templateConfig,
            id: config?.id || 'temp',
            createdAt: config?.createdAt || new Date(),
            updatedAt: new Date(),
          };
          onConfigChange(updatedConfig);
        }
        
        // Force form to re-validate and trigger watchers
        setTimeout(() => {
          trigger();
          setForceUpdate(prev => prev + 1); // Force re-render
        }, 100);
        
        // Auto-save template configuration
        setTimeout(async () => {
          try {
            if (onSave) {
              await onSave(templateConfig);
              setHasUnsavedChanges(false);
              notifications.success('Template Aplicado e Salvo', `Template "${templatePreviews[templateId]?.name}" aplicado e salvo com sucesso!`);
            }
          } catch (error) {
            console.error('Erro ao salvar template:', error);
            setHasUnsavedChanges(true);
            notifications.warning('Template Aplicado', `Template "${templatePreviews[templateId]?.name}" aplicado! Clique em "Salvar" para persistir as alterações.`);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Erro ao aplicar template:', error);
      notifications.error('Erro', 'Não foi possível aplicar o template');
    }
  };

  const tabs = [
    { id: 'template', name: 'Template', icon: Layout },
    { id: 'colors', name: 'Cores', icon: Palette },
    { id: 'fonts', name: 'Tipografia', icon: Type },
    { id: 'layout', name: 'Layout', icon: Sliders },
    { id: 'advanced', name: 'Avançado', icon: Settings },
  ] as const;

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              Configuração do Certificado
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Personalize o design e layout do certificado para este evento
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={resetToDefaults}
              className="btn-outline text-sm"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Resetar
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {submitError && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <p className="text-red-600 text-sm">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex">
          {/* Tabs Navigation */}
          <div className="w-64 bg-gray-50 border-r">
            <nav className="px-3 py-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 rounded-md text-left text-sm font-medium transition-colors mb-1 ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6">
            {activeTab === 'template' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Templates Predefinidos
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Escolha um template e clique em &quot;Aplicar&quot; para configurar automaticamente todas as opções.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {CERTIFICATE_TEMPLATES.map((template) => (
                      <div key={template.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            {[template.config.primaryColor, template.config.secondaryColor].map((color, index) => (
                              <div
                                key={index}
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <span className="font-medium text-gray-900">{template.name}</span>
                        </div>
                        <p className="text-sm text-gray-600">{template.description}</p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded ${
                            template.config.fontFamily === 'helvetica' ? 'bg-blue-100 text-blue-800' :
                            template.config.fontFamily === 'times' ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {template.config.fontFamily === 'helvetica' ? 'Sans-serif' :
                             template.config.fontFamily === 'times' ? 'Serif' : 'Monospace'}
                          </span>
                          <button
                            type="button"
                            onClick={() => applyTemplate(template.id)}
                            className="btn-outline text-sm"
                          >
                            Aplicar Template
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Template Atual
                  </label>
                  <div className="grid grid-cols-1 gap-4">
                    <label className="cursor-pointer">
                      <input
                        type="radio"
                        {...register('template')}
                        value={watchedValues.template}
                        className="sr-only"
                        checked
                        readOnly
                      />
                      <div className="border-2 rounded-lg p-4 border-blue-500 bg-blue-50">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="flex space-x-1">
                            {[watchedValues.primaryColor, watchedValues.secondaryColor].map((color, index) => (
                              <div
                                key={index}
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <span className="font-medium text-gray-900">
                            {templatePreviews[watchedValues.template]?.name || 'Personalizado'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {templatePreviews[watchedValues.template]?.description || 'Configuração personalizada atual'}
                        </p>
                      </div>
                    </label>
                  </div>
                  <FieldError error={getFieldError('template')} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Orientação
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        {...register('orientation')}
                        value="landscape"
                        className="mr-2"
                      />
                      <Layout className="h-4 w-4 mr-1" />
                      Paisagem (recomendado)
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        {...register('orientation')}
                        value="portrait"
                        className="mr-2"
                      />
                      <Layout className="h-4 w-4 mr-1 rotate-90" />
                      Retrato
                    </label>
                  </div>
                  <FieldError error={getFieldError('orientation')} />
                </div>
              </div>
            )}

            {activeTab === 'colors' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                      Cor Primária
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        id="primaryColor"
                        {...register('primaryColor')}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        {...register('primaryColor')}
                        placeholder="#2563eb"
                        className="input flex-1"
                      />
                    </div>
                    <FieldError error={getFieldError('primaryColor')} />
                  </div>

                  <div>
                    <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                      Cor Secundária
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        id="secondaryColor"
                        {...register('secondaryColor')}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        {...register('secondaryColor')}
                        placeholder="#64748b"
                        className="input flex-1"
                      />
                    </div>
                    <FieldError error={getFieldError('secondaryColor')} />
                  </div>

                  <div>
                    <label htmlFor="backgroundColor" className="block text-sm font-medium text-gray-700 mb-2">
                      Cor de Fundo
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        id="backgroundColor"
                        {...register('backgroundColor')}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        {...register('backgroundColor')}
                        placeholder="#ffffff"
                        className="input flex-1"
                      />
                    </div>
                    <FieldError error={getFieldError('backgroundColor')} />
                  </div>

                  <div>
                    <label htmlFor="borderColor" className="block text-sm font-medium text-gray-700 mb-2">
                      Cor da Borda
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        id="borderColor"
                        {...register('borderColor')}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        {...register('borderColor')}
                        placeholder="#e2e8f0"
                        className="input flex-1"
                      />
                    </div>
                    <FieldError error={getFieldError('borderColor')} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fonts' && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="fontFamily" className="block text-sm font-medium text-gray-700 mb-2">
                    Família da Fonte
                  </label>
                  <select
                    id="fontFamily"
                    {...register('fontFamily')}
                    className="input w-full"
                  >
                    <option value="helvetica">Helvetica (Sans-serif)</option>
                    <option value="times">Times New Roman (Serif)</option>
                    <option value="courier">Courier (Monospace)</option>
                  </select>
                  <FieldError error={getFieldError('fontFamily')} />
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="titleFontSize" className="block text-sm font-medium text-gray-700 mb-2">
                      Tamanho do Título
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        id="titleFontSize"
                        {...register('titleFontSize', { valueAsNumber: true })}
                        min="16"
                        max="48"
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-600 w-8">
                        {watchedValues.titleFontSize}px
                      </span>
                    </div>
                    <FieldError error={getFieldError('titleFontSize')} />
                  </div>

                  <div>
                    <label htmlFor="nameFontSize" className="block text-sm font-medium text-gray-700 mb-2">
                      Tamanho do Nome
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        id="nameFontSize"
                        {...register('nameFontSize', { valueAsNumber: true })}
                        min="14"
                        max="36"
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-600 w-8">
                        {watchedValues.nameFontSize}px
                      </span>
                    </div>
                    <FieldError error={getFieldError('nameFontSize')} />
                  </div>

                  <div>
                    <label htmlFor="bodyFontSize" className="block text-sm font-medium text-gray-700 mb-2">
                      Tamanho do Texto
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        id="bodyFontSize"
                        {...register('bodyFontSize', { valueAsNumber: true })}
                        min="10"
                        max="20"
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-600 w-8">
                        {watchedValues.bodyFontSize}px
                      </span>
                    </div>
                    <FieldError error={getFieldError('bodyFontSize')} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      Título Principal
                    </label>
                    <input
                      type="text"
                      id="title"
                      {...register('title')}
                      className="input w-full"
                      placeholder="Certificado de Participação"
                    />
                    <FieldError error={getFieldError('title')} />
                  </div>

                  <div>
                    <label htmlFor="subtitle" className="block text-sm font-medium text-gray-700 mb-2">
                      Subtítulo (opcional)
                    </label>
                    <input
                      type="text"
                      id="subtitle"
                      {...register('subtitle')}
                      className="input w-full"
                      placeholder="Curso de Capacitação Profissional"
                    />
                    <FieldError error={getFieldError('subtitle')} />
                  </div>

                  <div>
                    <label htmlFor="bodyText" className="block text-sm font-medium text-gray-700 mb-2">
                      Texto Principal
                    </label>
                    <textarea
                      id="bodyText"
                      {...register('bodyText')}
                      rows={3}
                      className="input w-full"
                      placeholder="Certificamos que {userName} participou do evento {eventName}, realizado em {eventDate}."
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Use {'{userName}'}, {'{eventName}'}, {'{eventDate}'}, {'{eventTime}'}, {'{eventStartTime}'} e {'{eventEndTime}'} para dados dinâmicos
                    </p>
                    <FieldError error={getFieldError('bodyText')} />
                  </div>

                  <div>
                    <label htmlFor="footer" className="block text-sm font-medium text-gray-700 mb-2">
                      Rodapé (opcional)
                    </label>
                    <input
                      type="text"
                      id="footer"
                      {...register('footer')}
                      className="input w-full"
                      placeholder="Organizador do Evento"
                    />
                    <FieldError error={getFieldError('footer')} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'layout' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Posição do Título</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Horizontal (%)</label>
                        <input
                          type="range"
                          {...register('titlePosition.x', { valueAsNumber: true })}
                          min="0"
                          max="100"
                          className="w-full"
                        />
                        <span className="text-xs text-gray-500">{watchedValues.titlePosition?.x}%</span>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Vertical (%)</label>
                        <input
                          type="range"
                          {...register('titlePosition.y', { valueAsNumber: true })}
                          min="0"
                          max="100"
                          className="w-full"
                        />
                        <span className="text-xs text-gray-500">{watchedValues.titlePosition?.y}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Posição do Nome</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Horizontal (%)</label>
                        <input
                          type="range"
                          {...register('namePosition.x', { valueAsNumber: true })}
                          min="0"
                          max="100"
                          className="w-full"
                        />
                        <span className="text-xs text-gray-500">{watchedValues.namePosition?.x}%</span>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Vertical (%)</label>
                        <input
                          type="range"
                          {...register('namePosition.y', { valueAsNumber: true })}
                          min="0"
                          max="100"
                          className="w-full"
                        />
                        <span className="text-xs text-gray-500">{watchedValues.namePosition?.y}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Posição do Texto</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Horizontal (%)</label>
                        <input
                          type="range"
                          {...register('bodyPosition.x', { valueAsNumber: true })}
                          min="0"
                          max="100"
                          className="w-full"
                        />
                        <span className="text-xs text-gray-500">{watchedValues.bodyPosition?.x}%</span>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Vertical (%)</label>
                        <input
                          type="range"
                          {...register('bodyPosition.y', { valueAsNumber: true })}
                          min="0"
                          max="100"
                          className="w-full"
                        />
                        <span className="text-xs text-gray-500">{watchedValues.bodyPosition?.y}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Logo/Imagem
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                        URL da Logo
                      </label>
                      <input
                        type="url"
                        id="logoUrl"
                        {...register('logoUrl')}
                        className="input w-full"
                        placeholder="https://exemplo.com/logo.png"
                      />
                      <FieldError error={getFieldError('logoUrl')} />
                    </div>

                    <div>
                      <label htmlFor="logoSize" className="block text-sm font-medium text-gray-700 mb-2">
                        Tamanho da Logo
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          id="logoSize"
                          {...register('logoSize', { valueAsNumber: true })}
                          min="20"
                          max="200"
                          className="flex-1"
                        />
                        <span className="text-sm text-gray-600 w-12">
                          {watchedValues.logoSize}px
                        </span>
                      </div>
                      <FieldError error={getFieldError('logoSize')} />
                    </div>
                  </div>

                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-3">Posição da Logo</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Horizontal (%)</label>
                        <input
                          type="range"
                          {...register('logoPosition.x', { valueAsNumber: true })}
                          min="0"
                          max="100"
                          className="w-full"
                        />
                        <span className="text-xs text-gray-500">{watchedValues.logoPosition?.x}%</span>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Vertical (%)</label>
                        <input
                          type="range"
                          {...register('logoPosition.y', { valueAsNumber: true })}
                          min="0"
                          max="100"
                          className="w-full"
                        />
                        <span className="text-xs text-gray-500">{watchedValues.logoPosition?.y}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Bordas e Decoração</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('showBorder')}
                          className="mr-2"
                        />
                        Mostrar Borda
                      </label>

                      {watchedValues.showBorder && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Largura da Borda
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="range"
                              {...register('borderWidth', { valueAsNumber: true })}
                              min="1"
                              max="10"
                              className="flex-1"
                            />
                            <span className="text-sm text-gray-600 w-8">
                              {watchedValues.borderWidth}px
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('showWatermark')}
                          className="mr-2"
                        />
                        Mostrar Marca d&apos;Água
                      </label>

                      {watchedValues.showWatermark && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Texto da Marca d&apos;Água
                            </label>
                            <input
                              type="text"
                              {...register('watermarkText')}
                              className="input w-full"
                              placeholder="CERTIFICADO"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Opacidade
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="range"
                                {...register('watermarkOpacity', { valueAsNumber: true })}
                                min="0.1"
                                max="0.5"
                                step="0.1"
                                className="flex-1"
                              />
                              <span className="text-sm text-gray-600 w-8">
                                {(watchedValues.watermarkOpacity * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                    <QrCode className="h-4 w-4 mr-2" />
                    QR Code de Validação
                  </h4>
                  
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('includeQRCode')}
                        className="mr-2"
                      />
                      Incluir QR Code para validação digital
                    </label>

                    {watchedValues.includeQRCode && (
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="qrCodeText" className="block text-sm font-medium text-gray-700 mb-2">
                            Texto do QR Code
                          </label>
                          <input
                            type="text"
                            id="qrCodeText"
                            {...register('qrCodeText')}
                            className="input w-full"
                            placeholder="URL de validação ou texto"
                          />
                          <FieldError error={getFieldError('qrCodeText')} />
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-3">Posição do QR Code</h5>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Horizontal (%)</label>
                              <input
                                type="range"
                                {...register('qrCodePosition.x', { valueAsNumber: true })}
                                min="0"
                                max="100"
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{watchedValues.qrCodePosition?.x}%</span>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Vertical (%)</label>
                              <input
                                type="range"
                                {...register('qrCodePosition.y', { valueAsNumber: true })}
                                min="0"
                                max="100"
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{watchedValues.qrCodePosition?.y}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">


          <div className="flex space-x-3">
            <button
              type="button"
              className="btn-outline"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn-primary disabled:opacity-50 disabled:cursor-not-allowed relative ${
                hasUnsavedChanges ? 'ring-2 ring-yellow-400 ring-offset-2' : ''
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Salvando...
                </div>
              ) : (
                <div className="flex items-center">
                  <Save className="h-4 w-4 mr-2" />
                  {hasUnsavedChanges ? 'Salvar Alterações' : 'Salvar Configuração'}
                  {hasUnsavedChanges && (
                    <span className="ml-2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                  )}
                </div>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
