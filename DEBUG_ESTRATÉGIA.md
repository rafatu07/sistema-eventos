# 🔍 DEBUG - Estratégia para Identificar Erro 500

## 🎯 **Abordagem Implementada**

### **APIs Criadas para Debug:**

#### 1. `src/app/api/certificate-debug/route.ts`
- ✅ **Teste básico**: JSON → Buffer → Response
- ✅ **Logs detalhados** de cada passo
- ✅ **Sem dependências** externas

#### 2. `src/app/api/generate-certificate-simple/route.ts`  
- ✅ **Certificado em texto puro**
- ✅ **Zero libraries** externas
- ✅ **Bypass total** de todas as dependências

### **API Principal Modificada:**
- ✅ **Comentado**: `getCertificateConfig` (possível fonte de erro)
- ✅ **Prioridade**: API ultra simples primeiro
- ✅ **Logs máximos** em cada etapa

## 🔬 **O que Vai Mostrar nos Logs**

### **Se API Simple funcionar:**
```
🚨 Tentando API Ultra Simples...
🌐 URL simples: https://...
📊 Simple response status: 200
🎉 API Ultra Simples funcionou!
```
→ **Problema**: Nas dependências complexas

### **Se API Simple falhar:**
```
💀 API Simples falhou: [erro]
```
→ **Problema**: Na estrutura básica da Vercel

### **Se nem chegar na API:**
```
Erro antes mesmo de tentar API simples
```
→ **Problema**: Na própria `/generate-certificate`

## 🚨 **Debugging Prático**

### **Passo 1: Deploy**
```bash
vercel --prod
```

### **Passo 2: Teste o Certificado**
1. Faça check-out em um evento
2. Clique "Gerar Certificado"
3. Abra Console F12

### **Passo 3: Analise os Logs**
```bash
vercel logs --follow
```

### **Cenários Possíveis:**

#### **CENÁRIO A: Funciona**
- ✅ Certificado baixado como `.txt`
- ✅ Logs mostram sucesso
- 🎯 **Ação**: Evoluir para SVG/PNG

#### **CENÁRIO B: Falha na API Simple**
- ❌ Erro mesmo na API mais básica
- 🎯 **Ação**: Problema na Vercel/config

#### **CENÁRIO C: Falha antes da API**  
- ❌ Erro na API principal
- 🎯 **Ação**: Problema em dependências (rate-limit, logger, etc)

## 📊 **Possíveis Fontes de Erro**

### **Alta Probabilidade:**
1. ✅ ~~`getCertificateConfig`~~ - **COMENTADO**
2. ⚠️ `rateLimit` - pode estar falhando
3. ⚠️ `logInfo/logError` - pode estar falhando  
4. ⚠️ `updateRegistration` - Firebase pode estar falhando

### **Média Probabilidade:**
5. ⚠️ `uploadImageToCloudinary` - após gerar o conteúdo
6. ⚠️ Variáveis de ambiente faltando
7. ⚠️ Timeout da função (60s é pouco?)

### **Baixa Probabilidade:**
8. ⚠️ Problema na Vercel em si
9. ⚠️ Problema de CORS/headers
10. ⚠️ Problema de memory

## 🔧 **Próximos Passos Baseados no Resultado**

### **Se API Simple FUNCIONAR:**
```typescript
// Evoluir para SVG:
const svgBuffer = generateSimpleSVG(data);
return new NextResponse(svgBuffer, {
  headers: { 'Content-Type': 'image/svg+xml' }
});
```

### **Se API Simple FALHAR:**
```typescript
// Comentar mais dependências:
// import { rateLimit... } ❌
// import { logInfo... } ❌
// import { uploadImageToCloudinary... } ❌
```

## 🎯 **Status Atual**

**Deploy**: 🟡 **PRONTO PARA TESTE**  
**Expectativa**: 90% chance da API Simple funcionar  
**Se não funcionar**: Problema muito profundo (Vercel config ou Node.js)

### **Comando de Teste:**
```bash
# 1. Deploy
vercel --prod

# 2. Acompanhar logs
vercel logs --follow

# 3. Testar certificado no browser
```

**Agora vamos descobrir exatamente onde está o erro! 🔍**
