'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useValidatedForm, FieldError } from '@/hooks/useValidatedForm';
import { useDebounce } from '@/hooks/useDebounce';
import { certificateConfigSchema, CertificateConfigData } from '@/lib/schemas';
import { CertificateConfig } from '@/types';
import { useNotifications } from '@/components/NotificationSystem';
import { CERTIFICATE_TEMPLATES, getTemplateConfig } from '@/lib/certificate-templates';
import { getDefaultCertificateConfig } from '@/lib/certificate-config';
import { ImageUpload } from '@/components/ImageUpload';
import { CertificateVisualEditor } from '@/components/CertificateVisualEditor';
import { validateImageUrl, getOptimizedPreviewUrl } from '@/lib/image-validation';
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
  Shield,
  Check,
  Clock,
  Wallpaper,
  FileText,
  MousePointer,
  Upload
} from 'lucide-react';
import { PAGE_SIZE_INFO, MARGIN_INFO } from '@/lib/page-utils';

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const previousHasChanges = React.useRef(false);

  // Monitor saveSuccess changes - apenas para logs importantes
  React.useEffect(() => {
    if (saveSuccess) {
      console.log('🟢 Botão verde ativado - mostrando feedback de sucesso');
    }
  }, [saveSuccess]);

  const form = useValidatedForm<CertificateConfigData>({
    schema: certificateConfigSchema,
    defaultValues: config || (user?.uid ? getDefaultCertificateConfig(eventId, user.uid) : undefined),
    onSubmitSuccess: () => {
      console.log('✅ Salvamento manual concluído com sucesso');
      notifications.success('Configuração Salva', 'Configuração do certificado salva com sucesso!');
      setSaveSuccess(true);
      
      // CORREÇÃO: Aguardar um pouco antes de limpar hasUnsavedChanges 
      // para dar tempo da nova config ser carregada do servidor
      setTimeout(() => {
        setHasUnsavedChanges(false);
      }, 100);
      
      // Remove o feedback de sucesso após 3 segundos
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    },
    onSubmitError: (error) => {
      notifications.error('Erro ao Salvar', error.message);
    },
  });

  const { register, handleSubmit, isSubmitting, submitError, getFieldError, watch, reset, trigger, setValue, formState } = form;
  const watchedValues = watch();

        // CORREÇÃO: Sincronizar formulário quando config carregada do servidor muda
  React.useEffect(() => {
    if (config && config.id) {
      console.log('🔄 SINCRONIZAÇÃO: Formulário sendo sincronizado com servidor');
      console.log('📄 Config recebido do servidor:', config);
      console.log('🔍 Campos críticos do config:');
      console.log(`  includeQRCode: ${config.includeQRCode} (${typeof config.includeQRCode})`);
      console.log(`  qrCodeText: "${config.qrCodeText}" (${typeof config.qrCodeText})`);
      console.log(`  backgroundImageUrl: "${config.backgroundImageUrl}" (${typeof config.backgroundImageUrl})`);
      
      // Reset do formulário com os novos valores
      reset(config);
      console.log('✅ SINCRONIZAÇÃO: Formulário sincronizado com servidor');
    }
  }, [config, reset]);

  // Função para salvamento automático da logo
  const saveLogoAutomatically = async (logoUrl: string) => {
    try {
      console.log('🔄 AUTO-SAVE: Iniciando salvamento automático da logo...');
      
      if (!onSave) {
        console.warn('⚠️  AUTO-SAVE: onSave não disponível, pulando...');
        return;
      }

      // Pegar dados atuais do formulário
      const currentData = watchedValues;
      
      // 🔧 GARANTIR que todos os campos estejam presentes, incluindo campos obrigatórios
      const updatedData = {
        ...currentData,
        logoUrl: logoUrl,
        // Garantir que campos essenciais estejam definidos
        eventId: currentData.eventId || eventId,
        createdBy: currentData.createdBy || user?.uid || '',
        createdAt: currentData.createdAt || new Date(),
        updatedAt: new Date(),
      };
      
      console.log('💾 AUTO-SAVE: Salvando configuração com nova logo:', logoUrl);
      console.log('📋 AUTO-SAVE: Dados completos:', updatedData);
      
      // Salvar dados completos
      await onSave(updatedData);
      
      console.log('✅ AUTO-SAVE: Logo salva automaticamente no banco!');
      notifications.success('Logo Salva', 'Logo foi salva automaticamente na configuração!');
      
    } catch (error) {
      console.error('❌ AUTO-SAVE: Erro ao salvar logo automaticamente:', error);
      notifications.error('Erro Auto-Save', 'Erro ao salvar logo automaticamente. Clique em "Salvar Configuração" manualmente.');
    }
  };



  // Função para upload de logo com validação aprimorada
  const handleLogoUpload = async (file: File): Promise<string> => {
    console.log('🖼️  UPLOAD: Iniciando upload de logo...', { fileName: file.name, size: file.size });
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload-logo', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ UPLOAD: Erro no upload:', data);
      throw new Error(data.error || 'Erro no upload da logo');
    }

    console.log('✅ UPLOAD: Upload bem-sucedido:', data.imageUrl);
    
    // Validar URL após upload
    console.log('🔍 UPLOAD: Validando URL após upload...');
    const validation = await validateImageUrl(data.imageUrl, {
      maxSize: 5 * 1024 * 1024, // 5MB
      timeout: 5000
    });
    
    if (!validation.isValid) {
      console.error('❌ UPLOAD: URL inválida após upload:', validation.error);
      throw new Error(validation.error || 'URL da imagem não é válida após upload');
    }
    
    notifications.success('Upload Concluído', 'Logo enviada, validada e salva com sucesso!');
    
    // 🎯 SALVAMENTO AUTOMÁTICO: Salvar imediatamente após upload
    console.log('💾 AUTO-SAVE: Salvando logo automaticamente...');
    await saveLogoAutomatically(data.imageUrl);
    
    return data.imageUrl;
  };

  // Função para upload de imagem de fundo com validação
  const handleBackgroundImageUpload = async (file: File): Promise<string> => {
    console.log('🌄 UPLOAD: Iniciando upload de imagem de fundo...', { fileName: file.name, size: file.size });
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload-background-image', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ UPLOAD: Erro no upload da imagem de fundo:', data);
      throw new Error(data.error || 'Erro no upload da imagem de fundo');
    }

    console.log('✅ UPLOAD: Upload de fundo bem-sucedido:', data.imageUrl);
    
    // Validar URL após upload
    console.log('🔍 UPLOAD: Validando URL da imagem de fundo após upload...');
    const validation = await validateImageUrl(data.imageUrl, {
      maxSize: 10 * 1024 * 1024, // 10MB
      timeout: 8000
    });
    
    if (!validation.isValid) {
      console.error('❌ UPLOAD: URL da imagem de fundo inválida após upload:', validation.error);
      throw new Error(validation.error || 'URL da imagem de fundo não é válida após upload');
    }
    
    notifications.success('Upload Concluído', 'Imagem de fundo enviada, validada e salva com sucesso!');
    
    // 🎯 SALVAMENTO AUTOMÁTICO: Salvar imediatamente após upload
    console.log('💾 AUTO-SAVE: Salvando imagem de fundo automaticamente...');
    await saveBackgroundImageAutomatically(data.imageUrl);
    
    return data.imageUrl;
  };

  // Função para salvamento automático da imagem de fundo
  const saveBackgroundImageAutomatically = async (backgroundImageUrl: string) => {
    try {
      console.log('🔄 AUTO-SAVE: Iniciando salvamento automático da imagem de fundo...');
      
      if (!onSave) {
        console.warn('⚠️  AUTO-SAVE: onSave não disponível, pulando...');
        return;
      }

      // Pegar dados atuais do formulário
      const currentData = watchedValues;
      
      // 🔧 GARANTIR que todos os campos estejam presentes, incluindo campos obrigatórios
      const updatedData = {
        ...currentData,
        backgroundImageUrl: backgroundImageUrl,
        // Garantir que campos essenciais estejam definidos
        eventId: currentData.eventId || eventId,
        createdBy: currentData.createdBy || user?.uid || '',
        createdAt: currentData.createdAt || new Date(),
        updatedAt: new Date(),
      };
      
      console.log('💾 AUTO-SAVE: Salvando configuração com nova imagem de fundo:', backgroundImageUrl);
      console.log('📋 AUTO-SAVE: Dados completos:', updatedData);
      
      // Salvar dados completos
      await onSave(updatedData);
      
      console.log('✅ AUTO-SAVE: Imagem de fundo salva automaticamente no banco!');
      notifications.success('Imagem de Fundo Salva', 'Imagem de fundo foi salva automaticamente na configuração!');
      
    } catch (error) {
      console.error('❌ AUTO-SAVE: Erro ao salvar imagem de fundo automaticamente:', error);
      notifications.error('Erro Auto-Save', 'Erro ao salvar imagem de fundo automaticamente. Clique em "Salvar Configuração" manualmente.');
    }
  };

  const handleLogoChange = async (imageUrl: string | undefined) => {
    console.log('🔄 LOGO_CHANGE: Mudando logoUrl para:', imageUrl);
    console.log('🔍 LOGO_CHANGE: Valor anterior era:', watchedValues.logoUrl);
    
    setValue('logoUrl', imageUrl, { shouldValidate: true, shouldDirty: true });
    
    console.log('✅ LOGO_CHANGE: setValue chamado, verificando...', { 
      novoValor: imageUrl,
      valorAtualDoForm: watchedValues.logoUrl 
    });
    
    // Validar URL externa se fornecida
    if (imageUrl && !imageUrl.includes('cloudinary.com')) {
      console.log('🔍 LOGO_CHANGE: Validando URL externa...');
      try {
        const validation = await validateImageUrl(imageUrl, {
          maxSize: 5 * 1024 * 1024,
          timeout: 8000
        });
        
        if (!validation.isValid) {
          notifications.warning('URL Inválida', validation.error || 'A URL da imagem não é válida');
          return;
        }
        
        notifications.info('URL Validada', 'URL da imagem validada com sucesso!');
      } catch (error) {
        console.error('❌ LOGO_CHANGE: Erro na validação:', error);
        notifications.error('Erro de Validação', 'Não foi possível validar a URL da imagem');
      }
    }
    
    // Update preview immediately (will be debounced by the effect)
    if (onConfigChange) {
      const updatedConfig: CertificateConfig = {
        ...watchedValues,
        logoUrl: imageUrl,
        id: config?.id || 'temp',
        createdAt: config?.createdAt || new Date(),
        updatedAt: new Date(),
      } as CertificateConfig;
      onConfigChange(updatedConfig);
      console.log('🎯 LOGO_CHANGE: onConfigChange chamado com logoUrl:', imageUrl);
    }
  };

  const handleBackgroundImageChange = async (imageUrl: string | undefined) => {
    console.log('🔄 BACKGROUND_CHANGE: Mudando backgroundImageUrl para:', imageUrl);
    console.log('🔍 BACKGROUND_CHANGE: Valor anterior era:', watchedValues.backgroundImageUrl);
    
    setValue('backgroundImageUrl', imageUrl, { shouldValidate: true, shouldDirty: true });
    
    console.log('✅ BACKGROUND_CHANGE: setValue chamado, verificando...', { 
      novoValor: imageUrl,
      valorAtualDoForm: watchedValues.backgroundImageUrl 
    });
    
    // Validar URL externa se fornecida
    if (imageUrl && !imageUrl.includes('cloudinary.com')) {
      console.log('🔍 BACKGROUND_CHANGE: Validando URL externa...');
      try {
        const validation = await validateImageUrl(imageUrl, {
          maxSize: 10 * 1024 * 1024,
          timeout: 8000
        });
        
        if (!validation.isValid) {
          notifications.warning('URL Inválida', validation.error || 'A URL da imagem de fundo não é válida');
          return;
        }
        
        notifications.info('URL Validada', 'URL da imagem de fundo validada com sucesso!');
      } catch (error) {
        console.error('❌ BACKGROUND_CHANGE: Erro na validação:', error);
        notifications.error('Erro de Validação', 'Não foi possível validar a URL da imagem de fundo');
      }
    }
    
    // Update preview immediately (will be debounced by the effect)
    if (onConfigChange) {
      const updatedConfig: CertificateConfig = {
        ...watchedValues,
        backgroundImageUrl: imageUrl,
        id: config?.id || 'temp',
        createdAt: config?.createdAt || new Date(),
        updatedAt: new Date(),
      } as CertificateConfig;
      onConfigChange(updatedConfig);
      console.log('🎯 BACKGROUND_CHANGE: onConfigChange chamado com backgroundImageUrl:', imageUrl);
    }
  };

  // Watch especificamente para logoUrl - log removido para reduzir spam

  // Debounced values para preview otimizado
  const [debouncedValues, isDebouncing] = useDebounce(watchedValues, 300);
  
  // Memoize the previous values to prevent infinite loops
  const prevValuesRef = React.useRef<string>('');
  
  // Watch for debounced form changes to update preview
  React.useEffect(() => {
    if (onConfigChange) {
      // Create a stable string representation of current values
              const currentValuesString = JSON.stringify({
          primaryColor: debouncedValues.primaryColor,
          secondaryColor: debouncedValues.secondaryColor,
          backgroundColor: debouncedValues.backgroundColor,
          borderColor: debouncedValues.borderColor,
          template: debouncedValues.template,
          orientation: debouncedValues.orientation,
          pageSize: debouncedValues.pageSize,
          pageMargin: debouncedValues.pageMargin,
          fontFamily: debouncedValues.fontFamily,
          logoUrl: debouncedValues.logoUrl,
          logoSize: debouncedValues.logoSize,
          backgroundImageUrl: debouncedValues.backgroundImageUrl,
          backgroundImageOpacity: debouncedValues.backgroundImageOpacity,
          backgroundImageSize: debouncedValues.backgroundImageSize,
          backgroundImagePosition: debouncedValues.backgroundImagePosition,
          showBorder: debouncedValues.showBorder,
          includeQRCode: debouncedValues.includeQRCode
        });
      
      // Only update if values actually changed
      if (currentValuesString !== prevValuesRef.current) {
        prevValuesRef.current = currentValuesString;
        
        const updatedConfig: CertificateConfig = {
          ...debouncedValues,
          id: config?.id || 'temp',
          createdAt: config?.createdAt || new Date(),
          updatedAt: new Date(),
        } as CertificateConfig;
        
        console.log('🎨 PREVIEW_UPDATE: Configuração atualizada com debounce', {
          isDebouncing,
          primaryColor: debouncedValues.primaryColor,
          logoUrl: debouncedValues.logoUrl ? debouncedValues.logoUrl.substring(0, 30) + '...' : 'none'
        });
        
        onConfigChange(updatedConfig);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValues, onConfigChange, config?.id, isDebouncing]);

  // Watch for changes in form values to mark as unsaved
  React.useEffect(() => {
    if (config && config.id) {
      // 🔧 REDUZIR LOGS: Só logar a detecção ocasionalmente
      const shouldLog = Math.random() < 0.1; // 10% das vezes
      
      if (shouldLog) {
        console.log('🔍 DETECÇÃO DE MUDANÇAS: Iniciando comparação');
        console.log('📋 watchedValues:', watchedValues);
        console.log('💾 config salvo:', config);
      }
      
      // Compare current form values with saved config to detect changes
      const changedFields: string[] = [];
      const hasChanges = Object.keys(watchedValues).some(key => {
        const currentValue = watchedValues[key as keyof typeof watchedValues];
        const savedValue = config[key as keyof typeof config];
        
        // Skip comparison for certain fields
        if (key === 'createdAt' || key === 'updatedAt' || key === 'id') {
          return false;
        }
        
        // CORREÇÃO: Tratamento especial para logoUrl
        if (key === 'logoUrl') {
          // Para logoUrl, consideramos apenas se ambos têm valor válido ou se ambos estão vazios
          const currentHasValue = currentValue && typeof currentValue === 'string' && currentValue.trim() !== '';
          const savedHasValue = savedValue && typeof savedValue === 'string' && savedValue.trim() !== '';
          
          const isDifferent = currentHasValue !== savedHasValue || 
            (currentHasValue && savedHasValue && currentValue !== savedValue);
          
          // Log apenas se necessário para debug específico
          // if (isDifferent) console.log('logoUrl state mismatch');
          
          return isDifferent;
        }
        
        // Tratamento especial para backgroundImageUrl
        if (key === 'backgroundImageUrl') {
          const currentHasValue = currentValue && typeof currentValue === 'string' && currentValue.trim() !== '';
          const savedHasValue = savedValue && typeof savedValue === 'string' && savedValue.trim() !== '';
          
          return currentHasValue !== savedHasValue || 
            (currentHasValue && savedHasValue && currentValue !== savedValue);
        }
        
        // Tratamento especial para campos booleanos
        if (typeof currentValue === 'boolean' || typeof savedValue === 'boolean') {
          // Normalizar para booleanos para comparação consistente
          const currentBool = Boolean(currentValue);
          const savedBool = Boolean(savedValue);
          return currentBool !== savedBool;
        }
        
        // Tratamento especial para objetos (posições, etc.)
        if (typeof currentValue === 'object' && typeof savedValue === 'object') {
          return JSON.stringify(currentValue) !== JSON.stringify(savedValue);
        }
        
        // Para outros campos, normalização padrão
        const normalizeValue = (val: unknown) => {
          if (val === null || val === undefined || val === '') return '';
          return val;
        };
        
        const normalizedCurrent = normalizeValue(currentValue);
        const normalizedSaved = normalizeValue(savedValue);
        
        let isChanged = false;
        
        // 🔧 CORREÇÃO: Verificar mudança de acordo com o tipo do campo
        if (key === 'includeQRCode' || key === 'showBorder' || key === 'showWatermark') {
          // Para campos booleanos, comparação direta
          const currentBool = Boolean(normalizedCurrent);
          const savedBool = Boolean(normalizedSaved);
          isChanged = currentBool !== savedBool;
          
          if (isChanged) {
            changedFields.push(key);
            console.log(`🔄 CAMPO BOOLEANO ALTERADO: ${key}`);
            console.log(`  Atual: ${currentBool} (boolean)`);
            console.log(`  Salvo: ${savedBool} (boolean)`);
          }
        } else {
          // Para outros campos, comparação JSON
          isChanged = JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedSaved);
          
          if (isChanged) {
            changedFields.push(key);
            console.log(`🔄 CAMPO ALTERADO: ${key}`);
            console.log(`  Atual: ${JSON.stringify(normalizedCurrent)} (${typeof normalizedCurrent})`);
            console.log(`  Salvo: ${JSON.stringify(normalizedSaved)} (${typeof normalizedSaved})`);
          }
        }
        
        return isChanged;
      });
      
      // 🔧 SEMPRE LOGAR quando há mudanças críticas detectadas ou quando estado muda
      if (hasChanges && changedFields.length > 0) {
        console.log('🔍 RESULTADO DA DETECÇÃO:');
        console.log('  hasChanges:', hasChanges);
        console.log('  changedFields:', changedFields);
        console.log('  Campos críticos para debug:');
        console.log(`    includeQRCode: atual=${watchedValues.includeQRCode}, salvo=${config.includeQRCode}`);
        console.log(`    qrCodeText: atual="${watchedValues.qrCodeText}", salvo="${config.qrCodeText}"`);
        console.log(`    backgroundImageUrl: atual="${watchedValues.backgroundImageUrl}", salvo="${config.backgroundImageUrl}"`);
      }
      
      // Track hasChanges state changes
      if (hasChanges !== previousHasChanges.current) {
        console.log(`🚦 MUDANÇA DE ESTADO: hasUnsavedChanges mudou de ${previousHasChanges.current} para ${hasChanges}`);
        if (hasChanges && changedFields.length === 0) {
          console.warn('⚠️ BUG: hasChanges=true mas changedFields vazio!');
        }
        previousHasChanges.current = hasChanges;
      }
      
      setHasUnsavedChanges(hasChanges);
    }
  }, [watchedValues, config]);

  // Variável para rastrear se onSubmit foi executado (para fallback)
  const onSubmitCalledRef = React.useRef(false);

  const onSubmit = async (data: CertificateConfigData) => {
    console.log('🚀🚀🚀 ONSUBMIT EXECUTADO! 🚀🚀🚀');
    console.log('⭐ Este log confirma que o onSubmit foi chamado com sucesso');
    onSubmitCalledRef.current = true;
    
    try {
      console.log('📤 SALVAMENTO MANUAL: Processando...');
      console.log('📋 Dados do formulário recebidos:', data);
      console.log('📋 Valores observados (watchedValues):', watchedValues);
      console.log('🔍 Estado hasUnsavedChanges:', hasUnsavedChanges);
      
      // 🔧 CORREÇÃO COMPLETA: Preservar TODOS os campos que podem estar em watchedValues
      // mas podem não estar sendo capturados corretamente pelo formulário
      
      const fieldsToPreserve = [
        'logoUrl',
        'backgroundImageUrl', 
        'includeQRCode',
        'qrCodeText',
        'qrCodePosition',
        'logoPosition',
        'titlePosition', 
        'namePosition',
        'bodyPosition',
        'showBorder',
        'showWatermark',
        'watermarkText',
        'watermarkOpacity',
        'borderWidth',
        'logoSize',
        'backgroundImageOpacity',
        'backgroundImageSize',
        'backgroundImagePosition',
        'pageSize',
        'pageMargin'
      ];
      
      fieldsToPreserve.forEach(field => {
        const currentValue = data[field as keyof CertificateConfigData];
        const watchedValue = watchedValues[field as keyof typeof watchedValues];
        
        // 🔧 LÓGICA APRIMORADA: Tratamento diferenciado por tipo de campo
        const shouldPreserve = (() => {
          // Para campos booleanos, preservar se o valor atual é undefined/null mas o watched não é
          if (typeof watchedValue === 'boolean') {
            return (currentValue === undefined || currentValue === null) && watchedValue !== undefined;
          }
          
          // Para strings, preservar se atual está vazio/undefined mas watched tem valor
          if (typeof watchedValue === 'string') {
            return (currentValue === undefined || currentValue === null || currentValue === '') && 
                   watchedValue !== undefined && watchedValue !== null && watchedValue !== '';
          }
          
          // Para números, preservar se atual é undefined/null mas watched tem valor válido
          if (typeof watchedValue === 'number') {
            return (currentValue === undefined || currentValue === null) && 
                   watchedValue !== undefined && !isNaN(watchedValue);
          }
          
          // Para objetos (posições, etc.), preservar se atual está undefined mas watched existe
          if (typeof watchedValue === 'object' && watchedValue !== null) {
            return (currentValue === undefined || currentValue === null) && watchedValue !== undefined;
          }
          
          // Caso padrão
          return (currentValue === undefined || currentValue === null) && watchedValue !== undefined;
        })();
        
        if (shouldPreserve) {
          console.log(`🔧 Preservando campo '${field}' (${typeof watchedValue}):`, watchedValue);
          (data as Record<string, unknown>)[field] = watchedValue;
        }
      });
      
      console.log('📋 Dados finais para salvamento:', data);
      
      // 🔍 DEBUG: Mostrar estado específico dos campos críticos
      console.log('🔍 DEBUG - Estado dos campos críticos:');
      console.log(`includeQRCode: ${data.includeQRCode} (tipo: ${typeof data.includeQRCode})`);
      console.log(`qrCodeText: "${data.qrCodeText}" (tipo: ${typeof data.qrCodeText})`);
      console.log(`qrCodePosition:`, data.qrCodePosition);
      console.log(`backgroundImageUrl: "${data.backgroundImageUrl}" (tipo: ${typeof data.backgroundImageUrl})`);
      console.log(`logoUrl: "${data.logoUrl}" (tipo: ${typeof data.logoUrl})`);
      console.log(`showBorder: ${data.showBorder} (tipo: ${typeof data.showBorder})`);
      console.log(`showWatermark: ${data.showWatermark} (tipo: ${typeof data.showWatermark})`);
      console.log(`pageSize: "${data.pageSize}" (tipo: ${typeof data.pageSize})`);
      console.log(`pageMargin: "${data.pageMargin}" (tipo: ${typeof data.pageMargin})`);
      
      if (onSave) {
        await onSave(data);
        console.log('✅ SALVAMENTO MANUAL: Configuração salva com sucesso!');
        
        // 🔧 GARANTIR feedback visual de sucesso após salvamento
        setHasUnsavedChanges(false);
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
        
        notifications.success('Configuração Salva', 'Todas as configurações foram salvas com sucesso!');
        
      } else {
        console.warn('⚠️ onSave não foi fornecido!');
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error);
      throw error; // Re-throw para que o hook de formulário possa lidar com o erro
    } finally {
      // Reset o flag para futuras execuções
      setTimeout(() => {
        onSubmitCalledRef.current = false;
      }, 2000);
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
        }, 100);
        
        // Auto-save template configuration
        setTimeout(async () => {
          try {
            if (onSave) {
              // 🔧 GARANTIR que todos os campos essenciais estejam no template
              const completeTemplateConfig = {
                ...templateConfig,
                eventId: eventId,
                createdBy: user?.uid || '',
                updatedAt: new Date(),
              };
              
              console.log('💾 AUTO-SAVE TEMPLATE: Salvando template completo:', completeTemplateConfig);
              
              await onSave(completeTemplateConfig);
              setHasUnsavedChanges(false);
              
              // ✅ CORREÇÃO: Ativar feedback de sucesso visual
              console.log('✅ Template aplicado - ativando feedback visual');
              setSaveSuccess(true);
              setTimeout(() => {
                setSaveSuccess(false);
              }, 3000);
              
              notifications.success('Template Aplicado e Salvo', `Template "${templatePreviews[templateId]?.name}" aplicado e salvo com sucesso!`);
            }
          } catch (error) {
            console.error('❌ Erro ao salvar template:', error);
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
    <div className="relative">
      {/* Toast de mudanças não salvas */}
      {hasUnsavedChanges && !isSubmitting && (
        <div className="fixed top-4 right-4 z-50 bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-md shadow-lg max-w-xs">
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-blue-600 mr-2 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-blue-800">Alterações Pendentes</p>
              <p className="text-xs text-blue-600">Lembre-se de salvar suas configurações</p>
            </div>
          </div>
        </div>
      )}

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
                        value={watchedValues.primaryColor || '#7c3aed'}
                        onChange={(e) => {
                          console.log('🎨 COLOR_PICKER: Mudança na cor primária:', e.target.value);
                          setValue('primaryColor', e.target.value, { shouldValidate: true, shouldDirty: true });
                        }}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={watchedValues.primaryColor || '#7c3aed'}
                        onChange={(e) => {
                          setValue('primaryColor', e.target.value, { shouldValidate: true, shouldDirty: true });
                        }}
                        placeholder="#7c3aed"
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
                        value={watchedValues.secondaryColor || '#6b7280'}
                        onChange={(e) => {
                          setValue('secondaryColor', e.target.value, { shouldValidate: true, shouldDirty: true });
                        }}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={watchedValues.secondaryColor || '#6b7280'}
                        onChange={(e) => {
                          setValue('secondaryColor', e.target.value, { shouldValidate: true, shouldDirty: true });
                        }}
                        placeholder="#6b7280"
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
                        value={watchedValues.backgroundColor || '#ffffff'}
                        onChange={(e) => {
                          setValue('backgroundColor', e.target.value, { shouldValidate: true, shouldDirty: true });
                        }}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={watchedValues.backgroundColor || '#ffffff'}
                        onChange={(e) => {
                          setValue('backgroundColor', e.target.value, { shouldValidate: true, shouldDirty: true });
                        }}
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
                        value={watchedValues.borderColor || '#c4b5fd'}
                        onChange={(e) => {
                          setValue('borderColor', e.target.value, { shouldValidate: true, shouldDirty: true });
                        }}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={watchedValues.borderColor || '#c4b5fd'}
                        onChange={(e) => {
                          setValue('borderColor', e.target.value, { shouldValidate: true, shouldDirty: true });
                        }}
                        placeholder="#c4b5fd"
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
                <div>
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Configurações de Página
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <label htmlFor="pageSize" className="block text-sm font-medium text-gray-700 mb-2">
                        Tamanho da Página
                      </label>
                      <select
                        id="pageSize"
                        {...register('pageSize')}
                        className="input w-full"
                      >
                        {Object.entries(PAGE_SIZE_INFO).map(([value, info]) => (
                          <option key={value} value={value}>
                            {info.name} - {info.description}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {PAGE_SIZE_INFO[watchedValues.pageSize || 'A4']?.dimensions}
                        {PAGE_SIZE_INFO[watchedValues.pageSize || 'A4']?.recommended && ' ⭐ Recomendado'}
                      </p>
                      <FieldError error={getFieldError('pageSize')} />
                    </div>

                    <div>
                      <label htmlFor="pageMargin" className="block text-sm font-medium text-gray-700 mb-2">
                        Margens da Página
                      </label>
                      <select
                        id="pageMargin"
                        {...register('pageMargin')}
                        className="input w-full"
                      >
                        {Object.entries(MARGIN_INFO).map(([value, info]) => (
                          <option key={value} value={value}>
                            {info.name} - {info.description}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Área útil: {MARGIN_INFO[watchedValues.pageMargin || 'normal']?.value}
                      </p>
                      <FieldError error={getFieldError('pageMargin')} />
                    </div>

                    <div className="md:col-span-2">
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <h6 className="text-sm font-semibold text-blue-900 mb-2">📏 Informações da Página</h6>
                        <div className="text-xs text-blue-800 grid grid-cols-2 gap-2">
                          <div><strong>Tamanho:</strong> {PAGE_SIZE_INFO[watchedValues.pageSize || 'A4']?.name}</div>
                          <div><strong>Dimensões:</strong> {PAGE_SIZE_INFO[watchedValues.pageSize || 'A4']?.dimensions}</div>
                          <div><strong>Orientação:</strong> {watchedValues.orientation === 'landscape' ? 'Paisagem' : 'Retrato'}</div>
                          <div><strong>Margem:</strong> {MARGIN_INFO[watchedValues.pageMargin || 'normal']?.name}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

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
                  
                  <div className="space-y-6">
                    {/* Upload de Logo com validação aprimorada */}
                    <ImageUpload
                      currentImage={watchedValues.logoUrl ? getOptimizedPreviewUrl(watchedValues.logoUrl) : undefined}
                      onImageChange={handleLogoChange}
                      onImageUpload={handleLogoUpload}
                      label="Logo do Certificado"
                      maxSize={5}
                      accept="image/*"
                      className="max-w-md"
                      disabled={isSubmitting}
                      allowExternalUrl={true}
                    />

                    {/* Campo de URL manual (alternativa ao upload) */}
                    <div className="max-w-md">
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="logoUrl" className="text-sm font-medium text-gray-700">
                          Ou usar URL externa
                        </label>
                        {watchedValues.logoUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              console.log('🗑️ Clicando para remover logo');
                              handleLogoChange(undefined);
                            }}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Remover logo
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        id="logoUrl"
                        {...register('logoUrl')}
                        className="input w-full"
                        placeholder="https://exemplo.com/logo.png"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Cole uma URL de imagem como alternativa ao upload
                      </p>
                      <FieldError error={getFieldError('logoUrl')} />
                    </div>

                    {/* Configurações da Logo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            disabled={isSubmitting}
                          />
                          <span className="text-sm text-gray-600 w-12">
                            {watchedValues.logoSize}px
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Controla a maior dimensão da logo (largura ou altura)
                        </p>
                        <FieldError error={getFieldError('logoSize')} />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Proporção da Logo
                        </label>
                        <div className="space-y-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={true}
                              disabled
                              className="mr-2 opacity-50"
                            />
                            <span className="text-sm text-gray-600">
                              Manter proporções originais ✅
                            </span>
                          </label>
                          
                          {/* Visual demonstration */}
                          <div className="bg-gray-50 p-3 rounded border">
                            <p className="text-xs font-medium text-gray-700 mb-2">Exemplo:</p>
                            <div className="flex items-center space-x-4">
                              <div className="text-center">
                                <div className="w-12 h-6 bg-blue-200 border border-blue-300 rounded mb-1 flex items-center justify-center">
                                  <span className="text-xs text-blue-700 font-bold">LOGO</span>
                                </div>
                                <p className="text-xs text-gray-600">Original<br/>(retangular)</p>
                              </div>
                              
                              <span className="text-gray-400">→</span>
                              
                              <div className="text-center">
                                <div className="w-12 h-6 bg-green-200 border border-green-300 rounded mb-1 flex items-center justify-center">
                                  <span className="text-xs text-green-700 font-bold">LOGO</span>
                                </div>
                                <p className="text-xs text-green-600">No certificado<br/>(proporções mantidas)</p>
                              </div>
                            </div>
                            <p className="text-xs text-green-600 mt-2 font-medium">
                              ✅ Sem achatamento ou distorção!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dicas para o usuário */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h6 className="text-sm font-semibold text-blue-900 mb-2">💡 Dicas para a logo</h6>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• <strong>Qualquer formato funciona</strong> - as proporções serão mantidas</li>
                        <li>• PNG com fundo transparente é recomendado</li>
                        <li>• Resolução mínima: 200px na maior dimensão</li>
                        <li>• O tamanho controla a maior dimensão (largura ou altura)</li>
                        <li>• Tamanho máximo do arquivo: 5MB</li>
                        <li>• ✅ <strong>Não mais achatamento!</strong> Proporções preservadas</li>
                      </ul>
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

                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                    <Wallpaper className="h-4 w-4 mr-2" />
                    Imagem de Fundo
                  </h4>
                  
                  <div className="space-y-6">
                    {/* Upload de Imagem de Fundo */}
                    <ImageUpload
                      currentImage={watchedValues.backgroundImageUrl ? getOptimizedPreviewUrl(watchedValues.backgroundImageUrl) : undefined}
                      onImageChange={handleBackgroundImageChange}
                      onImageUpload={handleBackgroundImageUpload}
                      label="Imagem de Fundo do Certificado"
                      maxSize={10}
                      accept="image/*"
                      className="max-w-md"
                      disabled={isSubmitting}
                      allowExternalUrl={true}
                    />

                    {/* Campo de URL manual para imagem de fundo */}
                    <div className="max-w-md">
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="backgroundImageUrl" className="text-sm font-medium text-gray-700">
                          Ou usar URL externa
                        </label>
                        {watchedValues.backgroundImageUrl && (
                          <button
                            type="button"
                            onClick={() => handleBackgroundImageChange(undefined)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Remover imagem de fundo
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        id="backgroundImageUrl"
                        {...register('backgroundImageUrl')}
                        className="input w-full"
                        placeholder="https://exemplo.com/imagem-fundo.jpg"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Cole uma URL de imagem como alternativa ao upload
                      </p>
                      <FieldError error={getFieldError('backgroundImageUrl')} />
                    </div>

                    {/* Configurações da Imagem de Fundo */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="backgroundImageOpacity" className="block text-sm font-medium text-gray-700 mb-2">
                          Opacidade
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="range"
                            id="backgroundImageOpacity"
                            {...register('backgroundImageOpacity', { valueAsNumber: true })}
                            min="0.1"
                            max="1.0"
                            step="0.1"
                            className="flex-1"
                            disabled={isSubmitting}
                          />
                          <span className="text-sm text-gray-600 w-12">
                            {Math.round((watchedValues.backgroundImageOpacity || 0.3) * 100)}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Controla a transparência da imagem de fundo
                        </p>
                        <FieldError error={getFieldError('backgroundImageOpacity')} />
                      </div>
                      
                      <div>
                        <label htmlFor="backgroundImageSize" className="block text-sm font-medium text-gray-700 mb-2">
                          Ajuste da Imagem
                        </label>
                        <select
                          id="backgroundImageSize"
                          {...register('backgroundImageSize')}
                          className="input w-full"
                          disabled={isSubmitting}
                        >
                          <option value="cover">Preencher (Cover)</option>
                          <option value="contain">Ajustar (Contain)</option>
                          <option value="auto">Tamanho Original (Auto)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Como a imagem se ajusta ao certificado
                        </p>
                        <FieldError error={getFieldError('backgroundImageSize')} />
                      </div>

                      <div>
                        <label htmlFor="backgroundImagePosition" className="block text-sm font-medium text-gray-700 mb-2">
                          Posição
                        </label>
                        <select
                          id="backgroundImagePosition"
                          {...register('backgroundImagePosition')}
                          className="input w-full"
                          disabled={isSubmitting}
                        >
                          <option value="center">Centro</option>
                          <option value="top">Topo</option>
                          <option value="bottom">Base</option>
                          <option value="left">Esquerda</option>
                          <option value="right">Direita</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Posição da imagem no certificado
                        </p>
                        <FieldError error={getFieldError('backgroundImagePosition')} />
                      </div>
                    </div>

                    {/* Dicas para o usuário */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h6 className="text-sm font-semibold text-blue-900 mb-2">💡 Dicas para imagem de fundo</h6>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• <strong>Recomendamos opacidade baixa</strong> (20-40%) para não interferir no texto</li>
                        <li>• Imagens com cores suaves funcionam melhor</li>
                        <li>• Use &quot;Cover&quot; para preencher todo o certificado</li>
                        <li>• Use &quot;Contain&quot; para manter a imagem completa e visível</li>
                        <li>• Resolução recomendada: 1200x800px (landscape) ou 800x1200px (portrait)</li>
                        <li>• Tamanho máximo do arquivo: 10MB</li>
                        <li>• Formatos suportados: PNG, JPG, GIF, WebP</li>
                      </ul>
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
              onClick={(e) => {
                console.log('🖱️ CLIQUE BOTÃO SALVAR - Iniciando debug completo');
                console.log('🔍 Estado do botão:');
                console.log('  type:', e.currentTarget.type);
                console.log('  disabled:', e.currentTarget.disabled);
                console.log('  form:', e.currentTarget.form);
                
                console.log('🔍 Estado do componente:');
                console.log('  hasUnsavedChanges:', hasUnsavedChanges);
                console.log('  isSubmitting:', isSubmitting);
                console.log('  watchedValues.includeQRCode:', watchedValues.includeQRCode);
                console.log('  config?.includeQRCode:', config?.includeQRCode);
                
                // 🔧 TESTE: Forçar chiamar o onSubmit manualmente se necessário
                console.log('🧪 TESTE: Verificando se o submit vai ser processado...');
                
                // Verificar se há erros de validação que podem impedir o submit
                console.log('🔍 Submit error:', submitError);
                console.log('🔍 Form state:', formState);
                console.log('🔍 Form errors:', formState.errors);
                console.log('🔍 Form isValid:', formState.isValid);
                console.log('🔍 Form isValidating:', formState.isValidating);
                
                // Se há erros de validação, mostrar quais são
                if (Object.keys(formState.errors).length > 0) {
                  console.error('❌ ERROS DE VALIDAÇÃO IMPEDINDO SUBMIT:');
                  Object.entries(formState.errors).forEach(([field, error]) => {
                    console.error(`  ${field}:`, error);
                  });
                }
                
                // 🔧 FALLBACK: Se por algum motivo o submit não funcionar, forçar chamada manual após timeout
                onSubmitCalledRef.current = false; // Reset o flag
                
                // Verificar se onSubmit foi chamado
                setTimeout(() => {
                  if (!onSubmitCalledRef.current) {
                    console.warn('⚠️ PROBLEMA: onSubmit NÃO foi chamado após 1 segundo!');
                    console.log('🔧 FORÇANDO SUBMIT MANUAL...');
                    
                    // Forçar submit manual com os dados atuais do formulário
                    const currentData = watchedValues;
                    console.log('📋 Dados para submit manual:', currentData);
                    
                    onSubmit(currentData as CertificateConfigData);
                  } else {
                    console.log('✅ onSubmit foi chamado corretamente via React Hook Form');
                  }
                }, 1000);
                
                // Não impedir o submit - deixar o React Hook Form processar
                console.log('➡️  Prosseguindo com o submit do formulário via React Hook Form');
              }}
              className={`
                btn-primary 
                disabled:opacity-50 
                disabled:cursor-not-allowed 
                relative 
                transition-all 
                duration-300 
                ${hasUnsavedChanges 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-lg transform scale-[1.02]' 
                  : ''
                }
                ${saveSuccess 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : ''
                }
              `}
            >
{(() => {
                if (isSubmitting) {
                  return (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      <span>Salvando...</span>
                    </div>
                  );
                } else if (saveSuccess) {
                  return (
                    <div className="flex items-center">
                      <Check className="h-4 w-4 mr-2 animate-bounce" />
                      <span>Salvo com Sucesso!</span>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex items-center">
                      {hasUnsavedChanges ? (
                        <Clock className="h-4 w-4 mr-2 text-blue-200 animate-pulse" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      <span>
                        {hasUnsavedChanges ? 'Salvar Alterações' : 'Confirmar Configuração'}
                      </span>
                      {hasUnsavedChanges && (
                        <span className="ml-2 px-1 py-0.5 text-xs bg-blue-200 text-blue-800 rounded-full font-medium">
                          Novo
                        </span>
                      )}
                    </div>
                  );
                }
              })()}
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>
  );
};
