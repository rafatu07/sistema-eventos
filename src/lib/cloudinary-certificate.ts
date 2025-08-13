import { v2 as cloudinary } from 'cloudinary';
import { CertificateConfig } from '@/types';

// 🎯 BIBLIOTECA PARA GERAR CERTIFICADOS VIA CLOUDINARY
// Esta abordagem é 100% compatível com Vercel e serverless

export interface CloudinaryCertificateData {
  userName: string;
  eventName: string;
  eventDate: string;
  eventStartTime?: string;
  eventEndTime?: string;
  config?: CertificateConfig;
}

// 📐 Construir certificado usando Cloudinary Transformations
export function buildCloudinaryCertificateUrl(data: CloudinaryCertificateData): string {
  const { config } = data;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    throw new Error('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME não configurado');
  }

  // VERSÃO SIMPLES E CONFIÁVEL
  // Usar template base ou criar imagem do zero
  
  const transformations = [
    // 1. Configurar canvas
    'w_1200,h_800,c_pad,b_white',
    
    // 2. Adicionar borda (se configurada)
    ...(config?.showBorder ? [`bo_${config.borderWidth || 2}px_solid_rgb:${(config.borderColor || '#000000').replace('#', '')}`] : []),
    
    // 3. TÍTULO
    `l_text:Arial_${config?.titleFontSize || 48}_bold:${encodeURIComponent(config?.title || 'CERTIFICADO')}`,
    `co_rgb:${(config?.primaryColor || '#2C3E50').replace('#', '')}`,
    'g_north,y_120',
    
    // 4. SUBTÍTULO (se existir)
    ...(config?.subtitle ? [
      `l_text:Arial_${Math.floor((config?.titleFontSize || 48) * 0.6)}_normal:${encodeURIComponent(config.subtitle)}`,
      `co_rgb:${(config?.secondaryColor || '#7F8C8D').replace('#', '')}`,
      'g_north,y_180'
    ] : []),
    
    // 5. NOME DO PARTICIPANTE (destaque)
    `l_text:Arial_${config?.nameFontSize || 36}_bold:${encodeURIComponent(data.userName)}`,
    `co_rgb:${(config?.primaryColor || '#34495E').replace('#', '')}`,
    'c_fit,w_1000',
    'g_center,y_-30',
    
    // 6. TEXTO PADRÃO
    `l_text:Arial_${config?.bodyFontSize || 18}_normal:${encodeURIComponent('participou do evento')}`,
    `co_rgb:${(config?.secondaryColor || '#7F8C8D').replace('#', '')}`,
    'g_center,y_20',
    
    // 7. NOME DO EVENTO
    `l_text:Arial_${(config?.bodyFontSize || 18) + 4}_bold:${encodeURIComponent(data.eventName)}`,
    `co_rgb:${(config?.primaryColor || '#2980B9').replace('#', '')}`,
    'c_fit,w_1000',
    'g_center,y_70',
    
    // 8. DATA DO EVENTO
    `l_text:Arial_${(config?.bodyFontSize || 18) - 2}_normal:${encodeURIComponent(`realizado em ${data.eventDate}`)}`,
    `co_rgb:${(config?.secondaryColor || '#7F8C8D').replace('#', '')}`,
    'g_center,y_120',
    
    // 9. RODAPÉ
    `l_text:Arial_12_normal:${encodeURIComponent(`Certificado digital emitido em ${new Date().toLocaleDateString('pt-BR')}`)}`,
    `co_rgb:${(config?.secondaryColor || '#95A5A6').replace('#', '')}`,
    'g_south,y_40'
  ];

  // URL final usando imagem base transparente ou sample
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;
  const params = transformations.join('/');
  
  // Usar uma imagem base simples (pode ser criada no Cloudinary)
  return `${baseUrl}/${params}/v1/certificates/blank_template.png`;
}

// 🎨 Versão alternativa usando template pré-criado
export function buildTemplateBasedCertificate(data: CloudinaryCertificateData): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  // Usar template já criado no Cloudinary e apenas sobrepor textos
  const overlays = [
    // Nome do participante
    `l_text:Arial_36_bold:${encodeURIComponent(data.userName)},co_rgb:2C3E50,c_fit,w_800,g_center,y_-50`,
    
    // Nome do evento  
    `l_text:Arial_24_bold:${encodeURIComponent(data.eventName)},co_rgb:2980B9,c_fit,w_800,g_center,y_50`,
    
    // Data
    `l_text:Arial_18_normal:${encodeURIComponent(data.eventDate)},co_rgb:7F8C8D,g_center,y_120`
  ];

  return `https://res.cloudinary.com/${cloudName}/image/upload/${overlays.join('/')}/v1/certificates/template_elegant.png`;
}

// 🚀 Gerar certificado e retornar buffer (para uso em APIs)
export async function generateCloudinaryCertificate(data: CloudinaryCertificateData): Promise<Buffer> {
  try {
    // Tentar template primeiro, depois versão customizada
    let url = '';
    
    try {
      url = buildTemplateBasedCertificate(data);
      console.log('🎨 Tentando template pré-definido...');
    } catch {
      url = buildCloudinaryCertificateUrl(data);
      console.log('🔧 Usando geração customizada...');
    }

    console.log('📍 URL Cloudinary:', url.substring(0, 100) + '...');

    // Baixar imagem
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    console.log('✅ Certificado baixado:', buffer.length, 'bytes');
    
    return buffer;

  } catch (error) {
    console.error('❌ Erro na geração Cloudinary:', error);
    throw error;
  }
}

// 🖼️ Upload do template base para o Cloudinary (executar uma vez apenas)
export async function uploadCertificateTemplate(): Promise<void> {
  try {
    // SVG de template básico
    const templateSvg = `
      <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="800" fill="#ffffff"/>
        <rect x="20" y="20" width="1160" height="760" stroke="#e0e0e0" stroke-width="2" fill="none"/>
        <!-- Decorações ou logo podem ser adicionados aqui -->
      </svg>
    `;

    const result = await cloudinary.uploader.upload(
      `data:image/svg+xml;base64,${Buffer.from(templateSvg).toString('base64')}`,
      {
        public_id: 'certificates/blank_template',
        resource_type: 'image',
        format: 'png'
      }
    );

    console.log('✅ Template enviado:', result.secure_url);
    
  } catch (error) {
    console.error('❌ Erro ao enviar template:', error);
    throw error;
  }
}
