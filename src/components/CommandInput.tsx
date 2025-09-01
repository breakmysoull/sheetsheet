import { useState, useRef, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, HelpCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CommandParser } from '@/services/parser';
import { Sheet } from '@/types/inventory';
import { XLSXHandler } from '@/services/xlsxHandler';
import { toast } from '@/hooks/use-toast';

interface CommandInputProps {
  onUpdateItems: (items: Array<{ name: string; quantity: number }>) => void;
  sheets: Sheet[];
}

export const CommandInput = ({ onUpdateItems, sheets }: CommandInputProps) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    const command = CommandParser.parse(input);

    switch (command.type) {
      case 'update':
        if (command.items) {
          onUpdateItems(command.items);
          toast({
            title: "✅ Itens atualizados",
            description: `${command.items.length} item(s) processado(s)`,
          });
        }
        break;

      case 'export':
        if (sheets.length > 0) {
          XLSXHandler.exportToXLSX(sheets);
          toast({
            title: "📥 Exportação concluída",
            description: "Planilha baixada com sucesso!",
          });
        } else {
          toast({
            title: "⚠️ Nenhuma planilha",
            description: "Importe uma planilha primeiro",
            variant: "destructive",
          });
        }
        break;

      case 'help':
        setShowHelp(true);
        setTimeout(() => setShowHelp(false), 5000);
        break;

      case 'unknown':
        toast({
          title: "❌ Comando não reconhecido",
          description: command.message,
          variant: "destructive",
        });
        break;
    }

    setInput('');
    setIsProcessing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full mb-2 w-full bg-card rounded-lg border border-border p-4 shadow-lg"
          >
            <div className="flex items-start gap-2">
              <HelpCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-foreground">Comandos disponíveis:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <code className="bg-muted px-1 rounded">Tomate 5, Batata 3</code> - Adiciona ao estoque</li>
                  <li>• <code className="bg-muted px-1 rounded">/exportar</code> - Baixa a planilha</li>
                  <li>• <code className="bg-muted px-1 rounded">/help</code> - Mostra ajuda</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite: 'Tomate 5, Batata 3' ou /help"
            className="min-h-[60px] max-h-[120px] resize-none pr-10"
            disabled={isProcessing}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 bottom-1 h-8 w-8"
            onClick={() => setInput('/help')}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isProcessing}
            className="bg-gradient-primary hover:opacity-90"
          >
            <Send className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={() => {
              setInput('/exportar');
              handleSubmit();
            }}
            variant="outline"
            size="icon"
            disabled={sheets.length === 0}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};