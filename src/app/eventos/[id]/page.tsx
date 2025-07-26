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
  Edit,
  Download
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

    if (user) {
      loadData();
    }
  }, [eventId, user]);

  const handleRegister = async () => {
    if (!user || !event) return;

    setActionLoading(true);
    try {
      const registrationData = {
        eventId: event.id,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email,
        checkedIn: false,
        checkedOut: false,
        certificateGenerated: false,
      };

      const registrationId = await createRegistration(registrationData);
      
      const newRegistration: Registration = {
        id: registrationId,
        ...registrationData,
        registeredAt: new Date(),
      };
      
      setRegistration(newRegistration);
    } catch (error) {
      console.error('Error registering for event:', error);
      setError('Erro ao se inscrever no evento');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!registration) return;

    setActionLoading(true);
    try {
      await updateRegistration(registration.id, {
        checkedIn: true,
        checkInTime: new Date(),
      });

      setRegistration(prev => prev ? {
        ...prev,
        checkedIn: true,
        checkInTime: new Date(),
      } : null);
    } catch (error) {
      console.error('Error checking in:', error);
      setError('Erro ao fazer check-in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!registration) return;

    setActionLoading(true);
    try {
      await updateRegistration(registration.id, {
        checkedOut: true,
        checkOutTime: new Date(),
      });

      setRegistration(prev => prev ? {
        ...prev,
        checkedOut: true,
        checkOutTime: new Date(),
      } : null);
    } catch (error) {
      console.error('Error checking out:', error);
      setError('Erro ao fazer check-out');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateCertificate = async () => {
    if (!registration || !event || !user) return;

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
          userId: user.uid,
          userName: registration.userName,
          eventName: event.name,
          eventDate: event.date.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar certificado');
      }

      const data = await response.json();
      
      setRegistration(prev => prev ? {
        ...prev,
        certificateGenerated: true,
        certificateUrl: data.certificateUrl,
      } : null);
    } catch (error) {
      console.error('Error generating certificate:', error);
      setError('Erro ao gerar certificado');
    } finally {
      setActionLoading(false);
    }
  };

  const exportAttendanceList = () => {
    if (!event || !allRegistrations.length) return;

    const csvContent = [
      ['Nome', 'Email', 'Inscrito em', 'Check-in', 'Check-out', 'Certificado'],
      ...allRegistrations.map(reg => [
        reg.userName,
        reg.userEmail,
        reg.registeredAt.toLocaleDateString('pt-BR'),
        reg.checkedIn ? (reg.checkInTime?.toLocaleString('pt-BR') || 'Sim') : 'Não',
        reg.checkedOut ? (reg.checkOutTime?.toLocaleString('pt-BR') || 'Sim') : 'Não',
        reg.certificateGenerated ? 'Gerado' : 'Não gerado'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `lista_presenca_${event.name.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <Loading text="Carregando evento..." />
      </ProtectedRoute>
    );
  }

  if (error || !event) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
            <p className="text-gray-600">{error || 'Evento não encontrado'}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const canCheckIn = registration && !registration.checkedIn;
  const canCheckOut = registration && registration.checkedIn && !registration.checkedOut;
  const canGenerateCertificate = registration && registration.checkedOut && !registration.certificateGenerated;
  const hasGeneratedCertificate = registration && registration.certificateGenerated;

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Event Header */}
          <div className="card mb-8">
            <div className="card-header">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {event.name}
                  </h1>
                  <p className="text-gray-600 text-lg">
                    {event.description}
                  </p>
                </div>
                
                {user?.isAdmin && (
                  <Link
                    href={`/dashboard/eventos/${event.id}/editar`}
                    className="btn-outline flex items-center"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Link>
                )}
              </div>
            </div>
            
            <div className="card-content">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center text-gray-600">
                  <Clock className="h-5 w-5 mr-3" />
                  <div>
                    <p className="font-medium">Data e Hora</p>
                    <p>{event.date.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</p>
                  </div>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-3" />
                  <div>
                    <p className="font-medium">Local</p>
                    <p>{event.location}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Status */}
          <div className="card mb-8">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">
                Status da Participação
              </h2>
            </div>
            
            <div className="card-content">
              {!registration ? (
                <div className="text-center py-6">
                  <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Você não está inscrito neste evento
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Faça sua inscrição para participar do evento
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
                <div className="space-y-6">
                  {/* Registration Info */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <UserCheck className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-green-800 font-medium">
                        Inscrito em {registration.registeredAt.toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {canCheckIn && (
                      <button
                        onClick={handleCheckIn}
                        disabled={actionLoading}
                        className="btn-primary flex items-center justify-center"
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Fazer Check-in
                      </button>
                    )}

                    {canCheckOut && (
                      <button
                        onClick={handleCheckOut}
                        disabled={actionLoading}
                        className="btn-secondary flex items-center justify-center"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Fazer Check-out
                      </button>
                    )}

                    {canGenerateCertificate && (
                      <button
                        onClick={handleGenerateCertificate}
                        disabled={actionLoading}
                        className="btn-primary flex items-center justify-center"
                      >
                        <Award className="h-4 w-4 mr-2" />
                        Gerar Certificado
                      </button>
                    )}

                    {hasGeneratedCertificate && registration.certificateUrl && (
                      <a
                        href={registration.certificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline flex items-center justify-center"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar Certificado
                      </a>
                    )}
                  </div>

                  {/* Status Timeline */}
                  <div className="space-y-3">
                    <div className={`flex items-center ${registration.checkedIn ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-4 h-4 rounded-full mr-3 ${registration.checkedIn ? 'bg-green-600' : 'bg-gray-300'}`} />
                      <span>Check-in realizado</span>
                      {registration.checkInTime && (
                        <span className="ml-2 text-sm text-gray-500">
                          ({registration.checkInTime.toLocaleString('pt-BR')})
                        </span>
                      )}
                    </div>
                    
                    <div className={`flex items-center ${registration.checkedOut ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-4 h-4 rounded-full mr-3 ${registration.checkedOut ? 'bg-green-600' : 'bg-gray-300'}`} />
                      <span>Check-out realizado</span>
                      {registration.checkOutTime && (
                        <span className="ml-2 text-sm text-gray-500">
                          ({registration.checkOutTime.toLocaleString('pt-BR')})
                        </span>
                      )}
                    </div>
                    
                    <div className={`flex items-center ${registration.certificateGenerated ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-4 h-4 rounded-full mr-3 ${registration.certificateGenerated ? 'bg-green-600' : 'bg-gray-300'}`} />
                      <span>Certificado gerado</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Admin Panel */}
          {user?.isAdmin && (
            <div className="card">
              <div className="card-header">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Painel Administrativo
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowQR(!showQR)}
                      className="btn-outline flex items-center"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      {showQR ? 'Ocultar QR' : 'Mostrar QR'}
                    </button>
                    <Link
                      href={`/admin/evento/${eventId}/checkin`}
                      className="btn-primary flex items-center"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Gerenciar Check-in
                    </Link>
                    {allRegistrations.length > 0 && (
                      <button
                        onClick={exportAttendanceList}
                        className="btn-secondary flex items-center"
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        Exportar Lista
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="card-content">
                {showQR && (
                  <div className="mb-8 flex justify-center">
                    <QRCodeGenerator
                      value={`${window.location.origin}/public/evento/${event.id}`}
                      size={200}
                      title="QR Code do Evento"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{allRegistrations.length}</p>
                    <p className="text-sm text-gray-600">Total de Inscrições</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {allRegistrations.filter(r => r.checkedIn).length}
                    </p>
                    <p className="text-sm text-gray-600">Check-ins</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {allRegistrations.filter(r => r.checkedOut).length}
                    </p>
                    <p className="text-sm text-gray-600">Check-outs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {allRegistrations.filter(r => r.certificateGenerated).length}
                    </p>
                    <p className="text-sm text-gray-600">Certificados</p>
                  </div>
                </div>

                {allRegistrations.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Participante
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Check-in
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Check-out
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Certificado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {allRegistrations.map((reg) => (
                          <tr key={reg.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {reg.userName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {reg.userEmail}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {reg.checkedIn ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Realizado
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Pendente
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {reg.checkedOut ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Realizado
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Pendente
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {reg.certificateGenerated ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Gerado
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Não gerado
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

