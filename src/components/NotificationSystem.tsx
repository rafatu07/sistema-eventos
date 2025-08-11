'use client';

import React, { useEffect, useState } from 'react';
import { useSafeUI } from '@/store/safeHooks';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export function NotificationSystem() {
  const [mounted, setMounted] = useState(false);
  
  // Só montar após hidratação
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <NotificationSystemInner />;
}

function NotificationSystemInner() {
  const { notifications, removeNotification } = useSafeUI();

  // Auto-remover notificações após 5 segundos
  useEffect(() => {
    if (!notifications.length) return;

    const timers = notifications
      .filter(notification => !notification.read)
      .map(notification => {
        return setTimeout(() => {
          removeNotification(notification.id);
        }, 5000);
      });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [notifications, removeNotification]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div 
      className="fixed top-4 right-4 z-50 space-y-2"
      role="region"
      aria-label="Notificações do sistema"
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            max-w-sm w-full p-4 rounded-lg border shadow-lg
            transform transition-all duration-300 ease-in-out
            hover:scale-105 ${getBackgroundColor(notification.type)}
            ${!notification.read ? 'animate-slide-in-right' : ''}
          `}
          role="alert"
          aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getIcon(notification.type)}
            </div>
            
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-semibold text-gray-900">
                {notification.title}
              </h4>
              <p className="mt-1 text-sm text-gray-700">
                {notification.message}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {notification.createdAt ? new Date(notification.createdAt).toLocaleTimeString('pt-BR') : ''}
              </p>
            </div>

            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={() => removeNotification(notification.id)}
                className="
                  rounded-md inline-flex text-gray-400 
                  hover:text-gray-500 focus:outline-none 
                  focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                "
                aria-label="Fechar notificação"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Função NotificationSystem já exportada no topo do arquivo

// Hook simplificado para evitar loops - só console.log por enquanto
export function useNotifications() {
  const showNotification = {
    success: (title: string, message: string) => {
      console.log('✅ Success:', title, message);
      // TODO: Re-implementar notificações quando o Zustand estiver estável
    },
    error: (title: string, message: string) => {
      console.error('❌ Error:', title, message);
      // TODO: Re-implementar notificações quando o Zustand estiver estável
    },
    warning: (title: string, message: string) => {
      console.warn('⚠️ Warning:', title, message);
      // TODO: Re-implementar notificações quando o Zustand estiver estável
    },
    info: (title: string, message: string) => {
      console.info('ℹ️ Info:', title, message);
      // TODO: Re-implementar notificações quando o Zustand estiver estável
    },
  };

  return showNotification;
}
