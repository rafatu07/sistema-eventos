// 🎨 BIBLIOTECA PARA GERAÇÃO DE CERTIFICADOS NO CLIENTE
// Usa HTML2Canvas para converter HTML em PNG sem dependências server-side

declare global {
  interface Window {
    html2canvas: (element: HTMLElement, options?: Html2CanvasOptions) => Promise<HTMLCanvasElement>;
  }
}

interface Html2CanvasOptions {
  width?: number;
  height?: number;
  scale?: number;
  useCORS?: boolean;
  allowTaint?: boolean;
  backgroundColor?: string;
  logging?: boolean;
  foreignObjectRendering?: boolean;
  removeContainer?: boolean;
}

export interface CertificateGenerationResult {
  success: boolean;
  certificateUrl?: string;
  error?: string;
}

export interface CertificateData {
  registrationId: string;
  eventId: string;
  userId: string;
  userName: string;
  eventName: string;
  eventDate: string;
  eventStartTime?: string;
  eventEndTime?: string;
}

// 🔄 Carregar html2canvas dinamicamente
async function loadHtml2Canvas(): Promise<void> {
  if (typeof window !== 'undefined' && !window.html2canvas) {
    console.log('📥 Carregando script html2canvas...');
    
    // Carregar script principal
    const script = document.createElement('script');
    // Usar versão específica 1.4.1 que é mais estável
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.crossOrigin = 'anonymous';
    
    const scriptLoaded = new Promise<void>((resolve, reject) => {
      script.onload = () => {
        console.log('✅ Script html2canvas carregado com sucesso');
        resolve();
      };
      script.onerror = (err) => {
        console.error('❌ Erro ao carregar html2canvas:', err);
        reject(new Error('Falha ao carregar html2canvas'));
      };
      document.head.appendChild(script);
    });

    await scriptLoaded;
    
    // Garantir que o script está realmente disponível
    if (!window.html2canvas) {
      throw new Error('html2canvas não disponível mesmo após carregamento');
    }
    
    console.log('🔍 html2canvas versão carregada');
    
    // Aguardar um momento para garantir inicialização
    await new Promise(resolve => setTimeout(resolve, 200));
  } else {
    console.log('✓ html2canvas já está disponível');
  }
}

