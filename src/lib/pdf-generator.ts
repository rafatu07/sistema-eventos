import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface CertificateData {
  userName: string;
  eventName: string;
  eventDate: Date;
}

export const generateCertificatePDF = async (data: CertificateData): Promise<Uint8Array> => {
  // Create a new PDFDocument
  const pdfDoc = await PDFDocument.create();
  
  // Add a page
  const page = pdfDoc.addPage([842, 595]); // A4 landscape
  const { width, height } = page.getSize();
  
  // Embed fonts
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // Colors
  const darkBlue = rgb(0.1, 0.2, 0.5);
  const gold = rgb(0.8, 0.7, 0.2);
  const black = rgb(0, 0, 0);
  
  // Draw border
  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: darkBlue,
    borderWidth: 3,
  });
  
  page.drawRectangle({
    x: 40,
    y: 40,
    width: width - 80,
    height: height - 80,
    borderColor: gold,
    borderWidth: 1,
  });
  
  // Title
  page.drawText('CERTIFICADO DE PARTICIPAÇÃO', {
    x: width / 2 - 200,
    y: height - 120,
    size: 28,
    font: timesRomanBoldFont,
    color: darkBlue,
  });
  
  // Subtitle
  page.drawText('Certificamos que', {
    x: width / 2 - 80,
    y: height - 180,
    size: 16,
    font: timesRomanFont,
    color: black,
  });
  
  // User name
  page.drawText(data.userName, {
    x: width / 2 - (data.userName.length * 12) / 2,
    y: height - 230,
    size: 24,
    font: timesRomanBoldFont,
    color: darkBlue,
  });
  
  // Event participation text
  page.drawText('participou do evento', {
    x: width / 2 - 90,
    y: height - 280,
    size: 16,
    font: timesRomanFont,
    color: black,
  });
  
  // Event name
  page.drawText(data.eventName, {
    x: width / 2 - (data.eventName.length * 10) / 2,
    y: height - 330,
    size: 20,
    font: timesRomanBoldFont,
    color: darkBlue,
  });
  
  // Event date
  const formattedDate = data.eventDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  
  page.drawText(`realizado em ${formattedDate}`, {
    x: width / 2 - 120,
    y: height - 380,
    size: 14,
    font: timesRomanFont,
    color: black,
  });
  
  // Footer
  const currentDate = new Date().toLocaleDateString('pt-BR');
  page.drawText(`Certificado emitido em ${currentDate}`, {
    x: width / 2 - 100,
    y: 80,
    size: 10,
    font: helveticaFont,
    color: black,
  });
  
  // Decorative elements
  page.drawCircle({
    x: 100,
    y: height - 200,
    size: 30,
    borderColor: gold,
    borderWidth: 2,
  });
  
  page.drawCircle({
    x: width - 100,
    y: height - 200,
    size: 30,
    borderColor: gold,
    borderWidth: 2,
  });
  
  // Serialize the PDFDocument to bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

