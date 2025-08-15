import { NextResponse } from 'next/server';
import { isEmailServiceConfigured, testEmailConfiguration } from '@/lib/email-service';

export async function GET() {
  try {
    const isConfigured = isEmailServiceConfigured();
    
    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        error: 'EMAIL_USER ou EMAIL_PASS não configurados',
        emailUser: process.env.EMAIL_USER ? 'Definido' : 'Não definido',
        emailPass: process.env.EMAIL_PASS ? 'Definido' : 'Não definido'
      });
    }

    // Testar conexão SMTP
    const connectionTest = await testEmailConfiguration();
    
    return NextResponse.json({
      configured: true,
      connectionTest,
      emailUser: process.env.EMAIL_USER,
      message: connectionTest ? 'Email configurado e funcionando' : 'Email configurado mas conexão falhou'
    });
    
  } catch (error) {
    return NextResponse.json({
      configured: false,
      error: (error as Error).message,
      emailUser: process.env.EMAIL_USER ? 'Definido' : 'Não definido'
    }, { status: 500 });
  }
}
