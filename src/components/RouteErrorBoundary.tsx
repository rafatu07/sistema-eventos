'use client';

import React from 'react';
import { ErrorBoundary, ErrorFallbackProps } from './ErrorBoundary';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Error Boundary específico para rotas
export function RouteErrorBoundary({ 
  children, 
  routeName,
  showBackButton = true 
}: { 
  children: React.ReactNode;
  routeName: string;
  showBackButton?: boolean;
}) {
  return (
    <ErrorBoundary
      fallback={(props) => (
        <RouteFallback 
          {...props} 
          routeName={routeName} 
          showBackButton={showBackButton} 
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// Fallback específico para páginas/rotas
function RouteFallback({ 
  error, 
  resetError, 
  errorId, 
  routeName,
  showBackButton 
}: ErrorFallbackProps & { 
  routeName: string; 
  showBackButton: boolean; 
}) {
  const router = useRouter();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-[50vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-orange-500 mb-4" />
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Erro na página {routeName}
        </h2>
        
        <p className="text-gray-600 mb-4">
          Não foi possível carregar esta página completamente.
        </p>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-orange-800">
            <strong>Erro:</strong> {error.message}
          </p>
          <p className="text-xs text-orange-700 mt-1">
            ID: {errorId}
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={resetError}
            className="btn-primary w-full flex items-center justify-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </button>

          {showBackButton && (
            <button
              onClick={handleGoBack}
              className="btn-outline w-full flex items-center justify-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </button>
          )}

          <Link
            href="/dashboard"
            className="btn-outline w-full flex items-center justify-center"
          >
            Ir para Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

// Error Boundary para componentes específicos
export function ComponentErrorBoundary({ 
  children, 
  componentName,
  fallbackComponent
}: { 
  children: React.ReactNode;
  componentName: string;
  fallbackComponent?: React.ComponentType<{ retry: () => void }>;
}) {
  return (
    <ErrorBoundary
      fallback={(props) => 
        fallbackComponent ? (
          React.createElement(fallbackComponent, { retry: props.resetError })
        ) : (
          <ComponentFallback {...props} componentName={componentName} />
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// Fallback simples para componentes
function ComponentFallback({ 
  resetError, 
  componentName 
}: ErrorFallbackProps & { 
  componentName: string 
}) {
  return (
    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
      <div className="flex items-center text-red-800 mb-2">
        <AlertTriangle className="h-4 w-4 mr-2" />
        <span className="text-sm font-medium">
          Erro no componente: {componentName}
        </span>
      </div>
      <p className="text-xs text-red-700 mb-3">
        Este componente não pôde ser carregado corretamente.
      </p>
      <button
        onClick={resetError}
        className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded border border-red-300"
      >
        Tentar Novamente
      </button>
    </div>
  );
}

// Error Boundary para formulários
export function FormErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ resetError, error }) => (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-red-800 mb-2">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span className="font-medium">Erro no formulário</span>
          </div>
          <p className="text-sm text-red-700 mb-3">
            {error.message}
          </p>
          <button
            onClick={resetError}
            className="btn-outline text-sm"
          >
            Resetar Formulário
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
