import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  Timestamp,
  serverTimestamp,
  DocumentData,
  // DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Event, Registration, CustomFormConfig, FormResponse } from '@/types';

const COLLECTIONS = {
  USERS: 'users',
  EVENTS: 'events',
  REGISTRATIONS: 'registrations',
  CERTIFICATE_CONFIGS: 'certificate_configs',
  CUSTOM_FORMS: 'custom_forms',
  FORM_RESPONSES: 'form_responses',
} as const;

// Interfaces para paginação
export interface PaginationOptions {
  limit?: number;
  startAfterDoc?: QueryDocumentSnapshot;
  endBeforeDoc?: QueryDocumentSnapshot;
}

export interface PaginatedResult<T> {
  items: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalCount?: number;
  firstDoc?: QueryDocumentSnapshot;
  lastDoc?: QueryDocumentSnapshot;
}

// Cache simples para consultas
const queryCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

function getCachedResult<T>(cacheKey: string): T | null {
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }
  queryCache.delete(cacheKey);
  return null;
}

function setCachedResult<T>(cacheKey: string, data: T): void {
  queryCache.set(cacheKey, { data, timestamp: Date.now() });
}

function invalidateCache(pattern?: string): void {
  if (pattern) {
    // Remove entradas específicas do cache
    for (const key of queryCache.keys()) {
      if (key.includes(pattern)) {
        queryCache.delete(key);
      }
    }
  } else {
    // Limpa todo o cache
    queryCache.clear();
  }
}

// Admin email check
export const isUserAdmin = (email: string): boolean => {
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
  return adminEmails.includes(email);
};

