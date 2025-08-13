# 🚀 Guia Completo de Deploy na Vercel

## ⚡ Status: OTIMIZADO PARA VERCEL

### ✅ Otimizações Implementadas
- 📄 **vercel.json** criado com configurações específicas
- ⚙️ **next.config.ts** ajustado para Vercel (removido standalone)
- 🔧 **Referrer Policy** corrigida para Firestore
- 💾 **Memory limits** aumentados para APIs de certificados
- ⏱️ **Timeouts** estendidos para 120s nas APIs pesadas

## 📋 Pré-Deploy Checklist

### 1. Instalar Vercel CLI
```bash
npm install -g vercel
vercel login
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copie todas as variáveis do seu .env.local

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=seu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=seu_api_secret

# URLs (será automaticamente configurado pela Vercel)
NEXTAUTH_URL=https://seu-projeto.vercel.app

# Otimizações específicas para Vercel
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
VERCEL_ENV=production
```

### 3. Deploy pela primeira vez
```bash
# No diretório do projeto
vercel

# Responda às perguntas:
# ? Set up and deploy "sistema-eventos"? [Y/n] y
# ? Which scope do you want to deploy to? [sua-conta]
# ? Found project.json. Link to it? [Y/n] y
# ? What's your project's name? sistema-eventos
# ? In which directory is your code located? ./
```

### 4. Configurar Variáveis via Dashboard
1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em Settings → Environment Variables
4. Adicione todas as variáveis listadas acima

### 5. Deploy em Produção
```bash
vercel --prod
```

## 🔧 Configurações Específicas da Vercel

### vercel.json
```json
{
  "functions": {
    "src/app/api/certificate-*/route.ts": {
      "maxDuration": 120,    // 2 minutos para certificados
      "memory": 3008         // Máximo de memória
    }
  },
  "regions": ["cle1"],       // Região otimizada para Brasil
  "env": {
    "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD": "1"
  }
}
```

### next.config.ts
```typescript
// Removido: output: 'standalone'
// Ajustado: Referrer-Policy para 'strict-origin-when-cross-origin'
```

## 🎯 Funcionalidades Específicas para Vercel

### 1. Edge Functions
```typescript
// Se necessário no futuro, pode usar Edge Runtime
export const runtime = 'edge'; // Para APIs simples
export const runtime = 'nodejs'; // Para APIs complexas (atual)
```

### 2. Regiões Otimizadas
```json
// vercel.json
{
  "regions": ["cle1", "gru1"], // Cleveland + São Paulo (baixa latência BR)
}
```

### 3. Caching Otimizado
```typescript
// Já configurado no next.config.ts
headers: [
  {
    source: '/(.*)\.(png|jpg|jpeg|webp|avif|ico|svg)$',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=2592000, stale-while-revalidate=86400',
      },
    ],
  },
]
```

## 🚀 Deploy Automático via GitHub

### 1. Conectar Repositório GitHub
1. No painel da Vercel
2. Import Git Repository
3. Selecione seu repositório
4. Configure as variáveis de ambiente

### 2. Deploy Automático
```bash
# Cada push para main/master fará deploy automático
git push origin main

# Deploy de preview para outras branches
git push origin feature-branch
```

## 📊 Monitoramento e Analytics

### 1. Analytics da Vercel
```typescript
// next.config.ts - adicionar se quiser analytics
const nextConfig: NextConfig = {
  // ... outras configs
  experimental: {
    // Analytics otimizadas
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB'],
  },
};
```

### 2. Logs e Debugging
```bash
# Ver logs em tempo real
vercel logs [deployment-url]

# Ver logs de function específica
vercel logs --follow
```

## ⚠️ Troubleshooting

### Problema: Certificate APIs timeout
**Solução**: Já configurado no vercel.json (memory: 3008, maxDuration: 120)

### Problema: Firestore referrer warnings  
**Solução**: Já ajustado no next.config.ts (strict-origin-when-cross-origin)

### Problema: Build muito lento
**Solução**: Dependencies otimizadas, considere mover canvas/puppeteer para devDependencies

### Problema: Cold start lento
**Solução**: Vercel automaticamente otimiza, mas considere upgrade para Pro se necessário

## 🎯 URLs de Deploy

### Development
```
https://sistema-eventos-git-[branch].vercel.app
```

### Preview (Pull Requests)
```
https://sistema-eventos-[commit-hash].vercel.app
```

### Production
```
https://sistema-eventos.vercel.app
```

## 💰 Custos Estimados

### Hobby Plan (Grátis)
- ✅ 100GB bandwidth/mês
- ✅ 100 serverless functions/dia
- ✅ Deploy ilimitados
- ⚠️ 10s function timeout (limitado para certificados)

### Pro Plan ($20/mês)
- ✅ 1TB bandwidth/mês  
- ✅ 1000 serverless functions/dia
- ✅ 60s function timeout
- ✅ Advanced analytics
- **🎯 RECOMENDADO** para este projeto

## 🎉 Status Final

### ✅ Otimizações Aplicadas
- vercel.json configurado para máxima compatibilidade
- next.config.ts otimizado para Vercel
- Memory e timeout adequados para certificados
- Referrer policy corrigida para Firestore
- Cache otimizado para performance

### 🚀 Pronto para Deploy
```bash
# Execute estes comandos:
vercel                    # First deploy
vercel --prod            # Production deploy
```

**Status**: 🟢 **OTIMIZADO - DEPLOY IMEDIATO**
