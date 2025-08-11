'use client';

import React from 'react';
import { CertificateConfigData } from '@/lib/schemas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CertificatePreviewProps {
  config: CertificateConfigData;
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

  return (
    <div className={`certificate-preview ${className}`}>
      <div 
        className={`relative border mx-auto bg-white ${
          isLandscape ? 'w-full aspect-[4/3]' : 'w-3/4 aspect-[3/4]'
        }`}
        style={{
          backgroundColor: config.backgroundColor,
          borderColor: config.showBorder ? config.borderColor : 'transparent',
          borderWidth: config.showBorder ? `${config.borderWidth}px` : '0',
          fontFamily: config.fontFamily === 'helvetica' 
            ? 'system-ui, -apple-system, sans-serif' 
            : config.fontFamily === 'times' 
            ? 'Times, serif' 
            : 'Courier, monospace',
        }}
      >
        {/* Watermark */}
        {config.showWatermark && (
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
            <img
              src={config.logoUrl}
              alt="Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
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
      </div>
    </div>
  );
};

// Wrapper component for the preview with controls
export const CertificatePreviewWithControls: React.FC<CertificatePreviewProps & {
  onExportPreview?: () => void;
  onToggleFullscreen?: () => void;
}> = ({ 
  config, 
  eventName, 
  participantName, 
  eventDate, 
  eventStartTime,
  eventEndTime,
  onExportPreview,
  onToggleFullscreen,
  className 
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preview Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Preview do Certificado
        </h3>
        <div className="flex space-x-2">
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="btn-outline text-sm"
            >
              Ver em Tela Cheia
            </button>
          )}
          {onExportPreview && (
            <button
              onClick={onExportPreview}
              className="btn-primary text-sm"
            >
              Exportar Preview
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <CertificatePreview
          config={config}
          eventName={eventName}
          participantName={participantName}
          eventDate={eventDate}
          eventStartTime={eventStartTime}
          eventEndTime={eventEndTime}
        />
      </div>

      {/* Preview Info */}
      <div className="text-sm text-gray-600 space-y-1">
        <p><strong>Template:</strong> {config.template}</p>
        <p><strong>Orientação:</strong> {config.orientation === 'landscape' ? 'Paisagem' : 'Retrato'}</p>
        <p><strong>Fonte:</strong> {config.fontFamily}</p>
        <p><strong>Cor principal:</strong> <span className="inline-block w-4 h-4 rounded border ml-1" style={{ backgroundColor: config.primaryColor }} /></p>
      </div>
    </div>
  );
};
