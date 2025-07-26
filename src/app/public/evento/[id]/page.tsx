'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getEvent } from '@/lib/firestore';
import { Event } from '@/types';
import { Loading } from '@/components/Loading';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  UserPlus,
  Share2,
  User,
  Mail,
  Phone,
  CreditCard,
  Lock
} from 'lucide-react';

export default function PublicEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showQR, setShowQR] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const loadEvent = async () => {
      try {
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

    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    
    setFormData(prev => ({
      ...prev,
      cpf: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    // Validações
    if (!formData.name || !formData.email || !formData.cpf || !formData.password) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      setSubmitting(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setSubmitting(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      setSubmitting(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor, digite um email válido.');
      setSubmitting(false);
      return;
    }

    const cpfNumbers = formData.cpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      setError('Por favor, digite um CPF válido.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/public-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          name: formData.name,
          email: formData.email,
          cpf: formData.cpf,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        
        // Para usuário existente, armazenar credenciais para login manual
        if (data.existingUser) {
          // Redirecionar para página de login com informações
          setTimeout(() => {
            router.push(`/login?email=${encodeURIComponent(formData.email)}&message=${encodeURIComponent('Inscrição realizada! Faça login com sua conta existente.')}`);
          }, 2000);
        } else {
          // Para novo usuário, o Firebase já fez login automaticamente
          // Apenas redirecionar para o dashboard
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        }
        
      } else {
        setError(data.error || 'Erro ao processar inscrição');
      }

    } catch (error) {
      console.error('Error submitting registration:', error);
      setError('Erro interno. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const shareEvent = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.name,
          text: `Inscreva-se no evento: ${event?.name}`,
          url: url,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copiado para a área de transferência!');
      } catch (error) {
        console.log('Error copying to clipboard:', error);
      }
    }
  };

  if (loading) {
    return <Loading text="Carregando evento..." />;
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Evento não encontrado</h3>
          <p className="text-gray-600">O evento que você está procurando não existe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Sistema de Eventos</h1>
            </div>
            
            <button
              onClick={shareEvent}
              className="btn-outline flex items-center"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Event Info */}
          <div className="space-y-6">
            {/* Event Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
              <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
              <p className="text-blue-100 text-lg">{event.description}</p>
            </div>

            {/* Event Details */}
            <div className="card">
              <div className="card-content space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Data e Hora</h3>
                    <p className="text-gray-600">
                      {event.date.toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-gray-600">
                      {event.date.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Local</h3>
                    <p className="text-gray-600">{event.location}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="card">
              <div className="card-content">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">QR Code do Evento</h3>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="btn-outline"
                  >
                    {showQR ? 'Ocultar' : 'Mostrar'} QR Code
                  </button>
                </div>
                
                {showQR && (
                  <div className="flex justify-center">
                    <QRCodeGenerator 
                      value={window.location.href}
                      size={200}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
              <div className="flex items-center mb-2">
                <UserPlus className="h-6 w-6 mr-3" />
                <h2 className="text-2xl font-bold">Inscreva-se no Evento</h2>
              </div>
              <p className="text-green-100">
                Preencha seus dados para confirmar sua participação
              </p>
            </div>

            <div className="card">
              <div className="card-content">
                {success && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 text-sm font-medium">{success}</p>
                    <p className="text-green-700 text-sm mt-1">
                      Redirecionando para o dashboard...
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm font-medium">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="inline h-4 w-4 mr-2" />
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="input w-full"
                      placeholder="Digite seu nome completo"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="inline h-4 w-4 mr-2" />
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="input w-full"
                      placeholder="Digite seu email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-2">
                      <CreditCard className="inline h-4 w-4 mr-2" />
                      CPF *
                    </label>
                    <input
                      type="text"
                      id="cpf"
                      name="cpf"
                      required
                      maxLength={14}
                      className="input w-full"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={handleCPFChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="inline h-4 w-4 mr-2" />
                      Telefone (opcional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="input w-full"
                      placeholder="(11) 99999-9999"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      <Lock className="inline h-4 w-4 mr-2" />
                      Senha *
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      required
                      minLength={6}
                      className="input w-full"
                      placeholder="Digite uma senha com pelo menos 6 caracteres"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      <Lock className="inline h-4 w-4 mr-2" />
                      Confirmar Senha *
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      required
                      minLength={6}
                      className="input w-full"
                      placeholder="Digite a senha novamente"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary w-full flex items-center justify-center"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Confirmar Inscrição
                      </>
                    )}
                  </button>

                  <p className="text-sm text-gray-600 text-center">
                    Ao se inscrever, você receberá acesso ao seu dashboard pessoal para 
                    acompanhar o evento.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

