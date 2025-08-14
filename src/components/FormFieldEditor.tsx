'use client';

import React, { useState } from 'react';
import { 
  FormFieldConfig, 
  FormFieldType, 
  FormFieldOption 
} from '@/types/custom-forms';
import { isSystemRequiredField } from '@/lib/default-form-config';
import { ConditionalLogicEditor } from './ConditionalLogicEditor';
import { 
  Type, 
  AlignLeft, 
  Hash, 
  Calendar, 
  Mail, 
  Phone, 
  CheckSquare, 
  Circle, 
  List,
  X,
  Plus,
  GripVertical,
  Settings,
  Trash2
} from 'lucide-react';

interface FormFieldEditorProps {
  field: FormFieldConfig;
  allFields: FormFieldConfig[];
  onUpdate: (field: FormFieldConfig) => void;
  onDelete: (fieldId: string) => void;
  onMoveUp?: (fieldId: string) => void;
  onMoveDown?: (fieldId: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const FIELD_TYPE_ICONS: Record<FormFieldType, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  phone: <Phone className="h-4 w-4" />,
  cpf: <Hash className="h-4 w-4" />,
  password: <Hash className="h-4 w-4" />,
  textarea: <AlignLeft className="h-4 w-4" />,
  select: <List className="h-4 w-4" />,
  'multi-select': <List className="h-4 w-4" />,
  radio: <Circle className="h-4 w-4" />,
  checkbox: <CheckSquare className="h-4 w-4" />,
  number: <Hash className="h-4 w-4" />,
  date: <Calendar className="h-4 w-4" />,
  terms: <CheckSquare className="h-4 w-4" />,
};

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Texto',
  email: 'Email',
  phone: 'Telefone',
  cpf: 'CPF',
  password: 'Senha',
  textarea: 'Texto Longo',
  select: 'Seleção',
  'multi-select': 'Seleção Múltipla',
  radio: 'Escolha Única',
  checkbox: 'Múltipla Escolha',
  number: 'Número',
  date: 'Data',
  terms: 'Termos e Condições',
};

