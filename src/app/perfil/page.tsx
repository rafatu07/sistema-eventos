'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { useNotifications } from '@/components/NotificationSystem';
import { User, Mail, Shield, Calendar, Lock, Edit2, CreditCard } from 'lucide-react';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function PerfilPage() {
  const { user } = useAuth();
  const notifications = useNotifications();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userCPF, setUserCPF] = useState<string | null>(null);
  const [loadingCPF, setLoadingCPF] = useState(true);
  
  // Form states
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Buscar CPF do usuário
  useEffect(() => {
    const fetchUserCPF = async () => {
      if (!user?.uid) return;
      
      try {
        setLoadingCPF(true);
        const response = await fetch(`/api/user-cpf?userId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          setUserCPF(data.cpf);
        } else {
          console.error('Erro ao buscar CPF:', await response.text());
        }
      } catch (error) {
        console.error('Erro ao buscar CPF:', error);
      } finally {
        setLoadingCPF(false);
      }
    };

    fetchUserCPF();
  }, [user?.uid]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auth.currentUser || !newDisplayName.trim()) return;
    
    setLoading(true);
    
    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: newDisplayName.trim()
      });

      // Update Firestore document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: newDisplayName.trim()
      });

      // Force page refresh to update user data in context
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      notifications.success('Nome Atualizado', 'Seu nome foi atualizado com sucesso!');
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
      notifications.error('Erro', 'Não foi possível atualizar o nome. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auth.currentUser) return;

    // Validations
    if (!currentPassword || !newPassword || !confirmPassword) {
      notifications.error('Erro', 'Preencha todos os campos de senha.');
      return;
    }

    if (newPassword !== confirmPassword) {
      notifications.error('Erro', 'A nova senha e confirmação não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      notifications.error('Erro', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, newPassword);

      notifications.success('Senha Alterada', 'Sua senha foi alterada com sucesso!');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      
      if (error.code === 'auth/wrong-password') {
        notifications.error('Erro', 'Senha atual incorreta.');
      } else if (error.code === 'auth/weak-password') {
        notifications.error('Erro', 'A nova senha é muito fraca.');
      } else {
        notifications.error('Erro', 'Não foi possível alterar a senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <User className="h-8 w-8 mr-3 text-blue-600" />
              Meu Perfil
            </h1>
            <p className="mt-2 text-gray-600">
              Gerencie suas informações pessoais e configurações da conta
            </p>
          </div>

          <div className="space-y-6">
            {/* Informações Básicas */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Informações Básicas
              </h2>

              {/* Nome */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome
                </label>
                {isEditingName ? (
                  <form onSubmit={handleUpdateName} className="flex space-x-3">
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="flex-1 input"
                      placeholder="Digite seu nome completo"
                      disabled={loading}
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading || !newDisplayName.trim()}
                      className="btn-primary"
                    >
                      {loading ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingName(false);
                        setNewDisplayName(user.displayName || '');
                      }}
                      className="btn-outline"
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-900">
                      {user.displayName || 'Não informado'}
                    </span>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-blue-600 hover:text-blue-700 p-2 rounded-md transition-colors"
                      title="Editar nome"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Email (somente leitura) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-700">{user.email}</span>
                  <span className="ml-auto text-xs text-gray-500">Somente leitura</span>
                </div>
              </div>

              {/* CPF (somente leitura) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF
                </label>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
                  {loadingCPF ? (
                    <span className="text-gray-500">Carregando...</span>
                  ) : (
                    <span className="text-gray-700">
                      {userCPF || 'Não informado'}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-gray-500">Somente leitura</span>
                </div>
                {userCPF && (
                  <p className="text-xs text-gray-500 mt-1">
                    CPF obtido do seu primeiro cadastro em evento
                  </p>
                )}
              </div>

              {/* Tipo de Usuário */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Conta
                </label>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Shield className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-700">
                    {user.isAdmin ? 'Administrador' : 'Usuário'}
                  </span>
                  {user.isAdmin && (
                    <span className="ml-3 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </div>
              </div>

              {/* Data de Criação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Membro desde
                </label>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-700">
                    {user.createdAt.toLocaleDateString('pt-BR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Segurança */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Segurança
              </h2>

              {isChangingPassword ? (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Senha Atual
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="input w-full"
                      placeholder="Digite sua senha atual"
                      disabled={loading}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input w-full"
                      placeholder="Digite a nova senha (mín. 6 caracteres)"
                      minLength={6}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input w-full"
                      placeholder="Confirme a nova senha"
                      minLength={6}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? 'Alterando...' : 'Alterar Senha'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      className="btn-outline"
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">Senha</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Altere sua senha para manter sua conta segura
                    </p>
                  </div>
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="btn-outline"
                  >
                    Alterar Senha
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
