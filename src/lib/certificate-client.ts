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
  certificateType?: string;
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

// 🎨 Função principal para gerar certificado (SERVER-SIDE OPTIMIZED)
export async function generateCertificate(data: CertificateData): Promise<CertificateGenerationResult> {
  try {
    console.log('🎯 Iniciando geração de certificado server-side otimizada...');
    
    // ✅ PRIORIDADE: API server-side corrigida (mais confiável)
    console.log('🖥️ Tentando API server-side otimizada...');
    const response = await fetch('/api/generate-certificate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationId: data.registrationId,
        eventId: data.eventId,
        userId: data.userId,
        userName: data.userName,
        eventName: data.eventName,
        eventDate: data.eventDate,
        eventStartTime: data.eventStartTime,
        eventEndTime: data.eventEndTime
      })
    });

    if (response.ok) {
      const result = await response.json();
      
      if (result.success) {
        console.log('🎉 Certificado gerado com sucesso via server-side!');
        return {
          success: true,
          certificateUrl: result.certificateUrl,
          certificateType: result.certificateType || 'png'
        };
      }
    }

    // Se chegou aqui, server-side falhou
    const errorText = await response.text().catch(() => 'Erro desconhecido');
    console.warn('⚠️ API server-side falhou:', errorText);
    console.log('🔄 Tentando fallback client-side...');

    // FALLBACK: Método client-side (apenas se necessário)
    return await generateCertificateClientSide(data);

  } catch (error) {
    console.error('💀 Erro na tentativa server-side:', error);
    console.log('🔄 Fallback para client-side por erro...');
    
    // FALLBACK: Método client-side
    return await generateCertificateClientSide(data);
  }
}

// 🔄 Fallback client-side (método original, mas otimizado)
async function generateCertificateClientSide(data: CertificateData): Promise<CertificateGenerationResult> {
  try {
    console.log('⚠️ FALLBACK: Usando método client-side...');
    
    // PASSO 1: Solicitar HTML ao servidor
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

    // PASSO 2: Carregar html2canvas
    await loadHtml2Canvas();

    // PASSO 3: Renderização simplificada para maior compatibilidade
    const container = document.createElement('div');
    container.innerHTML = htmlData.html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '1200px';
    container.style.height = '800px';
    document.body.appendChild(container);

    // Aguardar recursos
    await waitForImages(container);
    await new Promise(resolve => setTimeout(resolve, 800));

    // PASSO 4: Converter para PNG com configurações compatíveis
    // @ts-ignore - html2canvas typing
    const canvas = await window.html2canvas(container, {
      width: 1200,
      height: 800,
      scale: 1.5, // Reduzido para melhor performance
      useCORS: true,
      backgroundColor: htmlData.config?.backgroundColor || '#ffffff',
      logging: false, // Reduzir logs no fallback
      allowTaint: true
    });

    document.body.removeChild(container);

    // PASSO 5: Converter e enviar
    const imageDataURL = canvas.toDataURL('image/png', 0.9); // Qualidade ligeiramente reduzida
    
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
      throw new Error(`Falha no upload fallback: ${uploadResponse.status}`);
    }

    const uploadData = await uploadResponse.json();
    
    if (!uploadData.success) {
      throw new Error(uploadData.error || 'Falha no upload fallback');
    }
    
    console.log('✅ Fallback client-side concluído!');
    
    return {
      success: true,
      certificateUrl: uploadData.certificateUrl
    };

  } catch (error) {
    console.error('💀 Fallback client-side também falhou:', error);
    
    return {
      success: false,
      error: `Todos os métodos falharam: ${(error as Error).message}`
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
