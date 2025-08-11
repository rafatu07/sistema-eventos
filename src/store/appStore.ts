import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import React from 'react';

// === TYPES ===
export interface User {
  uid: string;
  email: string;
  name?: string;
  role?: 'admin' | 'organizer' | 'participant';
  photoURL?: string;
  createdAt?: string;
  lastLogin?: string;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  maxAttendees?: number;
  currentAttendees?: number;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  tags?: string[];
  imageUrl?: string;
  certificateTemplate?: string;
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'registered' | 'checked-in' | 'cancelled';
  registeredAt: string;
  checkedInAt?: string;
  certificateGenerated?: boolean;
  certificateUrl?: string;
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt?: string;
  autoRemove?: boolean;
  duration?: number;
}

// === STATE INTERFACES ===
export interface AppState {
  // === USUÁRIO ===
  user: User | null;
  isAuthenticated: boolean;
  
  // === EVENTOS ===
  events: Event[];
  currentEvent: Event | null;
  eventsLoading: boolean;
  
  // === INSCRIÇÕES ===
  userRegistrations: Registration[];
  registrationsLoading: boolean;
  
  // === UI ===
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  notifications: Notification[];
  
  // === CACHE ===
  lastFetch: {
    events?: number;
    registrations?: number;
  };
}

export interface AppActions {
  // === AÇÕES DO USUÁRIO ===
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  clearUser: () => void;
  
  // === AÇÕES DOS EVENTOS ===
  setEvents: (events: Event[]) => void;
  addEvent: (event: Event) => void;
  updateEvent: (eventId: string, updates: Partial<Event>) => void;
  removeEvent: (eventId: string) => void;
  setCurrentEvent: (event: Event | null) => void;
  setEventsLoading: (loading: boolean) => void;
  
  // === AÇÕES DAS INSCRIÇÕES ===
  setUserRegistrations: (registrations: Registration[]) => void;
  addRegistration: (registration: Registration) => void;
  updateRegistration: (registrationId: string, updates: Partial<Registration>) => void;
  removeRegistration: (registrationId: string) => void;
  setRegistrationsLoading: (loading: boolean) => void;
  
  // === AÇÕES DA UI ===
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // === NOTIFICAÇÕES ===
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
}

type AppStore = AppState & AppActions;

