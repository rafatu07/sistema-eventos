import * as XLSX from 'xlsx';
import { Event, Registration } from '@/types';
import { CustomFormConfig, FormResponse } from '@/types/custom-forms';
import { getSafeFieldsForReports } from './security-filters';

export interface ParticipantsExcelOptions {
  event: Event;
  participants: {
    registration: Registration;
    formResponse?: FormResponse | null;
  }[];
  customForm?: CustomFormConfig | null;
}

// Função auxiliar para sanitizar nome do arquivo
const sanitizeFileName = (name: string): string => {
  return name
    .replace(/[^a-zA-Z0-9\s\-\_]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
};

// Função auxiliar para formatar valores dos campos
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }
  
  if (typeof value === 'object' && value.toString) {
    return value.toString();
  }
  
  return String(value);
};

export const generateParticipantsExcel = async ({
  event,
  participants,
  customForm
}: ParticipantsExcelOptions): Promise<ArrayBuffer> => {
  try {
    console.log('Iniciando geração de Excel dos participantes...');
    
    // Criar nova planilha
    const workbook = XLSX.utils.book_new();
    
    // ========================
    // ABA 1: LISTA DE PARTICIPANTES
    // ========================
    
    // Definir colunas padrão
    const standardColumns = [
      { key: 'nome', header: 'Nome Completo', width: 25 },
      { key: 'email', header: 'Email', width: 30 },
      { key: 'cpf', header: 'CPF', width: 15 },
      { key: 'telefone', header: 'Telefone', width: 15 },
      { key: 'inscricao', header: 'Data Inscrição', width: 18 },
      { key: 'checkin', header: 'Check-in', width: 18 },
      { key: 'checkout', header: 'Check-out', width: 18 },
      { key: 'certificado', header: 'Certificado', width: 15 }
    ];
    
    // Adicionar colunas do formulário personalizado (excluindo campos sensíveis)
    const customColumns: { key: string; header: string; width: number }[] = [];
    
    if (customForm && customForm.fields) {
      const safeFields = getSafeFieldsForReports(customForm.fields);
      
      safeFields.forEach(field => {
        customColumns.push({
          key: field.id,
          header: field.label,
          width: Math.max(15, Math.min(30, field.label.length + 5))
        });
      });
    }
    
    // Combinar todas as colunas
    const allColumns = [...standardColumns, ...customColumns];
    
    // Criar dados da planilha
    const worksheetData: Record<string, unknown>[] = [];
    
    // Header row
    const headerRow: Record<string, string> = {};
    allColumns.forEach(col => {
      headerRow[col.key] = col.header;
    });
    worksheetData.push(headerRow);
    
    // Dados dos participantes
    participants.forEach((participant) => {
      const reg = participant.registration;
      const formData = participant.formResponse?.responses || {};
      
      const row: Record<string, unknown> = {};
      
      // Dados padrão
      row.nome = reg.userName || '';
      row.email = reg.userEmail || '';
      row.cpf = reg.userCPF || '';
      row.telefone = ''; // Campo telefone não disponível na interface Registration
      row.inscricao = reg.createdAt ? new Date(reg.createdAt).toLocaleDateString('pt-BR') : '';
      row.checkin = reg.checkedIn 
        ? (reg.checkInTime ? new Date(reg.checkInTime).toLocaleString('pt-BR') : 'Sim')
        : 'Não realizado';
      row.checkout = reg.checkedOut 
        ? (reg.checkOutTime ? new Date(reg.checkOutTime).toLocaleString('pt-BR') : 'Sim')
        : 'Não realizado';
      row.certificado = reg.certificateGenerated ? 'Gerado' : 'Não gerado';
      
      // Dados do formulário personalizado
      customColumns.forEach(col => {
        const fieldResponse = formData[col.key];
        row[col.key] = formatValue(fieldResponse?.value);
      });
      
      worksheetData.push(row);
    });
    
    // Criar worksheet
    const participantsWorksheet = XLSX.utils.json_to_sheet(worksheetData, { skipHeader: true });
    
    // Definir larguras das colunas
    const colWidths = allColumns.map(col => ({ wch: col.width }));
    participantsWorksheet['!cols'] = colWidths;
    
    // Estilizar header (primeira linha)
    const range = XLSX.utils.decode_range(participantsWorksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!participantsWorksheet[cellRef]) continue;
      
      participantsWorksheet[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "366092" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }
    
    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(workbook, participantsWorksheet, 'Participantes');
    
    // ========================
    // ABA 2: ESTATÍSTICAS DO EVENTO
    // ========================
    
    const statsData = [
      ['RELATÓRIO DE ESTATÍSTICAS DO EVENTO'],
      [''],
      ['Informações Gerais'],
      ['Nome do Evento', event.name],
      ['Descrição', event.description || 'N/A'],
      ['Data', new Date(event.date).toLocaleDateString('pt-BR')],
      ['Horário de Início', new Date(event.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })],
      ['Horário de Término', new Date(event.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })],
      ['Local', event.location],
      [''],
      ['Limites de Inscrição'],
      ['Data Limite', event.registrationDeadline ? new Date(event.registrationDeadline).toLocaleDateString('pt-BR') : 'Não definido'],
      ['Máximo de Participantes', event.maxParticipants ? event.maxParticipants.toString() : 'Ilimitado'],
      [''],
      ['Estatísticas'],
      ['Total de Inscrições', participants.length.toString()],
      ['Check-ins Realizados', participants.filter(p => p.registration.checkedIn).length.toString()],
      ['Check-outs Realizados', participants.filter(p => p.registration.checkedOut).length.toString()],
      ['Certificados Gerados', participants.filter(p => p.registration.certificateGenerated).length.toString()],
      [''],
      ['Relatório Gerado em', new Date().toLocaleString('pt-BR')]
    ];
    
    const statsWorksheet = XLSX.utils.aoa_to_sheet(statsData);
    
    // Definir larguras das colunas para estatísticas
    statsWorksheet['!cols'] = [
      { wch: 25 }, // Primeira coluna (labels)
      { wch: 40 }  // Segunda coluna (valores)
    ];
    
    // Estilizar título principal
    if (statsWorksheet['A1']) {
      statsWorksheet['A1'].s = {
        font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "366092" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }
    
    // Estilizar seções (Informações Gerais, Estatísticas, etc.)
    ['A3', 'A11', 'A15'].forEach(cellRef => {
      if (statsWorksheet[cellRef]) {
        statsWorksheet[cellRef].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4A90A4" } }
        };
      }
    });
    
    // Adicionar worksheet de estatísticas
    XLSX.utils.book_append_sheet(workbook, statsWorksheet, 'Estatísticas');
    
    // ========================
    // ABA 3: CONFIGURAÇÃO DO FORMULÁRIO (se existir)
    // ========================
    
    if (customForm && customForm.fields && customForm.fields.length > 0) {
      const formConfigData = [
        ['CONFIGURAÇÃO DO FORMULÁRIO PERSONALIZADO'],
        [''],
        ['Informações do Formulário'],
        ['Título', customForm.title],
        ['Descrição', customForm.description || 'N/A'],
        ['Ativo', customForm.isActive ? 'Sim' : 'Não'],
        ['Criado em', new Date(customForm.createdAt).toLocaleString('pt-BR')],
        ['Última atualização', customForm.updatedAt ? new Date(customForm.updatedAt).toLocaleString('pt-BR') : 'N/A'],
        [''],
        ['Campos do Formulário'],
        ['#', 'Campo', 'Tipo', 'Obrigatório', 'Descrição']
      ];
      
      customForm.fields.forEach((field, index) => {
        formConfigData.push([
          (index + 1).toString(),
          field.label,
          field.type,
          field.required ? 'Sim' : 'Não',
          field.description || 'N/A'
        ]);
      });
      
      const formConfigWorksheet = XLSX.utils.aoa_to_sheet(formConfigData);
      
      // Definir larguras das colunas
      formConfigWorksheet['!cols'] = [
        { wch: 5 },  // #
        { wch: 25 }, // Campo
        { wch: 15 }, // Tipo  
        { wch: 12 }, // Obrigatório
        { wch: 35 }  // Descrição
      ];
      
      // Estilizar
      if (formConfigWorksheet['A1']) {
        formConfigWorksheet['A1'].s = {
          font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "366092" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
      
      // Header da tabela de campos
      ['A11', 'B11', 'C11', 'D11', 'E11'].forEach(cellRef => {
        if (formConfigWorksheet[cellRef]) {
          formConfigWorksheet[cellRef].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4A90A4" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      });
      
      XLSX.utils.book_append_sheet(workbook, formConfigWorksheet, 'Configuração Form');
    }
    
    // Gerar o buffer do arquivo Excel
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array',
      compression: true
    });
    
    console.log('Excel gerado com sucesso!');
    return excelBuffer;
    
  } catch (error) {
    console.error('Erro ao gerar Excel:', error);
    throw new Error('Falha ao gerar relatório Excel');
  }
};

export const downloadParticipantsExcel = async (options: ParticipantsExcelOptions) => {
  try {
    const excelBuffer = await generateParticipantsExcel(options);
    
    // Criar blob e download
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = URL.createObjectURL(blob);
    
    // Criar elemento de download
    const a = document.createElement('a');
    a.href = url;
    const fileName = sanitizeFileName(`participantes_${options.event.name}`);
    a.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Erro ao fazer download do Excel:', error);
    throw error;
  }
};
