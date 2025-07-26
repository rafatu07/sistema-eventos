'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { Loading } from '@/components/Loading';
import { getEvent, getEventRegistrations, updateRegistration } from '@/lib/firestore';
import { Event, Registration } from '@/types';
import { 
  Search, 
  Users, 
  UserCheck, 
  Clock, 
  CheckCircle,
  XCircle,
  User,
  Mail,
  CreditCard
} from 'lucide-react';
import Link from 'next/link';

export default function AdminCheckinPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { user } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingCheckIn, setProcessingCheckIn] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventData, registrationsData] = await Promise.all([
          getEvent(eventId),
          getEventRegistrations(eventId)
        ]);

        if (!eventData) {
          setError('Evento não encontrado');
          return;
        }

        setEvent(eventData);
        setRegistrations(registrationsData);
        setFilteredRegistrations(registrationsData);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    if (eventId && user?.isAdmin) {
      loadData();
    }
  }, [eventId, user]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredRegistrations(registrations);
      return;
    }

    const filtered = registrations.filter(reg => 
      reg.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.userCPF.includes(searchTerm.replace(/\D/g, ''))
    );

    setFilteredRegistrations(filtered);
  }, [searchTerm, registrations]);

  const handleCheckIn = async (registration: Registration) => {
    if (registration.checkedIn) return;

    setProcessingCheckIn(prev => ({ ...prev, [registration.id]: true }));

    try {
      await updateRegistration(registration.id, {
        checkedIn: true,
        checkInTime: new Date(),
      });

      // Atualizar estado local
      const updatedRegistrations = registrations.map(reg =>
        reg.id === registration.id
          ? { ...reg, checkedIn: true, checkInTime: new Date() }
          : reg
      );

      setRegistrations(updatedRegistrations);
      setFilteredRegistrations(
        filteredRegistrations.map(reg =>
          reg.id === registration.id
            ? { ...reg, checkedIn: true, checkInTime: new Date() }
            : reg
        )
      );

    } catch (error) {
      console.error('Error checking in:', error);
      alert('Erro ao fazer check-in. Tente novamente.');
    } finally {
      setProcessingCheckIn(prev => ({ ...prev, [registration.id]: false }));
    }
  };

  const handleUndoCheckIn = async (registration: Registration) => {
    if (!registration.checkedIn) return;

    setProcessingCheckIn(prev => ({ ...prev, [registration.id]: true }));

    try {
      await updateRegistration(registration.id, {
        checkedIn: false,
        checkInTime: null,
      });

      // Atualizar estado local
      const updatedRegistrations = registrations.map(reg =>
        reg.id === registration.id
          ? { ...reg, checkedIn: false, checkInTime: undefined }
          : reg
      );

      setRegistrations(updatedRegistrations);
      setFilteredRegistrations(
        filteredRegistrations.map(reg =>
          reg.id === registration.id
            ? { ...reg, checkedIn: false, checkInTime: undefined }
            : reg
        )
      );

    } catch (error) {
      console.error('Error undoing check-in:', error);
      alert('Erro ao desfazer check-in. Tente novamente.');
    } finally {
      setProcessingCheckIn(prev => ({ ...prev, [registration.id]: false }));
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <Navbar />
        <Loading text="Carregando participantes..." />
      </ProtectedRoute>
    );
  }

  if (error || !event) {
    return (
      <ProtectedRoute requireAdmin>
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

  const stats = {
    total: registrations.length,
    checkedIn: registrations.filter(r => r.checkedIn).length,
    pending: registrations.filter(r => !r.checkedIn).length,
  };

  return (
    <ProtectedRoute requireAdmin>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-4">
              <Link
                href={`/eventos/${eventId}`}
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                ← Voltar ao evento
              </Link>
            </div>
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Check-in dos Participantes
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                  {event.name}
                </p>
                <p className="text-sm text-gray-500">
                  {event.date.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="px-4 sm:px-0 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total de Inscritos</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Check-in Realizado</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.checkedIn}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <XCircle className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Aguardando Check-in</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 sm:px-0 mb-6">
            <div className="max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="input pl-10 w-full"
                  placeholder="Buscar por nome, email ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Participants List */}
          <div className="px-4 sm:px-0">
            {filteredRegistrations.length === 0 ? (
              <div className="card">
                <div className="card-content text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {searchTerm ? 'Nenhum participante encontrado' : 'Nenhum participante inscrito'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Tente outro termo de busca.' : 'Aguardando inscrições no evento.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRegistrations.map((registration) => (
                  <div key={registration.id} className="card">
                    <div className="card-content">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                              registration.checkedIn ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              {registration.checkedIn ? (
                                <CheckCircle className="h-6 w-6 text-green-600" />
                              ) : (
                                <User className="h-6 w-6 text-gray-600" />
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {registration.userName}
                              </h3>
                              
                              <div className="mt-1 space-y-1">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Mail className="h-4 w-4 mr-2" />
                                  {registration.userEmail}
                                </div>
                                
                                <div className="flex items-center text-sm text-gray-600">
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  {registration.userCPF}
                                </div>
                                
                                {registration.checkedIn && registration.checkInTime && (
                                  <div className="flex items-center text-sm text-green-600">
                                    <Clock className="h-4 w-4 mr-2" />
                                    Check-in: {registration.checkInTime.toLocaleString('pt-BR')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0 ml-6">
                          {registration.checkedIn ? (
                            <button
                              onClick={() => handleUndoCheckIn(registration)}
                              disabled={processingCheckIn[registration.id]}
                              className="btn-outline text-red-600 border-red-300 hover:bg-red-50"
                            >
                              {processingCheckIn[registration.id] ? (
                                <div className="flex items-center">
                                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
                                  Processando...
                                </div>
                              ) : (
                                'Desfazer Check-in'
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCheckIn(registration)}
                              disabled={processingCheckIn[registration.id]}
                              className="btn-primary"
                            >
                              {processingCheckIn[registration.id] ? (
                                <div className="flex items-center">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  Processando...
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Fazer Check-in
                                </div>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 