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
    return {
      id: doc.id,
      eventId: data.eventId,
      template: data.template,
      orientation: data.orientation,
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
    console.log('Updating certificate config for event:', eventId);
    console.log('Config data to update:', configData);
    
    const configsRef = collection(db, CERTIFICATE_CONFIGS_COLLECTION);
    const q = query(configsRef, where('eventId', '==', eventId));
    const querySnapshot = await getDocs(q);
    
    console.log('Found existing configs:', querySnapshot.size);
    
    // Filter out undefined values for Firestore compatibility
    const cleanedData: Record<string, unknown> = {};
    Object.entries(configData).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanedData[key] = value;
      }
    });
    
    console.log('Cleaned data for Firestore:', cleanedData);
    
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
