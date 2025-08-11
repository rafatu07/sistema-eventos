// Teste simples da função sanitizeTextForPDF

// Função copiada do text-utils.ts para teste
const sanitizeTextForPDF = (text) => {
  return text
    // Remover emojis
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    // Substituir caracteres especiais problemáticos
    .replace(/[^\x00-\x7F]/g, function(char) {
      const replacements = {
        // Acentos em a
        'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
        'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'Ä': 'A',
        // Acentos em e
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
        // Acentos em i
        'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
        'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
        // Acentos em o
        'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
        'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O', 'Ö': 'O',
        // Acentos em u
        'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
        'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
        // Caracteres especiais
        'ç': 'c', 'Ç': 'C',
        'ñ': 'n', 'Ñ': 'N',
        // Símbolos comuns - usando códigos Unicode
        '\u201C': '"', '\u201D': '"', // aspas duplas curvas
        '\u2018': "'", '\u2019': "'", // aspas simples curvas
        '\u2013': '-', '\u2014': '-', // en dash e em dash
        '\u2026': '...', // reticências
        '\u20AC': 'EUR', // símbolo do Euro
        '\u00A3': 'GBP', // símbolo da Libra
        '\u00A5': 'JPY', // símbolo do Yen
        '\u00A9': '(C)', // copyright
        '\u00AE': '(R)', // marca registrada
        '\u2122': 'TM',  // trademark
      };
      return replacements[char] || '';
    })
    .trim();
};

// Testes com exemplos reais
const testCases = [
  'Conferência de Inovação 📅 2024',
  'Centro de Convenções São Paulo',
  'José da Silva - Programação Avançada',
  'Workshop: "Design Thinking" & Inovação',
  'Evento especial com € 100 de prêmio',
  'Texto com aspas curvas: "exemplo" e 'outro'',
  'Data: 15/03/2024 – Horário: 14:00—18:00…'
];

console.log('=== TESTES DE SANITIZAÇÃO PARA PDF ===\n');

testCases.forEach((test, index) => {
  const result = sanitizeTextForPDF(test);
  console.log(`Teste ${index + 1}:`);
  console.log(`Input:  "${test}"`);
  console.log(`Output: "${result}"`);
  console.log(`✓ ASCII Safe: ${/^[\x00-\x7F]*$/.test(result) ? 'SIM' : 'NÃO'}`);
  console.log('---');
});

console.log('\n✅ Todos os testes concluídos!');
console.log('📄 Os textos agora são seguros para PDF-lib com codificação WinAnsi');
