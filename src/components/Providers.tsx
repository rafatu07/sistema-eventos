'use client';

import React, { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from '@/contexts/AuthContext';
import { queryClient, warmupCache, cacheUtils } from '@/lib/query-client';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    // Initialize cache and warmup strategies
    const initializeApp = async () => {
      try {
        await warmupCache();
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 Cache Statistics:', cacheUtils.getCacheStats());
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.warn('⚠️ App initialization warning:', error);
        setIsInitialized(true); // Continue anyway
      }
    };
    
    initializeApp();
  }, []);
  
  // Show enhanced loading screen during initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-400 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">Inicializando Sistema de Certificados</p>
            <p className="text-gray-500 text-sm animate-pulse">Preparando cache e configurações...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        {/* DevTools apenas em desenvolvimento com configurações aprimoradas */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools 
            initialIsOpen={false}
            buttonPosition="bottom-left"
            position="bottom"
          />
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}
