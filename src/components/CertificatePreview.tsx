'use client';

import React from 'react';
import Image from 'next/image';
import { CertificateConfigData } from '@/lib/schemas';
import { CertificateConfig } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPageDimensions } from '@/lib/page-utils';

interface CertificatePreviewProps {
  config: CertificateConfigData | CertificateConfig;
  eventName?: string;
  participantName?: string;
  eventDate?: Date;
  eventStartTime?: Date;
  eventEndTime?: Date;
  className?: string;
}

export const CertificatePreview: React.FC<CertificatePreviewProps> = ({
  config,
  eventName = 'Nome do Evento',
  participantName = 'Nome do Participante',
  eventDate = new Date(),
  eventStartTime = new Date(),
  eventEndTime = new Date(),
  className = ''
}) => {
  const formatPosition = (position: { x: number; y: number }) => ({
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: 'translate(-50%, -50%)',
  });

  const replaceVariables = (text: string) => {
    const formattedDate = format(eventDate, 'dd \'de\' MMMM \'de\' yyyy', { locale: ptBR });
    const formattedStartTime = format(eventStartTime, 'HH:mm', { locale: ptBR });
    const formattedEndTime = format(eventEndTime, 'HH:mm', { locale: ptBR });
    const formattedTimeRange = `${formattedStartTime} às ${formattedEndTime}`;
    
    return text
      .replace(/{userName}/g, participantName)
      .replace(/{eventName}/g, eventName)
      .replace(/{eventDate}/g, formattedDate)
      .replace(/{eventTime}/g, formattedTimeRange)
      .replace(/{eventStartTime}/g, formattedStartTime)
      .replace(/{eventEndTime}/g, formattedEndTime);
  };

  const isLandscape = config.orientation === 'landscape';
  const pageSize = config.pageSize || 'A4';
  const dimensions = getPageDimensions(pageSize, config.orientation);
  
  // Calcular aspect ratio baseado nas dimensões reais
  const aspectRatio = dimensions.certificateWidth / dimensions.certificateHeight;

  return (
    <div className={`certificate-preview ${className}`}>
      <div 
        className="relative border mx-auto bg-white"
        style={{
          width: '100%',
          maxWidth: isLandscape ? '800px' : '600px', // Limite máximo para preview
          aspectRatio: aspectRatio.toString(),
          backgroundColor: config.backgroundColor,
          borderColor: config.showBorder ? config.borderColor : 'transparent',
          borderWidth: config.showBorder ? `${config.borderWidth}px` : '0',
          fontFamily:
            config.fontFamily === 'helvetica'
              ? 'system-ui, -apple-system, Arial, sans-serif'
              : config.fontFamily === 'times'
              ? 'Times, serif'
              : config.fontFamily === 'courier'
              ? 'Courier, monospace'
              : 'Arial, sans-serif',
          // Adicionar imagem de fundo se existir
          ...(config.backgroundImageUrl && {
            backgroundImage: `url(${config.backgroundImageUrl})`,
            backgroundSize: config.backgroundImageSize,
            backgroundPosition: config.backgroundImagePosition,
            backgroundRepeat: 'no-repeat',
          }),
        }}
      >
        {/* Overlay para opacidade da imagem de fundo */}
        {config.backgroundImageUrl && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: config.backgroundColor,
              opacity: 1 - (config.backgroundImageOpacity || 0.3),
            }}
          />
        )}
        {/* Watermark */}
        {config.showWatermark && config.template !== 'blank' && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              opacity: config.watermarkOpacity,
              color: config.secondaryColor,
            }}
          >
            <span 
              className="font-bold transform -rotate-45 select-none"
              style={{
                fontSize: `${config.titleFontSize * 2}px`,
                // 🔧 CORREÇÃO: Aplicar estilos específicos do template para watermark
                ...(config.template === 'classic' ? {
                  fontFamily: 'serif',
                  fontWeight: 'bold'
                } : {}),
                ...(config.template === 'elegant' ? {
                  fontFamily: 'serif',
                  fontStyle: 'italic',
                  fontWeight: '300'
                } : {}),
              }}
            >
              {config.watermarkText}
            </span>
          </div>
        )}

        {/* Logo */}
        {config.logoUrl && (
          <div
            className="absolute"
            style={{
              ...formatPosition(config.logoPosition),
              width: `${config.logoSize}px`,
              height: `${config.logoSize}px`,
            }}
          >
            <div className="relative w-full h-full">
              <Image
                src={config.logoUrl}
                alt="Logo do certificado"
                fill
                className="object-contain drop-shadow-sm"
                sizes={`${config.logoSize}px`}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  console.warn('Erro ao carregar logo:', config.logoUrl);
                }}
                onLoad={() => {
                  console.log('Logo carregada com sucesso:', config.logoUrl);
                }}
              />
            </div>
          </div>
        )}

        {/* Title */}
        <div
          className="absolute text-center font-bold"
          style={{
            ...formatPosition(config.titlePosition),
            fontSize: `${config.titleFontSize}px`,
            color: config.primaryColor,
            width: '80%',
            // 🔧 CORREÇÃO: Aplicar estilos específicos do template para títulos
            ...(config.template === 'classic' ? {
              fontFamily: 'serif',
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
            } : {}),
            ...(config.template === 'elegant' ? {
              fontFamily: 'serif',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
            } : {}),
            ...(config.template === 'modern' ? {
              fontFamily: 'sans-serif',
              letterSpacing: '1px'
            } : {}),
            ...(config.template === 'minimalist' ? {
              fontFamily: 'sans-serif',
              fontWeight: '300'
            } : {}),
            ...(config.template === 'blank' ? {
              fontFamily: 'sans-serif',
              fontWeight: '400'
            } : {}),
          }}
        >
          {config.title}
        </div>

        {/* Subtitle */}
        {config.subtitle && (
          <div
            className="absolute text-center"
            style={{
              ...formatPosition({
                x: config.titlePosition.x,
                y: config.titlePosition.y + 8
              }),
              fontSize: `${config.titleFontSize * 0.6}px`,
              color: config.secondaryColor,
              width: '70%',
            }}
          >
            {config.subtitle}
          </div>
        )}

        {/* Participant Name */}
        <div
          className="absolute text-center font-semibold"
          style={{
            ...formatPosition(config.namePosition),
            fontSize: `${config.nameFontSize}px`,
            color: config.primaryColor,
            width: '80%',
            // 🔧 CORREÇÃO: Aplicar estilos específicos do template para consistência com PDF
            ...(config.template === 'classic' || config.template === 'elegant' ? {
              textDecoration: 'underline',
              textDecorationColor: config.borderColor,
              textDecorationThickness: '2px',
              textUnderlineOffset: '4px'
            } : {}),
          }}
        >
          {participantName}
        </div>

        {/* Body Text */}
        <div
          className="absolute text-center"
          style={{
            ...formatPosition(config.bodyPosition),
            fontSize: `${config.bodyFontSize}px`,
            color: config.secondaryColor,
            width: '80%',
            lineHeight: '1.5',
          }}
        >
          {replaceVariables(config.bodyText)}
        </div>

        {/* Footer */}
        {config.footer && (
          <div
            className="absolute text-center"
            style={{
              ...formatPosition({
                x: config.bodyPosition.x,
                y: config.bodyPosition.y + 15
              }),
              fontSize: `${config.bodyFontSize * 0.9}px`,
              color: config.secondaryColor,
              width: '70%',
            }}
          >
            {config.footer}
          </div>
        )}

        {/* QR Code */}
        {config.includeQRCode && config.qrCodeText && (
          <div
            className="absolute"
            style={{
              ...formatPosition(config.qrCodePosition),
              width: '60px',
              height: '60px',
            }}
          >
            {/* QR Code placeholder - In production, use a real QR code generator */}
            <div 
              className="w-full h-full border-2 flex items-center justify-center text-xs text-center"
              style={{ 
                borderColor: config.secondaryColor,
                color: config.secondaryColor 
              }}
            >
              QR<br/>CODE
            </div>
          </div>
        )}

        {/* Template-specific decorations */}
        {config.template === 'elegant' && (
          <>
            {/* Decorative corners */}
            <div 
              className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2"
              style={{ borderColor: config.primaryColor }}
            />
            <div 
              className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2"
              style={{ borderColor: config.primaryColor }}
            />
            <div 
              className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2"
              style={{ borderColor: config.primaryColor }}
            />
            <div 
              className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2"
              style={{ borderColor: config.primaryColor }}
            />
          </>
        )}

        {config.template === 'classic' && (
          <>
            {/* Classic border decoration */}
            <div 
              className="absolute top-2 left-2 right-2 bottom-2 border"
              style={{ 
                borderColor: config.primaryColor,
                borderWidth: '1px',
              }}
            />
          </>
        )}

        {config.template === 'modern' && (
          <>
            {/* Modern accent line */}
            <div 
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: config.primaryColor }}
            />
            <div 
              className="absolute bottom-0 left-0 right-0 h-1"
              style={{ backgroundColor: config.primaryColor }}
            />
          </>
        )}

        {/* Template "blank" - sem decorações, ideal para imagens de fundo */}
      </div>
    </div>
  );
};


