'use client';

import React, { useState } from 'react';
import { 
  ConditionalLogic, 
  ConditionalRule, 
  FormFieldConfig
} from '@/types/custom-forms';
import { getConditionalTriggers, validateConditionalLogic } from '@/hooks/useConditionalLogic';
import { Plus, X, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface ConditionalLogicEditorProps {
  field: FormFieldConfig;
  allFields: FormFieldConfig[];
  onUpdate: (logic: ConditionalLogic) => void;
}

const OPERATORS = [
  { value: 'equals', label: 'É igual a' },
  { value: 'not_equals', label: 'É diferente de' },
  { value: 'contains', label: 'Contém' },
  { value: 'not_contains', label: 'Não contém' },
  { value: 'is_empty', label: 'Está vazio' },
  { value: 'is_not_empty', label: 'Não está vazio' },
];

const LOGIC_OPERATORS = [
  { value: 'and', label: 'E (todas as condições devem ser verdadeiras)' },
  { value: 'or', label: 'OU (pelo menos uma condição deve ser verdadeira)' },
];

const ACTIONS = [
  { value: 'show', label: 'Mostrar campo', icon: <Eye className="h-4 w-4" /> },
  { value: 'hide', label: 'Ocultar campo', icon: <EyeOff className="h-4 w-4" /> },
];

export const ConditionalLogicEditor: React.FC<ConditionalLogicEditorProps> = ({
  field,
  allFields,
  onUpdate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const availableTriggers = getConditionalTriggers(allFields, field.id);

  const logic: ConditionalLogic = field.conditionalLogic || {
    enabled: false,
    conditions: [],
    action: 'show',
    operator: 'and',
  };

  const validation = validateConditionalLogic(logic, allFields);

  const updateLogic = (updates: Partial<ConditionalLogic>) => {
    onUpdate({ ...logic, ...updates });
  };

  const addCondition = () => {
    const newCondition: ConditionalRule = {
      fieldId: '',
      operator: 'equals',
      value: '',
    };

    updateLogic({
      conditions: [...logic.conditions, newCondition],
    });
  };

  const updateCondition = (index: number, updates: Partial<ConditionalRule>) => {
    const updatedConditions = logic.conditions.map((condition, i) =>
      i === index ? { ...condition, ...updates } : condition
    );
    updateLogic({ conditions: updatedConditions });
  };

  const removeCondition = (index: number) => {
    const filteredConditions = logic.conditions.filter((_, i) => i !== index);
    updateLogic({ conditions: filteredConditions });
  };

  const getTriggerField = (fieldId: string) => {
    return availableTriggers.find(trigger => trigger.fieldId === fieldId);
  };

  const renderValueInput = (condition: ConditionalRule, index: number) => {
    const triggerField = getTriggerField(condition.fieldId);
    
    // Para operadores que não precisam de valor
    if (['is_empty', 'is_not_empty'].includes(condition.operator)) {
      return (
        <div className="text-sm text-gray-500 italic">
          Este operador não requer valor
        </div>
      );
    }

    // Para campos com opções (select, radio)
    if (triggerField?.options && ['equals', 'not_equals'].includes(condition.operator)) {
      return (
        <select
          value={condition.value as string}
          onChange={(e) => updateCondition(index, { value: e.target.value })}
          className="input w-full"
        >
          <option value="">Selecione uma opção...</option>
          {triggerField.options.map(option => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    // Para campos com opções e operadores contains/not_contains (permite múltiplos)
    if (triggerField?.options && ['contains', 'not_contains'].includes(condition.operator)) {
      const selectedValues = Array.isArray(condition.value) ? condition.value : [condition.value].filter(Boolean);
      
      return (
        <div className="space-y-2">
          {triggerField.options.map(option => (
            <label key={option.id} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={(e) => {
                  let newValues: string[];
                  if (e.target.checked) {
                    newValues = [...selectedValues, option.value];
                  } else {
                    newValues = selectedValues.filter(v => v !== option.value);
                  }
                  updateCondition(index, { value: newValues });
                }}
                className="mr-2"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      );
    }

    // Input de texto padrão
    return (
      <input
        type="text"
        value={condition.value as string}
        onChange={(e) => updateCondition(index, { value: e.target.value })}
        placeholder="Digite o valor para comparação"
        className="input w-full"
      />
    );
  };

  if (availableTriggers.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
          <p className="text-sm text-yellow-800">
            Lógica condicional não disponível. Adicione campos de seleção, radio ou texto ao formulário primeiro.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={logic.enabled}
            onChange={(e) => {
              e.stopPropagation();
              updateLogic({ enabled: e.target.checked });
            }}
            className="mr-3"
          />
          <div>
            <h4 className="font-medium text-gray-900">Lógica Condicional</h4>
            <p className="text-sm text-gray-600">
              {logic.enabled 
                ? `${logic.conditions.length} condição(ões) - ${logic.action === 'show' ? 'Mostrar' : 'Ocultar'} campo`
                : 'Mostrar/ocultar campo baseado em outras respostas'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!validation.isValid && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ↓
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && logic.enabled && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-4">
          {/* Ação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ação a Executar
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACTIONS.map(action => (
                <button
                  key={action.value}
                  type="button"
                  onClick={() => updateLogic({ action: action.value as 'show' | 'hide' })}
                  className={`flex items-center justify-center p-3 rounded-lg border text-sm font-medium transition-colors ${
                    logic.action === action.value
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Operador lógico (quando há mais de uma condição) */}
          {logic.conditions.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Como Avaliar Múltiplas Condições
              </label>
              <select
                value={logic.operator}
                onChange={(e) => updateLogic({ operator: e.target.value as 'and' | 'or' })}
                className="input w-full"
              >
                {LOGIC_OPERATORS.map(op => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Condições */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Condições ({logic.conditions.length})
              </label>
              <button
                type="button"
                onClick={addCondition}
                className="flex items-center text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Condição
              </button>
            </div>

            {logic.conditions.length === 0 ? (
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <p className="text-sm text-gray-500">
                  Nenhuma condição definida. Clique em &ldquo;Adicionar Condição&rdquo; para começar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {logic.conditions.map((condition, index) => (
                  <div key={index} className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        Condição {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCondition(index)}
                        className="text-red-500 hover:text-red-700"
                        title="Remover condição"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Campo trigger */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Campo</label>
                        <select
                          value={condition.fieldId}
                          onChange={(e) => updateCondition(index, { fieldId: e.target.value, value: '' })}
                          className="input w-full text-sm"
                        >
                          <option value="">Selecione um campo...</option>
                          {availableTriggers.map(trigger => (
                            <option key={trigger.fieldId} value={trigger.fieldId}>
                              {trigger.fieldLabel}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Operador */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Operador</label>
                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(index, { operator: e.target.value as ConditionalRule['operator'], value: '' })}
                          className="input w-full text-sm"
                        >
                          {OPERATORS.map(op => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Valor */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Valor</label>
                        {renderValueInput(condition, index)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Validação */}
          {!validation.isValid && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                <div>
                  <p className="text-sm font-medium text-red-800 mb-1">
                    Problemas encontrados:
                  </p>
                  <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
