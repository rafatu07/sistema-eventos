'use client';

import React from 'react';
import { useAppStore } from './appStore';

// Hook que sempre chama useAppStore mas retorna fallback durante SSR
export const useSafeUI = () => {
  const [isClient, setIsClient] = React.useState(false);
  
  // Sempre chama o hook para manter ordem consistente
  const storeState = useAppStore((state) => ({
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

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Retorna fallback durante SSR, estado real no cliente
  return isClient ? storeState : fallback;
};