export const FormFieldEditor: React.FC<FormFieldEditorProps> = ({
  field,
  allFields,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isSystemRequired = isSystemRequiredField(field.id);

  const updateField = (updates: Partial<FormFieldConfig>) => {
    onUpdate({ ...field, ...updates } as FormFieldConfig);
  };

  const addOption = () => {
    if ('options' in field && field.options) {
      const newOption: FormFieldOption = {
        id: `option_${Date.now()}`,
        label: `Opção ${field.options.length + 1}`,
        value: `opcao${field.options.length + 1}`,
      };
      updateField({
        ...field,
        options: [...field.options, newOption],
      });
    }
  };

  const updateOption = (optionId: string, updates: Partial<FormFieldOption>) => {
    if ('options' in field && field.options) {
      const updatedOptions = field.options.map(opt =>
        opt.id === optionId ? { ...opt, ...updates } : opt
      );
      updateField({
        ...field,
        options: updatedOptions,
      });
    }
  };

  const removeOption = (optionId: string) => {
    if ('options' in field && field.options) {
      const filteredOptions = field.options.filter(opt => opt.id !== optionId);
      updateField({
        ...field,
        options: filteredOptions,
      });
    }
  };

  const hasOptions = ['select', 'multi-select', 'radio', 'checkbox'].includes(field.type);

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Header do Campo */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
          <div className="flex items-center space-x-2">
            {FIELD_TYPE_ICONS[field.type]}
            <span className="font-medium text-gray-900">{field.label || 'Campo sem título'}</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {FIELD_TYPE_LABELS[field.type]}
            </span>
            {isSystemRequired && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-medium">
                Obrigatório do Sistema
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Botões de Movimentação */}
          {onMoveUp && !isFirst && (
            <button
              onClick={() => onMoveUp(field.id)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Mover para cima"
            >
              ↑
            </button>
          )}
          {onMoveDown && !isLast && (
            <button
              onClick={() => onMoveDown(field.id)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Mover para baixo"
            >
              ↓
            </button>
          )}

          {/* Botão de Configurações */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-2 rounded ${
              isExpanded 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Configurar campo"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Botão de Exclusão */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isSystemRequired}
            className={`p-2 ${
              isSystemRequired 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-red-400 hover:text-red-600'
            }`}
            title={
              isSystemRequired 
                ? 'Campo obrigatório do sistema não pode ser removido' 
                : 'Excluir campo'
            }
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Configurações Expandidas */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-gray-50">
          {/* Configurações Básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rótulo do Campo *
              </label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => updateField({ label: e.target.value })}
                className="input w-full"
                placeholder="Digite o rótulo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placeholder
              </label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) => updateField({ placeholder: e.target.value })}
                className="input w-full"
                placeholder="Texto de exemplo"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição (Opcional)
            </label>
            <textarea
              value={field.description || ''}
              onChange={(e) => updateField({ description: e.target.value })}
              className="input w-full"
              rows={2}
              placeholder="Descrição ou instrução para o campo"
            />
          </div>

          {/* Configurações de Layout e Obrigatório */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id={`required-${field.id}`}
                checked={field.required || isSystemRequired}
                onChange={(e) => updateField({ required: e.target.checked })}
                disabled={isSystemRequired}
                className="mr-2"
              />
              <label htmlFor={`required-${field.id}`} className={`text-sm ${isSystemRequired ? 'text-gray-500' : 'text-gray-700'}`}>
                Campo obrigatório
                {isSystemRequired && (
                  <span className="ml-2 text-xs text-red-600">
                    (Obrigatório do Sistema)
                  </span>
                )}
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Largura do Campo
              </label>
              <select
                value={field.width || 'half'}
                onChange={(e) => updateField({ width: e.target.value as 'full' | 'half' | 'third' | 'two-thirds' })}
                className="input w-full"
              >
                <option value="full">Linha inteira</option>
                <option value="half">Metade (1/2)</option>
                <option value="third">Um terço (1/3)</option>
                <option value="two-thirds">Dois terços (2/3)</option>
              </select>
            </div>
          </div>

          {/* Configurações Específicas por Tipo */}
          {(field.type === 'text' || field.type === 'email' || field.type === 'password' || field.type === 'textarea') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comprimento Mínimo
                </label>
                <input
                  type="number"
                  value={'minLength' in field ? field.minLength || '' : ''}
                  onChange={(e) => updateField({ 
                    ...field,
                    minLength: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  className="input w-full"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comprimento Máximo
                </label>
                <input
                  type="number"
                  value={'maxLength' in field ? field.maxLength || '' : ''}
                  onChange={(e) => updateField({ 
                    ...field,
                    maxLength: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  className="input w-full"
                  min="1"
                />
              </div>
            </div>
          )}

          {field.type === 'textarea' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Linhas
              </label>
              <input
                type="number"
                value={'rows' in field ? field.rows || 4 : 4}
                onChange={(e) => updateField({ 
                  ...field,
                  rows: parseInt(e.target.value) || 4 
                })}
                className="input w-full"
                min="2"
                max="10"
              />
            </div>
          )}

          {field.type === 'number' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Mínimo
                </label>
                <input
                  type="number"
                  value={'min' in field ? field.min || '' : ''}
                  onChange={(e) => updateField({ 
                    ...field,
                    min: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Máximo
                </label>
                <input
                  type="number"
                  value={'max' in field ? field.max || '' : ''}
                  onChange={(e) => updateField({ 
                    ...field,
                    max: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Incremento
                </label>
                <input
                  type="number"
                  value={'step' in field ? field.step || 1 : 1}
                  onChange={(e) => updateField({ 
                    ...field,
                    step: parseFloat(e.target.value) || 1 
                  })}
                  className="input w-full"
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>
          )}

          {field.type === 'terms' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Texto dos Termos
              </label>
              <textarea
                value={'termsText' in field ? field.termsText || '' : ''}
                onChange={(e) => updateField({ 
                  ...field,
                  termsText: e.target.value 
                })}
                className="input w-full"
                rows={3}
                placeholder="Eu aceito os termos e condições..."
              />
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL dos Termos (Opcional)
                </label>
                <input
                  type="url"
                  value={'termsUrl' in field ? field.termsUrl || '' : ''}
                  onChange={(e) => updateField({ 
                    ...field,
                    termsUrl: e.target.value 
                  })}
                  className="input w-full"
                  placeholder="https://exemplo.com/termos"
                />
              </div>
            </div>
          )}

          {/* Configuração de Opções para Campos de Seleção */}
          {hasOptions && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Opções
                </label>
                <button
                  onClick={addOption}
                  className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar Opção</span>
                </button>
              </div>

              <div className="space-y-2">
                {'options' in field && field.options?.map((option, index) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => updateOption(option.id, { label: e.target.value })}
                      className="input flex-1"
                      placeholder={`Opção ${index + 1}`}
                    />
                    <input
                      type="text"
                      value={option.value}
                      onChange={(e) => updateOption(option.id, { value: e.target.value })}
                      className="input w-32"
                      placeholder="valor"
                    />
                    <button
                      onClick={() => removeOption(option.id)}
                      className="p-2 text-red-400 hover:text-red-600"
                      disabled={field.options && field.options.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {(field.type === 'select' || field.type === 'radio') && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`allowOther-${field.id}`}
                    checked={'allowOther' in field ? field.allowOther || false : false}
                    onChange={(e) => updateField({ 
                      ...field,
                      allowOther: e.target.checked 
                    })}
                    className="mr-2"
                  />
                  <label htmlFor={`allowOther-${field.id}`} className="text-sm text-gray-700">
                    Permitir opção &ldquo;Outro&rdquo;
                  </label>
                </div>
              )}

              {field.type === 'checkbox' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mínimo Selecionados
                    </label>
                    <input
                      type="number"
                      value={'minSelected' in field ? field.minSelected || '' : ''}
                      onChange={(e) => updateField({ 
                        ...field,
                        minSelected: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      className="input w-full"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Máximo Selecionados
                    </label>
                    <input
                      type="number"
                      value={'maxSelected' in field ? field.maxSelected || '' : ''}
                      onChange={(e) => updateField({ 
                        ...field,
                        maxSelected: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      className="input w-full"
                      min="1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Editor de Lógica Condicional */}
          <div className="pt-4">
            <ConditionalLogicEditor
              field={field}
              allFields={allFields}
              onUpdate={(logic) => updateField({ conditionalLogic: logic })}
            />
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && !isSystemRequired && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Excluir Campo
            </h3>
            <p className="text-gray-600 mb-6">
              Tem certeza de que deseja excluir o campo &ldquo;{field.label}&rdquo;? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-outline"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDelete(field.id);
                  setShowDeleteConfirm(false);
                }}
                className="btn-primary bg-red-600 hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
