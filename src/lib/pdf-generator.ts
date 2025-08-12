import { PDFDocument, rgb, StandardFonts, degrees, PDFFont } from 'pdf-lib';
import { sanitizeTextForPDF } from './text-utils';
import { CertificateConfig } from '@/types';
import { getCertificateConfig, getDefaultCertificateConfig } from './certificate-config';

export interface CertificateData {
  userName: string;
  eventName: string;
  eventDate: Date;
  eventStartTime?: Date;
  eventEndTime?: Date;
  eventId?: string;
  config?: CertificateConfig;
}

export const generateCertificatePDF = async (data: CertificateData): Promise<Uint8Array> => {
  try {
    const debugMode = process.env.PDF_DEBUG_MODE === 'true';
    const forceAscii = process.env.FORCE_ASCII_PDF === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (debugMode) {
      console.log('🚀 Starting PDF generation for event:', data.eventId);
      console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
      console.log('🛠️  Debug mode:', debugMode);
      console.log('🔤 Force ASCII:', forceAscii);
      console.log('👤 User name:', JSON.stringify(data.userName));
      console.log('📅 Event name:', JSON.stringify(data.eventName));
    }
    
    // Get configuration
    let config = data.config;
    if (!config && data.eventId) {
      console.log('Fetching certificate config for event:', data.eventId);
      const configResult = await getCertificateConfig(data.eventId);
      config = configResult || undefined;
      console.log('Retrieved config:', configResult ? 'Found' : 'Not found');
    }
    if (!config) {
      console.log('Using default configuration');
      // Use default configuration
      const defaultConfigData = getDefaultCertificateConfig(data.eventId || 'default', 'system');
      config = {
        id: 'default',
        ...defaultConfigData,
      } as CertificateConfig;
    }
    
    // Ensure config is not null/undefined for TypeScript
    if (!config) {
      throw new Error('Unable to load certificate configuration');
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();

    // Set PDF metadata (if methods are available)
    try {
      if (pdfDoc.setTitle) pdfDoc.setTitle('Certificado de Participação');
      if (pdfDoc.setSubject) pdfDoc.setSubject(`Certificado para ${data.userName}`);
      if (pdfDoc.setProducer) pdfDoc.setProducer('Sistema de Eventos');
      if (pdfDoc.setLanguage) pdfDoc.setLanguage('pt-BR');
    } catch (metadataError) {
      console.log('Alguns metadados não puderam ser definidos:', metadataError);
    }

    // Determine page size based on orientation
    const isLandscape = config.orientation === 'landscape';
    const pageSize: [number, number] = isLandscape ? [842, 595] : [595, 842]; // A4
    const page = pdfDoc.addPage(pageSize);
    const { width, height } = page.getSize();

    // Embed fonts - Forçar uso apenas de Helvetica para máxima compatibilidade
    let normalFont, boldFont;
    
    try {
      console.log('🔤 Carregando fontes Helvetica para máxima compatibilidade...');
      console.log('🌍 Ambiente de produção:', process.env.NODE_ENV === 'production');
      
      // Usar apenas Helvetica que tem melhor suporte a caracteres básicos
      // Em produção, força configurações ainda mais específicas
      if (process.env.NODE_ENV === 'production') {
        console.log('🏭 Modo produção: configurações conservadoras para fontes');
      }
      
      normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      console.log('✅ Fontes Helvetica carregadas com sucesso');
      console.log('📚 Fonte normal:', normalFont.name);
      console.log('📚 Fonte bold:', boldFont.name);
      
    } catch (fontError) {
      console.error('❌ Erro crítico ao carregar fontes:', fontError);
      throw new Error(`Erro ao carregar fontes do PDF: ${fontError}`);
    }

    // Parse colors from hex
    const parseColor = (hex: string) => {
      const r = parseInt(hex.substring(1, 3), 16) / 255;
      const g = parseInt(hex.substring(3, 5), 16) / 255;
      const b = parseInt(hex.substring(5, 7), 16) / 255;
      return rgb(r, g, b);
    };

    const primaryColor = parseColor(config.primaryColor);
    const secondaryColor = parseColor(config.secondaryColor);
    const backgroundColor = parseColor(config.backgroundColor);
    const borderColor = parseColor(config.borderColor);

    // Set background color
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: backgroundColor,
    });

    // Draw border if enabled
    if (config.showBorder) {
      page.drawRectangle({
        x: config.borderWidth,
        y: config.borderWidth,
        width: width - config.borderWidth * 2,
        height: height - config.borderWidth * 2,
        borderColor: borderColor,
        borderWidth: config.borderWidth,
      });
    }

    // Add template-specific decorations
    if (config.template === 'elegant') {
      // Decorative corners
      const cornerSize = 30;
      const cornerOffset = 20;
      
      // Top-left corner
      page.drawLine({
        start: { x: cornerOffset, y: height - cornerOffset },
        end: { x: cornerOffset + cornerSize, y: height - cornerOffset },
        thickness: 2,
        color: primaryColor,
      });
      page.drawLine({
        start: { x: cornerOffset, y: height - cornerOffset },
        end: { x: cornerOffset, y: height - cornerOffset - cornerSize },
        thickness: 2,
        color: primaryColor,
      });

      // Other corners...
    } else if (config.template === 'modern') {
      // Modern accent lines
      page.drawRectangle({
        x: 0,
        y: height - 10,
        width,
        height: 10,
        color: primaryColor,
      });
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height: 10,
        color: primaryColor,
      });
    }

    // Helper function to calculate position from percentage
    const getPosition = (pos: { x: number; y: number }) => ({
      x: (width * pos.x) / 100,
      y: height - (height * pos.y) / 100, // Invert Y axis
    });

    // Helper function to get text width for centering
    const getTextWidth = (text: string, font: PDFFont, size: number) => {
      return font.widthOfTextAtSize(text, size);
    };

    // Title
    const titlePos = getPosition(config.titlePosition);
    const sanitizedTitle = sanitizeTextForPDF(config.title);
    if (debugMode) {
      console.log('📋 Título original:', JSON.stringify(config.title));
      console.log('🧹 Título sanitizado:', JSON.stringify(sanitizedTitle));
      console.log('🔤 Título códigos ASCII:', sanitizedTitle.split('').map(char => char.charCodeAt(0)).join(','));
      console.log('✅ Título apenas ASCII (32-126):', sanitizedTitle.split('').every(char => {
        const code = char.charCodeAt(0);
        return code >= 32 && code <= 126;
      }));
    }
    
    const titleWidth = getTextWidth(sanitizedTitle, boldFont, config.titleFontSize);
    page.drawText(sanitizedTitle, {
      x: titlePos.x - titleWidth / 2,
      y: titlePos.y,
      size: config.titleFontSize,
      font: boldFont,
      color: primaryColor,
    });
    console.log('✍️  Título renderizado no PDF:', titlePos.x, titlePos.y);

    // Subtitle (if provided)
    if (config.subtitle) {
      const subtitlePos = getPosition({
        x: config.titlePosition.x,
        y: config.titlePosition.y + 5,
      });
      const subtitleSize = config.titleFontSize * 0.6;
      const subtitleWidth = getTextWidth(config.subtitle, normalFont, subtitleSize);
      page.drawText(config.subtitle, {
        x: subtitlePos.x - subtitleWidth / 2,
        y: subtitlePos.y,
        size: subtitleSize,
        font: normalFont,
        color: secondaryColor,
      });
    }

    // Participant name
    const namePos = getPosition(config.namePosition);
    const sanitizedUserName = sanitizeTextForPDF(data.userName);
    if (debugMode) {
      console.log('🏷️  Nome original:', JSON.stringify(data.userName));
      console.log('🧹 Nome sanitizado:', JSON.stringify(sanitizedUserName));
      console.log('🔤 Nome códigos ASCII:', sanitizedUserName.split('').map(char => char.charCodeAt(0)).join(','));
      console.log('✅ Nome apenas ASCII (32-126):', sanitizedUserName.split('').every(char => {
        const code = char.charCodeAt(0);
        return code >= 32 && code <= 126;
      }));
    }
    
    const nameWidth = getTextWidth(sanitizedUserName, boldFont, config.nameFontSize);
    page.drawText(sanitizedUserName, {
      x: namePos.x - nameWidth / 2,
      y: namePos.y,
      size: config.nameFontSize,
      font: boldFont,
      color: primaryColor,
    });
    console.log('✍️  Nome renderizado no PDF:', namePos.x, namePos.y);

    // Body text with variable replacement
    const bodyPos = getPosition(config.bodyPosition);
    const formattedDate = data.eventDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    // Format times if available
    const formattedStartTime = data.eventStartTime 
      ? data.eventStartTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '00:00';
    const formattedEndTime = data.eventEndTime 
      ? data.eventEndTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '00:00';
    const formattedTimeRange = `${formattedStartTime} às ${formattedEndTime}`;

    const bodyText = config.bodyText
      .replace(/{userName}/g, data.userName)
      .replace(/{eventName}/g, data.eventName)
      .replace(/{eventDate}/g, formattedDate)
      .replace(/{eventTime}/g, formattedTimeRange)
      .replace(/{eventStartTime}/g, formattedStartTime)
      .replace(/{eventEndTime}/g, formattedEndTime);

    const sanitizedBodyText = sanitizeTextForPDF(bodyText);
    console.log('📄 Texto do corpo original:', JSON.stringify(bodyText.substring(0, 100) + '...'));
    console.log('🧹 Texto do corpo sanitizado:', JSON.stringify(sanitizedBodyText.substring(0, 100) + '...'));
    console.log('🔤 Primeiros 20 códigos ASCII:', sanitizedBodyText.substring(0, 20).split('').map(char => char.charCodeAt(0)).join(','));
    console.log('✅ Corpo apenas ASCII (32-126):', sanitizedBodyText.split('').every(char => {
      const code = char.charCodeAt(0);
      return code >= 32 && code <= 126;
    }));
    console.log('📏 Tamanho do texto sanitizado:', sanitizedBodyText.length, 'caracteres');
    
    // Handle multiline text
    const maxWidth = width * 0.8;
    const words = sanitizedBodyText.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = getTextWidth(testLine, normalFont, config.bodyFontSize);
      
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Draw each line
    const lineHeight = config.bodyFontSize * 1.2;
    const totalTextHeight = lines.length * lineHeight;
    const startY = bodyPos.y + totalTextHeight / 2;

    lines.forEach((line, index) => {
      console.log(`✍️  Renderizando linha ${index + 1}: "${line}"`);
      const lineWidth = getTextWidth(line, normalFont, config.bodyFontSize);
      page.drawText(line, {
        x: bodyPos.x - lineWidth / 2,
        y: startY - index * lineHeight,
        size: config.bodyFontSize,
        font: normalFont,
        color: secondaryColor,
      });
    });
    console.log(`✅ ${lines.length} linhas renderizadas no PDF`);

    // Footer (if provided)
    if (config.footer) {
      const footerPos = getPosition({
        x: config.bodyPosition.x,
        y: config.bodyPosition.y + 15,
      });
      const footerSize = config.bodyFontSize * 0.9;
      const footerWidth = getTextWidth(config.footer, normalFont, footerSize);
      page.drawText(config.footer, {
        x: footerPos.x - footerWidth / 2,
        y: footerPos.y,
        size: footerSize,
        font: normalFont,
        color: secondaryColor,
      });
    }

    // Watermark (if enabled)
    if (config.showWatermark) {
      const watermarkText = sanitizeTextForPDF(config.watermarkText);
      const watermarkSize = config.titleFontSize * 2;
      const watermarkWidth = getTextWidth(watermarkText, boldFont, watermarkSize);
      
              page.drawText(watermarkText, {
          x: width / 2 - watermarkWidth / 2,
          y: height / 2 - watermarkSize / 2,
          size: watermarkSize,
          font: boldFont,
          color: rgb(
            secondaryColor.red * config.watermarkOpacity,
            secondaryColor.green * config.watermarkOpacity,
            secondaryColor.blue * config.watermarkOpacity
          ),
          rotate: degrees(-45),
        });
    }

    // QR Code placeholder (if enabled)
    if (config.includeQRCode && config.qrCodeText) {
      const qrPos = getPosition(config.qrCodePosition);
      const qrSize = 60;
      
      // Draw QR Code placeholder (rectangle with text)
      page.drawRectangle({
        x: qrPos.x - qrSize / 2,
        y: qrPos.y - qrSize / 2,
        width: qrSize,
        height: qrSize,
        borderColor: secondaryColor,
        borderWidth: 2,
      });
      
      page.drawText('QR', {
        x: qrPos.x - 10,
        y: qrPos.y + 5,
        size: 12,
        font: normalFont,
        color: secondaryColor,
      });
      
      page.drawText('CODE', {
        x: qrPos.x - 15,
        y: qrPos.y - 10,
        size: 10,
        font: normalFont,
        color: secondaryColor,
      });
    }

    // Logo (if provided)
    if (config.logoUrl) {
      try {
        // In a real implementation, you would fetch and embed the logo image
        // For now, we'll add a placeholder
        const logoPos = getPosition(config.logoPosition);
        page.drawRectangle({
          x: logoPos.x - config.logoSize / 2,
          y: logoPos.y - config.logoSize / 2,
          width: config.logoSize,
          height: config.logoSize,
          borderColor: secondaryColor,
          borderWidth: 1,
        });
      } catch (error) {
        console.warn('Failed to load logo:', error);
      }
    }

    // Generation timestamp
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const timestampText = `Certificado emitido em ${currentDate}`;
    page.drawText(timestampText, {
      x: 20,
      y: 20,
      size: 8,
      font: normalFont,
      color: secondaryColor,
    });

    // Serialize PDF with specific options (configurações para produção)
    console.log('💾 Salvando PDF com configurações específicas...');
    const isProduction = process.env.NODE_ENV === 'production';
    
    const saveOptions = {
      useObjectStreams: false, // Força compatibilidade com readers antigos
      addDefaultPage: false,   // Não adicionar página padrão extra
      // Em produção, usa configurações mais conservadoras
      ...(isProduction && {
        compress: false, // Desativa compressão que pode afetar encoding
        fastWebViewWidth: false, // Desativa otimização que pode causar problemas
      })
    };
    
    console.log('⚙️  Opções de salvamento PDF:', saveOptions);
    const pdfBytes = await pdfDoc.save(saveOptions);
    
    console.log('✅ PDF gerado com sucesso!');
    console.log('📊 Tamanho do PDF:', pdfBytes.length, 'bytes');
    console.log('📄 Total de páginas:', pdfDoc.getPageCount());
    console.log('🔤 Fontes usadas: Helvetica, HelveticaBold');
    
    return pdfBytes;

  } catch (error) {
    console.error('Erro ao gerar certificado PDF:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('encode')) {
        throw new Error('Erro de codificação de caracteres no certificado. Verifique se o nome do usuário e evento não contêm caracteres especiais.');
      }
      throw new Error(`Erro ao gerar certificado: ${error.message}`);
    }
    
    throw new Error('Erro interno ao gerar certificado. Tente novamente ou entre em contato com o suporte.');
  }
};