// Event CRUD operations
export const createEvent = async (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
  const eventsRef = collection(db, COLLECTIONS.EVENTS);
  const newEvent = {
    ...eventData,
    date: Timestamp.fromDate(eventData.date),
    startTime: Timestamp.fromDate(eventData.startTime),
    endTime: Timestamp.fromDate(eventData.endTime),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(eventsRef, newEvent);
  
  // Invalidar cache de eventos
  invalidateCache('events');
  
  return docRef.id;
};

export const getEvent = async (eventId: string): Promise<Event | null> => {
  const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
  const eventSnap = await getDoc(eventRef);
  
  if (eventSnap.exists()) {
    const data = eventSnap.data();
    // 🕒 FALLBACK: Eventos antigos podem não ter startTime/endTime
    const eventDate = data.date.toDate();
    let startTime = eventDate;
    let endTime = eventDate;

    if (data.startTime && data.endTime) {
      // ✅ Evento tem horários salvos
      startTime = data.startTime.toDate();
      endTime = data.endTime.toDate();
    } else {
      // ⚠️ Evento antigo sem horários - usar horários padrão baseados na data
      const dateOnly = new Date(eventDate);
      dateOnly.setHours(13, 0, 0, 0); // Início padrão: 13:00
      startTime = dateOnly;
      
      const endTimeDefault = new Date(eventDate);
      endTimeDefault.setHours(17, 0, 0, 0); // Fim padrão: 17:00
      endTime = endTimeDefault;

      console.log('⚠️ Evento sem startTime/endTime - usando horários padrão:', {
        eventId: eventSnap.id,
        eventName: data.name,
        defaultStartTime: startTime,
        defaultEndTime: endTime
      });
    }

    return {
      id: eventSnap.id,
      name: data.name,
      description: data.description,
      date: eventDate,
      startTime,
      endTime,
      location: data.location,
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Event;
  }
  
  return null;
};

// Versão original (mantida para compatibilidade)
export const getAllEvents = async (): Promise<Event[]> => {
  const cacheKey = 'all-events';
  const cached = getCachedResult<Event[]>(cacheKey);
  if (cached) return cached;

  const eventsRef = collection(db, COLLECTIONS.EVENTS);
  const q = query(eventsRef, orderBy('date', 'desc'));
  const querySnapshot = await getDocs(q);
  
  const events = querySnapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    description: doc.data().description,
    date: doc.data().date.toDate(),
    startTime: doc.data().startTime.toDate(),
    endTime: doc.data().endTime.toDate(),
    location: doc.data().location,
    createdBy: doc.data().createdBy,
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Event[];

  setCachedResult(cacheKey, events);
  return events;
};

// Versão paginada otimizada
export const getEventsPaginated = async (
  options: PaginationOptions = {}
): Promise<PaginatedResult<Event>> => {
  const { limit: pageLimit = 10, startAfterDoc, endBeforeDoc } = options;
  const cacheKey = `events-paginated-${pageLimit}-${startAfterDoc?.id || 'start'}-${endBeforeDoc?.id || 'end'}`;
  
  const cached = getCachedResult<PaginatedResult<Event>>(cacheKey);
  if (cached) return cached;

  const eventsRef = collection(db, COLLECTIONS.EVENTS);
  let q = query(eventsRef, orderBy('date', 'desc'), limit(pageLimit + 1)); // +1 para verificar se há próxima página

  if (startAfterDoc) {
    q = query(eventsRef, orderBy('date', 'desc'), startAfter(startAfterDoc), limit(pageLimit + 1));
  } else if (endBeforeDoc) {
    q = query(eventsRef, orderBy('date', 'desc'), endBefore(endBeforeDoc), limitToLast(pageLimit + 1));
  }

  const querySnapshot = await getDocs(q);
  const docs = querySnapshot.docs;
  
  const hasNextPage = docs.length > pageLimit;
  const hasPreviousPage = !!startAfterDoc || !!endBeforeDoc;
  
  const events = docs.slice(0, pageLimit).map(doc => ({
    id: doc.id,
    name: doc.data().name,
    description: doc.data().description,
    date: doc.data().date.toDate(),
    startTime: doc.data().startTime.toDate(),
    endTime: doc.data().endTime.toDate(),
    location: doc.data().location,
    createdBy: doc.data().createdBy,
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Event[];

  const result: PaginatedResult<Event> = {
    items: events,
    hasNextPage,
    hasPreviousPage,
    firstDoc: docs[0],
    lastDoc: docs[pageLimit - 1],
  };

  setCachedResult(cacheKey, result);
  return result;
};

export const updateEvent = async (eventId: string, eventData: Partial<Event>) => {
  const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
  const updateData: DocumentData = {
    ...eventData,
    updatedAt: serverTimestamp(),
  };
  
  if (eventData.date) {
    updateData.date = Timestamp.fromDate(eventData.date);
  }
  
  if (eventData.startTime) {
    updateData.startTime = Timestamp.fromDate(eventData.startTime);
  }
  
  if (eventData.endTime) {
    updateData.endTime = Timestamp.fromDate(eventData.endTime);
  }
  
  await updateDoc(eventRef, updateData);
  
  // Invalidar cache de eventos
  invalidateCache('events');
  invalidateCache(`event-${eventId}`);
};

export const deleteEvent = async (eventId: string) => {
  // First, delete all registrations for this event
  const registrationsRef = collection(db, COLLECTIONS.REGISTRATIONS);
  const q = query(registrationsRef, where('eventId', '==', eventId));
  const querySnapshot = await getDocs(q);
  
  // Delete all registrations
  const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  
  // Then delete the event
  const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
  await deleteDoc(eventRef);
  
  // Invalidar cache
  invalidateCache('events');
  invalidateCache(`event-${eventId}`);
  invalidateCache('registrations');
};

// Registration CRUD operations
export const createRegistration = async (registrationData: Omit<Registration, 'id' | 'createdAt'>) => {
  const registrationsRef = collection(db, COLLECTIONS.REGISTRATIONS);
  const newRegistration = {
    ...registrationData,
    createdAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(registrationsRef, newRegistration);
  return docRef.id;
};

export const getRegistration = async (eventId: string, userId: string): Promise<Registration | null> => {
  const registrationsRef = collection(db, COLLECTIONS.REGISTRATIONS);
  const q = query(
    registrationsRef,
    where('eventId', '==', eventId),
    where('userId', '==', userId)
  );
  
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    if (!doc) return null;
    const data = doc.data();
    return {
      id: doc.id,
      eventId: data.eventId,
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      userCPF: data.userCPF,
      checkedIn: data.checkedIn,
      checkedOut: data.checkedOut,
      certificateGenerated: data.certificateGenerated,
      certificateUrl: data.certificateUrl,
      createdAt: data.createdAt?.toDate() || new Date(),
      checkInTime: data.checkInTime?.toDate(),
      checkOutTime: data.checkOutTime?.toDate(),
    } as Registration;
  }
  
  return null;
};

// Get registration by ID (needed for individual certificate deletion)
export const getRegistrationById = async (registrationId: string): Promise<Registration | null> => {
  const registrationRef = doc(db, COLLECTIONS.REGISTRATIONS, registrationId);
  const registrationSnap = await getDoc(registrationRef);
  
  if (!registrationSnap.exists()) {
    return null;
  }
  
  const data = registrationSnap.data();
  return {
    id: registrationSnap.id,
    eventId: data.eventId,
    userId: data.userId,
    userEmail: data.userEmail,
    userName: data.userName,
    userCPF: data.userCPF,
    checkedIn: data.checkedIn,
    checkedOut: data.checkedOut,
    certificateGenerated: data.certificateGenerated,
    certificateUrl: data.certificateUrl,
    createdAt: data.createdAt?.toDate() || new Date(),
    checkInTime: data.checkInTime?.toDate(),
    checkOutTime: data.checkOutTime?.toDate(),
  } as Registration;
};

export const getEventRegistrations = async (eventId: string): Promise<Registration[]> => {
  const registrationsRef = collection(db, COLLECTIONS.REGISTRATIONS);
  const q = query(registrationsRef, where('eventId', '==', eventId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    eventId: doc.data().eventId,
    userId: doc.data().userId,
    userEmail: doc.data().userEmail,
    userName: doc.data().userName,
    userCPF: doc.data().userCPF,
    checkedIn: doc.data().checkedIn,
    checkedOut: doc.data().checkedOut,
    certificateGenerated: doc.data().certificateGenerated,
    certificateUrl: doc.data().certificateUrl,
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    checkInTime: doc.data().checkInTime?.toDate(),
    checkOutTime: doc.data().checkOutTime?.toDate(),
  })) as Registration[];
};

export const updateRegistration = async (registrationId: string, data: Partial<Registration>) => {
  try {
    console.log(`[firestore] Iniciando updateRegistration para ID: ${registrationId}`);
    console.log(`[firestore] Dados recebidos:`, JSON.stringify(data, null, 2));
    
    const registrationRef = doc(db, COLLECTIONS.REGISTRATIONS, registrationId);
    const updateData: DocumentData = {};
    
    // Handle regular fields (excluding special fields that need custom treatment)
    Object.keys(data).forEach(key => {
      if (key !== 'checkInTime' && key !== 'checkOutTime' && key !== 'certificateUrl') {
        const value = data[key as keyof Registration];
        if (value !== undefined) {
          updateData[key] = value;
          console.log(`[firestore] Campo regular ${key}:`, value);
        }
      }
    });
    
    // Handle timestamp fields with special logic for undefined values
    if ('checkInTime' in data) {
      console.log(`[firestore] Processando checkInTime:`, data.checkInTime);
      if (data.checkInTime === undefined || data.checkInTime === null) {
        updateData.checkInTime = deleteField();
        console.log(`[firestore] checkInTime será removido`);
      } else {
        try {
          updateData.checkInTime = Timestamp.fromDate(data.checkInTime);
          console.log(`[firestore] checkInTime convertido para Timestamp`);
        } catch (timestampError) {
          console.error(`[firestore] Erro ao converter checkInTime para Timestamp:`, timestampError);
          throw new Error(`Erro ao converter checkInTime: ${timestampError}`);
        }
      }
    }
    
    if ('checkOutTime' in data) {
      console.log(`[firestore] Processando checkOutTime:`, data.checkOutTime);
      if (data.checkOutTime === undefined || data.checkOutTime === null) {
        updateData.checkOutTime = deleteField();
        console.log(`[firestore] checkOutTime será removido`);
      } else {
        try {
          updateData.checkOutTime = Timestamp.fromDate(data.checkOutTime);
          console.log(`[firestore] checkOutTime convertido para Timestamp`);
        } catch (timestampError) {
          console.error(`[firestore] Erro ao converter checkOutTime para Timestamp:`, timestampError);
          throw new Error(`Erro ao converter checkOutTime: ${timestampError}`);
        }
      }
    }
    
    // Handle certificateUrl field with special logic for undefined values
    if ('certificateUrl' in data) {
      console.log(`[firestore] Processando certificateUrl:`, data.certificateUrl);
      if (data.certificateUrl === undefined || data.certificateUrl === null) {
        updateData.certificateUrl = deleteField();
        console.log(`[firestore] certificateUrl será removido`);
      } else {
        updateData.certificateUrl = data.certificateUrl;
        console.log(`[firestore] certificateUrl será atualizado:`, data.certificateUrl);
      }
    }
    
    console.log(`[firestore] Dados finais para updateDoc:`, JSON.stringify(updateData, null, 2));
    
    await updateDoc(registrationRef, updateData);
    console.log(`[firestore] updateDoc executado com sucesso para ID: ${registrationId}`);
    
  } catch (error) {
    console.error(`[firestore] Erro em updateRegistration para ID ${registrationId}:`, error);
    throw error;
  }
};

export const deleteRegistration = async (registrationId: string) => {
  try {
    console.log(`[firestore] Iniciando deleteRegistration para ID: ${registrationId}`);
    
    const registrationRef = doc(db, COLLECTIONS.REGISTRATIONS, registrationId);
    await deleteDoc(registrationRef);
    
    // Invalidar cache relacionado
    invalidateCache(`registration_${registrationId}`);
    invalidateCache('user_registrations_*');
    invalidateCache('event_registrations_*');
    
    console.log(`[firestore] Registration ${registrationId} excluído com sucesso`);
  } catch (error) {
    console.error(`[firestore] Erro em deleteRegistration para ID ${registrationId}:`, error);
    throw error;
  }
};

// Function to automatically checkout participants when event ends
export const autoCheckoutEventParticipants = async (eventId: string) => {
  try {
    // Get all registrations that are checked in but not checked out
    const registrationsRef = collection(db, COLLECTIONS.REGISTRATIONS);
    const q = query(
      registrationsRef,
      where('eventId', '==', eventId),
      where('checkedIn', '==', true),
      where('checkedOut', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    const now = new Date();
    
    // Update all matching registrations
    const updatePromises = querySnapshot.docs.map(doc => 
      updateDoc(doc.ref, {
        checkedOut: true,
        checkOutTime: Timestamp.fromDate(now),
      })
    );
    
    await Promise.all(updatePromises);
    
    console.log(`Auto checkout completed for event ${eventId}. ${querySnapshot.size} participants checked out.`);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error during auto checkout:', error);
    throw error;
  }
};

// User operations
export const getUserRegistrations = async (userId: string): Promise<Registration[]> => {
  const registrationsRef = collection(db, COLLECTIONS.REGISTRATIONS);
  const q = query(registrationsRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    eventId: doc.data().eventId,
    userId: doc.data().userId,
    userEmail: doc.data().userEmail,
    userName: doc.data().userName,
    userCPF: doc.data().userCPF,
    checkedIn: doc.data().checkedIn,
    checkedOut: doc.data().checkedOut,
    certificateGenerated: doc.data().certificateGenerated,
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    checkInTime: doc.data().checkInTime?.toDate(),
    checkOutTime: doc.data().checkOutTime?.toDate(),
  })) as Registration[];
};

// ===================================================================
// CUSTOM FORMS CRUD OPERATIONS
// ===================================================================

/**
 * Criar formulário personalizado para um evento
 */
export const createCustomForm = async (formData: Omit<CustomFormConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
  const formsRef = collection(db, COLLECTIONS.CUSTOM_FORMS);
  const newForm = {
    ...formData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(formsRef, newForm);
  
  // Invalidar cache
  invalidateCache('custom-forms');
  invalidateCache(`form-${formData.eventId}`);
  
  return docRef.id;
};

/**
 * Obter formulário personalizado por ID do evento
 */
export const getCustomFormByEventId = async (eventId: string): Promise<CustomFormConfig | null> => {
  const cacheKey = `form-${eventId}`;
  const cached = getCachedResult<CustomFormConfig>(cacheKey);
  if (cached) return cached;

  const formsRef = collection(db, COLLECTIONS.CUSTOM_FORMS);
  const q = query(formsRef, where('eventId', '==', eventId), where('isActive', '==', true));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  if (!doc) {
    return null;
  }
  
  const data = doc.data();
  
  const form: CustomFormConfig = {
    id: doc.id,
    eventId: data.eventId,
    title: data.title,
    description: data.description,
    fields: data.fields || [],
    settings: data.settings || {
      allowMultipleSubmissions: false,
      requireLogin: true,
      showProgressBar: true,
      confirmationMessage: 'Formulário enviado com sucesso!',
      emailNotifications: false,
      saveResponsesToFirestore: true,
    },
    styling: data.styling || {
      theme: 'default',
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      borderRadius: 8,
    },
    createdBy: data.createdBy,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    isActive: data.isActive ?? true,
  };

  setCachedResult(cacheKey, form);
  return form;
};

/**
 * Obter formulário personalizado por ID
 */
export const getCustomFormById = async (formId: string): Promise<CustomFormConfig | null> => {
  const formRef = doc(db, COLLECTIONS.CUSTOM_FORMS, formId);
  const formSnap = await getDoc(formRef);
  
  if (!formSnap.exists()) {
    return null;
  }
  
  const data = formSnap.data();
  return {
    id: formSnap.id,
    eventId: data.eventId,
    title: data.title,
    description: data.description,
    fields: data.fields || [],
    settings: data.settings,
    styling: data.styling,
    createdBy: data.createdBy,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    isActive: data.isActive ?? true,
  } as CustomFormConfig;
};

/**
 * Atualizar formulário personalizado
 */
export const updateCustomForm = async (formId: string, formData: Partial<CustomFormConfig>) => {
  const formRef = doc(db, COLLECTIONS.CUSTOM_FORMS, formId);
  const updateData: DocumentData = {
    ...formData,
    updatedAt: serverTimestamp(),
  };
  
  // Remover campos que não devem ser atualizados
  delete updateData.id;
  delete updateData.createdAt;
  
  await updateDoc(formRef, updateData);
  
  // Invalidar cache
  invalidateCache('custom-forms');
  if (formData.eventId) {
    invalidateCache(`form-${formData.eventId}`);
  }
};

/**
 * Excluir formulário personalizado (soft delete)
 */
export const deleteCustomForm = async (formId: string) => {
  const formRef = doc(db, COLLECTIONS.CUSTOM_FORMS, formId);
  await updateDoc(formRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
  
  // Invalidar cache
  invalidateCache('custom-forms');
  const form = await getCustomFormById(formId);
  if (form) {
    invalidateCache(`form-${form.eventId}`);
  }
};

/**
 * Listar todos os formulários personalizados
 */
export const getAllCustomForms = async (): Promise<CustomFormConfig[]> => {
  const cacheKey = 'all-custom-forms';
  const cached = getCachedResult<CustomFormConfig[]>(cacheKey);
  if (cached) return cached;

  const formsRef = collection(db, COLLECTIONS.CUSTOM_FORMS);
  const q = query(formsRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  const forms = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      eventId: data.eventId,
      title: data.title,
      description: data.description,
      fields: data.fields || [],
      settings: data.settings,
      styling: data.styling,
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      isActive: data.isActive ?? true,
    } as CustomFormConfig;
  });

  setCachedResult(cacheKey, forms);
  return forms;
};

// ===================================================================
// FORM RESPONSES OPERATIONS
// ===================================================================

/**
 * Salvar resposta do formulário
 */
export const saveFormResponse = async (responseData: Omit<FormResponse, 'id' | 'submittedAt'>) => {
  const responsesRef = collection(db, COLLECTIONS.FORM_RESPONSES);
  const newResponse = {
    ...responseData,
    submittedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(responsesRef, newResponse);
  return docRef.id;
};

/**
 * Obter respostas de um formulário específico
 */
export const getFormResponses = async (formId: string): Promise<FormResponse[]> => {
  const responsesRef = collection(db, COLLECTIONS.FORM_RESPONSES);
  const q = query(responsesRef, where('formId', '==', formId), orderBy('submittedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    formId: doc.data().formId,
    eventId: doc.data().eventId,
    userId: doc.data().userId,
    userEmail: doc.data().userEmail,
    userName: doc.data().userName,
    responses: doc.data().responses,
    submittedAt: doc.data().submittedAt?.toDate() || new Date(),
    ipAddress: doc.data().ipAddress,
    userAgent: doc.data().userAgent,
  })) as FormResponse[];
};

/**
 * Obter respostas de um evento específico
 */
export const getEventFormResponses = async (eventId: string): Promise<FormResponse[]> => {
  const responsesRef = collection(db, COLLECTIONS.FORM_RESPONSES);
  const q = query(responsesRef, where('eventId', '==', eventId), orderBy('submittedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    formId: doc.data().formId,
    eventId: doc.data().eventId,
    userId: doc.data().userId,
    userEmail: doc.data().userEmail,
    userName: doc.data().userName,
    responses: doc.data().responses,
    submittedAt: doc.data().submittedAt?.toDate() || new Date(),
    ipAddress: doc.data().ipAddress,
    userAgent: doc.data().userAgent,
  })) as FormResponse[];
};

/**
 * Verificar se usuário já respondeu formulário
 */
export const hasUserRespondedForm = async (formId: string, userEmail: string): Promise<boolean> => {
  const responsesRef = collection(db, COLLECTIONS.FORM_RESPONSES);
  const q = query(
    responsesRef, 
    where('formId', '==', formId),
    where('userEmail', '==', userEmail)
  );
  const querySnapshot = await getDocs(q);
  
  return !querySnapshot.empty;
};

