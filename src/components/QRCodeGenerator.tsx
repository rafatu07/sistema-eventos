'use client';

import React from 'react';
import QRCode from 'react-qr-code';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  title?: string;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ 
  value, 
  size = 256, 
  title = 'QR Code' 
}) => {
  return (
    <div className="flex flex-col items-center space-y-4">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <QRCode
          value={value}
          size={size}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          viewBox={`0 0 ${size} ${size}`}
        />
      </div>
      <p className="text-sm text-gray-600 text-center max-w-xs">
        Escaneie este QR Code para acessar rapidamente o evento
      </p>
    </div>
  );
};

