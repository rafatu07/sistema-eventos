'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { Loading } from '@/components/Loading';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { 
  getEvent, 
  getRegistration, 
  getEventRegistrations, 
  createRegistration, 
  updateRegistration 
} from '@/lib/firestore';
import { Event, Registration } from '@/types';
import { 
  MapPin, 
  Clock, 
  UserPlus, 
  UserCheck, 
  LogOut, 
  Award,
  QrCode,
  FileDown,
  Edit
} from 'lucide-react';
import Link from 'next/link';

export default function EventDetailsPage() {
  const params = useParams();
  const { user } = useAuth();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user) return;

        const eventData = await getEvent(eventId);
        if (!eventData) {
          setError('Evento não encontrado');
          return;
        }
        setEvent(eventData);

        // Load user registration
        const userRegistration = await getRegistration(eventId, user.uid);
        setRegistration(userRegistration);

        // Load all registrations if user is admin
        if (user.isAdmin) {
          const registrations = await getEventRegistrations(eventId);
          setAllRegistrations(registrations);
        }
      } catch (error) {
        console.error('Error loading event data:', error);
        setError('Erro ao carregar dados do evento');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId, user]);

  // Check for auto checkout when event ends
  useEffect(() => {
    if (!event) return;

    const checkAutoCheckout = () => {
      const now = new Date();
      if (now >= event.endTime) {
        // Event has ended, trigger auto checkout
        fetch('/api/auto-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ eventId }),
        }).catch(error => {
          console.error('Error triggering auto checkout:', error);
        });
      }
    };

    // Check immediately
    checkAutoCheckout();

    // Set up interval to check every minute
    const interval = setInterval(checkAutoCheckout, 60000);

    return () => clearInterval(interval);
  }, [event, eventId]);

  const handleRegister = async () => {
    if (!event || !user) return;

    setActionLoading(true);
    try {
      const registrationData = {
        eventId: event.id,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || '',
        userCPF: '', // Para ser preenchido posteriormente
        checkedIn: false,
        checkedOut: false,
        certificateGenerated: false,
        createdAt: new Date(),
      };

      const registrationId = await createRegistration(registrationData);
      
      // Atualizar estado local
      const newRegistration: Registration = {
        id: registrationId,
        ...registrationData,
      };
      setRegistration(newRegistration);

    } catch (error) {
      console.error('Error registering for event:', error);
      setError('Erro ao se inscrever no evento');
    } finally {
      setActionLoading(false);
    }
  };

  const generateCertificate = async () => {
    if (!registration || !event) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/generate-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registrationId: registration.id,
          eventId: event.id,
          userId: registration.userId,
          userName: registration.userName,
          eventName: event.name,
          eventDate: event.date.toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRegistration({
          ...registration,
          certificateGenerated: true,
          certificateUrl: data.certificateUrl,
        });
        
        // Open certificate in new tab
        window.open(data.certificateUrl, '_blank');
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('Error generating certificate:', error);
      setError('Erro ao gerar certificado');
    } finally {
      setActionLoading(false);
    }
  };

  const formatEventTimes = (event: Event) => {
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

  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <Loading text="Carregando evento..." />
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erro</h3>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!event) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Evento não encontrado</h3>
            <p className="text-gray-600">O evento que você está procurando não existe.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const times = formatEventTimes(event);

  return (
    <ProtectedRoute>
      <Navbar />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
                <p className="mt-2 text-gray-600">{event.description}</p>
                
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    {times.dateStr} • {times.fullTimeStr}
                  </div>
                  
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {event.location}
                  </div>
                </div>
              </div>

              {user?.isAdmin && (
                <div className="flex gap-3">
                  <Link
                    href={`/dashboard/eventos/${event.id}/editar`}
                    className="btn-outline flex items-center"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Link>
                  
                  <Link
                    href={`/admin/evento/${event.id}/checkin`}
                    className="btn-primary flex items-center"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Gerenciar Check-in
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 sm:px-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Event Status Card */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-lg font-semibold">Status da Inscrição</h3>
                  </div>
                  
                  <div className="card-content">
                    {!registration ? (
                      <div className="text-center py-8">
                        <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          Você ainda não está inscrito
                        </h4>
                        <p className="text-gray-600 mb-6">
                          Faça sua inscrição para participar deste evento.
                        </p>
                        <button
                          onClick={handleRegister}
                          disabled={actionLoading}
                          className="btn-primary"
                        >
                          {actionLoading ? 'Inscrevendo...' : 'Inscrever-se'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center">
                            <UserCheck className="h-5 w-5 text-green-600 mr-3" />
                            <div>
                              <p className="font-medium text-green-900">Inscrito no evento</p>
                              <p className="text-sm text-green-700">
                                Inscrito em {registration.createdAt.toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Check-in Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className={`p-4 rounded-lg border ${
                            registration.checkedIn 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center">
                              <UserCheck className={`h-5 w-5 mr-3 ${
                                registration.checkedIn ? 'text-green-600' : 'text-gray-400'
                              }`} />
                              <div>
                                <p className={`font-medium ${
                                  registration.checkedIn ? 'text-green-900' : 'text-gray-900'
                                }`}>
                                  Check-in
                                </p>
                                <p className={`text-sm ${
                                  registration.checkedIn ? 'text-green-700' : 'text-gray-600'
                                }`}>
                                  {registration.checkedIn 
                                    ? `Realizado em ${registration.checkInTime?.toLocaleString('pt-BR')}`
                                    : 'Aguardando'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className={`p-4 rounded-lg border ${
                            registration.checkedOut 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center">
                              <LogOut className={`h-5 w-5 mr-3 ${
                                registration.checkedOut ? 'text-green-600' : 'text-gray-400'
                              }`} />
                              <div>
                                <p className={`font-medium ${
                                  registration.checkedOut ? 'text-green-900' : 'text-gray-900'
                                }`}>
                                  Check-out
                                </p>
                                <p className={`text-sm ${
                                  registration.checkedOut ? 'text-green-700' : 'text-gray-600'
                                }`}>
                                  {registration.checkedOut 
                                    ? `Realizado em ${registration.checkOutTime?.toLocaleString('pt-BR')}`
                                    : `Automático às ${times.endTimeStr}`
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Certificate Action */}
                        {registration.checkedOut && !registration.certificateGenerated && (
                          <div className="pt-4">
                            <button
                              onClick={generateCertificate}
                              disabled={actionLoading}
                              className="btn-primary"
                            >
                              <Award className="h-4 w-4 mr-2" />
                              {actionLoading ? 'Gerando...' : 'Gerar Certificado'}
                            </button>
                          </div>
                        )}

                        {registration.certificateGenerated && registration.certificateUrl && (
                          <div className="pt-4">
                            <a
                              href={registration.certificateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary"
                            >
                              <FileDown className="h-4 w-4 mr-2" />
                              Baixar Certificado
                            </a>
                          </div>
                        )}

                        {/* Info for non-admin users */}
                        {!user?.isAdmin && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <UserCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                              </div>
                              <div className="ml-3">
                                <h4 className="text-sm font-medium text-blue-900">
                                  Check-in e Check-out
                                </h4>
                                <p className="text-sm text-blue-700 mt-1">
                                  O check-in será realizado por um organizador do evento no local. 
                                  O check-out acontecerá automaticamente no horário de término ({times.endTimeStr}).
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Code Section */}
                {registration && (
                  <div className="card">
                    <div className="card-header">
                      <h3 className="text-lg font-semibold">QR Code do Evento</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Use este QR Code para acesso rápido ao evento
                      </p>
                    </div>
                    
                    <div className="card-content">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <QrCode className="h-5 w-5 text-gray-600 mr-3" />
                          <span className="text-sm text-gray-700">
                            QR Code personalizado para sua inscrição
                          </span>
                        </div>
                        
                        <button
                          onClick={() => setShowQR(!showQR)}
                          className="btn-outline"
                        >
                          {showQR ? 'Ocultar' : 'Mostrar'} QR Code
                        </button>
                      </div>
                      
                      {showQR && (
                        <div className="mt-6 flex justify-center">
                          <QRCodeGenerator 
                            value={`${window.location.origin}/eventos/${event.id}?reg=${registration.id}`}
                            size={200}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Event Info */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-lg font-semibold">Informações do Evento</h3>
                  </div>
                  
                  <div className="card-content space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Data</h4>
                      <p className="text-sm text-gray-600">{times.dateStr}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Horário</h4>
                      <p className="text-sm text-gray-600">
                        Início: {times.startTimeStr}<br/>
                        Término: {times.endTimeStr}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Local</h4>
                      <p className="text-sm text-gray-600">{event.location}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Descrição</h4>
                      <p className="text-sm text-gray-600">{event.description}</p>
                    </div>
                  </div>
                </div>

                {/* Admin Stats */}
                {user?.isAdmin && allRegistrations.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <h3 className="text-lg font-semibold">Estatísticas</h3>
                    </div>
                    
                    <div className="card-content space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total de Inscrições</span>
                        <span className="font-medium">{allRegistrations.length}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Check-ins Realizados</span>
                        <span className="font-medium">
                          {allRegistrations.filter(reg => reg.checkedIn).length}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Check-outs Realizados</span>
                        <span className="font-medium">
                          {allRegistrations.filter(reg => reg.checkedOut).length}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Certificados Gerados</span>
                        <span className="font-medium">
                          {allRegistrations.filter(reg => reg.certificateGenerated).length}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Registration Info */}
                {registration && (
                  <div className="card">
                    <div className="card-header">
                      <h3 className="text-lg font-semibold">Sua Inscrição</h3>
                    </div>
                    
                    <div className="card-content space-y-3">
                      <div className="text-sm">
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2 font-medium text-green-600">Confirmada</span>
                      </div>
                      
                      <div className="text-sm">
                        <span className="text-gray-600">Data da Inscrição:</span>
                        <span className="ml-2 font-medium">
                          Inscrito em {registration.createdAt.toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      
                      <div className="text-sm">
                        <span className="text-gray-600">ID da Inscrição:</span>
                        <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {registration.id}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

