'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getEvent, getCustomFormByEventId } from '@/lib/firestore';
import { Event, CustomFormConfig } from '@/types';
import { Loading } from '@/components/Loading';
import { CustomPublicForm } from '@/components/CustomPublicForm';
import { validateCPF, validateEmail, validateFullName, formatCPF } from '@/lib/validators';
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
  const [customForm, setCustomForm] = useState<CustomFormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isClient, setIsClient] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  // Garantir que a formatação de datas aconteça apenas no cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const eventData = await getEvent(eventId);
        if (!eventData) {
          setError('Evento não encontrado');
          return;
        }
        setEvent(eventData);

        // Tentar carregar formulário personalizado
        try {
          const customFormData = await getCustomFormByEventId(eventId);
          setCustomForm(customFormData);
        } catch {
          console.log('No custom form found, using default form');
          setCustomForm(null);
        }
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
    const formattedCPF = formatCPF(e.target.value);
    setFormData(prev => ({
      ...prev,
      cpf: formattedCPF
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    // Validações usando validators centralizados
    if (!formData.name || !formData.email || !formData.cpf || !formData.password) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      setSubmitting(false);
      return;
    }

    if (!validateFullName(formData.name)) {
      setError('Por favor, digite seu nome completo.');
      setSubmitting(false);
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Por favor, digite um email válido.');
      setSubmitting(false);
      return;
    }

    if (!validateCPF(formData.cpf)) {
      setError('Por favor, digite um CPF válido.');
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

  const times = formatEventTimes(event);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Calendar className="h-10 w-10 text-blue-600 mr-4" />
              <h1 className="text-2xl font-bold text-gray-900">Sistema de Eventos</h1>
            </div>
            
            <button
              onClick={shareEvent}
              className="btn-outline flex items-center px-6 py-3"
            >
              <Share2 className="h-5 w-5 mr-2" />
              Compartilhar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Event Info */}
          <div className="flex flex-col">
            {/* Event Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white shadow-lg mb-8">
              <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
              <p className="text-blue-100 text-xl leading-relaxed">{event.description}</p>
            </div>

            {/* Event Details - Mesmo tamanho que o card do formulário */}
            <div className="card flex-1">
              <div className="card-content h-full flex flex-col justify-center">
                <div className="space-y-12">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-20 h-20 bg-blue-100 rounded-xl flex items-center justify-center mr-8">
                      <Calendar className="h-10 w-10 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">Data</h3>
                      <p className="text-gray-700 text-xl font-medium">{times.dateStr}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-20 h-20 bg-green-100 rounded-xl flex items-center justify-center mr-8">
                      <Clock className="h-10 w-10 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">Horário</h3>
                      <div className="text-gray-700 text-xl space-y-2">
                        <p>Início: <span className="font-semibold">{times.startTimeStr}</span></p>
                        <p>Término: <span className="font-semibold">{times.endTimeStr}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-20 h-20 bg-purple-100 rounded-xl flex items-center justify-center mr-8">
                      <MapPin className="h-10 w-10 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">Local</h3>
                      <p className="text-gray-700 text-xl font-medium">{event.location}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <div className="space-y-8">
            {/* Se existe formulário personalizado, usar ele, senão usar formulário padrão */}
            {customForm ? (
              <CustomPublicForm eventId={eventId} config={customForm} />
            ) : (
              <>
                <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-8 text-white">
                  <div className="flex items-center mb-3">
                    <UserPlus className="h-8 w-8 mr-4" />
                    <h2 className="text-3xl font-bold">Inscreva-se no Evento</h2>
                  </div>
                  <p className="text-green-100 text-lg">
                    Preencha seus dados para confirmar sua participação
                  </p>
                </div>

                <div className="card">
                  <div className="card-content">
                    {success && (
                      <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-green-800 font-semibold text-lg mb-2">{success}</p>
                        <p className="text-green-700">
                          Redirecionando para o dashboard...
                        </p>
                      </div>
                    )}

                    {error && (
                      <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-red-800 font-semibold text-lg">{error}</p>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-3">
                            <User className="inline h-5 w-5 mr-2" />
                            Nome Completo *
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            className="input w-full text-lg"
                            placeholder="Digite seu nome completo"
                            value={formData.name}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div>
                          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-3">
                            <Mail className="inline h-5 w-5 mr-2" />
                            Email *
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            className="input w-full text-lg"
                            placeholder="Digite seu email"
                            value={formData.email}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div>
                          <label htmlFor="cpf" className="block text-sm font-semibold text-gray-700 mb-3">
                            <CreditCard className="inline h-5 w-5 mr-2" />
                            CPF *
                          </label>
                          <input
                            type="text"
                            id="cpf"
                            name="cpf"
                            required
                            maxLength={14}
                            className="input w-full text-lg"
                            placeholder="000.000.000-00"
                            value={formData.cpf}
                            onChange={handleCPFChange}
                          />
                        </div>

                        <div>
                          <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-3">
                            <Phone className="inline h-5 w-5 mr-2" />
                            Telefone (opcional)
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            className="input w-full text-lg"
                            placeholder="(11) 99999-9999"
                            value={formData.phone}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div>
                          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3">
                            <Lock className="inline h-5 w-5 mr-2" />
                            Senha *
                          </label>
                          <input
                            type="password"
                            id="password"
                            name="password"
                            required
                            minLength={6}
                            className="input w-full text-lg"
                            placeholder="Digite uma senha com pelo menos 6 caracteres"
                            value={formData.password}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-3">
                            <Lock className="inline h-5 w-5 mr-2" />
                            Confirmar Senha *
                          </label>
                          <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            required
                            minLength={6}
                            className="input w-full text-lg"
                            placeholder="Digite a senha novamente"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="btn-primary w-full flex items-center justify-center text-lg py-4"
                        >
                          {submitting ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-5 w-5 mr-3" />
                              Confirmar Inscrição
                            </>
                          )}
                        </button>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                        <p className="text-blue-800 font-medium">
                          Ao se inscrever, você receberá acesso ao seu dashboard pessoal para 
                          acompanhar o evento.
                        </p>
                      </div>
                    </form>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

