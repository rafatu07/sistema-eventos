# Guia de Configuração - Sistema de Gestão de Eventos

Este guia fornece instruções detalhadas para configurar o sistema do zero.

## 🔥 Configuração do Firebase

### Passo 1: Criar Projeto
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Digite o nome do projeto (ex: "sistema-eventos-prod")
4. Desabilite Google Analytics (opcional)
5. Clique em "Criar projeto"

### Passo 2: Configurar Authentication
1. No menu lateral, clique em "Authentication"
2. Clique em "Vamos começar"
3. Vá para a aba "Sign-in method"
4. Ative "Email/senha":
   - Clique em "Email/senha"
   - Ative a primeira opção
   - Clique em "Salvar"
5. Ative "Google" (opcional):
   - Clique em "Google"
   - Ative o provedor
   - Configure email de suporte
   - Clique em "Salvar"

### Passo 3: Configurar Firestore
1. No menu lateral, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Selecione "Começar no modo de teste"
4. Escolha uma localização próxima (ex: southamerica-east1)
5. Clique em "Concluído"

### Passo 4: Configurar Regras de Segurança
No Firestore, vá para "Regras" e substitua por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Anyone can read events
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Users can read/write their own registrations
    match /registrations/{registrationId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == resource.data.userId;
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
    }
    
    // Certificates are readable by owners and admins
    match /certificates/{certificateId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
      allow create: if request.auth != null;
    }
  }
}
```

### Passo 5: Obter Credenciais
1. Clique no ícone de engrenagem > "Configurações do projeto"
2. Role até "Seus aplicativos"
3. Clique no ícone da web `</>`
4. Digite um nome para o app (ex: "sistema-eventos-web")
5. NÃO marque "Firebase Hosting"
6. Clique em "Registrar app"
7. Copie as credenciais mostradas

## ☁️ Configuração do Cloudinary

### Passo 1: Criar Conta
1. Acesse [Cloudinary](https://cloudinary.com/)
2. Clique em "Sign Up Free"
3. Preencha os dados e crie a conta
4. Confirme o email

### Passo 2: Obter Credenciais
1. No dashboard, você verá:
   - **Cloud Name**: nome único da sua conta
   - **API Key**: chave pública
   - **API Secret**: chave privada (clique em "Reveal")
2. Copie essas três informações

### Passo 3: Configurar Upload Presets (Opcional)
1. Vá para "Settings" > "Upload"
2. Role até "Upload presets"
3. Clique em "Add upload preset"
4. Configure:
   - Preset name: "certificates"
   - Signing Mode: "Unsigned"
   - Folder: "certificates"
5. Clique em "Save"

## 🔧 Configuração das Variáveis de Ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz

# Admin Configuration (emails separados por vírgula)
ADMIN_EMAILS=admin@exemplo.com,gestor@exemplo.com
```

## 👤 Configuração de Administradores

### Método 1: Via Variável de Ambiente
Adicione os emails dos administradores na variável `ADMIN_EMAILS`:
```env
ADMIN_EMAILS=admin@empresa.com,gestor@empresa.com,coordenador@empresa.com
```

### Método 2: Via Firestore (Manual)
1. Acesse o Firestore Console
2. Vá para a coleção "users"
3. Encontre o documento do usuário
4. Edite o campo `isAdmin` para `true`

## 🚀 Deploy no Vercel

### Passo 1: Preparar Repositório
1. Faça push do código para GitHub/GitLab/Bitbucket
2. Certifique-se que o `.env.local` está no `.gitignore`

### Passo 2: Conectar ao Vercel
1. Acesse [Vercel](https://vercel.com/)
2. Faça login com sua conta GitHub
3. Clique em "New Project"
4. Selecione o repositório do sistema
5. Clique em "Import"

### Passo 3: Configurar Variáveis de Ambiente
1. Na tela de configuração, clique em "Environment Variables"
2. Adicione todas as variáveis do `.env.local`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `ADMIN_EMAILS`

### Passo 4: Deploy
1. Clique em "Deploy"
2. Aguarde o build completar
3. Acesse a URL fornecida pelo Vercel

## 🔍 Verificação da Configuração

### Checklist Firebase
- [ ] Projeto criado
- [ ] Authentication configurado (Email/senha)
- [ ] Firestore criado
- [ ] Regras de segurança configuradas
- [ ] Credenciais copiadas para .env.local

### Checklist Cloudinary
- [ ] Conta criada
- [ ] Credenciais copiadas para .env.local
- [ ] Upload preset configurado (opcional)

### Checklist Aplicação
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo .env.local criado
- [ ] Todas as variáveis configuradas
- [ ] Emails de admin configurados
- [ ] Aplicação rodando (`npm run dev`)

## 🐛 Solução de Problemas

### Erro: "Firebase project not found"
- Verifique se `NEXT_PUBLIC_FIREBASE_PROJECT_ID` está correto
- Confirme se o projeto existe no Firebase Console

### Erro: "Permission denied"
- Verifique as regras de segurança do Firestore
- Confirme se o usuário está autenticado

### Erro: "Cloudinary upload failed"
- Verifique as credenciais do Cloudinary
- Confirme se a API Key e Secret estão corretas

### Erro: "User is not admin"
- Verifique se o email está em `ADMIN_EMAILS`
- Confirme se não há espaços extras nos emails
- Verifique se o usuário foi criado no Firestore

### Erro de CORS
- Adicione o domínio do Vercel nas configurações do Firebase
- Vá para Authentication > Settings > Authorized domains

## 📞 Suporte

Se você ainda tiver problemas:

1. Verifique os logs do console do navegador
2. Verifique os logs do Vercel (se em produção)
3. Confirme se todas as variáveis estão configuradas
4. Teste localmente primeiro (`npm run dev`)

## 🎯 Próximos Passos

Após a configuração:

1. **Teste o sistema completo**:
   - Crie uma conta de usuário
   - Faça login como admin
   - Crie um evento de teste
   - Teste o fluxo completo

2. **Configure domínio personalizado** (opcional):
   - No Vercel, vá para Settings > Domains
   - Adicione seu domínio personalizado

3. **Configure monitoramento** (opcional):
   - Ative Analytics no Vercel
   - Configure alertas de erro

4. **Backup dos dados**:
   - Configure backup automático do Firestore
   - Documente procedimentos de recuperação

