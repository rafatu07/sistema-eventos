import { NextRequest, NextResponse } from 'next/server';

/**
 * API para testar carregamento de logos
 * Útil para debug de problemas de carregamento de imagem
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { logoUrl } = body;
    
    if (!logoUrl) {
      return NextResponse.json(
        { error: 'logoUrl é obrigatório' },
        { status: 400 }
      );
    }

    console.log('🧪 Testando carregamento de logo:', logoUrl);

    // Teste 1: Validar se URL é acessível
    console.log('1️⃣ Testando acesso à URL...');
    const headResponse = await fetch(logoUrl, { method: 'HEAD' });
    
    const headResult = {
      ok: headResponse.ok,
      status: headResponse.status,
      statusText: headResponse.statusText,
      contentType: headResponse.headers.get('content-type'),
      contentLength: headResponse.headers.get('content-length'),
    };
    
    console.log('HEAD Response:', headResult);

    // Teste 2: Tentar baixar a imagem
    console.log('2️⃣ Tentando baixar imagem...');
    const getResponse = await fetch(logoUrl, {
      headers: {
        'User-Agent': 'Certificate-Generator/1.0',
        'Accept': 'image/*',
      },
    });
    
    const getResult = {
      ok: getResponse.ok,
      status: getResponse.status,
      statusText: getResponse.statusText,
      contentType: getResponse.headers.get('content-type'),
    };

    let imageSize = 0;
    let isValidImage = false;
    
    if (getResponse.ok) {
      const arrayBuffer = await getResponse.arrayBuffer();
      imageSize = arrayBuffer.byteLength;
      
      // Verificar se é realmente uma imagem (magic bytes)
      const uint8Array = new Uint8Array(arrayBuffer);
      const header = Array.from(uint8Array.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Magic bytes para formatos de imagem comuns
      isValidImage = (
        header.startsWith('89504e47') || // PNG
        header.startsWith('ffd8ff') ||   // JPEG
        header.startsWith('47494638') || // GIF
        header.startsWith('52494646')    // WebP
      );
      
      console.log('Imagem baixada:', { imageSize, header: header.substring(0, 16), isValidImage });
    }

    // Teste 3: Tentar carregar com canvas (se possível)
    console.log('3️⃣ Testando carregamento com canvas...');
    let canvasResult = null;
    
    try {
      // Importar canvas apenas no servidor
      const { loadImage } = await import('canvas');
      
      if (imageSize > 0) {
        const buffer = Buffer.from(await (await fetch(logoUrl)).arrayBuffer());
        const image = await loadImage(buffer);
        
        canvasResult = {
          success: true,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
        };
        
        console.log('Canvas load success:', canvasResult);
      }
    } catch (canvasError) {
      canvasResult = {
        success: false,
        error: canvasError instanceof Error ? canvasError.message : String(canvasError),
      };
      
      console.log('Canvas load failed:', canvasResult);
    }

    const finalResult = {
      success: headResult.ok && getResult.ok && isValidImage,
      logoUrl,
      tests: {
        headRequest: headResult,
        getRequest: { ...getResult, imageSize },
        imageValidation: { isValidImage },
        canvasLoad: canvasResult,
      },
      summary: {
        accessible: headResult.ok,
        downloadable: getResult.ok,
        validImage: isValidImage,
        canvasCompatible: canvasResult?.success || false,
      }
    };

    console.log('🏁 Teste completo:', finalResult.summary);

    return NextResponse.json(finalResult);

  } catch (error) {
    console.error('Erro no teste de logo:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
