'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { Loading } from '@/components/Loading';
import { getAllEvents, getEventRegistrations, deleteEvent } from '@/lib/firestore';
import { Event, Registration } from '@/types';
import { 
  Calendar, 
  Users, 
  Plus, 
  MapPin, 
  Clock,
  UserCheck,
  Award,
  BarChart3,
  Link as LinkIcon,
  Trash2,
  ExternalLink,
  Check,
  Copy,
  AlertTriangle,
  X
} from 'lucide-react';
import Link from 'next/link';

interface DeleteModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (eventId: string) => void;
  isDeleting: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ event, isOpen, onClose, onConfirm, isDeleting }) => {
  const [confirmText, setConfirmText] = useState('');
  const canDelete = confirmText.toLowerCase() === 'delete';

  // Reset confirmText when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const handleConfirm = () => {
    if (canDelete && !isDeleting) {
      onConfirm(event.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canDelete && !isDeleting) {
      handleConfirm();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onKeyDown={handleKeyDown}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Excluir Evento</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Você está prestes a excluir permanentemente o evento:
            </p>
            <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-red-500">
              <p className="font-medium text-gray-900">{event.name}</p>
              <p className="text-sm text-gray-600">
                {event.date.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-red-600 font-medium mb-2">
              ⚠️ Esta ação não pode ser desfeita!
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Todos os dados relacionados ao evento, incluindo inscrições, check-ins e certificados serão perdidos permanentemente.
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="confirmText" className="block text-sm font-medium text-gray-700 mb-2">
              Para confirmar, digite <span className="font-mono bg-gray-100 px-1 rounded">delete</span> no campo abaixo:
            </label>
            <input
              id="confirmText"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Digite 'delete' para confirmar"
              disabled={isDeleting}
              className="input w-full"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="btn-outline"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canDelete || isDeleting}
            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Permanentemente
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<{ [eventId: string]: Registration[] }>({});
  const [loading, setLoading] = useState(true);
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; event: Event | null }>({
    isOpen: false,
    event: null
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const eventsData = await getAllEvents();
        setEvents(eventsData);

        // Load registrations for each event if user is admin
        if (user?.isAdmin) {
          const registrationsData: { [eventId: string]: Registration[] } = {};
          for (const event of eventsData) {
            const eventRegistrations = await getEventRegistrations(event.id);
            registrationsData[event.id] = eventRegistrations;
          }
          setRegistrations(registrationsData);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  const getEventStats = (eventId: string) => {
    const eventRegistrations = registrations[eventId] || [];
    return {
      total: eventRegistrations.length,
      checkedIn: eventRegistrations.filter(r => r.checkedIn).length,
      checkedOut: eventRegistrations.filter(r => r.checkedOut).length,
      certificates: eventRegistrations.filter(r => r.certificateGenerated).length,
    };
  };

  const copyPublicLink = async (eventId: string, eventName: string) => {
    const publicUrl = `${window.location.origin}/public/evento/${eventId}`;
    
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(eventId);
      setShowToast(true);
      
      // Esconder o toast após 3 segundos
      setTimeout(() => {
        setShowToast(false);
        setCopiedLink(null);
      }, 3000);
    } catch (error) {
      // Fallback para browsers que não suportam clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = publicUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopiedLink(eventId);
      setShowToast(true);
      
      setTimeout(() => {
        setShowToast(false);
        setCopiedLink(null);
      }, 3000);
    }
  };

  const openDeleteModal = (event: Event) => {
    setDeleteModal({ isOpen: true, event });
  };

  const closeDeleteModal = () => {
    if (!deletingEvent) {
      setDeleteModal({ isOpen: false, event: null });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setDeletingEvent(eventId);

    try {
      await deleteEvent(eventId);
      
      // Remover evento da lista local
      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      
      // Remover registrations do evento
      setRegistrations(prevRegistrations => {
        const newRegistrations = { ...prevRegistrations };
        delete newRegistrations[eventId];
        return newRegistrations;
      });

      // Fechar modal
      setDeleteModal({ isOpen: false, event: null });

      // Mostrar toast de sucesso
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);

    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Erro ao excluir evento. Tente novamente.');
    } finally {
      setDeletingEvent(null);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <Loading text="Carregando dashboard..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Navbar />
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center">
            <Check className="h-5 w-5 mr-2" />
            {copiedLink ? 'Link público copiado com sucesso!' : 'Evento excluído com sucesso!'}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteModal
        event={deleteModal.event}
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteEvent}
        isDeleting={!!deletingEvent}
      />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {user?.isAdmin ? 'Dashboard Administrativo' : 'Meus Eventos'}
                </h1>
                <p className="mt-2 text-gray-600">
                  {user?.isAdmin 
                    ? 'Gerencie eventos e acompanhe participações'
                    : 'Veja seus eventos e certificados'
                  }
                </p>
              </div>
              
              {user?.isAdmin && (
                <Link
                  href="/dashboard/eventos/novo"
                  className="btn-primary flex items-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Novo Evento
                </Link>
              )}
            </div>
          </div>

          {/* Stats Cards (Admin only) */}
          {user?.isAdmin && (
            <div className="px-4 sm:px-0 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card">
                  <div className="card-content">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Calendar className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total de Eventos</p>
                        <p className="text-2xl font-bold text-gray-900">{events.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-content">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Users className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total de Inscrições</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {Object.values(registrations).reduce((acc, regs) => acc + regs.length, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-content">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserCheck className="h-8 w-8 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Check-ins Realizados</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {Object.values(registrations).reduce((acc, regs) => 
                            acc + regs.filter(r => r.checkedIn).length, 0
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-content">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Award className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Certificados Emitidos</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {Object.values(registrations).reduce((acc, regs) => 
                            acc + regs.filter(r => r.certificateGenerated).length, 0
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Events List */}
          <div className="px-4 sm:px-0">
            {events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum evento encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {user?.isAdmin 
                    ? 'Comece criando seu primeiro evento.'
                    : 'Não há eventos disponíveis no momento.'
                  }
                </p>
                {user?.isAdmin && (
                  <div className="mt-6">
                    <Link href="/dashboard/eventos/novo" className="btn-primary">
                      <Plus className="h-5 w-5 mr-2" />
                      Criar Evento
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => {
                  const stats = user?.isAdmin ? getEventStats(event.id) : null;
                  const isDeleting = deletingEvent === event.id;
                  const linkCopied = copiedLink === event.id;
                  
                  return (
                    <div key={event.id} className="card hover:shadow-lg transition-shadow">
                      <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {event.name}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {event.description}
                        </p>
                      </div>
                      
                      <div className="card-content">
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="h-4 w-4 mr-2" />
                            {event.date.toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            {event.location}
                          </div>
                        </div>

                        {user?.isAdmin && stats && (
                          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                            <div className="text-center">
                              <p className="font-medium text-gray-900">{stats.total}</p>
                              <p className="text-gray-500">Inscrições</p>
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-gray-900">{stats.checkedIn}</p>
                              <p className="text-gray-500">Check-ins</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="card-footer">
                        {user?.isAdmin ? (
                          <div className="space-y-2">
                            {/* Botão principal - Gerenciar */}
                            <Link
                              href={`/eventos/${event.id}`}
                              className="btn-primary w-full text-center flex items-center justify-center"
                            >
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Gerenciar Evento
                            </Link>
                            
                            {/* Botões secundários */}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => copyPublicLink(event.id, event.name)}
                                className={`btn-outline text-xs flex items-center justify-center transition-all ${
                                  linkCopied ? 'bg-green-50 border-green-300 text-green-700' : ''
                                }`}
                                title="Copiar link para inscrições"
                              >
                                {linkCopied ? (
                                  <>
                                    <Check className="h-3 w-3 mr-1" />
                                    Copiado!
                                  </>
                                ) : (
                                  <>
                                    <LinkIcon className="h-3 w-3 mr-1" />
                                    Link Público
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={() => openDeleteModal(event)}
                                disabled={isDeleting}
                                className="btn-outline text-xs flex items-center justify-center text-red-600 border-red-300 hover:bg-red-50 disabled:opacity-50"
                                title="Excluir evento"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Excluir
                              </button>
                            </div>
                          </div>
                        ) : (
                          <Link
                            href={`/eventos/${event.id}`}
                            className="btn-primary w-full text-center"
                          >
                            Ver Detalhes
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

