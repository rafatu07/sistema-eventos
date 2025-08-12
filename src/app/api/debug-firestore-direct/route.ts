import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const CERTIFICATE_CONFIGS_COLLECTION = 'certificate_configs';

export async function POST(request: NextRequest) {
  try {
    const { eventId, logoUrl } = await request.json();
    
    if (!eventId || !logoUrl) {
      return NextResponse.json(
        { error: 'eventId e logoUrl são obrigatórios' },
        { status: 400 }
      );
    }

    console.log('🔥 FIRESTORE-DIRECT: Teste direto no Firestore...');
    console.log('📋 FIRESTORE-DIRECT: eventId:', eventId);
    console.log('📋 FIRESTORE-DIRECT: logoUrl:', logoUrl);

    // Step 1: Tentar encontrar documento existente
    const configsRef = collection(db, CERTIFICATE_CONFIGS_COLLECTION);
    const q = query(configsRef, where('eventId', '==', eventId));
    const querySnapshot = await getDocs(q);
    
    console.log('🔍 FIRESTORE-DIRECT: Documentos encontrados:', querySnapshot.size);

    let documentId: string;
    let operation: string;

    if (!querySnapshot.empty) {
      // Atualizar documento existente
      const docRef = querySnapshot.docs[0].ref;
      documentId = docRef.id;
      operation = 'UPDATE';
      
      console.log('🔄 FIRESTORE-DIRECT: Atualizando documento existente:', documentId);
      
      await updateDoc(docRef, {
        logoUrl: logoUrl,
        title: `Teste Firestore Direto - ${new Date().toISOString()}`,
        template: 'elegant',
        updatedAt: serverTimestamp(),
      });
      
    } else {
      // Criar novo documento
      operation = 'CREATE';
      
      console.log('➕ FIRESTORE-DIRECT: Criando novo documento...');
      
      const docRef = await addDoc(configsRef, {
        eventId: eventId,
        logoUrl: logoUrl,
        title: `Teste Firestore Direto - ${new Date().toISOString()}`,
        template: 'elegant',
        orientation: 'landscape',
        primaryColor: '#7c3aed',
        secondaryColor: '#6b7280',
        backgroundColor: '#ffffff',
        createdBy: 'debug-test',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      documentId = docRef.id;
    }

    // Step 2: Aguardar um pouco e então verificar se foi salvo
    console.log('⏳ FIRESTORE-DIRECT: Aguardando propagação...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Re-ler o documento
    console.log('🔍 FIRESTORE-DIRECT: Verificando se foi salvo...');
    const verifyQuery = query(configsRef, where('eventId', '==', eventId));
    const verifySnapshot = await getDocs(verifyQuery);
    
    if (verifySnapshot.empty) {
      throw new Error('Documento não encontrado após salvamento!');
    }

    const savedDoc = verifySnapshot.docs[0];
    const savedData = savedDoc.data();
    
    console.log('✅ FIRESTORE-DIRECT: Documento verificado:', savedData);

    const logoMatch = savedData.logoUrl === logoUrl;
    
    return NextResponse.json({
      success: logoMatch,
      operation,
      documentId,
      test: {
        logoUrlSent: logoUrl,
        logoUrlSaved: savedData.logoUrl,
        match: logoMatch,
      },
      savedDocument: savedData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ FIRESTORE-DIRECT: Erro:', error);
    
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
