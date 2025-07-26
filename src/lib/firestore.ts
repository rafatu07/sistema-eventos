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
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { Event, Registration, User } from '@/types';

const COLLECTIONS = {
  USERS: 'users',
  EVENTS: 'events',
  REGISTRATIONS: 'registrations',
} as const;

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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(eventsRef, newEvent);
  return docRef.id;
};

export const getEvent = async (eventId: string): Promise<Event | null> => {
  const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
  const eventSnap = await getDoc(eventRef);
  
  if (eventSnap.exists()) {
    const data = eventSnap.data();
    return {
      id: eventSnap.id,
      name: data.name,
      description: data.description,
      date: data.date.toDate(),
      location: data.location,
      createdBy: data.createdBy,
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
    name: doc.data().name,
    description: doc.data().description,
    date: doc.data().date.toDate(),
    location: doc.data().location,
    createdBy: doc.data().createdBy,
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Event[];
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
  
  await updateDoc(eventRef, updateData);
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
      createdAt: data.createdAt?.toDate() || new Date(),
      checkInTime: data.checkInTime?.toDate(),
      checkOutTime: data.checkOutTime?.toDate(),
    } as Registration;
  }
  
  return null;
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
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    checkInTime: doc.data().checkInTime?.toDate(),
    checkOutTime: doc.data().checkOutTime?.toDate(),
  })) as Registration[];
};

export const updateRegistration = async (registrationId: string, data: Partial<Registration>) => {
  const registrationRef = doc(db, COLLECTIONS.REGISTRATIONS, registrationId);
  const updateData: DocumentData = { ...data };
  
  if (data.checkInTime) {
    updateData.checkInTime = Timestamp.fromDate(data.checkInTime);
  }
  
  if (data.checkOutTime) {
    updateData.checkOutTime = Timestamp.fromDate(data.checkOutTime);
  }
  
  await updateDoc(registrationRef, updateData);
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

