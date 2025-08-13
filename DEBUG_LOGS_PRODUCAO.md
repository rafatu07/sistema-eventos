# 🚨 LOGS DE DEBUG ADICIONADOS - Diagnóstico de Produção

## 🎯 **OBJETIVO**

Identificar exatamente onde e como o texto está sendo modificado em **produção no Vercel** para resolver definitivamente o problema dos símbolos estranhos.

---

## 📋 **LOGS ADICIONADOS**

### **1. 🌍 Detecção de Ambiente (`src/lib/embedded-fonts.ts`)**
```typescript
🔍 Detecção de ambiente (primeira vez): {
  NODE_ENV: "production",
  VERCEL: "1", 
  VERCEL_ENV: "production",
  VERCEL_URL: "SET",
  VERCEL_REGION: "iad1",
  FORCE_ASCII_ONLY: undefined,  // ← CRÍTICO
  platform: "linux",
  hasVercelIndicator: true,
  RESULTADO_FINAL: "🏭 SERVERLESS"
}

🏭 AMBIENTE SERVERLESS CONFIRMADO - Verificando configuração ASCII
⚙️ FORCE_ASCII_ONLY atual: undefined
🎯 Deve usar ASCII? false  // ← DEVE SER FALSE
```

### **2. 🚀 Início da Geração (`src/lib/certificate-image-generator.ts`)**
```typescript
🚀 INÍCIO - generateCertificateImage
🌍 AMBIENTE DETECTADO: {
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "production", 
  FORCE_ASCII_ONLY: undefined,  // ← CRÍTICO
  platform: "linux"
}

🏠 AMBIENTE FINAL: {
  isServerlessEnv: true,
  shouldForceASCII: false  // ← DEVE SER FALSE
}
```

### **3. 🎯 Dados dos Certificados (`src/app/api/generate-certificate/route.ts`)**
```typescript
🎯 DADOS DO CERTIFICADO COMPLETOS: {
  userName: "Joceli da Cruz de Oliveira",  // ← Verificar acentos
  eventName: "Evento Novo Andar",
  hasConfig: true,
  template: "elegant",
  environment: "production",
  forceASCII: undefined  // ← DEVE SER UNDEFINED
}
```

### **4. 🎨 Renderização de Textos**

**Título:**
```typescript
🎯 RENDERIZANDO TÍTULO: {
  texto: "Certificado de Excelência",  // ← Verificar acentos
  tamanho: 24,
  cor: "#7c3aed"
}
```

**Nome:**
```typescript
🎯 RENDERIZANDO NOME: {
  texto: "Joceli da Cruz de Oliveira",  // ← CRÍTICO: verificar acentos
  tamanho: 18,
  cor: "#7c3aed"
}
```

**Corpo:**
```typescript
🎯 RENDERIZANDO CORPO: {
  textoOriginal: "Por meio deste, certificamos que {userName} participou...",
  textoFormatado: "Por meio deste, certificamos que Joceli da Cruz de Oliveira participou...",  // ← CRÍTICO
  tamanho: 12,
  cor: "#6b7280"
}
```

### **5. 📝 Processamento de Texto (`drawText`)**

**Entrada:**
```typescript
📝 drawText - ENTRADA: {
  texto: "Joceli da Cruz de Oliveira",  // ← Verificar se tem acentos
  tamanho: 18,
  fontWeight: "semibold",
  hasAcentos: true  // ← DEVE SER TRUE
}

🎯 CONFIGURAÇÃO DE RENDERIZAÇÃO: {
  isServerless: true,
  shouldUseASCII: false,  // ← CRÍTICO: DEVE SER FALSE
  forcedASCII: undefined,
  message: "✅ Acentos preservados"  // ← DEVE APARECER
}
```

**Processamento:**
```typescript
✅ TEXTO INTACTO (produção): {
  texto: "Joceli da Cruz de Oliveira",  // ← DEVE TER ACENTOS
  ambiente: "SERVERLESS",
  preservandoAcentos: true  // ← DEVE SER TRUE
}
```

**Saída:**
```typescript
✅ SUCESSO renderização: {
  textoFinal: "Joceli da Cruz de Oliveira",  // ← VERIFICAR SE MANTÉM ACENTOS
  fonte: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif",
  preservouAcentos: true  // ← CRÍTICO: DEVE SER TRUE
}
```

---

## 🔍 **DIAGNÓSTICO ESPERADO**

### **✅ Se funcionando corretamente:**
- `FORCE_ASCII_ONLY: undefined` ou `false`
- `shouldUseASCII: false`
- `preservandoAcentos: true` em todos os logs
- `hasAcentos: true` para nomes com acentos
- Logs mostram `✅ TEXTO INTACTO (produção)`

### **❌ Se ainda com problema:**
- **Verificar**: Se `FORCE_ASCII_ONLY` está sendo setado em algum lugar
- **Verificar**: Se `shouldUseASCII: true` mesmo não devendo
- **Verificar**: Se aparece `✅ TEXTO PRESERVADO` ao invés de `TEXTO INTACTO`
- **Identificar**: Onde exatamente os acentos estão sendo removidos

---

## 🎯 **PRÓXIMOS PASSOS**

1. **Deploy** com logs adicionados
2. **Gerar certificado** em produção
3. **Analisar logs** completos do Vercel
4. **Identificar** onde está o problema
5. **Aplicar correção** específica

**Com estes logs detalhados, vamos identificar o problema exato!** 🕵️‍♂️
