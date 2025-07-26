import { NextRequest, NextResponse } from 'next/server';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { createRegistration, isUserAdmin } from '@/lib/firestore';
import { PublicRegistrationData } from '@/types';

// Função para traduzir erros do Firebase para mensagens amigáveis
const getFirebaseErrorMessage = (error: any): string => {
  const errorCode = error?.code || '';
  
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'Este email já está cadastrado. O sistema fará a inscrição com a conta existente.';
    case 'auth/invalid-email':
      return 'Email inválido. Verifique se digitou corretamente.';
    case 'auth/weak-password':
      return 'Erro interno: senha temporária muito fraca.';
    case 'auth/operation-not-allowed':
      return 'Cadastro temporariamente desabilitado. Entre em contato com o suporte.';
    case 'auth/network-request-failed':
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    default:
      if (errorCode.includes('auth/')) {
        return 'Erro na criação da conta. Tente novamente.';
      }
      return 'Erro interno do servidor. Tente novamente.';
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, name, email, cpf, phone }: { eventId: string } & PublicRegistrationData = body;

    if (!eventId || !name || !email || !cpf) {
      return NextResponse.json(
        { error: 'Por favor, preencha todos os campos obrigatórios.' },
        { status: 400 }
      );
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido. Verifique se digitou corretamente.' },
        { status: 400 }
      );
    }

    // Validação básica de CPF (deve ter 11 dígitos)
    const cpfNumbers = cpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido. Deve conter 11 dígitos.' },
        { status: 400 }
      );
    }

    // Gerar senha temporária
    const tempPassword = Math.random().toString(36).slice(-12);

    try {
      // Tentar criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
      const firebaseUser = userCredential.user;

      // Atualizar perfil do usuário
      await updateProfile(firebaseUser, { displayName: name });

      // Criar documento do usuário no Firestore
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userData = {
        email: email,
        displayName: name,
        isAdmin: isUserAdmin(email),
        createdAt: new Date(),
      };
      await setDoc(userRef, userData);

      // Criar inscrição no evento
      const registrationData = {
        eventId: eventId,
        userId: firebaseUser.uid,
        userEmail: email,
        userName: name,
        userCPF: cpf,
        checkedIn: false,
        checkedOut: false,
        certificateGenerated: false,
      };

      const registrationId = await createRegistration(registrationData);

      return NextResponse.json({
        success: true,
        message: 'Inscrição realizada com sucesso! Você receberá acesso ao seu dashboard.',
        userId: firebaseUser.uid,
        registrationId: registrationId,
        tempPassword: tempPassword, // Para login automático
      });

    } catch (authError: any) {
      // Se usuário já existe, apenas criar inscrição
      if (authError.code === 'auth/email-already-in-use') {
        try {
          // Verificar se usuário existe no Firestore
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const existingUser = querySnapshot.docs[0];
            const userId = existingUser.id;

            // Verificar se já está inscrito no evento
            const registrationsRef = collection(db, 'registrations');
            const registrationQuery = query(
              registrationsRef, 
              where('eventId', '==', eventId),
              where('userId', '==', userId)
            );
            const existingRegistration = await getDocs(registrationQuery);

            if (!existingRegistration.empty) {
              return NextResponse.json(
                { error: 'Você já está inscrito neste evento.' },
                { status: 400 }
              );
            }

            // Criar inscrição no evento
            const registrationData = {
              eventId: eventId,
              userId: userId,
              userEmail: email,
              userName: name,
              userCPF: cpf,
              checkedIn: false,
              checkedOut: false,
              certificateGenerated: false,
            };

            const registrationId = await createRegistration(registrationData);

            return NextResponse.json({
              success: true,
              message: 'Inscrição realizada com sucesso! Faça login com sua conta existente.',
              userId: userId,
              registrationId: registrationId,
              existingUser: true,
            });
          } else {
            throw new Error('Usuário não encontrado no sistema.');
          }
        } catch (firestoreError) {
          console.error('Error handling existing user:', firestoreError);
          throw new Error('Erro ao processar conta existente.');
        }
      } else {
        // Outros erros de autenticação
        const friendlyMessage = getFirebaseErrorMessage(authError);
        throw new Error(friendlyMessage);
      }
    }

  } catch (error: any) {
    console.error('Error in public registration:', error);
    
    // Se já é uma mensagem amigável, usar ela
    const errorMessage = error.message || 'Erro interno do servidor. Tente novamente.';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 