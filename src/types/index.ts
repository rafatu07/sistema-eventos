export interface User {
  uid: string;
  email: string;
  displayName?: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  date: Date;
  location: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userCPF: string;
  registeredAt: Date;
  checkedIn: boolean;
  checkedOut: boolean;
  checkInTime?: Date;
  checkOutTime?: Date;
  certificateUrl?: string;
  certificateGenerated: boolean;
}

export interface Certificate {
  id: string;
  registrationId: string;
  eventId: string;
  userId: string;
  userName: string;
  eventName: string;
  eventDate: Date;
  generatedAt: Date;
  cloudinaryUrl: string;
  publicId: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export interface EventFormData {
  name: string;
  description: string;
  date: string;
  location: string;
}

// Nova interface para inscrição pública
export interface PublicRegistrationData {
  name: string;
  email: string;
  cpf: string;
  phone?: string;
}