// === STORE ===
export const useAppStore = create<AppStore>()(
  persist(
    immer((set) => ({
      // === ESTADO INICIAL ===
      user: null,
      isAuthenticated: false,
      events: [],
      currentEvent: null,
      eventsLoading: false,
      userRegistrations: [],
      registrationsLoading: false,
      theme: 'light',
      sidebarOpen: false,
      notifications: [],
      lastFetch: {},

      // === AÇÕES DO USUÁRIO ===
      setUser: (user) => {
        set((state) => {
          state.user = user;
          state.isAuthenticated = !!user;
        });
      },

      updateUser: (updates) => {
        set((state) => {
          if (state.user) {
            Object.assign(state.user, updates);
          }
        });
      },

      clearUser: () => {
        set((state) => {
          state.user = null;
          state.isAuthenticated = false;
          state.events = [];
          state.userRegistrations = [];
        });
      },

      // === AÇÕES DOS EVENTOS ===
      setEvents: (events) => {
        set((state) => {
          state.events = events;
        });
      },

      addEvent: (event) => {
        set((state) => {
          state.events.unshift(event); // Adicionar no início
        });
      },

      updateEvent: (eventId, updates) => {
        set((state) => {
          const eventIndex = state.events.findIndex(e => e.id === eventId);
          if (eventIndex !== -1) {
            const currentEvent = state.events[eventIndex];
            state.events[eventIndex] = { ...currentEvent, ...updates } as Event;
          }
          
          // Atualizar evento atual se for o mesmo
          if (state.currentEvent?.id === eventId) {
            state.currentEvent = { ...state.currentEvent, ...updates } as Event;
          }
        });
      },

      removeEvent: (eventId) => {
        set((state) => {
          state.events = state.events.filter(e => e.id !== eventId);
          
          // Limpar evento atual se for o mesmo
          if (state.currentEvent?.id === eventId) {
            state.currentEvent = null;
          }
        });
      },

      setCurrentEvent: (event) => {
        set((state) => {
          state.currentEvent = event;
        });
      },

      setEventsLoading: (loading) => {
        set((state) => {
          state.eventsLoading = loading;
        });
      },

      // === AÇÕES DAS INSCRIÇÕES ===
      setUserRegistrations: (registrations) => {
        set((state) => {
          state.userRegistrations = registrations;
        });
      },

      addRegistration: (registration) => {
        set((state) => {
          state.userRegistrations.push(registration);
        });
      },

      updateRegistration: (registrationId, updates) => {
        set((state) => {
          const regIndex = state.userRegistrations.findIndex(r => r.id === registrationId);
          if (regIndex !== -1) {
            const currentReg = state.userRegistrations[regIndex];
            state.userRegistrations[regIndex] = { ...currentReg, ...updates } as Registration;
          }
        });
      },

      removeRegistration: (registrationId) => {
        set((state) => {
          state.userRegistrations = state.userRegistrations.filter(r => r.id !== registrationId);
        });
      },

      setRegistrationsLoading: (loading) => {
        set((state) => {
          state.registrationsLoading = loading;
        });
      },

      // === AÇÕES DA UI ===
      toggleTheme: () => {
        set((state) => {
          state.theme = state.theme === 'light' ? 'dark' : 'light';
        });
      },

      setTheme: (theme) => {
        set((state) => {
          state.theme = theme;
        });
      },

      toggleSidebar: () => {
        set((state) => {
          state.sidebarOpen = !state.sidebarOpen;
        });
      },

      setSidebarOpen: (open) => {
        set((state) => {
          state.sidebarOpen = open;
        });
      },

      // === NOTIFICAÇÕES ===
      addNotification: (notification) => {
        set((state) => {
          const newNotification: Notification = {
            ...notification,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
          };
          state.notifications.push(newNotification);
        });
      },

      removeNotification: (id) => {
        set((state) => {
          state.notifications = state.notifications.filter(n => n.id !== id);
        });
      },

      markNotificationAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification) {
            notification.read = true;
          }
        });
      },

      clearNotifications: () => {
        set((state) => {
          state.notifications = [];
        });
      },
    })),
    {
      name: 'app-store',
      storage: createJSONStorage(() => {
        // SSR-safe storage
        if (typeof window !== 'undefined') {
          return window.localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      skipHydration: typeof window === 'undefined',
    }
  )
);

// === HOOKS DERIVADOS MEMOIZADOS ===
export const useUser = () => 
  useAppStore(React.useCallback((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    setUser: state.setUser,
    updateUser: state.updateUser,
    clearUser: state.clearUser,
  }), []));

export const useEvents = () => 
  useAppStore(React.useCallback((state) => ({
    events: state.events,
    currentEvent: state.currentEvent,
    eventsLoading: state.eventsLoading,
    setEvents: state.setEvents,
    addEvent: state.addEvent,
    updateEvent: state.updateEvent,
    removeEvent: state.removeEvent,
    setCurrentEvent: state.setCurrentEvent,
    setEventsLoading: state.setEventsLoading,
  }), []));

export const useRegistrations = () => 
  useAppStore(React.useCallback((state) => ({
    userRegistrations: state.userRegistrations,
    registrationsLoading: state.registrationsLoading,
    setUserRegistrations: state.setUserRegistrations,
    addRegistration: state.addRegistration,
    updateRegistration: state.updateRegistration,
    removeRegistration: state.removeRegistration,
    setRegistrationsLoading: state.setRegistrationsLoading,
  }), []));

export const useUI = () => 
  useAppStore(React.useCallback((state) => ({
    theme: state.theme,
    sidebarOpen: state.sidebarOpen,
    notifications: state.notifications,
    toggleTheme: state.toggleTheme,
    setTheme: state.setTheme,
    toggleSidebar: state.toggleSidebar,
    setSidebarOpen: state.setSidebarOpen,
    addNotification: state.addNotification,
    removeNotification: state.removeNotification,
    markNotificationAsRead: state.markNotificationAsRead,
    clearNotifications: state.clearNotifications,
  }), []));

export const useCache = () => 
  useAppStore(React.useCallback((state) => ({
    lastFetch: state.lastFetch,
  }), []));
