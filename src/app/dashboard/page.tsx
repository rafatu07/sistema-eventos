'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { Loading } from '@/components/Loading';
import { getAllEvents, getUserRegistrations, deleteEvent } from '@/lib/firestore';
import { Event, Registration } from '@/types';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Edit,
  Trash2,
  Link as LinkIcon,
  QrCode,
  Camera,
  CheckCircle,
  X
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamic import para o QR Scanner (só carrega quando necessário)
const QRScanner = dynamic(() => import('@/components/QRScanner'), {
  ssr: false,
  loading: () => <div className="text-center p-4">Carregando scanner...</div>
});

export default function DashboardPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setCopiedLink] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    event: Event | null;
  }>({
    isOpen: false,
    event: null,
  });
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success?: boolean;
    message?: string;
    eventName?: string;
  } | null>(null);

  // Garantir que a formatação de datas aconteça apenas no cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user) return;
        
        const [eventsData, registrationsData] = await Promise.all([
          getAllEvents(),
          getUserRegistrations(user.uid)
        ]);
        
        setEvents(eventsData);
        setUserRegistrations(registrationsData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const copyPublicLink = async (eventId: string) => {
    const publicUrl = `${window.location.origin}/public/evento/${eventId}`;
    
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(eventId);
      setShowToast(true);
      
      setTimeout(() => {
        setCopiedLink(null);
        setShowToast(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleDeleteEvent = (event: Event) => {
    setDeleteModal({
      isOpen: true,
      event,
    });
    setDeleteConfirmText('');
  };

  const confirmDelete = async () => {
    if (!deleteModal.event || deleteConfirmText !== 'delete') return;

    setIsDeleting(true);
    try {
      await deleteEvent(deleteModal.event.id);
      setEvents(events.filter(e => e.id !== deleteModal.event!.id));
      setDeleteModal({ isOpen: false, event: null });
      setDeleteConfirmText('');
    } catch (error) {
      console.error('Error deleting event:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Funções do QR Scanner
  const handleQRScan = async (qrCodeData: string) => {
    try {
      // Extrair o event ID do QR code (formato: domain/checkin/eventId)
      const url = new URL(qrCodeData);
      const pathParts = url.pathname.split('/');
      
      if (pathParts[1] !== 'checkin' || !pathParts[2]) {
        setScanResult({
          success: false,
          message: 'QR Code inválido. Certifique-se de que é um QR code de check-in de evento.',
        });
        setShowQRScanner(false);
        return;
      }

      const eventId = pathParts[2];
      
      // Fazer check-in via API
      const response = await fetch('/api/qr-checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          eventId, 
          userId: user?.uid 
        }),
      });

      const data = await response.json();

      setScanResult({
        success: data.success,
        message: data.message || (data.success ? 'Check-in realizado com sucesso!' : 'Erro no check-in'),
        eventName: data.eventName,
      });

      // Recarregar dados para atualizar o status
      if (data.success) {
        const loadData = async () => {
          setLoading(true);
          try {
            if (user?.isAdmin) {
              const allEvents = await getAllEvents();
              setEvents(allEvents);
            }
            
            if (user?.uid) {
              const registrations = await getUserRegistrations(user.uid);
              setUserRegistrations(registrations);
            }
          } catch (error) {
            console.error('Error loading data:', error);
          } finally {
            setLoading(false);
          }
        };
        
        loadData();
      }
      
      setShowQRScanner(false);
    } catch (error) {
      console.error('Erro ao processar QR code:', error);
      setScanResult({
        success: false,
        message: 'Erro ao processar QR code. Verifique se é um link válido.',
      });
      setShowQRScanner(false);
    }
  };

  const closeQRScanner = () => {
    setShowQRScanner(false);
  };

  const closeScanResult = () => {
    setScanResult(null);
  };

  const formatEventTimes = (event: Event) => {
    if (!isClient) {
      // Durante o SSR, retorna valores seguros que não variam
      return {
        dateStr: 'Carregando...',
        startTimeStr: '--:--',
        endTimeStr: '--:--',
        fullTimeStr: '--:-- - --:--',
      };
    }

    const dateStr = event.date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
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
      fullTimeStr: `${startTimeStr} - ${endTimeStr}`,
    };
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <Loading text="Carregando dashboard..." />
      </ProtectedRoute>
    );
  }

  if (!user) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Carregando...</h3>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const userEvents = user.isAdmin 
    ? events 
    : events.filter(event => 
        userRegistrations.some(reg => reg.eventId === event.id)
      );

  return (
    <ProtectedRoute>
      <Navbar />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {user.isAdmin ? 'Dashboard Admin' : 'Meus Eventos'}
                </h1>
                <p className="mt-2 text-gray-600">
                  {user.isAdmin 
                    ? 'Gerencie todos os eventos do sistema' 
                    : 'Acompanhe seus eventos inscritos'
                  }
                </p>
              </div>
              
              <div className="flex gap-3">
                {!user.isAdmin && (
                  <button
                    onClick={() => setShowQRScanner(true)}
                    className="btn-primary flex items-center"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Check-in com QR Code
                  </button>
                )}
                
                {user.isAdmin && (
                  <Link
                    href="/dashboard/eventos/novo"
                    className="btn-primary flex items-center"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Criar Evento
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="px-4 sm:px-0 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        {user.isAdmin ? 'Total de Eventos' : 'Eventos Inscritos'}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">{userEvents.length}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        {user.isAdmin ? 'Eventos Ativos' : 'Check-ins Realizados'}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {user.isAdmin 
                          ? userEvents.filter(e => e.endTime > new Date()).length
                          : userRegistrations.filter(r => r.checkedIn).length
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        {user.isAdmin ? 'Eventos Passados' : 'Certificados Gerados'}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {user.isAdmin 
                          ? userEvents.filter(e => e.endTime <= new Date()).length
                          : userRegistrations.filter(r => r.certificateGenerated).length
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Events Grid */}
          <div className="px-4 sm:px-0">
            {userEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {user.isAdmin ? 'Nenhum evento criado' : 'Nenhuma inscrição encontrada'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {user.isAdmin 
                    ? 'Comece criando seu primeiro evento.' 
                    : 'Você ainda não se inscreveu em nenhum evento.'
                  }
                </p>
                {user.isAdmin && (
                  <Link
                    href="/dashboard/eventos/novo"
                    className="btn-primary"
                  >
                    Criar Primeiro Evento
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userEvents.map((event) => {
                  const times = formatEventTimes(event);
                  const registration = userRegistrations.find(r => r.eventId === event.id);
                  
                  return (
                    <div key={event.id} className="card hover:shadow-lg transition-shadow">
                      <div className="card-content">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {event.name}
                            </h3>
                            <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                              {event.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            {times.dateStr}
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="h-4 w-4 mr-2" />
                            {times.fullTimeStr}
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            {event.location}
                          </div>
                        </div>

                        {!user.isAdmin && registration && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Status:</span>
                              <span className={`font-medium ${
                                registration.checkedOut 
                                  ? 'text-green-600' 
                                  : registration.checkedIn 
                                    ? 'text-blue-600' 
                                    : 'text-gray-600'
                              }`}>
                                {registration.checkedOut 
                                  ? 'Concluído' 
                                  : registration.checkedIn 
                                    ? 'Presente' 
                                    : 'Inscrito'
                                }
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          {/* Botão principal - Gerenciar/Ver Detalhes */}
                          <Link
                            href={`/eventos/${event.id}`}
                            className="btn-primary w-full text-center flex items-center justify-center"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {user.isAdmin ? 'Gerenciar Evento' : 'Ver Detalhes'}
                          </Link>
                          
                          {user.isAdmin && (
                            <>
                              {/* Botão de Link Público - Mesmo tamanho */}
                              <button
                                onClick={() => copyPublicLink(event.id)}
                                className="btn-outline w-full flex items-center justify-center text-blue-600 border-blue-300 hover:bg-blue-50"
                                title="Copiar link de inscrição pública"
                              >
                                <LinkIcon className="h-4 w-4 mr-2" />
                                Link de Inscrição Pública
                              </button>
                              
                              {/* Botão de deletar - Menor */}
                              <div className="flex justify-end">
                                <button
                                  onClick={() => handleDeleteEvent(event)}
                                  className="btn-outline flex items-center justify-center px-3 py-1 text-red-600 border-red-300 hover:bg-red-50 text-xs"
                                  title="Excluir evento"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Excluir
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center">
            <LinkIcon className="h-4 w-4 mr-2" />
            <p className="text-sm font-medium">Link de inscrição pública copiado!</p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.event && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmar Exclusão
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                Você está prestes a excluir o evento:
              </p>
              <p className="font-medium text-gray-900 mb-1">
                {deleteModal.event.name}
              </p>
              <p className="text-sm text-gray-600">
                {isClient ? `${deleteModal.event.date.toLocaleDateString('pt-BR')} • ${deleteModal.event.location}` : 'Carregando...'}
              </p>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">
                Esta ação não pode ser desfeita. Para confirmar, digite <strong>delete</strong> no campo abaixo:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="input w-full"
                placeholder="Digite 'delete' para confirmar"
                onKeyDown={(e) => e.key === 'Enter' && confirmDelete()}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setDeleteModal({ isOpen: false, event: null });
                  setDeleteConfirmText('');
                }}
                className="btn-outline"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirmText !== 'delete' || isDeleting}
                className="btn-primary bg-red-600 hover:bg-red-700 disabled:bg-gray-300"
              >
                {isDeleting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Excluindo...
                  </div>
                ) : (
                  'Excluir Evento'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner */}
      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={closeQRScanner}
          isActive={showQRScanner}
        />
      )}

      {/* Scan Result Modal */}
      {scanResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                scanResult.success ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {scanResult.success ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <X className="h-8 w-8 text-red-600" />
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {scanResult.success ? 'Check-in Realizado!' : 'Erro no Check-in'}
              </h3>
              
              {scanResult.eventName && (
                <p className="text-sm text-gray-600 mb-3">
                  Evento: <span className="font-medium">{scanResult.eventName}</span>
                </p>
              )}
              
              <p className="text-gray-700 mb-6">
                {scanResult.message}
              </p>
              
              <button
                onClick={closeScanResult}
                className="w-full btn-primary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

