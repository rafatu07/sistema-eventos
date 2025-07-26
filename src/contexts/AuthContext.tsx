'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { isUserAdmin } from '@/lib/firestore';
import { AuthContextType, User } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Função para traduzir erros do Firebase para mensagens amigáveis
const getFirebaseErrorMessage = (error: { code?: string; message?: string }): string => {
  const errorCode = error?.code || '';
  
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Usuário não encontrado. Verifique seu email ou cadastre-se.';
    case 'auth/wrong-password':
      return 'Senha incorreta. Tente novamente.';
    case 'auth/invalid-email':
      return 'Email inválido. Verifique se digitou corretamente.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada. Entre em contato com o suporte.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas de login. Tente novamente mais tarde.';
    case 'auth/email-already-in-use':
      return 'Este email já está cadastrado. Tente fazer login ou use outro email.';
    case 'auth/weak-password':
      return 'Senha muito fraca. Use pelo menos 6 caracteres.';
    case 'auth/operation-not-allowed':
      return 'Operação não permitida. Entre em contato com o suporte.';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Email ou senha incorretos. Verifique seus dados e tente novamente.';
    case 'auth/network-request-failed':
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    case 'auth/popup-closed-by-user':
      return 'Login cancelado. Tente novamente.';
    case 'auth/cancelled-popup-request':
      return 'Apenas uma janela de login pode estar aberta por vez.';
    case 'auth/popup-blocked':
      return 'Popup bloqueado pelo navegador. Permita popups e tente novamente.';
    default:
      if (errorCode.includes('auth/')) {
        return 'Erro na autenticação. Tente novamente ou entre em contato com o suporte.';
      }
      return 'Erro inesperado. Tente novamente.';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const createUserDocument = async (firebaseUser: FirebaseUser) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const userData: Omit<User, 'uid'> = {
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || '',
        isAdmin: isUserAdmin(firebaseUser.email!),
        createdAt: new Date(),
      };

      await setDoc(userRef, userData);
    }

    // Get the user data
    const updatedUserSnap = await getDoc(userRef);
    if (updatedUserSnap.exists()) {
      const userData = updatedUserSnap.data();
      return {
        uid: firebaseUser.uid,
        email: userData.email,
        displayName: userData.displayName,
        isAdmin: userData.isAdmin,
        createdAt: userData.createdAt?.toDate() || new Date(),
      } as User;
    }

    return null;
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userData = await createUserDocument(result.user);
      setUser(userData);
    } catch (error) {
      console.error('Error signing in:', error);
      const friendlyMessage = getFirebaseErrorMessage(error as { code?: string; message?: string });
      throw new Error(friendlyMessage);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name
      await updateProfile(result.user, { displayName });
      
      const userData = await createUserDocument(result.user);
      setUser(userData);
    } catch (error) {
      console.error('Error signing up:', error);
      const friendlyMessage = getFirebaseErrorMessage(error as { code?: string; message?: string });
      throw new Error(friendlyMessage);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userData = await createUserDocument(result.user);
      setUser(userData);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      const friendlyMessage = getFirebaseErrorMessage(error as { code?: string; message?: string });
      throw new Error(friendlyMessage);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      // Limpar login temporário se existir
      localStorage.removeItem('tempLogin');
    } catch (error) {
      console.error('Error signing out:', error);
      const friendlyMessage = getFirebaseErrorMessage(error as { code?: string; message?: string });
      throw new Error(friendlyMessage);
    }
  };

  // Função para tentar login automático com credenciais temporárias
  const tryTempLogin = async () => {
    const tempLogin = localStorage.getItem('tempLogin');
    if (tempLogin) {
      try {
        const { email, password } = JSON.parse(tempLogin);
        await signInWithEmailAndPassword(auth, email, password);
        localStorage.removeItem('tempLogin'); // Limpar após uso
        return true;
      } catch (error) {
        console.error('Error with temp login:', error);
        localStorage.removeItem('tempLogin');
        return false;
      }
    }
    return false;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await createUserDocument(firebaseUser);
        setUser(userData);
      } else {
        // Se não há usuário logado, tentar login temporário
        const didTempLogin = await tryTempLogin();
        if (!didTempLogin) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

