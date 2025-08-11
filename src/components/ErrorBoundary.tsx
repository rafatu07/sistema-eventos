'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  resetError: () => void;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Gerar ID único para o erro
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Log do erro
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
    
    // Executar callback personalizado se fornecido
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Enviar erro para serviço de monitoramento (se disponível)
    this.reportError(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset automático quando props mudam (se habilitado)
    if (
      hasError &&
      resetOnPropsChange &&
      prevProps.children !== this.props.children
    ) {
      this.resetError();
    }

    // Reset baseado em chaves específicas
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (resetKey, idx) => prevProps.resetKeys![idx] !== resetKey
      );

      if (hasResetKeyChanged) {
        this.resetError();
      }
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  // Reportar erro para serviço de monitoramento
  private reportError(error: Error, errorInfo: ErrorInfo) {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Em produção, enviar para serviço como Sentry
    if (process.env.NODE_ENV === 'production') {
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport),
      // }).catch(console.error);
    }

    // Log local para desenvolvimento
    console.warn('Erro reportado:', errorReport);
  }

  override render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error!}
          errorInfo={this.state.errorInfo!}
          resetError={this.resetError}
          errorId={this.state.errorId!}
        />
      );
    }

    return this.props.children;
  }
}

// Componente de fallback padrão
export function DefaultErrorFallback({
  error,
  errorInfo,
  resetError,
  errorId,
}: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  const [isReloading, setIsReloading] = React.useState(false);

  const handleReload = () => {
    setIsReloading(true);
    // Pequeno delay para mostrar o loading
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const copyErrorDetails = () => {
    const errorDetails = `
Erro ID: ${errorId}
Timestamp: ${new Date().toISOString()}
Mensagem: ${error.message}
Stack: ${error.stack}
Component Stack: ${errorInfo.componentStack}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      alert('Detalhes do erro copiados para a área de transferência');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! Algo deu errado
          </h1>
          
          <p className="text-gray-600 mb-6">
            Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver o problema.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-sm">
              <p className="font-medium text-red-800 mb-2">
                ID do Erro: <code className="bg-red-100 px-1 rounded text-xs">{errorId}</code>
              </p>
              <p className="text-red-700">
                {error.message}
              </p>
            </div>

            {/* Detalhes técnicos (collapsible) */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mt-3 inline-flex items-center text-sm text-red-700 hover:text-red-800"
            >
              Detalhes técnicos
              {showDetails ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-1 h-4 w-4" />
              )}
            </button>

            {showDetails && (
              <div className="mt-3 p-3 bg-red-100 rounded border text-xs text-red-800 font-mono overflow-auto max-h-40">
                <pre className="whitespace-pre-wrap">{error.stack}</pre>
                {errorInfo.componentStack && (
                  <>
                    <hr className="my-2 border-red-200" />
                    <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={resetError}
                className="btn-primary flex items-center justify-center"
                disabled={isReloading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </button>

              <button
                onClick={handleReload}
                className="btn-outline flex items-center justify-center"
                disabled={isReloading}
              >
                {isReloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                    Recarregando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recarregar Página
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleGoHome}
                className="btn-outline flex items-center justify-center"
              >
                <Home className="h-4 w-4 mr-2" />
                Ir para Início
              </button>

              <button
                onClick={copyErrorDetails}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Copiar detalhes do erro
              </button>
            </div>
          </div>

          <div className="mt-8 text-xs text-gray-400">
            <p>
              Se o problema persistir, entre em contato com nosso suporte
              informando o ID do erro: <strong>{errorId}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook para usar ErrorBoundary de forma declarativa
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);
  
  // Re-throw em um useEffect para que seja capturado pelo ErrorBoundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}

// HOC para envolver componentes automaticamente
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorFallbackProps>
) {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}
