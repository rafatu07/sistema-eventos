'use client';

import React, { useState, useCallback } from 'react';
import { 
  CustomFormConfig, 
  FormFieldConfig, 
  FormFieldType,
  DEFAULT_FIELD_CONFIGS 
} from '@/types/custom-forms';
import { 
  createDefaultFormConfig, 
  isSystemRequiredField, 
  validateFormHasRequiredFields 
} from '@/lib/default-form-config';
import { FormFieldEditor } from './FormFieldEditor';
import { FormPreview } from './FormPreview';
import { 
  Eye, 
  Settings, 
  Plus, 
  Save, 
  ArrowLeft,
  Palette,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';

interface CustomFormBuilderProps {
  eventId: string;
  initialConfig?: CustomFormConfig | null;
  onSave: (config: CustomFormConfig) => Promise<void>;
  onCancel: () => void;
  userId: string;
}

const FIELD_TYPES: { type: FormFieldType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Texto', icon: '📝' },
  { type: 'email', label: 'Email', icon: '📧' },
  { type: 'phone', label: 'Telefone', icon: '📞' },
  { type: 'cpf', label: 'CPF', icon: '🆔' },
  { type: 'password', label: 'Senha', icon: '🔒' },
  { type: 'textarea', label: 'Texto Longo', icon: '📄' },
  { type: 'number', label: 'Número', icon: '🔢' },
  { type: 'date', label: 'Data', icon: '📅' },
  { type: 'select', label: 'Seleção', icon: '📋' },
  { type: 'multi-select', label: 'Seleção Múltipla', icon: '☑️' },
  { type: 'radio', label: 'Escolha Única', icon: '🔘' },
  { type: 'checkbox', label: 'Múltipla Escolha', icon: '☑️' },
  { type: 'terms', label: 'Termos', icon: '📋' },
];

const THEMES = [
  { id: 'default', name: 'Padrão', colors: { primary: '#3b82f6', bg: '#ffffff', text: '#1f2937' } },
  { id: 'modern', name: 'Moderno', colors: { primary: '#8b5cf6', bg: '#fafafa', text: '#111827' } },
  { id: 'minimal', name: 'Minimalista', colors: { primary: '#6b7280', bg: '#ffffff', text: '#374151' } },
  { id: 'colorful', name: 'Colorido', colors: { primary: '#f59e0b', bg: '#fffbeb', text: '#78350f' } },
];

export const CustomFormBuilder: React.FC<CustomFormBuilderProps> = ({
  eventId,
  initialConfig,
  onSave,
  onCancel,
  userId,
}) => {
  const [currentTab, setCurrentTab] = useState<'builder' | 'preview' | 'settings'>('builder');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);

  // Estado do formulário
  const [config, setConfig] = useState<CustomFormConfig>(() => {
    if (initialConfig) {
      return initialConfig;
    }
    
    // Se não há formulário personalizado, carrega o formulário padrão
    return createDefaultFormConfig(eventId, userId);
  });

  const updateConfig = useCallback((updates: Partial<CustomFormConfig>) => {
    setConfig(prev => ({ ...prev, ...updates, updatedAt: new Date() }));
  }, []);

  const addField = (fieldType: FormFieldType) => {
    const defaultConfig = DEFAULT_FIELD_CONFIGS[fieldType];
    const baseField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: fieldType,
      label: `Novo Campo ${FIELD_TYPES.find(f => f.type === fieldType)?.label}`,
      required: false,
      order: config.fields.length,
      width: 'half' as const,
      ...defaultConfig,
    };

    updateConfig({
      fields: [...config.fields, baseField] as FormFieldConfig[],
    });
  };

  const updateField = (fieldId: string, updates: Partial<FormFieldConfig>) => {
    const updatedFields = config.fields.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    );
    updateConfig({ fields: updatedFields as FormFieldConfig[] });
  };

  const deleteField = (fieldId: string) => {
    // Verificar se é um campo obrigatório do sistema
    if (isSystemRequiredField(fieldId)) {
      alert('Este campo é obrigatório para o funcionamento do sistema e não pode ser removido.');
      return;
    }

    const filteredFields = config.fields.filter(field => field.id !== fieldId);
    // Reordenar os campos
    const reorderedFields = filteredFields.map((field, index) => ({
      ...field,
      order: index,
    }));
    updateConfig({ fields: reorderedFields });
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = config.fields.findIndex(f => f.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= config.fields.length) return;

    const newFields = [...config.fields];
    const currentField = newFields[currentIndex];
    const targetField = newFields[newIndex];
    
    if (currentField && targetField) {
      newFields[currentIndex] = targetField;
      newFields[newIndex] = currentField;
    }

    // Atualizar order
    const reorderedFields = newFields.map((field, index) => ({
      ...field,
      order: index,
    }));

    updateConfig({ fields: reorderedFields });
  };

  const handleSave = async () => {
    if (!config.title.trim()) {
      alert('Por favor, defina um título para o formulário.');
      return;
    }

    if (config.fields.length === 0) {
      alert('Por favor, adicione pelo menos um campo ao formulário.');
      return;
    }

    // Validar se todos os campos obrigatórios do sistema estão presentes
    const validation = validateFormHasRequiredFields(config.fields);
    if (!validation.isValid) {
      alert(`Os seguintes campos são obrigatórios para o funcionamento do sistema e devem estar presentes:\n\n${validation.missingFields.join(', ')}\n\nPor favor, adicione estes campos antes de salvar.`);
      return;
    }

    // Verificar se campos obrigatórios do sistema estão marcados como required
    const systemFields = config.fields.filter(f => isSystemRequiredField(f.id));
    const nonRequiredSystemFields = systemFields.filter(f => !f.required);
    if (nonRequiredSystemFields.length > 0) {
      alert(`Os seguintes campos do sistema devem estar marcados como obrigatórios:\n\n${nonRequiredSystemFields.map(f => f.label).join(', ')}\n\nCorrija isso antes de salvar.`);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(config);
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      alert('Erro ao salvar formulário. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const applyTheme = (themeId: string) => {
    const theme = THEMES.find(t => t.id === themeId);
    if (theme) {
      updateConfig({
        styling: {
          ...config.styling,
          theme: themeId as 'default' | 'modern' | 'minimal' | 'colorful',
          primaryColor: theme.colors.primary,
          backgroundColor: theme.colors.bg,
          textColor: theme.colors.text,
        },
      });
    }
  };

  const getDeviceClass = () => {
    switch (previewDevice) {
      case 'mobile':
        return 'max-w-sm';
      case 'tablet':
        return 'max-w-2xl';
      default:
        return 'max-w-4xl';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onCancel}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Editor de Formulário
              </h1>
              <p className="text-sm text-gray-600">
                {initialConfig ? 'Editando formulário existente' : 'Criando novo formulário'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setCurrentTab('builder')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'builder'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="h-4 w-4 mr-2 inline" />
                Construtor
              </button>
              <button
                onClick={() => setCurrentTab('preview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'preview'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="h-4 w-4 mr-2 inline" />
                Preview
              </button>
              <button
                onClick={() => setCurrentTab('settings')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'settings'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Palette className="h-4 w-4 mr-2 inline" />
                Estilo
              </button>
            </div>

            {/* Preview Device Selector */}
            {currentTab === 'preview' && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-2 rounded-md transition-colors ${
                    previewDevice === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                  title="Desktop"
                >
                  <Monitor className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-2 rounded-md transition-colors ${
                    previewDevice === 'tablet' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                  title="Tablet"
                >
                  <Tablet className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-2 rounded-md transition-colors ${
                    previewDevice === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                  title="Mobile"
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary flex items-center"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Formulário
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1">
        {currentTab === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Palette de Campos */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Adicionar Campo</h3>
                <div className="grid grid-cols-1 gap-2">
                  {FIELD_TYPES.map((fieldType) => (
                    <button
                      key={fieldType.type}
                      onClick={() => addField(fieldType.type)}
                      className="flex items-center p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <span className="text-lg mr-3">{fieldType.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{fieldType.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Editor de Campos */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {/* Configurações Básicas */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Configurações do Formulário</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Título do Formulário *
                      </label>
                      <input
                        type="text"
                        value={config.title}
                        onChange={(e) => updateConfig({ title: e.target.value })}
                        className="input w-full"
                        placeholder="Digite o título do formulário"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrição (Opcional)
                      </label>
                      <textarea
                        value={config.description || ''}
                        onChange={(e) => updateConfig({ description: e.target.value })}
                        className="input w-full"
                        rows={3}
                        placeholder="Descrição ou instruções para o formulário"
                      />
                    </div>
                  </div>
                </div>

                {/* Lista de Campos */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Campos do Formulário</h3>
                    <span className="text-sm text-gray-600">
                      {config.fields.length} campo(s)
                    </span>
                  </div>

                  {config.fields.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                      <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 mb-2">Nenhum campo adicionado ainda</p>
                      <p className="text-sm text-gray-500">
                        Use a paleta à esquerda para adicionar campos ao formulário
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {config.fields
                        .sort((a, b) => a.order - b.order)
                        .map((field, index) => (
                          <FormFieldEditor
                            key={field.id}
                            field={field}
                            allFields={config.fields}
                            onUpdate={(updatedField) => updateField(field.id, updatedField)}
                            onDelete={deleteField}
                            onMoveUp={(fieldId) => moveField(fieldId, 'up')}
                            onMoveDown={(fieldId) => moveField(fieldId, 'down')}
                            isFirst={index === 0}
                            isLast={index === config.fields.length - 1}
                          />
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'preview' && (
          <div className="p-6">
            <div className={`mx-auto transition-all duration-300 ${getDeviceClass()}`}>
              <div className="bg-white rounded-lg border border-gray-200 shadow-lg">
                <FormPreview config={config} />
              </div>
            </div>
          </div>
        )}

        {currentTab === 'settings' && (
          <div className="max-w-3xl mx-auto p-6 space-y-6">
            {/* Configurações de Comportamento */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Configurações de Comportamento</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.settings.allowMultipleSubmissions}
                    onChange={(e) => updateConfig({
                      settings: { ...config.settings, allowMultipleSubmissions: e.target.checked }
                    })}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-700">Permitir múltiplas submissões</div>
                    <div className="text-sm text-gray-600">Usuários podem enviar o formulário mais de uma vez</div>
                  </div>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.settings.requireLogin}
                    onChange={(e) => updateConfig({
                      settings: { ...config.settings, requireLogin: e.target.checked }
                    })}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-700">Exigir login</div>
                    <div className="text-sm text-gray-600">Apenas usuários logados podem enviar</div>
                  </div>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.settings.showProgressBar}
                    onChange={(e) => updateConfig({
                      settings: { ...config.settings, showProgressBar: e.target.checked }
                    })}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-700">Mostrar barra de progresso</div>
                    <div className="text-sm text-gray-600">Exibe o progresso de preenchimento</div>
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensagem de Confirmação
                  </label>
                  <textarea
                    value={config.settings.confirmationMessage}
                    onChange={(e) => updateConfig({
                      settings: { ...config.settings, confirmationMessage: e.target.value }
                    })}
                    className="input w-full"
                    rows={3}
                    placeholder="Mensagem exibida após envio do formulário"
                  />
                </div>
              </div>
            </div>

            {/* Configurações de Estilo */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Aparência</h3>
              <div className="space-y-6">
                {/* Temas Predefinidos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Temas Predefinidos
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => applyTheme(theme.id)}
                        className={`p-3 rounded-lg border-2 text-center transition-colors ${
                          config.styling.theme === theme.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex space-x-1 mb-2 justify-center">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: theme.colors.primary }}
                          />
                          <div 
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: theme.colors.bg }}
                          />
                        </div>
                        <div className="text-sm font-medium">{theme.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cores Personalizadas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor Principal
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={config.styling.primaryColor}
                        onChange={(e) => updateConfig({
                          styling: { ...config.styling, primaryColor: e.target.value }
                        })}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.styling.primaryColor}
                        onChange={(e) => updateConfig({
                          styling: { ...config.styling, primaryColor: e.target.value }
                        })}
                        className="input flex-1"
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor de Fundo
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={config.styling.backgroundColor}
                        onChange={(e) => updateConfig({
                          styling: { ...config.styling, backgroundColor: e.target.value }
                        })}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.styling.backgroundColor}
                        onChange={(e) => updateConfig({
                          styling: { ...config.styling, backgroundColor: e.target.value }
                        })}
                        className="input flex-1"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor do Texto
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={config.styling.textColor}
                        onChange={(e) => updateConfig({
                          styling: { ...config.styling, textColor: e.target.value }
                        })}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.styling.textColor}
                        onChange={(e) => updateConfig({
                          styling: { ...config.styling, textColor: e.target.value }
                        })}
                        className="input flex-1"
                        placeholder="#1f2937"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arredondamento das Bordas: {config.styling.borderRadius}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={config.styling.borderRadius}
                    onChange={(e) => updateConfig({
                      styling: { ...config.styling, borderRadius: parseInt(e.target.value) }
                    })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
