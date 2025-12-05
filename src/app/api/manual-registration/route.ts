import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createRegistration } from '@/lib/firestore';

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
      userId = existingUser.id;

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
      // Criar novo usuário na coleção users
      const newUser = {
        email: sanitizedEmail,
        displayName: sanitizedName,
        cpf: formattedCPF,
        phone: sanitizedPhone,
        isAdmin: false,
        createdAt: serverTimestamp(),
        manuallyCreated: true, // Flag para indicar que foi criado manualmente
        createdBy: adminUserId || 'admin'
      };

      const userDocRef = await addDoc(usersRef, newUser);
      userId = userDocRef.id;
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

