import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Event, Registration, Certificate } from '@/types';

// Collections
export const COLLECTIONS = {
  USERS: 'users',
  EVENTS: 'events',
  REGISTRATIONS: 'registrations',
  CERTIFICATES: 'certificates',
} as const;

// User functions
export const createUser = async (userData: Omit<User, 'createdAt'>) => {
  const userRef = doc(db, COLLECTIONS.USERS, userData.uid);
  await updateDoc(userRef, {
    ...userData,
    createdAt: serverTimestamp(),
  });
};

export const getUser = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
    } as User;
  }
  
  return null;
};

export const isUserAdmin = (email: string): boolean => {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  return adminEmails.includes(email);
};

// Event functions
export const createEvent = async (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
  const eventsRef = collection(db, COLLECTIONS.EVENTS);
  const docRef = await addDoc(eventsRef, {
    ...eventData,
    date: Timestamp.fromDate(eventData.date),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getEvent = async (eventId: string): Promise<Event | null> => {
  const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
  const eventSnap = await getDoc(eventRef);
  
  if (eventSnap.exists()) {
    const data = eventSnap.data();
    return {
      id: eventSnap.id,
      ...data,
      date: data.date?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Event;
  }
  
  return null;
};

export const getAllEvents = async (): Promise<Event[]> => {
  const eventsRef = collection(db, COLLECTIONS.EVENTS);
  const q = query(eventsRef, orderBy('date', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date?.toDate() || new Date(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Event[];
};

export const updateEvent = async (eventId: string, eventData: Partial<Event>) => {
  const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
  const updateData: any = {
    ...eventData,
    updatedAt: serverTimestamp(),
  };
  
  if (eventData.date) {
    updateData.date = Timestamp.fromDate(eventData.date);
  }
  
  await updateDoc(eventRef, updateData);
};

export const deleteEvent = async (eventId: string) => {
  const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
  await deleteDoc(eventRef);
};

// Registration functions
export const createRegistration = async (registrationData: Omit<Registration, 'id' | 'registeredAt'>) => {
  const registrationsRef = collection(db, COLLECTIONS.REGISTRATIONS);
  const docRef = await addDoc(registrationsRef, {
    ...registrationData,
    registeredAt: serverTimestamp(),
  });
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
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      registeredAt: data.registeredAt?.toDate() || new Date(),
      checkInTime: data.checkInTime?.toDate(),
      checkOutTime: data.checkOutTime?.toDate(),
    } as Registration;
  }
  
  return null;
};

export const getEventRegistrations = async (eventId: string): Promise<Registration[]> => {
  const registrationsRef = collection(db, COLLECTIONS.REGISTRATIONS);
  const q = query(
    registrationsRef,
    where('eventId', '==', eventId),
    orderBy('registeredAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    registeredAt: doc.data().registeredAt?.toDate() || new Date(),
    checkInTime: doc.data().checkInTime?.toDate(),
    checkOutTime: doc.data().checkOutTime?.toDate(),
  })) as Registration[];
};

export const updateRegistration = async (registrationId: string, data: Partial<Registration>) => {
  const registrationRef = doc(db, COLLECTIONS.REGISTRATIONS, registrationId);
  const updateData: any = { ...data };
  
  if (data.checkInTime) {
    updateData.checkInTime = Timestamp.fromDate(data.checkInTime);
  }
  
  if (data.checkOutTime) {
    updateData.checkOutTime = Timestamp.fromDate(data.checkOutTime);
  }
  
  await updateDoc(registrationRef, updateData);
};

// Certificate functions
export const createCertificate = async (certificateData: Omit<Certificate, 'id' | 'generatedAt'>) => {
  const certificatesRef = collection(db, COLLECTIONS.CERTIFICATES);
  const docRef = await addDoc(certificatesRef, {
    ...certificateData,
    eventDate: Timestamp.fromDate(certificateData.eventDate),
    generatedAt: serverTimestamp(),
  });
  return docRef.id;
};

