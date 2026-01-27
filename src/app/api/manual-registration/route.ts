import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { createRegistration, isUserAdmin } from '@/lib/firestore';

// Senha temporária padrão para registros manuais
const TEMPORARY_PASSWORD = '123456';

// Validação básica de CPF
function isValidCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Valida comprimento
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
}

// Formata CPF para o padrão XXX.XXX.XXX-XX
function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Validação básica de email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, name, email, cpf, phone, adminUserId } = body;

    // Validações básicas
    if (!eventId || !name || !email || !cpf) {
      return NextResponse.json(
        { error: 'Todos os campos obrigatórios devem ser preenchidos (nome, email, CPF)' },
        { status: 400 }
      );
    }

    // Validar email
    if (!isValidEmail(email.toLowerCase().trim())) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Validar CPF
    if (!isValidCPF(cpf)) {
      return NextResponse.json(
        { error: 'CPF inválido' },
        { status: 400 }
      );
    }

    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedName = name.trim();
    const formattedCPF = formatCPF(cpf);
    const sanitizedPhone = phone?.trim() || '';

    // Verificar se já existe um usuário com este email
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', sanitizedEmail));
    const userQuerySnapshot = await getDocs(userQuery);

    let userId: string;

    if (!userQuerySnapshot.empty) {
      // Usuário já existe
      const existingUser = userQuerySnapshot.docs[0];
      if (!existingUser) {
        throw new Error('Erro ao recuperar dados do usuário existente');
      }
      userId = existingUser.id;
      const userData = existingUser.data();

      // VALIDAÇÃO E ATUALIZAÇÃO DE DADOS DO USUÁRIO
      const existingCPF = userData.cpf;
      const updateFields: Record<string, unknown> = {};
      
      // Validar CPF
      if (existingCPF) {
        // Usuário já tem CPF cadastrado - verificar se é o mesmo
        const cleanExistingCPF = existingCPF.replace(/\D/g, '');
        const cleanProvidedCPF = formattedCPF.replace(/\D/g, '');
        
        if (cleanExistingCPF !== cleanProvidedCPF) {
          return NextResponse.json(
            { 
              error: `CPF informado (${formattedCPF}) não corresponde ao CPF cadastrado para este usuário. Por favor, verifique os dados ou use o CPF correto: ${existingCPF}`,
              existingCPF: existingCPF,
              providedCPF: formattedCPF
            },
            { status: 400 }
          );
        }
      } else {
        // Usuário não tem CPF cadastrado - adicionar ao update
        updateFields.cpf = formattedCPF;
        console.log(`✅ CPF ${formattedCPF} será adicionado ao perfil do usuário ${sanitizedEmail}`);
      }

      // Atualizar nome se estiver vazio ou for diferente
      if (!userData.displayName || userData.displayName.trim() === '') {
        updateFields.displayName = sanitizedName;
        console.log(`✅ Nome "${sanitizedName}" será adicionado ao perfil do usuário ${sanitizedEmail}`);
      }

      // Atualizar telefone se fornecido e o usuário não tiver
      if (sanitizedPhone && (!userData.phone || userData.phone.trim() === '')) {
        updateFields.phone = sanitizedPhone;
        console.log(`✅ Telefone será adicionado ao perfil do usuário ${sanitizedEmail}`);
      }

      // Aplicar atualizações se houver campos para atualizar
      if (Object.keys(updateFields).length > 0) {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          ...updateFields,
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Perfil do usuário ${sanitizedEmail} atualizado com sucesso`);
      }

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
          { error: 'Este usuário já está inscrito neste evento' },
          { status: 400 }
        );
      }
    } else {
      // Criar novo usuário no Firebase Authentication com senha temporária
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, TEMPORARY_PASSWORD);
        const firebaseUser = userCredential.user;
        userId = firebaseUser.uid;

        // Atualizar perfil do usuário no Firebase Auth
        await updateProfile(firebaseUser, { displayName: sanitizedName });

        // Criar documento do usuário no Firestore
        const userRef = doc(db, 'users', userId);
        const userData = {
          email: sanitizedEmail,
          displayName: sanitizedName,
          cpf: formattedCPF,
          phone: sanitizedPhone,
          isAdmin: isUserAdmin(sanitizedEmail),
          createdAt: serverTimestamp(),
          manuallyCreated: true, // Flag para indicar que foi criado manualmente
          createdBy: adminUserId || 'admin',
          hasTemporaryPassword: true // Flag para indicar que tem senha temporária
        };

        await setDoc(userRef, userData);
        
        console.log(`✅ Novo usuário criado no Firebase Auth com senha temporária: ${sanitizedEmail}`);
      } catch (authError: unknown) {
        const error = authError as { code?: string; message?: string };
        console.error('❌ Erro ao criar usuário no Firebase Auth:', error);
        
        // Tratamento específico de erros do Firebase Auth
        if (error.code === 'auth/email-already-in-use') {
          return NextResponse.json(
            { error: 'Este email já está cadastrado no sistema. Use outro email ou tente fazer login.' },
            { status: 400 }
          );
        }
        
        throw new Error(error.message || 'Erro ao criar usuário no sistema de autenticação');
      }
    }

    // Verificar duplicação de CPF no evento (para evitar fraudes)
    const registrationsRef = collection(db, 'registrations');
    const cpfQuery = query(
      registrationsRef,
      where('eventId', '==', eventId),
      where('userCPF', '==', formattedCPF)
    );
    const cpfRegistrations = await getDocs(cpfQuery);

    if (!cpfRegistrations.empty) {
      return NextResponse.json(
        { error: 'Já existe uma inscrição com este CPF neste evento' },
        { status: 400 }
      );
    }

    // Criar inscrição no evento
    const registrationData = {
      eventId: eventId,
      userId: userId,
      userEmail: sanitizedEmail,
      userName: sanitizedName,
      userCPF: formattedCPF,
      userPhone: sanitizedPhone,
      checkedIn: false,
      checkedOut: false,
      certificateGenerated: false,
      manualRegistration: true, // Flag para indicar que foi registrado manualmente
      registeredBy: adminUserId || 'admin'
    };

    const registrationId = await createRegistration(registrationData);

    return NextResponse.json({
      success: true,
      message: 'Participante adicionado com sucesso!',
      registrationId,
      userId,
      temporaryPassword: TEMPORARY_PASSWORD, // Senha temporária para exibir ao admin
      data: {
        userName: sanitizedName,
        userEmail: sanitizedEmail,
        userCPF: formattedCPF
      }
    });

  } catch (error) {
    console.error('Erro ao adicionar participante manualmente:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação. Tente novamente.' },
      { status: 500 }
    );
  }
}

