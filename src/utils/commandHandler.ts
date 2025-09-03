/**
 * Manipulador de comandos especiais para o sistema de inventário
 * Implementa a funcionalidade handleCommand conforme especificação
 */

export type CommandType = "exportar" | "help" | null;

/**
 * Processa comandos especiais e retorna o tipo do comando
 * Comandos suportados:
 * - "/exportar" → exporta a planilha atualizada
 * - "/help" → mostra instruções de uso
 */
export function handleCommand(input: string): CommandType {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const cleanInput = input.trim().toLowerCase();
  
  // Verificar comandos de exportação
  if (cleanInput === '/exportar' || 
      cleanInput === '/export' || 
      cleanInput === '/baixar' || 
      cleanInput === '/download') {
    return "exportar";
  }
  
  // Verificar comandos de ajuda
  if (cleanInput === '/help' || 
      cleanInput === '/ajuda' || 
      cleanInput === '/?' || 
      cleanInput === 'help' || 
      cleanInput === 'ajuda') {
    return "help";
  }
  
  return null;
}

/**
 * Verifica se a entrada é um comando especial
 */
export function isCommand(input: string): boolean {
  return handleCommand(input) !== null;
}

/**
 * Retorna a mensagem de ajuda completa
 */
export function getHelpMessage(): string {
  return `
🚀 **SHEET CHEF SYNC - Sistema de Inventário**

📋 **COMANDOS DISPONÍVEIS:**

**📦 Atualizar Estoque:**
• \`Tomate 5, Batata 3, Cebola 2\` - Múltiplos itens
• \`5 Tomates, 3 Batatas\` - Quantidade primeiro
• \`Tomate: 5\` - Com dois pontos
• \`5x Tomate\` - Formato multiplicação
• \`Leite 2.5\` - Aceita decimais

**⚡ Comandos Especiais:**
• \`/exportar\` - Baixa planilha atualizada (.xlsx)
• \`/help\` - Mostra esta ajuda

**🔍 Dicas Importantes:**
• Use vírgula, ponto e vírgula ou quebra de linha para separar itens
• Os valores são sempre **SOMADOS** ao estoque atual
• Nomes não precisam ser exatos (busca aproximada)
• Aceita números decimais (ex: 2.5 kg)
• Cria automaticamente itens que não existem

**📊 Funcionalidades:**
• 📂 Importação de planilhas XLSX (múltiplas abas)
• 🔗 Integração com Google Sheets
• 🔍 Busca e filtros avançados
• ✅ Checklist de revisão
• 📝 Log completo de alterações
• 📱 Interface mobile-first

**💡 Exemplos Práticos:**
\`\`\`
Arroz 10, Feijão 5
2.5 Leite, 3x Açúcar
Tomate: 15
/exportar
\`\`\`

---
💡 **Dúvidas?** Digite \`/help\` a qualquer momento!
  `.trim();
}

/**
 * Retorna mensagem específica para comando de exportação
 */
export function getExportMessage(): string {
  return "📥 Iniciando exportação da planilha atualizada...";
}

/**
 * Valida se um comando é válido
 */
export function validateCommand(command: string): {
  isValid: boolean;
  type: CommandType;
  message: string;
} {
  const type = handleCommand(command);
  
  if (type === "exportar") {
    return {
      isValid: true,
      type,
      message: getExportMessage()
    };
  }
  
  if (type === "help") {
    return {
      isValid: true,
      type,
      message: getHelpMessage()
    };
  }
  
  return {
    isValid: false,
    type: null,
    message: `❌ Comando não reconhecido: "${command}". Digite \`/help\` para ver comandos disponíveis.`
  };
}

/**
 * Lista todos os comandos disponíveis
 */
export function getAvailableCommands(): Array<{
  command: string;
  description: string;
  aliases: string[];
}> {
  return [
    {
      command: "/exportar",
      description: "Exporta a planilha atualizada em formato XLSX",
      aliases: ["/export", "/baixar", "/download"]
    },
    {
      command: "/help",
      description: "Mostra a mensagem de ajuda com todos os comandos",
      aliases: ["/ajuda", "/?", "help", "ajuda"]
    }
  ];
}

/**
 * Processa e executa um comando
 */
export function processCommand(input: string): {
  type: CommandType;
  shouldExecute: boolean;
  message: string;
} {
  const validation = validateCommand(input);
  
  return {
    type: validation.type,
    shouldExecute: validation.isValid,
    message: validation.message
  };
}

/**
 * Função de utilidade para testar comandos
 */
export function testCommands(): void {
  console.log('🧪 Testando handleCommand...');
  
  const testCases = [
    "/exportar",
    "/export", 
    "/help",
    "/ajuda",
    "/?",
    "help",
    "/invalid",
    "Tomate 5",
    "",
    null
  ];
  
  testCases.forEach(test => {
    const result = handleCommand(test as string);
    console.log(`Test: "${test}" → ${result}`);
  });
} 