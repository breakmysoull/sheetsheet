import { useState, useRef, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RotateCcw, HelpCircle, Download, AlertTriangle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CommandParser } from '@/services/parser';
import { Sheet } from '@/types/inventory';
import { XLSXHandler } from '@/services/xlsxHandler';
import { toast } from '@/hooks/use-toast';

interface CommandInputProps {
  onUpdateItems: (items: Array<{ name: string; quantity: number }>, operation: 'add' | 'set') => void;
  sheets: Sheet[];
}

export const CommandInput = ({ onUpdateItems, sheets }: CommandInputProps) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [notFoundItems, setNotFoundItems] = useState<Array<{ name: string; quantity: number }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Função para verificar se item existe
  const checkItemExists = (itemName: string): boolean => {
    const allItems: string[] = [];
    sheets.forEach(sheet => {
      sheet.items.forEach(item => {
        allItems.push(item.name.toLowerCase());
      });
    });
    
    const searchName = itemName.toLowerCase();
    return allItems.some(existingName => 
      existingName.includes(searchName) || searchName.includes(existingName)
    );
  };

  const handleSubmit = async (operation: 'add' | 'set' | 'command' = 'command') => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    
    if (operation === 'add' || operation === 'set') {
      const command = CommandParser.parse(input);
      if (command.type === 'update' && command.items) {
        // Separar itens encontrados e não encontrados
        const found = command.items.filter(item => checkItemExists(item.name));
        const notFound = command.items.filter(item => !checkItemExists(item.name));
        
        // Processar itens encontrados primeiro
        if (found.length > 0) {
          onUpdateItems(found, operation);
          const operationText = operation === 'add' ? 'adicionadas' : 'atualizadas';
          toast({
            title: `✅ ${found.length} item(ns) processado(s)`,
            description: `Quantidades ${operationText} com sucesso`,
          });
        }
        
        // Lidar com itens não encontrados
        if (notFound.length > 0) {
          setNotFoundItems(notFound);
          
          // Atualizar input para mostrar apenas itens não encontrados
          const newInputText = notFound.map(item => `${item.name} ${item.quantity}`).join(', ');
          setInput(newInputText);
          
          toast({
            title: `⚠️ ${notFound.length} item(ns) não encontrado(s)`,
            description: found.length > 0 
              ? `${found.length} processado(s), ${notFound.length} pendente(s)`
              : 'Confira os itens abaixo. Clique em "Criar mesmo assim" para adicionar.',
            variant: 'destructive',
          });
        } else {
          // Todos os itens foram processados, limpar input
          setInput('');
          setNotFoundItems([]);
        }
      } else {
        toast({
          title: '❌ Formato inválido',
          description: 'Use o formato: "Tomate 5, Batata 3"',
          variant: 'destructive',
        });
      }
    } else {
      // Handle other commands
      const command = CommandParser.parse(input);
      switch (command.type) {
        case 'export':
          if (sheets.length > 0) {
            XLSXHandler.exportToXLSX(sheets);
            toast({
              title: '📥 Exportação concluída',
              description: 'Planilha baixada com sucesso!',
            });
          } else {
            toast({
              title: '⚠️ Nenhuma planilha',
              description: 'Importe uma planilha primeiro',
              variant: 'destructive',
            });
          }
          break;

        case 'help':
          setShowHelp(true);
          setTimeout(() => setShowHelp(false), 5000);
          break;

        case 'unknown':
          toast({
            title: '❌ Comando não reconhecido',
            description: command.message,
            variant: 'destructive',
          });
          break;
      }
      setInput('');
    }

    setIsProcessing(false);
  };

  const handleCreateAnyway = () => {
    if (notFoundItems.length > 0) {
      onUpdateItems(notFoundItems, 'add');
      toast({
        title: '✅ Itens criados',
        description: `${notFoundItems.length} novo(s) item(ns) adicionado(s)`,
      });
      setInput('');
      setNotFoundItems([]);
    }
  };

  const handleIgnoreAll = () => {
    setNotFoundItems([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit('add');
    }
  };

  return (
    <div className="relative space-y-4">
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full mb-2 w-full bg-card rounded-lg border border-border p-4 shadow-lg z-10"
          >
            <div className="flex items-start gap-2">
              <HelpCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-foreground">Comandos disponíveis:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <code className="bg-muted px-1 rounded">Tomate 5, Batata 3</code> - Digite os itens</li>
                  <li>• <strong>Adicionar</strong>: Soma às quantidades existentes</li>
                  <li>• <strong>Atualizar</strong>: Substitui as quantidades</li>
                  <li>• <code className="bg-muted px-1 rounded">/exportar</code> - Baixa a planilha</li>
                  <li>• <code className="bg-muted px-1 rounded">/help</code> - Mostra esta ajuda</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite: Tomate 5, Batata 3 ou /help"
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
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleSubmit('add')}
            disabled={!input.trim() || isProcessing}
            className="bg-success hover:bg-success/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
          
          <Button
            onClick={() => handleSubmit('set')}
            disabled={!input.trim() || isProcessing}
            className="bg-primary hover:bg-primary/90"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
        
        <Button
          onClick={() => {
            setInput('/exportar');
            handleSubmit('command');
          }}
          variant="outline"
          className="w-full"
          disabled={sheets.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar Planilha
        </Button>

        {/* Sistema de Sugestões Simples */}
        <AnimatePresence>
          {notFoundItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Itens não encontrados
                    <Badge variant="destructive" className="ml-auto">
                      {notFoundItems.length} pendente(s)
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {notFoundItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 border rounded bg-background"
                      >
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.name}</span>
                        <Badge variant="outline">{item.quantity} unidades</Badge>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                    <Button
                      size="sm"
                      onClick={handleCreateAnyway}
                      className="bg-success hover:bg-success/90 text-white"
                    >
                      ✅ Criar mesmo assim
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleIgnoreAll}
                    >
                      ❌ Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};