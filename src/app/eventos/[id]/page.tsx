'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { Loading } from '@/components/Loading';
import { 
  getEvent, 
  getRegistration, 
  getEventRegistrations, 
  createRegistration
} from '@/lib/firestore';
import { Event, Registration } from '@/types';
import { 
  MapPin, 
  Clock, 
  UserPlus, 
  UserCheck, 
  LogOut, 
  Award,
  FileDown,
  Edit,
  Download,
  QrCode,
  Copy,
  Share2,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { downloadQRCodePDF } from '@/lib/qr-pdf-generator';

export default function EventDetailsPage() {
  const params = useParams();
  const { user } = useAuth();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeCopied, setQrCodeCopied] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Garantir que a formatação de datas aconteça apenas no cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

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

        // Load user registration only for non-admin users
        if (!user.isAdmin) {
          const userRegistration = await getRegistration(eventId, user.uid);
          setRegistration(userRegistration);
        }

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

  const handleRegister = async () => {
    if (!event || !user || user.isAdmin) return;

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

    // Limpar mensagens anteriores
    setError('');
    setSuccessMessage('');
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
          eventStartTime: event.startTime?.toISOString(),
          eventEndTime: event.endTime?.toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reload registration data from database to ensure consistency
        try {
          const updatedRegistration = await getRegistration(event.id, registration.userId);
          if (updatedRegistration) {
            setRegistration(updatedRegistration);
          } else {
            // Fallback to manual update if reload fails
            setRegistration({
              ...registration,
              certificateGenerated: true,
              certificateUrl: data.certificateUrl,
            });
          }
        } catch (reloadError) {
          console.warn('Failed to reload registration, using manual update:', reloadError);
          // Fallback to manual update
          setRegistration({
            ...registration,
            certificateGenerated: true,
            certificateUrl: data.certificateUrl,
          });
        }
        
        // Open certificate in new tab
        window.open(data.certificateUrl, '_blank');
        setSuccessMessage('Certificado gerado com sucesso!');
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

  const downloadParticipantsList = async () => {
    if (!event || !user?.isAdmin) return;

    // Limpar mensagens anteriores
    setError('');
    setSuccessMessage('');
    setDownloadLoading(true);
    
    try {
      // Buscar lista completa de registrations
      const registrations = await getEventRegistrations(event.id);
      
      if (registrations.length === 0) {
        setError('Não há participantes inscritos neste evento');
        return;
      }
      
      // Preparar dados para CSV
      const csvData = registrations.map(reg => ({
        'Nome': reg.userName,
        'Email': reg.userEmail,
        'CPF': reg.userCPF || 'Não informado',
        'Data da Inscrição': isClient ? reg.createdAt.toLocaleDateString('pt-BR') : 'N/A',
        'Check-in Realizado': reg.checkedIn ? 'Sim' : 'Não',
        'Data do Check-in': reg.checkedIn && reg.checkInTime && isClient 
          ? reg.checkInTime.toLocaleString('pt-BR') 
          : 'N/A',
        'Check-out Realizado': reg.checkedOut ? 'Sim' : 'Não',
        'Data do Check-out': reg.checkedOut && reg.checkOutTime && isClient 
          ? reg.checkOutTime.toLocaleString('pt-BR') 
          : 'N/A',
        'Certificado Gerado': reg.certificateGenerated ? 'Sim' : 'Não',
      }));

      // Gerar CSV com cabeçalho de informações do evento
      const eventInfo = [
        `"Evento: ${event.name}"`,
        `"Descrição: ${event.description}"`,
        `"Data: ${times.dateStr}"`,
        `"Horário: ${times.fullTimeStr}"`,
        `"Local: ${event.location}"`,
        `"Total de Participantes: ${registrations.length}"`,
        `"Relatório gerado em: ${isClient ? new Date().toLocaleString('pt-BR') : new Date().toISOString()}"`,
        '', // Linha em branco
      ];

      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        ...eventInfo,
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(',')
        )
      ].join('\n');

      // Adicionar BOM para UTF-8 (para o Excel reconhecer acentos)
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const fileName = `participantes_${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      // Mostrar mensagem de sucesso
      setSuccessMessage(`Lista de participantes baixada com sucesso! (${registrations.length} participantes)`);
      setTimeout(() => setSuccessMessage(''), 5000);
      
    } catch (error) {
      console.error('Error downloading participants list:', error);
      setError('Erro ao baixar lista de participantes');
    } finally {
      setDownloadLoading(false);
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

            {/* Success Message */}
            {successMessage && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <Download className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-green-800 font-medium">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-red-800 font-medium">{error}</p>
                  </div>
                  <div className="ml-auto pl-3">
                    <div className="-mx-1.5 -my-1.5">
                      <button
                        onClick={() => setError('')}
                        className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-4 sm:px-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Admin View */}
                {user?.isAdmin ? (
                  <div className="card">
                    <div className="card-header">
                      <h3 className="text-lg font-semibold">Painel Administrativo</h3>
                    </div>
                    
                    <div className="card-content">
                      <div className="text-center py-8">
                        <UserCheck className="mx-auto h-12 w-12 text-blue-600 mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          Gerenciamento do Evento
                        </h4>
                        <p className="text-gray-600 mb-6">
                          Use os botões abaixo para editar o evento, gerenciar check-ins dos participantes ou baixar a lista de inscritos.
                        </p>
                        
                        <div className="flex flex-wrap justify-center gap-4">
                          <Link
                            href={`/dashboard/eventos/${event.id}/editar`}
                            className="btn-outline flex items-center"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Evento
                          </Link>
                          
                          <Link
                            href={`/dashboard/eventos/${event.id}/certificado`}
                            className="btn-outline flex items-center text-green-600 border-green-300 hover:bg-green-50"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Configurar Certificado
                          </Link>
                          
                          <Link
                            href={`/admin/evento/${event.id}/checkin`}
                            className="btn-primary flex items-center"
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Gerenciar Check-in
                          </Link>

                          <button
                            onClick={downloadParticipantsList}
                            disabled={downloadLoading || allRegistrations.length === 0}
                            className="btn-outline flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                            title={allRegistrations.length === 0 ? "Nenhum participante inscrito" : "Baixar lista de participantes"}
                          >
                            {downloadLoading ? (
                              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            {downloadLoading ? 'Gerando...' : 'Baixar Lista'}
                          </button>

                          <button
                            onClick={() => setShowQRCode(!showQRCode)}
                            className="btn-outline flex items-center text-purple-600 border-purple-300 hover:bg-purple-50"
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            {showQRCode ? 'Ocultar QR Code' : 'Mostrar QR Code'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* QR Code Section */}
                    {showQRCode && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="text-center">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">
                            QR Code para Check-in
                          </h4>
                          <p className="text-gray-600 mb-6">
                            Os participantes podem escanear este QR Code para fazer check-in automaticamente no evento.
                          </p>
                          
                          {event && (
                            <div className="flex flex-col items-center space-y-4">
                              <QRCodeGenerator 
                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/checkin/${event.id}`}
                                size={200}
                                title=""
                              />
                              
                              <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                  onClick={copyCheckinLink}
                                  className="btn-outline flex items-center"
                                >
                                  {qrCodeCopied ? (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-2 text-green-600" />
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
                              
                              <div className="max-w-md mx-auto">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                                  <strong>Instruções:</strong>
                                  <ul className="mt-2 space-y-1 list-disc list-inside">
                                    <li>Mostre este QR Code para os participantes escanearem</li>
                                    <li>Os participantes precisam estar logados para fazer check-in</li>
                                    <li>Check-in ficará disponível 30 minutos antes do evento</li>
                                    <li>O link também pode ser compartilhado diretamente</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* User View */
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
                                  {isClient ? `Inscrito em ${registration.createdAt.toLocaleDateString('pt-BR')}` : 'Carregando...'}
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
                                      ? (isClient ? `Realizado em ${registration.checkInTime?.toLocaleString('pt-BR')}` : 'Realizado')
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
                                      ? (isClient ? `Realizado em ${registration.checkOutTime?.toLocaleString('pt-BR')}` : 'Realizado')
                                      : `Automático às ${times.endTimeStr}`
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Certificate Action */}
                          {(() => {
                            console.log('Certificate Debug:', {
                              checkedOut: registration.checkedOut,
                              certificateGenerated: registration.certificateGenerated,
                              certificateUrl: registration.certificateUrl,
                              showGenerateButton: registration.checkedOut && !registration.certificateGenerated,
                              showDownloadButton: registration.certificateGenerated && registration.certificateUrl
                            });
                            return null;
                          })()}
                          
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

                          {registration.certificateGenerated && !registration.certificateUrl && (
                            <div className="pt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-yellow-800 text-sm">
                                ⚠️ Certificado foi gerado mas a URL não está disponível. Tente gerar novamente.
                              </p>
                              <button
                                onClick={generateCertificate}
                                disabled={actionLoading}
                                className="btn-outline mt-2 text-sm"
                              >
                                <Award className="h-4 w-4 mr-2" />
                                {actionLoading ? 'Gerando...' : 'Gerar Novamente'}
                              </button>
                            </div>
                          )}

                          {/* Info for non-admin users */}
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

                {/* Registration Info - Only for registered users */}
                {registration && !user?.isAdmin && (
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
                          {isClient ? `Inscrito em ${registration.createdAt.toLocaleDateString('pt-BR')}` : 'Carregando...'}
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

