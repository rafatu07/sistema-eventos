'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
  Download,
  Trash2,
  AlertTriangle,
  Award,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { downloadQRCodePDF } from '@/lib/qr-pdf-generator';

export default function AdminCheckinPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { user } = useAuth();
  
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
  
  // Estados para exclusão de certificados (botão temporário)
  const [deletingCertificates, setDeletingCertificates] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Estados para exclusão de certificado individual
  const [deletingIndividualCert, setDeletingIndividualCert] = useState<Set<string>>(new Set());
  
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

  // Função temporária para excluir certificados do evento
  const deleteCertificates = async () => {
    if (!event) return;
    
    setDeletingCertificates(true);
    
    try {
      console.log('🗑️ Iniciando exclusão de certificados para evento:', event.id);
      
      const response = await fetch('/api/delete-event-certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          userId: 'admin-temp' // Temporário - idealmente usar o ID do usuário logado
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Certificados excluídos com sucesso:', data);
        alert(`✅ Sucesso!\n\nCertificados processados: ${data.deletedCount} removidos\n${data.errorCount > 0 ? `${data.errorCount} erros encontrados` : 'Nenhum erro'}`);
        
        // Recarregar registrations para atualizar o status dos certificados
        const updatedRegistrations = await getEventRegistrations(event.id);
        setRegistrations(updatedRegistrations);
        
      } else {
        console.error('❌ Erro na exclusão:', data.error);
        alert(`❌ Erro ao excluir certificados:\n\n${data.error}`);
      }
    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      alert('❌ Erro interno. Verifique o console para detalhes.');
    } finally {
      setDeletingCertificates(false);
      setShowDeleteConfirm(false);
    }
  };

  // Função para excluir certificado individual
  const deleteIndividualCertificate = async (registration: Registration) => {
    if (!registration.certificateUrl || !registration.certificateGenerated) {
      alert('Este usuário não possui certificado gerado.');
      return;
    }

    const confirmDelete = window.confirm(
      `⚠️ Confirmar exclusão do certificado de ${registration.userName}?\n\nEsta ação não é reversível e removerá o arquivo do Cloudinary!`
    );

    if (!confirmDelete) return;

    setDeletingIndividualCert(prev => new Set(prev).add(registration.id));

    try {
      console.log(`🗑️ Excluindo certificado individual para ${registration.userName}`);

      // Usar nova API que deleta do Cloudinary E Firebase
      const response = await fetch('/api/delete-individual-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registrationId: registration.id,
          userId: user?.uid
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao excluir certificado');
      }

      // Atualizar estado local
      const updatedRegistrations = registrations.map(reg =>
        reg.id === registration.id
          ? { ...reg, certificateGenerated: false, certificateUrl: undefined }
          : reg
      );
      
      setRegistrations(updatedRegistrations);

      console.log(`✅ ${result.message}`);
      alert(`✅ ${result.message}`);

    } catch (error) {
      console.error('❌ Erro ao excluir certificado individual:', error);
      alert(`❌ Erro ao excluir certificado de ${registration.userName}. ${(error as Error).message}`);
    } finally {
      setDeletingIndividualCert(prev => {
        const newSet = new Set(prev);
        newSet.delete(registration.id);
        return newSet;
      });
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
    certificatesGenerated: registrations.filter(r => r.certificateGenerated && r.certificateUrl).length,
    certificatesPending: registrations.filter(r => r.checkedOut && !r.certificateGenerated).length,
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
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

              {/* Novas estatísticas de certificados */}
              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <Award className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Certificados Gerados</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.certificatesGenerated}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Certificados Pendentes</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.certificatesPending}</p>
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

                              {/* Botão temporário para excluir certificados */}
                              <button
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={deletingCertificates}
                                className="btn-outline flex items-center text-red-600 border-red-300 hover:bg-red-50 disabled:opacity-50"
                                title="⚠️ FUNÇÃO TEMPORÁRIA - Exclui todos os certificados deste evento"
                              >
                                {deletingCertificates ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
                                    Excluindo...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    🗑️ Excluir Certificados
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

                          {/* Status e informações do certificado */}
                          <div className="mt-3 flex items-center flex-wrap gap-3">
                            {/* Badge de status geral */}
                            {registration.checkedIn && registration.checkedOut ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Participação Completa
                              </span>
                            ) : registration.checkedIn ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <UserCheck className="w-3 h-3 mr-1" />
                                Check-in Realizado
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <UserX className="w-3 h-3 mr-1" />
                                Aguardando Check-in
                              </span>
                            )}

                            {/* Badge do certificado */}
                            {registration.certificateGenerated && registration.certificateUrl ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <Award className="w-3 h-3 mr-1" />
                                  Certificado Gerado
                                </span>
                                
                                {/* Botões de ação do certificado */}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => window.open(`/api/certificate/download?registrationId=${registration.id}`, '_blank')}
                                    className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                                    title="Ver certificado"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                  
                                  <button
                                    onClick={() => deleteIndividualCertificate(registration)}
                                    disabled={deletingIndividualCert.has(registration.id)}
                                    className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-50"
                                    title="Excluir certificado"
                                  >
                                    {deletingIndividualCert.has(registration.id) ? (
                                      <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            ) : registration.checkedOut && !registration.certificateGenerated ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                <Award className="w-3 h-3 mr-1" />
                                Certificado Pendente
                              </span>
                            ) : null}
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

      {/* Modal de confirmação para exclusão de certificados */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                ⚠️ Confirmar Exclusão de Certificados
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                <strong>Esta ação irá:</strong>
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-4">
                <li>Excluir <strong>TODOS</strong> os certificados deste evento</li>
                <li>Remover os arquivos do Cloudinary (CDN)</li>
                <li>Atualizar o status no banco de dados</li>
                <li><strong>NÃO É REVERSÍVEL!</strong></li>
              </ul>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 text-sm">
                <p><strong>Evento:</strong> {event?.name}</p>
                <p><strong>Certificados a serem excluídos:</strong> {registrations.filter(r => r.certificateGenerated).length}</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingCertificates}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              
              <button
                onClick={deleteCertificates}
                disabled={deletingCertificates}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {deletingCertificates ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Confirmar Exclusão
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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