// 🎨 Função principal para gerar certificado
export async function generateCertificate(data: CertificateData): Promise<CertificateGenerationResult> {
  try {
    console.log('🎯 Iniciando geração de certificado client-side...');
    
    // PASSO 1: Solicitar HTML ao servidor
    console.log('📄 PASSO 1: Solicitando HTML...');
    const htmlResponse = await fetch('/api/certificate-new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'generate-html',
        ...data
      })
    });

    if (!htmlResponse.ok) {
      throw new Error(`Falha na solicitação HTML: ${htmlResponse.status}`);
    }

    const htmlData = await htmlResponse.json();
    
    if (!htmlData.success) {
      throw new Error(htmlData.error || 'Falha na geração HTML');
    }

    console.log('✅ HTML recebido do servidor');

    // PASSO 2: Carregar html2canvas
    console.log('📚 PASSO 2: Carregando html2canvas...');
    await loadHtml2Canvas();
    console.log('✅ html2canvas carregado');

    // PASSO 3: Criar elemento HTML corretamente e renderizar no documento
    console.log('🏗️ PASSO 3: Criando elemento HTML...');
    
    // Criar um iframe para isolar o ambiente de renderização
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '1200px';
    iframe.style.height = '800px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    // Garantir que o iframe está pronto
    await new Promise<void>(resolve => {
      iframe.onload = () => resolve();
      if (iframe.contentDocument) resolve();
    });
    
    // Obter o documento do iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('Não foi possível acessar o documento do iframe');
    
    // Escrever o HTML completo no iframe (incluindo DOCTYPE e estrutura completa)
    iframeDoc.open();
    iframeDoc.write(htmlData.html);
    iframeDoc.close();
    
    // Aguardar que o DOM esteja pronto
    await new Promise<void>(resolve => {
      if (iframeDoc.readyState === 'complete') resolve();
      else iframeDoc.addEventListener('DOMContentLoaded', () => resolve());
    });
    
    // Aguardar carregar fontes e imagens
    const certificate = iframeDoc.querySelector('.certificate-container');
    if (!certificate) throw new Error('Container do certificado não encontrado');
    
    // Forçar carregamento completo das fontes (tempo extra)
    console.log('⏱️ Aguardando carregamento completo...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await waitForImages(iframeDoc.body);
    console.log('✅ Elemento preparado');
    
    // PASSO 4: Converter para PNG com configurações otimizadas
    console.log('🖼️ PASSO 4: Convertendo para PNG...');
    const canvas = await window.html2canvas(iframeDoc.body, {
      width: 1200,
      height: 800,
      scale: 2, // Para melhor qualidade
      useCORS: true,
      allowTaint: true, // Permitir conteúdo tainted para melhor compatibilidade
      backgroundColor: htmlData.config?.backgroundColor || '#ffffff',
      logging: true, // Mostrar logs para debug
      foreignObjectRendering: false, // Desativar foreignObject para maior compatibilidade
      removeContainer: false // Não remover o container para evitar problemas
    });

    // Remover iframe temporário
    document.body.removeChild(iframe);
    console.log('✅ PNG gerado com sucesso com', canvas.width, 'x', canvas.height);

    // PASSO 5: Converter canvas para data URL
    const imageDataURL = canvas.toDataURL('image/png', 1.0);
    console.log('📊 PNG size:', Math.round(imageDataURL.length / 1024), 'KB');

    // PASSO 6: Enviar PNG para o servidor
    console.log('📤 PASSO 6: Enviando PNG para servidor...');
    const uploadResponse = await fetch('/api/certificate-new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'upload-png',
        imageDataURL,
        registrationId: data.registrationId,
        eventId: data.eventId,
        userId: data.userId,
        userName: data.userName,
        eventName: data.eventName
      })
    });

    if (!uploadResponse.ok) {
      throw new Error(`Falha no upload: ${uploadResponse.status}`);
    }

    const uploadData = await uploadResponse.json();
    
    if (!uploadData.success) {
      throw new Error(uploadData.error || 'Falha no upload');
    }

    console.log('🎉 Certificado gerado com sucesso!');
    
    return {
      success: true,
      certificateUrl: uploadData.certificateUrl
    };

  } catch (error) {
    console.error('💀 Erro na geração de certificado:', error);
    
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

// 🖼️ Aguardar carregamento de imagens de forma mais robusta
async function waitForImages(container: HTMLElement): Promise<void> {
  // Encontrar todas as imagens no container
  const images = container.querySelectorAll('img');
  console.log(`🖼️ Encontradas ${images.length} imagens para processar`);
  
  if (images.length === 0) {
    return Promise.resolve();
  }

  // Garantir que todas as imagens têm crossOrigin configurado
  images.forEach(img => {
    img.crossOrigin = 'anonymous';
    // Forçar reload das imagens para garantir crossOrigin
    const currentSrc = img.src;
    if (currentSrc && !img.complete) {
      img.src = '';
      img.src = currentSrc;
    }
    console.log(`🔍 Processando imagem: ${img.src.substring(0, 50)}...`);
  });

  // Aguardar carregamento
  const imagePromises = Array.from(images).map(img => {
    return new Promise<void>((resolve) => {
      if (img.complete && img.naturalWidth !== 0) {
        console.log(`✓ Imagem já carregada: ${img.src.substring(0, 30)}...`);
        resolve();
      } else {
        img.onload = () => {
          console.log(`✓ Imagem carregada: ${img.src.substring(0, 30)}...`);
          resolve();
        };
        img.onerror = (err) => {
          console.warn(`⚠️ Erro ao carregar imagem: ${img.src.substring(0, 30)}...`, err);
          resolve(); // Continuar mesmo se imagem falhar
        };
        // Timeout de 5 segundos para evitar travamento
        setTimeout(() => {
          console.warn(`⏱️ Timeout para imagem: ${img.src.substring(0, 30)}...`);
          resolve();
        }, 5000);
      }
    });
  });

  await Promise.all(imagePromises);
  // Timeout adicional para garantir renderização completa
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('✅ Todas as imagens processadas');
}

// 🔍 Função para pré-visualização (opcional)
export async function previewCertificate(data: CertificateData): Promise<string | null> {
  try {
    const htmlResponse = await fetch('/api/certificate-new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'generate-html',
        ...data
      })
    });

    if (!htmlResponse.ok) return null;
    
    const htmlData = await htmlResponse.json();
    
    return htmlData.success ? htmlData.html : null;
    
  } catch (error) {
    console.error('Erro na pré-visualização:', error);
    return null;
  }
}
