'use client';

import React, { Suspense, lazy } from 'react';
import { Loading } from './Loading';

// Componente genérico para lazy loading
interface LazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function LazyLoader({ 
  children, 
  fallback,
  className 
}: LazyLoaderProps) {
  const defaultFallback = (
    <div className={className}>
      <Loading size="md" text="Carregando componente..." />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

// Hook para lazy loading condicional
export function useLazyLoad<T>(
  importFn: () => Promise<{ default: T }>,
  condition: boolean = true
) {
  const [Component, setComponent] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!condition || Component) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    importFn()
      .then((module) => {
        if (!cancelled) {
          setComponent(module.default);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [condition, importFn, Component]);

  return { Component, loading, error };
}

// HOC para criar lazy components
export function createLazyComponent<Props extends object>(
  importFn: () => Promise<{ default: React.ComponentType<Props> }>,
  displayName?: string
) {
  const LazyComponent = lazy(importFn);
  
  const WrappedComponent = (props: Props) => (
    <LazyLoader>
      <LazyComponent {...props} />
    </LazyLoader>
  );

  WrappedComponent.displayName = displayName || 'LazyComponent';
  
  return WrappedComponent;
}

// Componentes lazy específicos
export const LazyQRCodeGenerator = createLazyComponent(
  () => import('./QRCodeGenerator'),
  'LazyQRCodeGenerator'
);

// Observer para lazy loading baseado em visibilidade
export function useIntersectionObserver<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsIntersecting(entry.isIntersecting);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, options]);

  return isIntersecting;
}

// Componente para lazy loading baseado em visibilidade
export function LazyIntersection({
  children,
  fallback,
  className,
  ...options
}: LazyLoaderProps & IntersectionObserverInit) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver<HTMLDivElement>(ref, options);

  return (
    <div ref={ref} className={className}>
      {isVisible ? (
        <LazyLoader fallback={fallback}>
          {children}
        </LazyLoader>
      ) : (
        fallback || <div className="h-32" /> // Placeholder
      )}
    </div>
  );
}

// Preloader para componentes críticos
export function preloadComponent<T>(
  importFn: () => Promise<{ default: T }>
): Promise<T> {
  return importFn().then(module => module.default);
}

// Hook para preload baseado em hover
export function usePreloadOnHover<T>(
  importFn: () => Promise<{ default: T }>
) {
  const preloadRef = React.useRef<Promise<T> | null>(null);

  const handleMouseEnter = React.useCallback(() => {
    if (!preloadRef.current) {
      preloadRef.current = preloadComponent(importFn);
    }
  }, [importFn]);

  return { onMouseEnter: handleMouseEnter, preloadRef };
}

// Componente para lazy loading de rotas
export function LazyRoute({ 
  children
}: { 
  children: React.ReactNode;
}) {
  return (
    <LazyLoader
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loading size="lg" text="Carregando página..." />
        </div>
      }
    >
      {children}
    </LazyLoader>
  );
}
