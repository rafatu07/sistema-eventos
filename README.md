# Sistema de Gestão de Eventos

Um sistema web moderno e completo para gestão de eventos com funcionalidades de check-in, check-out e geração automática de certificados.

## 🚀 Funcionalidades

### 🔐 Autenticação
- Login e registro com email/senha
- Autenticação com Google
- Sistema de roles (Admin/Usuário)
- Proteção de rotas

### 📅 Gestão de Eventos (Admin)
- Criar, editar e visualizar eventos
- Dashboard administrativo com estatísticas
- Gerenciamento de participantes
- Exportação de lista de presença

### 👥 Participação de Usuários
- Inscrição em eventos
- Check-in e check-out digital
- Geração automática de certificados
- Download de certificados em PDF

### 🎯 Funcionalidades Extras
- QR Code para acesso rápido aos eventos
- Página pública para divulgação
- Interface responsiva (mobile-first)
- Exportação de dados em CSV

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Next.js 15** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework CSS utilitário
- **Lucide React** - Ícones modernos

### Backend
- **Next.js API Routes** - Endpoints serverless
- **pdf-lib** - Geração de PDFs
- **QR Code** - Geração de códigos QR

### Banco de Dados e Autenticação
- **Firebase Auth** - Autenticação
- **Firestore** - Banco de dados NoSQL

### Armazenamento
- **Cloudinary** - Upload e armazenamento de certificados

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta no Firebase
- Conta no Cloudinary

## ⚙️ Instalação e Configuração

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd sistema-eventos
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
Copie o arquivo `.env.local` e configure as seguintes variáveis:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id

# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret

# Admin Configuration
ADMIN_EMAILS=admin@exemplo.com,admin2@exemplo.com
```

### 4. Configure o Firebase

#### 4.1 Crie um projeto no Firebase Console
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Criar projeto"
3. Siga as instruções para criar o projeto

#### 4.2 Configure Authentication
1. No painel do Firebase, vá para "Authentication"
2. Clique em "Começar"
3. Na aba "Sign-in method", ative:
   - Email/Password
   - Google (opcional)

#### 4.3 Configure Firestore Database
1. No painel do Firebase, vá para "Firestore Database"
2. Clique em "Criar banco de dados"
3. Escolha "Começar no modo de teste"
4. Selecione uma localização

#### 4.4 Obtenha as credenciais
1. Vá para "Configurações do projeto" (ícone de engrenagem)
2. Na seção "Seus aplicativos", clique em "Adicionar app" > "Web"
3. Registre o app e copie as credenciais para o `.env.local`

### 5. Configure o Cloudinary

#### 5.1 Crie uma conta no Cloudinary
1. Acesse [Cloudinary](https://cloudinary.com/)
2. Crie uma conta gratuita

#### 5.2 Obtenha as credenciais
1. No dashboard do Cloudinary, copie:
   - Cloud Name
   - API Key
   - API Secret
2. Adicione essas informações ao `.env.local`

### 6. Execute o projeto
```bash
npm run dev
```

O sistema estará disponível em `http://localhost:3000`

## 📖 Como Usar

### Para Administradores

#### 1. Primeiro Acesso
1. Faça login com um email configurado em `ADMIN_EMAILS`
2. Você será automaticamente identificado como administrador

#### 2. Criar Eventos
1. No dashboard, clique em "Novo Evento"
2. Preencha as informações do evento
3. Clique em "Criar Evento"

#### 3. Gerenciar Eventos
1. No dashboard, clique em "Gerenciar" em um evento
2. Visualize estatísticas de participação
3. Exporte lista de presença
4. Gere QR Code para divulgação

### Para Usuários

#### 1. Inscrição em Eventos
1. Acesse a página pública do evento ou faça login
2. Clique em "Inscrever-se" no evento desejado

#### 2. Check-in e Check-out
1. No dia do evento, acesse a página do evento
2. Clique em "Fazer Check-in" ao chegar
3. Clique em "Fazer Check-out" ao sair

#### 3. Certificado
1. Após o check-out, clique em "Gerar Certificado"
2. O certificado será gerado automaticamente
3. Clique em "Baixar Certificado" para fazer download

## 🗂️ Estrutura do Projeto

```
src/
├── app/                    # App Router do Next.js
│   ├── api/               # API Routes
│   ├── dashboard/         # Dashboard administrativo
│   ├── eventos/           # Páginas de eventos
│   ├── login/             # Página de login
│   └── public/            # Páginas públicas
├── components/            # Componentes reutilizáveis
├── contexts/              # Context API (Auth)
├── lib/                   # Utilitários e configurações
└── types/                 # Tipos TypeScript
```

## 🔒 Segurança

### Autenticação
- Tokens JWT gerenciados pelo Firebase Auth
- Proteção de rotas sensíveis
- Verificação de roles (admin/usuário)

### Dados
- Validação de entrada em todas as APIs
- Sanitização de dados do usuário
- Regras de segurança do Firestore

### Uploads
- Upload seguro via Cloudinary
- Validação de tipos de arquivo
- URLs assinadas para downloads

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Outras Plataformas
O projeto é compatível com qualquer plataforma que suporte Next.js:
- Netlify
- Railway
- Heroku
- AWS Amplify

## 📊 Banco de Dados

### Coleções Firestore

#### users
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: Date;
}
```

#### events
```typescript
{
  id: string;
  name: string;
  description: string;
  date: Date;
  location: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### registrations
```typescript
{
  id: string;
  eventId: string;
  userId: string;
  userEmail: string;
  userName: string;
  registeredAt: Date;
  checkedIn: boolean;
  checkedOut: boolean;
  checkInTime?: Date;
  checkOutTime?: Date;
  certificateUrl?: string;
  certificateGenerated: boolean;
}
```

#### certificates
```typescript
{
  id: string;
  registrationId: string;
  eventId: string;
  userId: string;
  userName: string;
  eventName: string;
  eventDate: Date;
  generatedAt: Date;
  cloudinaryUrl: string;
  publicId: string;
}
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Se você encontrar algum problema ou tiver dúvidas:

1. Verifique se todas as variáveis de ambiente estão configuradas
2. Confirme se o Firebase e Cloudinary estão configurados corretamente
3. Consulte os logs do console para erros específicos
4. Abra uma issue no repositório

## 🎯 Roadmap

### Funcionalidades Futuras
- [ ] Notificações por email
- [ ] Integração com calendários
- [ ] Relatórios avançados
- [ ] API pública
- [ ] Aplicativo mobile
- [ ] Integração com redes sociais

---

Desenvolvido com ❤️ usando Next.js, Firebase e Cloudinary.

