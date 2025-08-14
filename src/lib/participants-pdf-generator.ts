import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Event, Registration } from '@/types';
import { FormResponse, CustomFormConfig } from '@/types/custom-forms';

interface ParticipantData {
  registration: Registration;
  formResponse?: FormResponse;
}

interface ParticipantsPDFOptions {
  event: Event;
  participants: ParticipantData[];
  customForm?: CustomFormConfig;
}

const formatValue = (value: string | string[] | boolean | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return 'Não informado';
  }
  
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }
  
  return String(value);
};

const sanitizeFileName = (name: string): string => {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
};

export const generateParticipantsPDF = async ({ 
  event, 
  participants, 
  customForm 
}: ParticipantsPDFOptions): Promise<Uint8Array> => {
  try {
    console.log('Iniciando geração de PDF dos participantes...');
    
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const pageWidth = 595.28;  // A4 width
    const pageHeight = 841.89; // A4 height
    const margin = 50;
    const contentWidth = pageWidth - (2 * margin);
    
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;
    
    // Função auxiliar para adicionar nova página se necessário
    const checkPageSpace = (requiredSpace: number) => {
      if (yPosition - requiredSpace < margin) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }
    };
    
    // Função auxiliar para adicionar texto
    const addText = (text: string, size: number, textFont: typeof font | typeof boldFont, x: number = margin) => {
      currentPage.drawText(text, {
        x,
        y: yPosition,
        size,
        font: textFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= size + 5;
    };
    
    // Cabeçalho do documento
    addText('RELATÓRIO DE PARTICIPANTES', 18, boldFont, margin + (contentWidth / 2) - 100);
    yPosition -= 10;
    
    // Informações do evento
    addText(`Evento: ${event.name}`, 14, boldFont);
    if (event.description) {
      addText(`Descrição: ${event.description}`, 12, font);
    }
    addText(`Data: ${new Date(event.date).toLocaleDateString('pt-BR')}`, 12, font);
    
    // Formatar horários para mostrar apenas HH:MM
    const startTimeFormatted = new Date(event.startTime).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const endTimeFormatted = new Date(event.endTime).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    addText(`Horário: ${startTimeFormatted} às ${endTimeFormatted}`, 12, font);
    addText(`Local: ${event.location}`, 12, font);
    addText(`Total de Participantes: ${participants.length}`, 12, boldFont);
    addText(`Relatório gerado em: ${new Date().toLocaleString('pt-BR')}`, 10, font);
    
    yPosition -= 20;
    
    // Lista de participantes
    addText('LISTA DE PARTICIPANTES', 16, boldFont);
    yPosition -= 10;
    
    participants.forEach((participant, index) => {
      checkPageSpace(150); // Reservar espaço mínimo para cada participante
      
      const reg = participant.registration;
      const formData = participant.formResponse?.responses || {};
      
      // Cabeçalho do participante
      addText(`${index + 1}. ${reg.userName}`, 14, boldFont);
      
      // Dados básicos
      addText(`   Email: ${reg.userEmail}`, 11, font);
      if (reg.userCPF) {
        addText(`   CPF: ${reg.userCPF}`, 11, font);
      }
      addText(`   Inscrição: ${reg.createdAt.toLocaleDateString('pt-BR')}`, 11, font);
      addText(`   Check-in: ${reg.checkedIn ? 
        (reg.checkInTime ? reg.checkInTime.toLocaleString('pt-BR') : 'Sim') : 'Não realizado'}`, 11, font);
      addText(`   Check-out: ${reg.checkedOut ? 
        (reg.checkOutTime ? reg.checkOutTime.toLocaleString('pt-BR') : 'Sim') : 'Não realizado'}`, 11, font);
      addText(`   Certificado: ${reg.certificateGenerated ? 'Gerado' : 'Não gerado'}`, 11, font);
      
      // Dados do formulário personalizado
      if (customForm && customForm.fields.length > 0) {
        yPosition -= 5;
        addText(`   DADOS DO FORMULÁRIO:`, 11, boldFont);
        
        customForm.fields.forEach(field => {
          const fieldResponse = formData[field.id];
          const value = fieldResponse?.value;
          const displayValue = formatValue(value);
          
          // Quebrar linhas longas
          const maxCharsPerLine = 80;
          const label = `     ${field.label}:`;
          
          if (displayValue.length > maxCharsPerLine) {
            addText(label, 10, font);
            const lines = displayValue.match(new RegExp(`.{1,${maxCharsPerLine}}`, 'g')) || [displayValue];
            lines.forEach(line => {
              addText(`       ${line}`, 10, font);
            });
          } else {
            addText(`${label} ${displayValue}`, 10, font);
          }
        });
      }
      
      yPosition -= 15; // Espaço entre participantes
    });
    
    // Rodapé em todas as páginas
    const pages = pdfDoc.getPages();
    pages.forEach((page, index) => {
      page.drawText(`Página ${index + 1} de ${pages.length}`, {
        x: pageWidth - margin - 100,
        y: margin - 20,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      
      page.drawText(`Sistema de Gestão de Eventos - ${new Date().getFullYear()}`, {
        x: margin,
        y: margin - 20,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    });
    
    console.log('PDF gerado com sucesso!');
    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Erro ao gerar PDF dos participantes:', error);
    throw new Error('Falha ao gerar relatório PDF');
  }
};

export const downloadParticipantsPDF = async (options: ParticipantsPDFOptions) => {
  try {
    const pdfBytes = await generateParticipantsPDF(options);
    
    // Criar blob e download
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    // Criar elemento de download
    const a = document.createElement('a');
    a.href = url;
    const fileName = sanitizeFileName(`participantes_${options.event.name}`);
    a.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.pdf`;
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
