'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getEvent } from '@/lib/firestore';
import { Event } from '@/types';
import { Loading } from '@/components/Loading';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  UserCheck,
  CheckCircle,
  AlertCircle,
  LogIn,
  QrCode,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

export default function QRCheckinPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const eventId = params.eventId as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkInResult, setCheckInResult] = useState<{
    success?: boolean;
    message?: string;
    eventName?: string;
    checkInTime?: string;
    alreadyCheckedIn?: boolean;
    registration?: {
      id: string;
      userName: string;
      userEmail: string;
      checkedIn: boolean;
      checkInTime: Date;
    };
  } | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Garantir que a formatação de datas aconteça apenas no cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        if (!eventId) return;

        const eventData = await getEvent(eventId);
        if (!eventData) {
          setError('Evento não encontrado');
          return;
        }
        setEvent(eventData);
      } catch (error) {
        console.error('Error loading event:', error);
        setError('Erro ao carregar evento');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  const handleCheckin = async () => {
    if (!user || !event) return;

    setCheckinLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/qr-checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        setCheckInResult(data);
        
        // Redirecionar para o dashboard após 3 segundos
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        setError(data.error || 'Erro ao realizar check-in');
        
        // Se já fez check-in, mostrar informações
        if (data.alreadyCheckedIn) {
          setCheckInResult({
            ...data,
            eventName: event.name
          });
        }
      }

    } catch (error) {
      console.error('Error during checkin:', error);
      setError('Erro interno. Tente novamente.');
    } finally {
      setCheckinLoading(false);
    }
  };

  const formatEventTimes = (event: Event) => {
    if (!isClient) {
      return {
        dateStr: 'Carregando...',
        startTimeStr: '--:--',
        endTimeStr: '--:--',
        fullTimeStr: '--:-- às --:--',
      };
    }

    const dateStr = event.date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    
    const startTimeStr = event.startTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const endTimeStr = event.endTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    return {
      dateStr,
      startTimeStr,
      endTimeStr,
      fullTimeStr: `${startTimeStr} às ${endTimeStr}`,
    };
  };

  if (loading || authLoading) {
    return <Loading text="Carregando evento..." />;
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erro</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/dashboard" className="btn-primary">
              Voltar ao Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <QrCode className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Evento não encontrado</h3>
            <p className="text-gray-600 mb-6">O evento que você está procurando não existe.</p>
            <Link href="/dashboard" className="btn-primary">
              Voltar ao Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const times = formatEventTimes(event);

  // Usuário não autenticado
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center py-6">
              <div className="flex items-center">
                <QrCode className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-xl font-bold text-gray-900">Check-in via QR Code</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Event Info */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg mb-8">
            <h1 className="text-2xl font-bold mb-2">{event.name}</h1>
            <p className="text-blue-100 mb-4">{event.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                {times.dateStr}
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                {times.fullTimeStr}
              </div>
              <div className="flex items-center md:col-span-2">
                <MapPin className="h-4 w-4 mr-2" />
                {event.location}
              </div>
            </div>
          </div>

          {/* Login Required */}
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <QrCode className="mx-auto h-16 w-16 text-blue-600 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Check-in por QR Code
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Para fazer check-in neste evento via QR Code, você precisa estar logado em sua conta. 
              Após o login, você será automaticamente redirecionado para confirmar seu check-in.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-left">
                  <p className="font-medium text-blue-900 mb-1">Processo rápido e seguro:</p>
                  <ul className="text-blue-700 space-y-1 text-sm">
                    <li>• Faça login com sua conta</li>
                    <li>• Check-in automático será processado</li>
                    <li>• Confirmação instantânea</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href={`/login?redirect=${encodeURIComponent(`/checkin/${eventId}`)}`}
                className="btn-primary flex items-center justify-center group"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Fazer Login para Check-in
                <ArrowRight className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              
              <Link 
                href={`/public/evento/${eventId}`}
                className="btn-outline flex items-center justify-center"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Registrar no Evento
              </Link>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Não tem conta? <Link href="/register" className="text-blue-600 hover:text-blue-700 underline">Registre-se aqui</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <QrCode className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Check-in via QR Code</h1>
            </div>
            <div className="text-sm text-gray-600">
              Olá, <span className="font-medium">{user.displayName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Event Info */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg mb-8">
          <h1 className="text-2xl font-bold mb-2">{event.name}</h1>
          <p className="text-blue-100 mb-4">{event.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              {times.dateStr}
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              {times.fullTimeStr}
            </div>
            <div className="flex items-center md:col-span-2">
              <MapPin className="h-4 w-4 mr-2" />
              {event.location}
            </div>
          </div>
        </div>

        {/* Check-in Section */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {success && (
            <div className="bg-green-50 border-b border-green-200 p-6">
              <div className="flex items-center">
                <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-900">{success}</h3>
                  <p className="text-green-700 mt-1">
                    Redirecionando para o dashboard em alguns segundos...
                  </p>
                </div>
              </div>
              
              {checkInResult && (
                <div className="mt-4 p-4 bg-green-100 rounded-lg">
                  <div className="text-sm text-green-800">
                    <strong>Detalhes do Check-in:</strong>
                    <div className="mt-2 space-y-1">
                      <div>Participante: {checkInResult.registration?.userName}</div>
                      <div>
                        Horário: {isClient && checkInResult.checkInTime 
                          ? new Date(checkInResult.checkInTime).toLocaleString('pt-BR')
                          : 'Agora'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-b border-red-200 p-6">
              <div className="flex items-center">
                <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900">Erro no Check-in</h3>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              </div>
              
              {checkInResult && checkInResult.alreadyCheckedIn && (
                <div className="mt-4 p-4 bg-red-100 rounded-lg">
                  <div className="text-sm text-red-800">
                    <strong>Você já fez check-in neste evento!</strong>
                    <div className="mt-2 space-y-1">
                      {checkInResult.checkInTime && isClient && (
                        <div>
                          Check-in realizado em: {new Date(checkInResult.checkInTime).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="p-8">
            {!success ? (
              <div className="text-center">
                <UserCheck className="mx-auto h-16 w-16 text-blue-600 mb-6" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Confirmar Check-in
                </h2>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Você está prestes a fazer check-in no evento <strong>{event.name}</strong>.
                  Clique no botão abaixo para confirmar sua presença.
                </p>
                
                <div className="space-y-4">
                  <button
                    onClick={handleCheckin}
                    disabled={checkinLoading}
                    className="btn-primary w-full flex items-center justify-center text-lg py-4"
                  >
                    {checkinLoading ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                        Fazendo Check-in...
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-5 w-5 mr-3" />
                        Confirmar Check-in
                      </>
                    )}
                  </button>
                  
                  <Link 
                    href="/dashboard"
                    className="btn-outline w-full flex items-center justify-center"
                  >
                    Voltar ao Dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-6" />
                <h2 className="text-2xl font-bold text-green-900 mb-4">
                  Check-in Realizado!
                </h2>
                <p className="text-green-700 mb-6">
                  Sua presença foi confirmada com sucesso.
                </p>
                
                <Link 
                  href="/dashboard"
                  className="btn-primary flex items-center justify-center"
                >
                  Ir para Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
