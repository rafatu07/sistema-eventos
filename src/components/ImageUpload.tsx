'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, FileImage, Loader, Check, AlertCircle, Eye } from 'lucide-react';
import { validateImageUrl } from '@/lib/image-validation';

interface ImageUploadProps {
  currentImage?: string;
  onImageChange: (imageUrl: string | undefined) => void;
  onImageUpload: (file: File) => Promise<string>;
  label?: string;
  accept?: string;
  maxSize?: number; // em MB
  className?: string;
  disabled?: boolean;
  allowExternalUrl?: boolean; // Permitir URL externa
  onUrlValidate?: (url: string) => Promise<void>; // Callback para validação de URL
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImage,
  onImageChange,
  onImageUpload,
  label = "Imagem",
  accept = "image/*",
  maxSize = 5, // 5MB default
  className = "",
  disabled = false
}) => {
  // Estados principais
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentImage);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados granulares de loading
  const [uploadStates, setUploadStates] = useState({
    validating: false,
    uploading: false,
    processing: false,
    complete: false
  });
  
  // Estado de validação de URL
  const [urlValidation, setUrlValidation] = useState<{
    isValidating: boolean;
    isValid: boolean;
    message?: string;
  }>({ isValidating: false, isValid: true });
  
  const isAnyLoading = Object.values(uploadStates).some(Boolean) || urlValidation.isValidating;

  const handleFileSelect = async (file: File) => {
    setError(null);
    setUploadStates({ validating: false, uploading: false, processing: false, complete: false });
    
    try {
      // Etapa 1: Validação inicial
      setUploadStates(prev => ({ ...prev, validating: true }));
      
      if (!file.type.startsWith('image/')) {
        throw new Error('Por favor, selecione apenas arquivos de imagem.');
      }
      
      if (file.size > maxSize * 1024 * 1024) {
        throw new Error(`O arquivo deve ter menos que ${maxSize}MB.`);
      }
      
      // Etapa 2: Criar preview local
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
      setUploadStates(prev => ({ ...prev, validating: false, uploading: true }));
      
      // Etapa 3: Upload da imagem
      const uploadedUrl = await onImageUpload(file);
      setUploadStates(prev => ({ ...prev, uploading: false, processing: true }));
      
      // Etapa 4: Validar URL uploadada
      const validation = await validateImageUrl(uploadedUrl, {
        maxSize: maxSize * 1024 * 1024,
        timeout: 5000
      });
      
      if (!validation.isValid) {
        throw new Error(validation.error || 'URL da imagem não é válida');
      }
      
      // Etapa 5: Finalizar
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(uploadedUrl);
      onImageChange(uploadedUrl);
      setUploadStates(prev => ({ ...prev, processing: false, complete: true }));
      
      // Reset estado de sucesso após 2 segundos
      setTimeout(() => {
        setUploadStates(prev => ({ ...prev, complete: false }));
      }, 2000);
      
    } catch (uploadError) {
      console.error('Erro no processo de upload:', uploadError);
      setError(uploadError instanceof Error ? uploadError.message : 'Erro ao fazer upload da imagem. Tente novamente.');
      
      // Reverter para estado anterior
      setPreviewUrl(currentImage);
      setUploadStates({ validating: false, uploading: false, processing: false, complete: false });
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    
    if (disabled) return;
    
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(undefined);
    onImageChange(undefined);
    setError(null);
    setUploadStates({ validating: false, uploading: false, processing: false, complete: false });
    setUrlValidation({ isValidating: false, isValid: true });
    
    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Função para validar URL externa
  const handleValidateExternalUrl = async (url: string) => {
    if (!url.trim()) {
      setUrlValidation({ isValidating: false, isValid: true });
      return;
    }
    
    setUrlValidation({ isValidating: true, isValid: false });
    
    try {
      const validation = await validateImageUrl(url, {
        maxSize: maxSize * 1024 * 1024,
        timeout: 8000
      });
      
      setUrlValidation({
        isValidating: false,
        isValid: validation.isValid,
        message: validation.error || (validation.isValid ? 'URL válida!' : undefined)
      });
      
      if (validation.isValid) {
        setPreviewUrl(url);
        onImageChange(url);
        setError(null);
      } else {
        setError(validation.error || 'URL da imagem não é válida');
      }
      
    } catch (validationError) {
      console.error('Erro na validação da URL:', validationError);
      setUrlValidation({
        isValidating: false,
        isValid: false,
        message: 'Erro ao validar URL'
      });
      setError('Erro ao validar URL da imagem');
    }
  };

  const handleClickUpload = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      <div
        className={`relative border-2 border-dashed rounded-lg transition-all ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClickUpload}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          disabled={disabled || isAnyLoading}
          className="hidden"
        />
        
        {previewUrl ? (
          <div className="relative group">
            <div className="p-4 flex items-center justify-center min-h-[120px]">
              <div className="relative">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  width={100}
                  height={100}
                  className={`rounded-lg object-cover shadow-sm transition-all ${
                    isAnyLoading ? 'opacity-70' : 'opacity-100'
                  }`}
                  loading="lazy"
                  onError={() => {
                    setError('Erro ao carregar imagem');
                    setPreviewUrl(undefined);
                    setUploadStates({ validating: false, uploading: false, processing: false, complete: false });
                  }}
                />
                
                {/* Overlay de estados de loading */}
                {isAnyLoading && (
                  <div className="absolute inset-0 bg-black bg-opacity-60 rounded-lg flex flex-col items-center justify-center text-white text-xs">
                    <Loader className="h-6 w-6 animate-spin mb-2" />
                    <span className="font-medium">
                      {uploadStates.validating && 'Validando...'}
                      {uploadStates.uploading && 'Enviando...'}
                      {uploadStates.processing && 'Processando...'}
                      {urlValidation.isValidating && 'Verificando URL...'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Barra de progresso visual */}
            {isAnyLoading && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300 animate-pulse"
                  style={{
                    width: uploadStates.validating ? '25%' : 
                           uploadStates.uploading ? '50%' : 
                           uploadStates.processing ? '75%' : 
                           urlValidation.isValidating ? '60%' : '100%'
                  }}
                />
              </div>
            )}
            
            {/* Botão de remover */}
            {!isAnyLoading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage();
                }}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            {/* Indicadores de estado */}
            <div className="absolute top-2 left-2 flex space-x-1">
              {uploadStates.complete && (
                <div className="bg-green-600 text-white rounded-full p-1 shadow-lg animate-pulse">
                  <Check className="h-4 w-4" />
                </div>
              )}
              
              {error && (
                <div className="bg-red-600 text-white rounded-full p-1 shadow-lg">
                  <AlertCircle className="h-4 w-4" />
                </div>
              )}
              
              {urlValidation.isValid && previewUrl && !isAnyLoading && !error && (
                <div className="bg-blue-600 text-white rounded-full p-1 shadow-lg">
                  <Eye className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="flex flex-col items-center space-y-3">
              {isAnyLoading ? (
                <>
                  <div className="relative">
                    <Loader className="h-12 w-12 text-blue-500 animate-spin" />
                    {/* Círculo de progresso */}
                    <div className="absolute inset-0 rounded-full border-4 border-blue-100">
                      <div 
                        className="rounded-full border-4 border-blue-500 transition-all duration-300"
                        style={{
                          transform: `rotate(${
                            uploadStates.validating ? '90deg' : 
                            uploadStates.uploading ? '180deg' : 
                            uploadStates.processing ? '270deg' : 
                            urlValidation.isValidating ? '225deg' : '360deg'
                          })`,
                          borderTopColor: 'transparent',
                          borderRightColor: 'transparent',
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-blue-600 font-medium">
                      {uploadStates.validating && 'Validando arquivo...'}
                      {uploadStates.uploading && 'Enviando imagem...'}
                      {uploadStates.processing && 'Processando...'}
                      {urlValidation.isValidating && 'Verificando URL...'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Por favor, aguarde
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center relative">
                    <FileImage className={`h-12 w-12 transition-colors ${
                      dragOver ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                    <Upload className={`h-6 w-6 -ml-2 -mt-2 transition-all ${
                      dragOver ? 'text-blue-500 scale-110' : 'text-gray-400'
                    }`} />
                    
                    {/* Animação de bounce no hover */}
                    {dragOver && (
                      <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-75" />
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <p className={`text-sm font-medium transition-colors ${
                      dragOver ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      Clique para selecionar ou arraste uma imagem
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF até {maxSize}MB
                    </p>
                    
                    {/* Dica adicional */}
                    <p className="text-xs text-blue-600 mt-2">
                      💡 Imagens quadradas ficam melhores no certificado
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Mensagens de erro e sucesso */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3 flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Erro no upload</p>
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {uploadStates.complete && !error && (
        <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-3 flex items-center space-x-2">
          <Check className="h-4 w-4 flex-shrink-0" />
          <p><span className="font-medium">Sucesso!</span> Imagem carregada e validada.</p>
        </div>
      )}
      
      {/* Status da validação de URL */}
      {urlValidation.message && (
        <div className={`text-sm rounded-md p-2 flex items-center space-x-2 ${
          urlValidation.isValid 
            ? 'text-green-600 bg-green-50 border border-green-200'
            : 'text-amber-600 bg-amber-50 border border-amber-200'
        }`}>
          {urlValidation.isValidating ? (
            <Loader className="h-4 w-4 animate-spin flex-shrink-0" />
          ) : urlValidation.isValid ? (
            <Check className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          <p>{urlValidation.message}</p>
        </div>
      )}
      
      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 <strong>Dicas:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Imagens quadradas (1:1) ficam melhores no certificado</li>
          <li>Use fundo transparente (PNG) para melhor integração</li>
          <li>Resolução mínima recomendada: 200x200px</li>
          <li>URLs do Cloudinary são automaticamente otimizadas</li>
        </ul>
      </div>
    </div>
  );
};
