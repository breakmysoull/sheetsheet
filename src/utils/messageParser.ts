/**
 * Parser de mensagens para atualizações de inventário
 * Implementa a funcionalidade de parseUpdateMessage conforme especificação
 */

export interface ParsedItem {
  item: string;
  quantidade: number;
}

/**
 * Interpreta mensagens no formato: "Tomate 5, Batata 3, Cebola 7"
 * Suporta múltiplas atualizações na mesma mensagem
 * Sistema soma ao valor existente, não sobrescreve
 */
export function parseUpdateMessage(message: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  
  if (!message || message.trim().length === 0) {
    return items;
  }

  // Limpar e normalizar a mensagem
  const cleanMessage = message.trim();
  
  // Separar por vírgula, ponto e vírgula ou quebra de linha
  const parts = cleanMessage.split(/[,;\n]/);
  
  for (const part of parts) {
    const trimmed = part.trim();
    
    if (trimmed.length === 0) continue;
    
    // Padrões suportados:
    // 1. "Tomate 5" - nome seguido de quantidade
    // 2. "5 Tomates" - quantidade seguida de nome
    // 3. "Tomate: 5" - nome com dois pontos e quantidade
    // 4. "5x Tomate" - quantidade com 'x' e nome
    
    const patterns = [
      /^(.+?)\s*:\s*(\d+(?:\.\d+)?)$/,           // "Tomate: 5"
      /^(\d+(?:\.\d+)?)\s*x\s*(.+)$/i,          // "5x Tomate"
      /^(.+?)\s+(\d+(?:\.\d+)?)$/,              // "Tomate 5"
      /^(\d+(?:\.\d+)?)\s+(.+)$/,               // "5 Tomate"
    ];
    
    let matched = false;
    
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      
      if (match) {
        let itemName: string;
        let quantity: number;
        
        if (pattern.source.includes('x\\s*(.+)')) {
          // Padrão "5x Tomate"
          quantity = parseFloat(match[1]);
          itemName = match[2].trim();
        } else if (pattern.source.startsWith('(\\d+')) {
          // Padrão "5 Tomate"
          quantity = parseFloat(match[1]);
          itemName = match[2].trim();
        } else {
          // Padrões "Tomate 5" e "Tomate: 5"
          itemName = match[1].trim();
          quantity = parseFloat(match[2]);
        }
        
        // Validações
        if (itemName.length > 0 && !isNaN(quantity) && quantity >= 0) {
          items.push({
            item: itemName,
            quantidade: quantity
          });
          matched = true;
        }
        
        break;
      }
    }
    
    // Se não conseguiu fazer parse, tentar extrair apenas números do final
    if (!matched) {
      const fallbackMatch = trimmed.match(/^(.+?)\s*(\d+(?:\.\d+)?)\s*$/);
      if (fallbackMatch) {
        const itemName = fallbackMatch[1].trim();
        const quantity = parseFloat(fallbackMatch[2]);
        
        if (itemName.length > 0 && !isNaN(quantity) && quantity >= 0) {
          items.push({
            item: itemName,
            quantidade: quantity
          });
        }
      }
    }
  }
  
  return items;
}

/**
 * Valida se uma mensagem pode ser processada como atualização de inventário
 */
export function isValidUpdateMessage(message: string): boolean {
  const parsed = parseUpdateMessage(message);
  return parsed.length > 0;
}

/**
 * Normaliza o nome do item para busca e comparação
 */
export function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .replace(/\s+/g, ' '); // Normaliza espaços
}

/**
 * Converte de volta para o formato de mensagem
 */
export function formatUpdateMessage(items: ParsedItem[]): string {
  return items
    .map(item => `${item.item} ${item.quantidade}`)
    .join(', ');
}

/**
 * Exemplos de uso e testes
 */
export const parseExamples = {
  // Exemplos válidos
  valid: [
    "Tomate 5, Batata 3, Cebola 7",
    "5 Tomates, 3 Batatas",
    "Tomate: 5, Batata: 3",
    "5x Tomate, 3x Batata",
    "Leite 2.5, Açúcar 1",
    "Arroz 10\nFeijão 5\nMacarrão 3",
  ],
  
  // Exemplos inválidos
  invalid: [
    "Apenas texto sem números",
    "123 sem nome",
    "",
    "Tomate -5", // Quantidade negativa seria filtrada
  ]
};

// Função de teste para validar o parser
export function testParser(): void {
  console.log('🧪 Testando parseUpdateMessage...');
  
  parseExamples.valid.forEach((example, index) => {
    const result = parseUpdateMessage(example);
    console.log(`✅ Exemplo ${index + 1}: "${example}" → `, result);
  });
  
  parseExamples.invalid.forEach((example, index) => {
    const result = parseUpdateMessage(example);
    console.log(`❌ Inválido ${index + 1}: "${example}" → `, result);
  });
} 