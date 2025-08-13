# 🚨 Dependências Problemáticas - Sistema de Eventos

## ❌ **DEPENDÊNCIAS PARA REMOVER**

### **1. Tecnologias de Browser Automation (Muito pesadas para Vercel)**
```bash
npm uninstall @sparticuz/chromium playwright puppeteer
```
- `@sparticuz/chromium`: ~150MB
- `playwright`: ~200MB  
- `puppeteer`: ~300MB

**Problema**: Essas dependências são enormes e causam timeouts no Vercel. O Canvas nativo do Node.js é suficiente.

### **2. Dependências Duplicadas/Conflitantes**
```bash
npm uninstall html2canvas @types/html2canvas
```
- `html2canvas`: Conflita com a geração server-side usando Canvas
- `@types/html2canvas`: Tipo desnecessário

**Problema**: Duas abordagens diferentes para renderização (client-side vs server-side)

### **3. PDF-lib (Se não usar PDFs)**
```bash
npm uninstall pdf-lib
```
- Você está focando em PNG → Cloudinary, PDF-lib não é necessário

## ✅ **DEPENDÊNCIAS CORRETAS A MANTER**

### **Essenciais para Certificados PNG**
- ✅ `canvas`: Geração de imagens server-side
- ✅ `qrcode`: QR codes nos certificados  
- ✅ `cloudinary`: Upload e storage de imagens

### **Core do Sistema**
- ✅ `next`: Framework
- ✅ `react`/`react-dom`: UI
- ✅ `firebase`: Database
- ✅ `zod`: Validação
- ✅ `react-hook-form`: Forms

## 🎯 **COMANDOS DE LIMPEZA**

```bash
# Remover dependências problemáticas
npm uninstall @sparticuz/chromium playwright puppeteer html2canvas @types/html2canvas pdf-lib

# Limpar cache
npm cache clean --force
rm -rf node_modules package-lock.json

# Reinstalar dependências limpas
npm install

# Build de teste
npm run build
```

## 🔧 **RESULTADO ESPERADO**

- ⚡ Build mais rápido (~2-3min → ~30s)
- 💾 Bundle menor (~50MB → ~15MB)
- 🚀 Deploy mais confiável no Vercel
- 🎯 Certificados com acentos funcionando

## 📊 **IMPACTO NO TAMANHO**

| Antes | Depois |
|-------|--------|
| ~650MB com node_modules | ~200MB com node_modules |
| ~50MB bundle Vercel | ~15MB bundle Vercel |
| 5+ mins build time | ~1min build time |

