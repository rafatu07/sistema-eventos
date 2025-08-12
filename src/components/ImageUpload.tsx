'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, FileImage, Loader, Check } from 'lucide-react';

interface ImageUploadProps {
  currentImage?: string;
  onImageChange: (imageUrl: string | undefined) => void;
  onImageUpload: (file: File) => Promise<string>;
  label?: string;
  accept?: string;
  maxSize?: number; // em MB
  className?: string;
  disabled?: boolean;
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
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentImage);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);
    
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas arquivos de imagem.');
      return;
    }
    
    // Validar tamanho
    if (file.size > maxSize * 1024 * 1024) {
      setError(`O arquivo deve ter menos que ${maxSize}MB.`);
      return;
    }
    
    // Criar preview local
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    
    try {
      setIsUploading(true);
      
      // Upload da imagem
      const uploadedUrl = await onImageUpload(file);
      
      // Limpar preview local e usar URL final
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(uploadedUrl);
      onImageChange(uploadedUrl);
      
    } catch (uploadError) {
      console.error('Erro no upload:', uploadError);
      setError('Erro ao fazer upload da imagem. Tente novamente.');
      
      // Reverter preview local
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(currentImage);
    } finally {
      setIsUploading(false);
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
    
    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
          disabled={disabled || isUploading}
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
                  className="rounded-lg object-cover shadow-sm"
                  onError={() => {
                    setError('Erro ao carregar imagem');
                    setPreviewUrl(undefined);
                  }}
                />
                
                {isUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                    <Loader className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Botão de remover */}
            {!isUploading && (
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
            
            {/* Indicador de sucesso */}
            {!isUploading && previewUrl === currentImage && (
              <div className="absolute top-2 left-2 bg-green-600 text-white rounded-full p-1 shadow-lg">
                <Check className="h-4 w-4" />
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="flex flex-col items-center space-y-3">
              {isUploading ? (
                <>
                  <Loader className="h-12 w-12 text-blue-500 animate-spin" />
                  <p className="text-sm text-blue-600 font-medium">
                    Fazendo upload...
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center">
                    <FileImage className="h-12 w-12 text-gray-400" />
                    <Upload className="h-6 w-6 text-gray-400 -ml-2 -mt-2" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">
                      Clique para selecionar ou arraste uma imagem
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF até {maxSize}MB
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}
      
      <div className="text-xs text-gray-500">
        Recomendado: imagens quadradas (1:1) ou com fundo transparente para melhor resultado
      </div>
    </div>
  );
};
