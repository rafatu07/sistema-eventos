import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { CertificateConfig } from '@/types';
import { CertificateConfigData, certificateConfigSchema } from './schemas';

const CERTIFICATE_CONFIGS_COLLECTION = 'certificate_configs';

// Certificate Configuration CRUD operations
export const createCertificateConfig = async (configData: Omit<CertificateConfigData, 'updatedAt'>) => {
  const configsRef = collection(db, CERTIFICATE_CONFIGS_COLLECTION);
  
  // Filter out undefined values for Firestore compatibility
  const cleanedData: Record<string, unknown> = {};
  Object.entries(configData).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanedData[key] = value;
    }
  });
  
  const newConfig = {
    ...cleanedData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(configsRef, newConfig);
  return docRef.id;
};

export const getCertificateConfig = async (eventId: string): Promise<CertificateConfig | null> => {
  try {
    console.log('Looking for certificate config for eventId:', eventId);
    const configsRef = collection(db, CERTIFICATE_CONFIGS_COLLECTION);
    const q = query(configsRef, where('eventId', '==', eventId));
    const querySnapshot = await getDocs(q);
    
    console.log('Query results:', querySnapshot.size, 'documents found');
  
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    if (!doc) return null;
    const data = doc.data();
    const config = {
      id: doc.id,
      eventId: data.eventId,
      template: data.template,
      orientation: data.orientation,
      pageSize: data.pageSize ?? 'A4',
      pageMargin: data.pageMargin ?? 'normal',
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      backgroundColor: data.backgroundColor,
      borderColor: data.borderColor,
      titleFontSize: data.titleFontSize,
      nameFontSize: data.nameFontSize,
      bodyFontSize: data.bodyFontSize,
      fontFamily: data.fontFamily,
      title: data.title,
      subtitle: data.subtitle,
      bodyText: data.bodyText,
      footer: data.footer,
      titlePosition: data.titlePosition,
      namePosition: data.namePosition,
      bodyPosition: data.bodyPosition,
      logoUrl: data.logoUrl,
      logoSize: data.logoSize,
      logoPosition: data.logoPosition,
      backgroundImageUrl: data.backgroundImageUrl,
      backgroundImageOpacity: data.backgroundImageOpacity ?? 0.3,
      backgroundImageSize: data.backgroundImageSize ?? 'cover',
      backgroundImagePosition: data.backgroundImagePosition ?? 'center',
      showBorder: data.showBorder,
      borderWidth: data.borderWidth,
      showWatermark: data.showWatermark,
      watermarkText: data.watermarkText,
      watermarkOpacity: data.watermarkOpacity,
      includeQRCode: data.includeQRCode,
      qrCodeText: data.qrCodeText,
      qrCodePosition: data.qrCodePosition,
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate(),
    } as CertificateConfig;
    
    console.log('📥 CARREGAMENTO: Configuração encontrada:', {
      id: config.id,
      template: config.template,
      includeQRCode: config.includeQRCode,
      qrCodeText: config.qrCodeText ? config.qrCodeText.substring(0, 30) + '...' : 'none',
      logoUrl: config.logoUrl ? config.logoUrl.substring(0, 50) + '...' : 'none'
    });
    
    // Log específico para logoUrl
    if (config.logoUrl) {
      console.log('✅ CARREGAMENTO: logoUrl carregada:', config.logoUrl);
    } else {
      console.log('❌ CARREGAMENTO: logoUrl NÃO encontrada na configuração!');
    }
    
    console.log('🔍 CARREGAMENTO: Dados brutos do Firestore para logoUrl:', data.logoUrl);
    
    // Verificação adicional de integridade
    if (data.logoUrl && !config.logoUrl) {
      console.error('🚨 ERRO CRÍTICO: logoUrl existe no Firestore mas não foi mapeada no config!');
      console.error('Data.logoUrl:', data.logoUrl);
      console.error('Config.logoUrl:', config.logoUrl);
    }
    
    return config;
  }
  
  console.log('No certificate config found for event:', eventId);
  return null;
  
  } catch (error) {
    console.error('Error fetching certificate config:', error);
    return null;
  }
};

