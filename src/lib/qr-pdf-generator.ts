'use client';

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { Event } from '@/types';
import { sanitizeTextForPDF, sanitizeFileName } from './text-utils';
import { formatTimeBrazil } from '@/lib/date-utils';

export interface QRCodePDFOptions {
  event: Event;
  qrCodeUrl: string;
  baseUrl: string;
}

export const generateQRCodePDF = async ({ event, qrCodeUrl, baseUrl }: QRCodePDFOptions): Promise<Uint8Array> => {
  try {
    // Criar documento PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size in points

    // Carregar fontes
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Dimensões da página
    const { width, height } = page.getSize();
    const margin = 50;
    const centerX = width / 2;

    // Gerar QR Code como imagem
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Converter data URL para bytes
    const base64Data = qrCodeDataUrl.split(',')[1];
    if (!base64Data) {
      throw new Error('QR Code inválido');
    }
    const qrCodeImageBytes = Uint8Array.from(
      atob(base64Data),
      (c) => c.charCodeAt(0)
    );

    // Embedar a imagem do QR Code
    const qrCodeImage = await pdfDoc.embedPng(qrCodeImageBytes);
    const qrCodeSize = 250;

    // Título principal
    page.drawText('CHECK-IN DO EVENTO', {
      x: centerX - 120,
      y: height - 80,
      size: 24,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.8),
    });

    // Nome do evento
    const sanitizedEventName = sanitizeTextForPDF(event.name);
    page.drawText(sanitizedEventName, {
      x: centerX - (sanitizedEventName.length * 6),
      y: height - 120,
      size: 20,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Informações do evento com fuso horário correto
    const eventDate = new Date(event.date).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Sao_Paulo'
    });

    const eventTime = `${formatTimeBrazil(new Date(event.startTime))} - ${formatTimeBrazil(new Date(event.endTime))}`;

    // Data
    page.drawText(`Data: ${eventDate}`, {
      x: margin,
      y: height - 170,
      size: 14,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Horário
    page.drawText(`Horario: ${eventTime}`, {
      x: margin,
      y: height - 195,
      size: 14,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Local
    const sanitizedLocation = sanitizeTextForPDF(event.location);
    page.drawText(`Local: ${sanitizedLocation}`, {
      x: margin,
      y: height - 220,
      size: 14,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    // QR Code
    page.drawImage(qrCodeImage, {
      x: centerX - qrCodeSize / 2,
      y: height - 500,
      width: qrCodeSize,
      height: qrCodeSize,
    });

    // Instruções
    page.drawText('INSTRUÇÕES PARA CHECK-IN:', {
      x: margin,
      y: height - 550,
      size: 16,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.8),
    });

    const instructions = [
      '1. Escaneie este QR Code com a câmera do seu celular',
      '2. Acesse o link que será aberto no navegador',
      '3. Faça login com sua conta (se ainda não estiver logado)',
      '4. Seu check-in será processado automaticamente',
      '5. Você receberá uma confirmação na tela'
    ];

    instructions.forEach((instruction, index) => {
      page.drawText(instruction, {
        x: margin,
        y: height - 580 - (index * 25),
        size: 12,
        font: regularFont,
        color: rgb(0.1, 0.1, 0.1),
      });
    });

    // Notas importantes
    page.drawText('IMPORTANTE:', {
      x: margin,
      y: height - 720,
      size: 14,
      font: boldFont,
      color: rgb(0.8, 0.2, 0.2),
    });

    page.drawText('• Você precisa estar inscrito no evento para fazer check-in', {
      x: margin,
      y: height - 745,
      size: 11,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText('• Check-in ficará disponível a qualquer momento antes do início', {
      x: margin,
      y: height - 765,
      size: 11,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText('• Em caso de dúvidas, procure a organização do evento', {
      x: margin,
      y: height - 785,
      size: 11,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    // URL do evento (para referência)
    page.drawText(`Link: ${baseUrl}/checkin/${event.id}`, {
      x: margin,
      y: 40,
      size: 10,
      font: regularFont,
      color: rgb(0.6, 0.6, 0.6),
    });

    // Serializar o PDF
    return await pdfDoc.save();
  } catch (error) {
    console.error('Erro ao gerar PDF do QR Code:', error);
    
    // Erro mais específico baseado no tipo de erro
    if (error instanceof Error) {
      if (error.message.includes('encode')) {
        throw new Error('Erro de codificação de caracteres. Verifique se o nome do evento e local não contêm caracteres especiais.');
      } else if (error.message.includes('QR Code')) {
        throw new Error('Erro ao gerar o QR Code. Tente novamente.');
      }
      throw new Error(`Erro ao gerar PDF: ${error.message}`);
    }
    
    throw new Error('Erro interno ao gerar PDF. Tente novamente ou entre em contato com o suporte.');
  }
};

export const downloadQRCodePDF = async ({ event, qrCodeUrl, baseUrl }: QRCodePDFOptions) => {
  try {
    const pdfBytes = await generateQRCodePDF({ event, qrCodeUrl, baseUrl });
    
    // Criar blob e download
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    // Criar elemento de download
    const a = document.createElement('a');
    a.href = url;
    const fileName = sanitizeFileName(`qr-code-checkin-${event.name}`);
    a.download = `${fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Erro ao fazer download do PDF:', error);
    throw error;
  }
};
