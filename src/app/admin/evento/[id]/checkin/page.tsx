'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
// import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { Loading } from '@/components/Loading';
import { 
  getEvent, 
  getEventRegistrations, 
  updateRegistration 
} from '@/lib/firestore';
import { Event, Registration } from '@/types';
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  MapPin, 
  Clock,
  Users, 
  UserCheck, 
  UserX,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Share2,
  Copy,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { downloadQRCodePDF } from '@/lib/qr-pdf-generator';

export default function AdminCheckinPage() {
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isClient, setIsClient] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeCopied, setQrCodeCopied] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Garantir que a formatação de datas aconteça apenas no cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventData, registrationsData] = await Promise.all([
          getEvent(eventId),
          getEventRegistrations(eventId)
        ]);
        
        if (!eventData) {
          throw new Error('Evento não encontrado');
        }
        
        setEvent(eventData);
        setRegistrations(registrationsData);
        setFilteredRegistrations(registrationsData);
      } catch (error) {
        console.error('Error loading checkin data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadData();
    }
  }, [eventId]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredRegistrations(registrations);
    } else {
      const filtered = registrations.filter(reg => 
        reg.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.userCPF.includes(searchTerm.replace(/\D/g, ''))
      );
      setFilteredRegistrations(filtered);
    }
    
    // Reset página quando filtrar
    setCurrentPage(1);
  }, [searchTerm, registrations]);

  // Cálculos de paginação
  const totalItems = filteredRegistrations.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredRegistrations.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleCheckIn = async (registration: Registration) => {
    if (processingIds.has(registration.id)) return;

    setProcessingIds(prev => new Set(prev).add(registration.id));
    
    try {
      await updateRegistration(registration.id, {
        checkedIn: true,
        checkInTime: new Date(),
      });

      // Update local state
      const updatedRegistrations = registrations.map(reg =>
        reg.id === registration.id
          ? { ...reg, checkedIn: true, checkInTime: new Date() }
          : reg
      );
      
      setRegistrations(updatedRegistrations);
    } catch (error) {
      console.error('Error during check-in:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(registration.id);
        return newSet;
      });
    }
  };

  const handleCheckOut = async (registration: Registration) => {
    if (processingIds.has(registration.id)) return;

    setProcessingIds(prev => new Set(prev).add(registration.id));
    
    try {
      await updateRegistration(registration.id, {
        checkedOut: true,
        checkOutTime: new Date(),
      });

      // Update local state
      const updatedRegistrations = registrations.map(reg =>
        reg.id === registration.id
          ? { ...reg, checkedOut: true, checkOutTime: new Date() }
          : reg
      );
      
      setRegistrations(updatedRegistrations);
    } catch (error) {
      console.error('Error during check-out:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(registration.id);
        return newSet;
      });
    }
  };

  const undoCheckIn = async (registration: Registration) => {
    if (processingIds.has(registration.id)) return;

    setProcessingIds(prev => new Set(prev).add(registration.id));
    
    try {
      await updateRegistration(registration.id, {
        checkedIn: false,
        checkInTime: undefined,
      });

      // Update local state
      const updatedRegistrations = registrations.map(reg =>
        reg.id === registration.id
          ? { ...reg, checkedIn: false, checkInTime: undefined }
          : reg
      );
      
      setRegistrations(updatedRegistrations);
    } catch (error) {
      console.error('Error undoing check-in:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(registration.id);
        return newSet;
      });
    }
  };

  const undoCheckOut = async (registration: Registration) => {
    if (processingIds.has(registration.id)) return;

    setProcessingIds(prev => new Set(prev).add(registration.id));
    
    try {
      await updateRegistration(registration.id, {
        checkedOut: false,
        checkOutTime: undefined,
      });

      // Update local state
      const updatedRegistrations = registrations.map(reg =>
        reg.id === registration.id
          ? { ...reg, checkedOut: false, checkOutTime: undefined }
          : reg
      );
      
      setRegistrations(updatedRegistrations);
    } catch (error) {
      console.error('Error undoing check-out:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(registration.id);
        return newSet;
      });
    }
  };

  const copyCheckinLink = async () => {
    if (!event) return;
    
    const checkinUrl = `${window.location.origin}/checkin/${event.id}`;
    
    try {
      await navigator.clipboard.writeText(checkinUrl);
      setQrCodeCopied(true);
      
      setTimeout(() => {
        setQrCodeCopied(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to copy checkin link:', error);
    }
  };

  const generateQRCodePDF = async () => {
    if (!event) return;
    
    setGeneratingPDF(true);
    
    try {
      const qrCodeUrl = `${window.location.origin}/checkin/${event.id}`;
      const baseUrl = window.location.origin;
      
      await downloadQRCodePDF({
        event,
        qrCodeUrl,
        baseUrl
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const formatEventTimes = (event: Event) => {
    if (!isClient) {
      // Durante o SSR, retorna valores seguros que não variam
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

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <Navbar />
        <Loading text="Carregando dados do evento..." />
      </ProtectedRoute>
    );
  }

  if (!event) {
    return (
      <ProtectedRoute requireAdmin>
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
  const stats = {
    total: registrations.length,
    checkedIn: registrations.filter(r => r.checkedIn).length,
    pending: registrations.filter(r => !r.checkedIn).length,
    checkedOut: registrations.filter(r => r.checkedOut).length,
  };

  return (
    <ProtectedRoute requireAdmin>
      <Navbar />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-6 sm:px-0">
            <Link
              href={`/eventos/${eventId}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao evento
            </Link>
            
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Check-in dos Participantes
              </h1>
              <div className="space-y-1">
                <h2 className="text-xl text-gray-700">{event.name}</h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {times.dateStr}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    {times.fullTimeStr}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {event.location}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Total de Inscritos</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Check-in Realizado</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.checkedIn}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <XCircle className="h-8 w-8 text-orange-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Aguardando Check-in</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Check-out Realizado</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.checkedOut}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Check-in via QR Code</h3>
                  <p className="text-sm text-gray-600">
                    Permita que os participantes façam check-in automaticamente escaneando o QR Code
                  </p>
                </div>
                <button
                  onClick={() => setShowQRCode(!showQRCode)}
                  className="btn-outline flex items-center text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  {showQRCode ? 'Ocultar QR Code' : 'Mostrar QR Code'}
                </button>
              </div>

              {showQRCode && (
                <div className="card">
                  <div className="card-content">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                      {/* QR Code */}
                      <div className="text-center">
                        {event && (
                          <div className="flex flex-col items-center space-y-4">
                            <QRCodeGenerator 
                              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/checkin/${event.id}`}
                              size={250}
                              title=""
                            />
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={copyCheckinLink}
                                className="btn-outline flex items-center"
                              >
                                {qrCodeCopied ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    Link Copiado!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copiar Link
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={() => {
                                  const checkinUrl = `${window.location.origin}/checkin/${event.id}`;
                                  if (navigator.share) {
                                    navigator.share({
                                      title: `Check-in: ${event.name}`,
                                      text: `Faça check-in no evento: ${event.name}`,
                                      url: checkinUrl,
                                    });
                                  }
                                }}
                                className="btn-outline flex items-center"
                              >
                                <Share2 className="h-4 w-4 mr-2" />
                                Compartilhar
                              </button>

                              <button
                                onClick={generateQRCodePDF}
                                disabled={generatingPDF}
                                className="btn-outline flex items-center text-green-600 border-green-300 hover:bg-green-50 disabled:opacity-50"
                              >
                                {generatingPDF ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-2" />
                                    Gerando PDF...
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-4 w-4 mr-2" />
                                    Baixar PDF
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Instructions */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">
                            Como usar o QR Code
                          </h4>
                          <div className="space-y-3 text-sm text-gray-600">
                            <div className="flex items-start">
                              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                                1
                              </div>
                              <p>Mostre este QR Code para os participantes ou projete em uma tela</p>
                            </div>
                            <div className="flex items-start">
                              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                                2
                              </div>
                              <p>Os participantes devem estar logados em suas contas para fazer check-in</p>
                            </div>
                            <div className="flex items-start">
                              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                                3
                              </div>
                              <p>O check-in estará disponível a qualquer momento antes do horário de início do evento</p>
                            </div>
                            <div className="flex items-start">
                              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                                4
                              </div>
                              <p>Você ainda pode fazer check-in manual aqui abaixo se necessário</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-green-900">Vantagens do QR Code</p>
                              <ul className="mt-2 text-sm text-green-700 list-disc list-inside space-y-1">
                                <li>Check-in mais rápido e automatizado</li>
                                <li>Reduz filas e aglomerações</li>
                                <li>Participantes fazem seu próprio check-in</li>
                                <li>Horário de check-in registrado automaticamente</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
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
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'Nenhum participante encontrado' : 'Nenhuma inscrição encontrada'}
                </h3>
                <p className="text-gray-600">
                  {searchTerm 
                    ? 'Tente ajustar os termos de busca.' 
                    : 'Ainda não há inscrições para este evento.'
                  }
                </p>
              </div>
            ) : (
              <>
                {/* Informações de paginação */}
                <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
                  <div>
                    Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems} participantes
                  </div>
                  <div>
                    Página {currentPage} de {totalPages}
                  </div>
                </div>

                <div className="space-y-4">
                  {currentItems.map((registration) => (
                  <div key={registration.id} className="card">
                    <div className="card-content">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            {registration.checkedIn ? (
                              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                            ) : (
                              <UserX className="h-5 w-5 text-gray-400 mr-3" />
                            )}
                            <h3 className="text-lg font-semibold text-gray-900">
                              {registration.userName}
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Email:</span> {registration.userEmail}
                            </div>
                            <div>
                              <span className="font-medium">CPF:</span> {registration.userCPF || 'Não informado'}
                            </div>
                            <div>
                              <span className="font-medium text-blue-600">Inscrito em:</span>{' '}
                              {isClient ? registration.createdAt.toLocaleString('pt-BR') : 'Carregando...'}
                            </div>
                            {registration.checkedIn && registration.checkInTime && (
                              <div>
                                <span className="font-medium text-green-600">Check-in:</span>{' '}
                                {isClient ? registration.checkInTime.toLocaleString('pt-BR') : 'Realizado'}
                              </div>
                            )}
                            {registration.checkedOut && registration.checkOutTime && (
                              <div>
                                <span className="font-medium text-purple-600">Check-out:</span>{' '}
                                {isClient ? registration.checkOutTime.toLocaleString('pt-BR') : 'Realizado'}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {!registration.checkedIn ? (
                            <button
                              onClick={() => handleCheckIn(registration)}
                              disabled={processingIds.has(registration.id)}
                              className="btn-primary flex items-center"
                            >
                              {processingIds.has(registration.id) ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              ) : (
                                <UserCheck className="h-4 w-4 mr-2" />
                              )}
                              Fazer Check-in
                            </button>
                          ) : (
                            <div className="flex space-x-2">
                              {!registration.checkedOut && (
                                <button
                                  onClick={() => handleCheckOut(registration)}
                                  disabled={processingIds.has(registration.id)}
                                  className="btn-primary flex items-center"
                                >
                                  {processingIds.has(registration.id) ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  ) : (
                                    <UserCheck className="h-4 w-4 mr-2" />
                                  )}
                                  Fazer Check-out
                                </button>
                              )}
                              
                              {registration.checkedOut ? (
                                <button
                                  onClick={() => undoCheckOut(registration)}
                                  disabled={processingIds.has(registration.id)}
                                  className="btn-outline text-red-600 border-red-300 hover:bg-red-50 flex items-center"
                                >
                                  {processingIds.has(registration.id) ? (
                                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
                                  ) : (
                                    <XCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Desfazer Check-out
                                </button>
                              ) : (
                                <button
                                  onClick={() => undoCheckIn(registration)}
                                  disabled={processingIds.has(registration.id)}
                                  className="btn-outline text-red-600 border-red-300 hover:bg-red-50 flex items-center"
                                >
                                  {processingIds.has(registration.id) ? (
                                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
                                  ) : (
                                    <XCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Desfazer Check-in
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                </div>

                {/* Controles de navegação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-8">
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === 1
                          ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </button>

                    <div className="flex space-x-2">
                      {Array.from({ length: totalPages }, (_, index) => {
                        const page = index + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === totalPages
                          ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification for QR Code Link */}
      {qrCodeCopied && (
        <div className="fixed bottom-4 right-4 bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center">
            <QrCode className="h-4 w-4 mr-2" />
            <p className="text-sm font-medium">Link de check-in via QR Code copiado!</p>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
} 