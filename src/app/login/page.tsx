'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/Loading';
import { SEOHead } from '@/components/SEOHead';
import { AlertCircle, Info } from 'lucide-react';

function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (user && !authLoading) {
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl) {
        // Decodificar e validar a URL de redirecionamento
        try {
          const decodedUrl = decodeURIComponent(redirectUrl);
          // Verificar se é uma URL interna válida
          if (decodedUrl.startsWith('/') && !decodedUrl.startsWith('//')) {
            router.push(decodedUrl);
            return;
          }
        } catch {
          // Se houver erro no decode, ir para dashboard
        }
      }
      router.push('/dashboard');
    }
  }, [user, authLoading, router, searchParams]);

  useEffect(() => {
    // Verificar se há parâmetros de URL para preencher dados
    const emailParam = searchParams.get('email');
    const messageParam = searchParams.get('message');
    const redirectParam = searchParams.get('redirect');
    
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
    
    if (messageParam) {
      setInfo(decodeURIComponent(messageParam));
    } else if (redirectParam?.includes('/checkin/')) {
      setInfo('Faça login para confirmar seu check-in no evento via QR Code');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
      }
    } catch (error) {
      setError((error as Error).message || 'Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Limpar erro quando alternar entre login/cadastro
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setInfo('');
    if (!searchParams.get('email')) {
      setEmail('');
    }
    setPassword('');
    setDisplayName('');
  };

  if (authLoading) {
    return <Loading text="Verificando autenticação..." />;
  }

  if (user) {
    return <Loading text="Redirecionando..." />;
  }

  return (
    <>
      <SEOHead 
        title={isLogin ? 'Login - Sistema de Gestão de Eventos' : 'Cadastro - Sistema de Gestão de Eventos'}
        description={isLogin 
          ? 'Faça login no Sistema de Gestão de Eventos para acessar sua conta e gerenciar seus eventos.'
          : 'Crie sua conta no Sistema de Gestão de Eventos e comece a gerenciar eventos de forma eficiente.'
        }
        keywords={['login', 'entrar', 'cadastro', 'conta', 'acesso', 'eventos']}
      />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistema de Gestão de Eventos
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {!isLogin && (
              <div>
                <label htmlFor="displayName" className="sr-only">
                  Nome completo
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required={!isLogin}
                  className="input rounded-t-md"
                  placeholder="Nome completo"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`input ${isLogin ? 'rounded-t-md' : ''}`}
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input rounded-b-md"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {info && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Informação
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    {info}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Erro de autenticação
                  </h3>
                  <p className="mt-1 text-sm text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processando...
                </div>
              ) : (
                isLogin ? 'Entrar' : 'Criar conta'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={toggleAuthMode}
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              {isLogin
                ? 'Não tem uma conta? Cadastre-se'
                : 'Já tem uma conta? Entre'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading text="Carregando página..." />}>
      <LoginForm />
    </Suspense>
  );
}

