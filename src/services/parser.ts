import { ParsedCommand } from '@/types/inventory';

export class CommandParser {
  private static readonly COMMANDS = {
    '/exportar': 'export',
    '/export': 'export',
    '/help': 'help',
    '/ajuda': 'help',
  } as const;

  static parse(input: string): ParsedCommand {
    const trimmedInput = input.trim().toLowerCase();

    // Check for special commands
    if (trimmedInput.startsWith('/')) {
      const command = this.COMMANDS[trimmedInput as keyof typeof this.COMMANDS];
      
      if (command === 'export') {
        return { type: 'export', message: 'Exportando planilha...' };
      }
      
      if (command === 'help') {
        return { 
          type: 'help', 
          message: this.getHelpMessage() 
        };
      }
      
      return { 
        type: 'unknown', 
        message: `Comando desconhecido: ${trimmedInput}` 
      };
    }

    // Parse item updates
    const items = this.parseItemUpdates(input);
    
    if (items.length > 0) {
      return {
        type: 'update',
        items,
        message: `Atualizando ${items.length} item(s)...`
      };
    }

    return {
      type: 'unknown',
      message: 'Formato não reconhecido. Use: "Tomate 5, Batata 3" ou digite /help'
    };
  }

  private static parseItemUpdates(input: string): Array<{ name: string; quantity: number }> {
    const items: Array<{ name: string; quantity: number }> = [];
    
    // Split by comma or semicolon
    const parts = input.split(/[,;]/);
    
    for (const part of parts) {
      const trimmed = part.trim();
      
      // Match patterns like "Tomate 5" or "5 Tomates"
      const match1 = trimmed.match(/^(.+?)\s+(\d+)$/);
      const match2 = trimmed.match(/^(\d+)\s+(.+)$/);
      
      if (match1) {
        items.push({
          name: match1[1].trim(),
          quantity: parseInt(match1[2], 10)
        });
      } else if (match2) {
        items.push({
          name: match2[2].trim(),
          quantity: parseInt(match2[1], 10)
        });
      }
    }
    
    return items;
  }

  private static getHelpMessage(): string {
    return `
📋 **Comandos Disponíveis:**

**Atualizar estoque:**
• Tomate 5, Batata 3, Cebola 2
• 5 Tomates, 3 Batatas

**Comandos especiais:**
• /exportar - Baixa a planilha atualizada
• /help - Mostra esta mensagem de ajuda

**Dicas:**
• Use vírgula ou ponto e vírgula para separar itens
• Os valores são sempre somados ao estoque atual
• Nomes não precisam ser exatos (busca aproximada)
    `.trim();
  }
}