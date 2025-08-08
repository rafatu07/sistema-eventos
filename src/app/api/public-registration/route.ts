import { NextRequest, NextResponse } from 'next/server';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { createRegistration, isUserAdmin } from '@/lib/firestore';
import { PublicRegistrationData } from '@/types';
import { rateLimit, getRequestIdentifier, RATE_LIMIT_CONFIGS, createRateLimitHeaders } from '@/lib/rate-limit';
import { validateCPF, validateEmail, validateFullName, sanitizeInput } from '@/lib/validators';
import { logError, logInfo, logAudit, AuditAction } from '@/lib/logger';

// Função para traduzir erros do Firebase para mensagens amigáveis
const getFirebaseErrorMessage = (error: { code?: string; message?: string }): string => {
  const errorCode = error?.code || '';
  
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'Este email já está cadastrado. O sistema fará a inscrição com a conta existente.';
    case 'auth/invalid-email':
      return 'Email inválido. Verifique se digitou corretamente.';
    case 'auth/weak-password':
      return 'Senha muito fraca. Use pelo menos 6 caracteres.';
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
  const startTime = Date.now();
  const identifier = getRequestIdentifier(request);
  
  // Rate limiting
  const rateLimitResult = rateLimit(identifier, RATE_LIMIT_CONFIGS.PUBLIC_REGISTRATION);
  if (!rateLimitResult.success) {
    logInfo('Rate limit excedido para registro público', { 
      identifier, 
      retryAfter: rateLimitResult.retryAfter 
    });
    
    return NextResponse.json(
      { error: 'Muitas tentativas de registro. Tente novamente em alguns minutos.' },
      { 
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult)
      }
    );
  }

  try {
    const body = await request.json();
    const { eventId, name, email, cpf, password }: { 
      eventId: string; 
      password: string; 
    } & Omit<PublicRegistrationData, 'phone'> = body;

    logInfo('Tentativa de registro público', { eventId, email: email?.substring(0, 3) + '***' });

    // Validação de campos obrigatórios
    if (!eventId || !name || !email || !cpf || !password) {
      logInfo('Campos obrigatórios faltando no registro público');
      return NextResponse.json(
        { error: 'Por favor, preencha todos os campos obrigatórios.' },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Sanitizar inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    const sanitizedCPF = sanitizeInput(cpf);

    // Validações robustas
    if (!validateEmail(sanitizedEmail)) {
      logInfo('Email inválido no registro público', { email: sanitizedEmail });
      return NextResponse.json(
        { error: 'Email inválido. Verifique se digitou corretamente.' },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    if (!validateFullName(sanitizedName)) {
      logInfo('Nome inválido no registro público');
      return NextResponse.json(
        { error: 'Por favor, digite seu nome completo.' },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    if (!validateCPF(sanitizedCPF)) {
      logInfo('CPF inválido no registro público');
      return NextResponse.json(
        { error: 'CPF inválido. Verifique se digitou corretamente.' },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Validação de senha
    if (password.length < 6) {
      logInfo('Senha muito fraca no registro público');
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres.' },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    try {
      // Tentar criar usuário no Firebase Auth com a senha fornecida
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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

      // Log de auditoria para novo usuário
      logAudit(AuditAction.REGISTER, firebaseUser.uid, true, {
        eventId,
        email: sanitizedEmail,
        registrationId
      });

      const duration = Date.now() - startTime;
      logInfo('Registro público realizado com sucesso', {
        userId: firebaseUser.uid,
        eventId,
        registrationId,
        duration
      });

      return NextResponse.json({
        success: true,
        message: 'Inscrição realizada com sucesso! Você receberá acesso ao seu dashboard.',
        userId: firebaseUser.uid,
        registrationId: registrationId,
      }, {
        headers: createRateLimitHeaders(rateLimitResult)
      });

    } catch (authError) {
      const error = authError as { code?: string; message?: string };
      
      // Se usuário já existe, apenas criar inscrição
      if (error.code === 'auth/email-already-in-use') {
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

            // Log de auditoria para usuário existente
            logAudit(AuditAction.REGISTRATION_CREATE, userId, true, {
              eventId,
              email: sanitizedEmail,
              registrationId,
              existingUser: true
            });

            const duration = Date.now() - startTime;
            logInfo('Registro público realizado para usuário existente', {
              userId,
              eventId,
              registrationId,
              duration
            });

            return NextResponse.json({
              success: true,
              message: 'Inscrição realizada com sucesso! Faça login com sua conta existente.',
              userId: userId,
              registrationId: registrationId,
              existingUser: true,
            }, {
              headers: createRateLimitHeaders(rateLimitResult)
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
        const friendlyMessage = getFirebaseErrorMessage(error);
        throw new Error(friendlyMessage);
      }
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = (error as Error).message || 'Erro interno do servidor. Tente novamente.';
    
    logError('Erro no registro público', error as Error, {
      identifier,
      duration
    });
    
    // Log de auditoria para falha
    logAudit(AuditAction.REGISTER, identifier, false, {
      error: errorMessage
    });
    
    return NextResponse.json(
      { error: errorMessage },
      { 
        status: 500,
        headers: createRateLimitHeaders({
          limit: RATE_LIMIT_CONFIGS.PUBLIC_REGISTRATION.maxRequests,
          remaining: 0,
          resetTime: Date.now() + RATE_LIMIT_CONFIGS.PUBLIC_REGISTRATION.windowMs
        })
      }
    );
  }
} 