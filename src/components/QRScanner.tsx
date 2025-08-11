'use client';

import React, { useRef, useEffect, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Camera, X, RotateCcw } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
  isActive: boolean;
}

export default function QRScanner({ onScan, onClose, isActive }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    if (!isActive || !videoRef.current) return;

    const video = videoRef.current;
    setIsLoading(true);
    setError(null);

    // Verificar se há câmeras disponíveis
    QrScanner.hasCamera().then(hasCamera => {
      setHasCamera(hasCamera);
      if (!hasCamera) {
        setError('Nenhuma câmera encontrada no dispositivo');
        setIsLoading(false);
        return;
      }

      // Criar scanner
      const scanner = new QrScanner(
        video,
        (result) => {
          onScan(result.data);
          scanner.stop();
        },
        {
          preferredCamera: facingMode,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          returnDetailedScanResult: true,
        }
      );

      scannerRef.current = scanner;

      // Iniciar scanner
      scanner.start().then(() => {
        setIsLoading(false);
      }).catch((err) => {
        console.error('Erro ao iniciar câmera:', err);
        setError('Erro ao acessar a câmera. Verifique as permissões.');
        setIsLoading(false);
      });
    }).catch((err) => {
      console.error('Erro ao verificar câmeras:', err);
      setError('Erro ao verificar câmeras disponíveis');
      setIsLoading(false);
    });

    // Cleanup
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [isActive, facingMode, onScan]);

  const switchCamera = async () => {
    if (scannerRef.current) {
      try {
        setIsLoading(true);
        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        await scannerRef.current.setCamera(newFacingMode);
        setFacingMode(newFacingMode);
        setIsLoading(false);
      } catch (err) {
        console.error('Erro ao trocar câmera:', err);
        setIsLoading(false);
      }
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black text-white">
        <h3 className="text-lg font-semibold">Scanner QR Code</h3>
        <div className="flex gap-2">
          {hasCamera && (
            <button
              onClick={switchCamera}
              disabled={isLoading}
              className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
              title="Trocar câmera"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-800 hover:bg-gray-700"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 relative flex items-center justify-center">
        {error ? (
          <div className="text-center text-white p-6">
            <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Erro ao acessar câmera</p>
            <p className="text-sm opacity-75">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="max-w-full max-h-full object-contain"
              playsInline
              muted
            />
            
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Iniciando câmera...</p>
                </div>
              </div>
            )}

            {/* Scan Frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-64 h-64 border-2 border-white border-opacity-50 rounded-lg">
                {/* Corner indicators */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="p-6 bg-black text-white text-center">
        <p className="text-sm opacity-75">
          Posicione o QR Code dentro do quadro para fazer o check-in
        </p>
      </div>
    </div>
  );
}

// Exportação para lazy loading
export { QRScanner };
