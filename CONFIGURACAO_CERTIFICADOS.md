# 📄 Configuração de Certificados - Duas Estratégias Disponíveis

## 🎯 **ESCOLHA SUA ESTRATÉGIA:**

### **🌐 OPÇÃO A: API DINÂMICO (Sem Storage)**
```bash
# Adicione ao seu .env.local:
USE_DYNAMIC_CERTIFICATES=true
NEXT_PUBLIC_APP_URL=https://seudominio.com
```

**Como funciona:**
- URL: `https://seudominio.com/api/certificate/download?registrationId=xxx`
- PDF gerado em tempo real (sem salvar arquivo)
- Sempre usa configurações mais atuais

**Vantagens:**
- ✅ **Zero dependência** de Cloudinary ou storage externo
- ✅ **Sempre atualizado** com configurações mais recentes  
- ✅ **Sem custos** de storage
- ✅ **Setup imediato** - funciona agora mesmo

**Desvantagens:**
- ⚠️ **Mais lento** (3-5s para gerar PDF)
- ⚠️ **Maior uso de servidor** (CPU/memória)

### **📁 OPÇÃO B: Cloudinary Storage (Padrão)**
```bash
# Mantenha configuração atual:
USE_DYNAMIC_CERTIFICATES=false
# (ou não defina a variável)

# + configurações do Cloudinary:
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=sua-api-secret
```

**Como funciona:**
- PDF salvo no Cloudinary após geração
- URL: `https://res.cloudinary.com/.../certificate.pdf`
- CDN global para download rápido

**Vantagens:**
- ✅ **Download rápido** (CDN global)
- ✅ **Menos carga no servidor**
- ✅ **URLs permanentes**

**Desvantagens:**
- ⚠️ **Dependência externa** (Cloudinary)
- ⚠️ **Custos de storage** ($$$)
- ⚠️ **Problemas de acesso** (401 Unauthorized atual)

## 🔧 **COMO TESTAR AGORA:**

1. **Adicione ao `.env.local`:**
   ```bash
   USE_DYNAMIC_CERTIFICATES=true
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

2. **Reinicie o servidor:**
   ```bash
   npm run dev
   ```

3. **Gere um certificado** - URL será:
   ```
   http://localhost:3000/api/certificate/download?registrationId=xxx
   ```

4. **Teste a URL** - deve baixar PDF diretamente!

## 📊 **COMPARAÇÃO RESUMIDA:**

| Aspecto | API Dinâmico | Cloudinary |
|---------|--------------|------------|
| **Setup** | ✅ Imediato | ⚠️ Configurar credenciais |
| **Velocidade** | ⚠️ 3-5s | ✅ <1s |
| **Custos** | ✅ Grátis | ⚠️ ~$10/mês |
| **Dependências** | ✅ Zero | ⚠️ Cloudinary |
| **Atualizações** | ✅ Auto | ⚠️ Manual |
| **Status atual** | ✅ Funciona | ❌ Erro 401 |

## 🚀 **RECOMENDAÇÃO:**

**Para resolver AGORA:** Use API Dinâmico (`USE_DYNAMIC_CERTIFICATES=true`)

**Para produção futura:** 
- Volume baixo (<100 certificados/dia): API Dinâmico
- Volume alto (>100 certificados/dia): Cloudinary ou AWS S3

## 🔍 **LOGS PARA DEBUG:**

No console você verá:
```bash
# API Dinâmico:
✅ URL dinâmica gerada: { strategy: 'API Dinâmico' }

# Cloudinary:
📁 Usando estratégia de storage (Cloudinary)...
```
