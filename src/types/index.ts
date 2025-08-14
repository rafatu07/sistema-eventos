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
  startTime: Date;
  endTime: Date;
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
  createdAt: Date;
  checkedIn: boolean;
  checkedOut: boolean;
  checkInTime?: Date | undefined;
  checkOutTime?: Date | undefined;
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
  signOut: () => Promise<void>;
}

export interface EventFormData {
  name: string;
  description: string;
  date: string; // ISO string for form input
  startTime: string;
  endTime: string;
  location: string;
}

export interface PublicRegistrationData {
  name: string;
  email: string;
  cpf: string;
  phone?: string;
  password: string;
}

export interface CertificateConfig {
  id: string;
  eventId: string;
  template: 'modern' | 'classic' | 'elegant' | 'minimalist';
  orientation: 'landscape' | 'portrait';
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  borderColor: string;
  titleFontSize: number;
  nameFontSize: number;
  bodyFontSize: number;
  fontFamily: 'helvetica' | 'times' | 'courier' | 'DejaVuSans';
  title: string;
  subtitle?: string;
  bodyText: string;
  footer?: string;
  titlePosition: { x: number; y: number };
  namePosition: { x: number; y: number };
  bodyPosition: { x: number; y: number };
  logoUrl?: string;
  logoSize: number;
  logoPosition: { x: number; y: number };
  showBorder: boolean;
  borderWidth: number;
  showWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  includeQRCode: boolean;
  qrCodeText?: string;
  qrCodePosition: { x: number; y: number };
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Re-export custom form types
export * from './custom-forms';