export const updateCertificateConfig = async (eventId: string, configData: Partial<CertificateConfigData>) => {
  try {
    console.log('🔄 SALVAMENTO: Iniciando para evento:', eventId);
    console.log('📋 SALVAMENTO: Dados recebidos:', configData);
    
    // Log específico para logoUrl
    if (configData.logoUrl !== undefined) {
      console.log('🖼️  SALVAMENTO: logoUrl encontrada:', configData.logoUrl);
    } else {
      console.log('⚠️  SALVAMENTO: logoUrl está undefined!');
    }
    
    const configsRef = collection(db, CERTIFICATE_CONFIGS_COLLECTION);
    const q = query(configsRef, where('eventId', '==', eventId));
    const querySnapshot = await getDocs(q);
    
    console.log('🔍 SALVAMENTO: Configurações existentes encontradas:', querySnapshot.size);
    
    // Filter out undefined values for Firestore compatibility
    const cleanedData: Record<string, unknown> = {};
    Object.entries(configData).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanedData[key] = value;
      }
    });
    
    console.log('✨ SALVAMENTO: Dados limpos para Firestore:', cleanedData);
    
    // Log específico para logoUrl nos dados limpos
    if (cleanedData.logoUrl) {
      console.log('✅ SALVAMENTO: logoUrl será salva:', cleanedData.logoUrl);
    } else {
      console.log('❌ SALVAMENTO: logoUrl NÃO será salva (undefined ou vazia)');
    }
    
    if (!querySnapshot.empty) {
      console.log('Updating existing config...');
      const configRef = querySnapshot.docs[0]?.ref;
      if (configRef) {
        await updateDoc(configRef, {
          ...cleanedData,
          updatedAt: serverTimestamp(),
        });
        console.log('Config updated successfully');
      }
    } else {
      console.log('Creating new config...');
      // Criar nova configuração se não existir
      const newConfigId = await createCertificateConfig({
        ...cleanedData,
        eventId,
      } as Omit<CertificateConfigData, 'updatedAt'>);
      console.log('New config created with ID:', newConfigId);
    }
  } catch (error) {
    console.error('Error updating certificate config:', error);
    throw error;
  }
};

export const deleteCertificateConfig = async (eventId: string) => {
  const configsRef = collection(db, CERTIFICATE_CONFIGS_COLLECTION);
  const q = query(configsRef, where('eventId', '==', eventId));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const configRef = querySnapshot.docs[0]?.ref;
    if (configRef) {
      await deleteDoc(configRef);
    }
  }
};

// Helper function to get default certificate config
export const getDefaultCertificateConfig = (eventId: string, createdBy: string): CertificateConfigData => {
  const defaultData = {
    eventId,
    template: 'modern' as const,
    orientation: 'landscape' as const,
    pageSize: 'A4' as const,
    pageMargin: 'normal' as const,
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    titleFontSize: 24,
    nameFontSize: 18,
    bodyFontSize: 12,
    fontFamily: 'helvetica' as const,
    title: 'Certificado de Participação',
    subtitle: '',
    bodyText: 'Certificamos que {userName} participou do evento {eventName}, realizado em {eventDate} das {eventTime}.',
    footer: '',
    titlePosition: { x: 50, y: 25 },
    namePosition: { x: 50, y: 45 },
    bodyPosition: { x: 50, y: 65 },
    logoUrl: undefined,
    logoSize: 80,
    logoPosition: { x: 10, y: 10 },
    backgroundImageUrl: undefined,
    backgroundImageOpacity: 0.3,
    backgroundImageSize: 'cover' as const,
    backgroundImagePosition: 'center' as const,
    showBorder: true,
    borderWidth: 2,
    showWatermark: false,
    watermarkText: 'CERTIFICADO',
    watermarkOpacity: 0.1,
    includeQRCode: false,
    qrCodeText: undefined,
    qrCodePosition: { x: 85, y: 85 },
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // Validate with schema to ensure it's correct
  return certificateConfigSchema.parse(defaultData);
};
