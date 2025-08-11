'use client';

import React from 'react';
import { useAppStore } from './appStore';

// Versão simplificada - só usar no cliente
export const useSafeUI = () => {
  // Fallback padrão para SSR
  const fallback = React.useMemo(() => ({
    theme: 'light' as const,
    sidebarOpen: false,
    notifications: [],
    toggleTheme: () => {},
    setTheme: () => {},
    toggleSidebar: () => {},
    setSidebarOpen: () => {},
    addNotification: () => {},
    removeNotification: () => {},
    markNotificationAsRead: () => {},
    clearNotifications: () => {},
  }), []);

  // Se não tiver window, retorna fallback
  if (typeof window === 'undefined') {
    return fallback;
  }

  // Hook estável no cliente
  return useAppStore((state) => ({
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
  }));
};
