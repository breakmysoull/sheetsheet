import { useState, useRef, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RotateCcw, HelpCircle, Download, Search, X, Check, AlertTriangle, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommandParser } from "@/services/parser";
import { Sheet } from "@/types/inventory";
import { XLSXHandler } from "@/services/xlsxHandler";
import { toast } from "@/hooks/use-toast";

interface CommandInputProps {
  onUpdateItems: (items: Array<{ name: string; quantity: number }>, operation: "add" | "set") => void;
  onUpdateItemsInAllSheets?: (items: Array<{ name: string; quantity: number }>, operation: "add" | "set") => void;
  sheets: Sheet[];
}

interface NotFoundItem {
  name: string;
  quantity: number;
  suggestions: Array<{
    name: string;
    similarity: number;
    matchType: string;
    category?: string;
  }>;
}

export const CommandInput = ({ onUpdateItems, onUpdateItemsInAllSheets, sheets }: CommandInputProps) => {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [notFoundItems, setNotFoundItems] = useState<NotFoundItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Função para encontrar itens similares
  const findSimilarItems = (searchItem: string, allItems: Array<{ name: string; quantity: number; category?: string }>) => {
    const results = allItems.map(item => {
      const similarity = calculateSimilarity(searchItem, item.name);
      return {
        name: item.name,
        similarity,
        matchType: similarity > 0.8 ? "high" : similarity > 0.6 ? "medium" : "low",
        category: item.category
      };
    });

    return results
      .filter(item => item.similarity > 0.4)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  };

  // Função básica de similaridade
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    // Verifica se um contém o outro
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Similaridade básica por caracteres
    const maxLength = Math.max(s1.length, s2.length);
    let matches = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) matches++;
    }
    
    return matches / maxLength;
  };

  // Obter todos os itens de todas as planilhas
  const getAllItems = () => {
    const allItems: Array<{ name: string; quantity: number; category?: string }> = [];
    sheets.forEach(sheet => {
      sheet.items.forEach(item => {
        allItems.push({
          name: item.name,
          quantity: item.quantity,
          category: item.category || sheet.name
        });
      });
    });
    return allItems;
  };

  const checkForNotFoundItems = (items: Array<{ name: string; quantity: number }>) => {
    const allItems = getAllItems();
    const notFound: NotFoundItem[] = [];

    items.forEach(item => {
      const exists = allItems.some(existingItem => 
        existingItem.name.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(existingItem.name.toLowerCase())
      );

      if (!exists) {
        const suggestions = findSimilarItems(item.name, allItems);
        notFound.push({
          name: item.name,
          quantity: item.quantity,
          suggestions
        });
      }
    });

    if (notFound.length > 0) {
      setNotFoundItems(notFound);
      setShowSuggestions(true);
    } else {
      setNotFoundItems([]);
      setShowSuggestions(false);
    }

    return notFound;
  };

  const handleSubmit = async (operation: "add" | "set" | "command" = "command", allSheets = false) => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    
    if (operation === "add" || operation === "set") {
      const command = CommandParser.parse(input);
      if (command.type === "update" && command.items) {
        const notFound = checkForNotFoundItems(command.items);
        
        if (notFound.length === 0) {
          const updateFunction = allSheets ? (onUpdateItemsInAllSheets || onUpdateItems) : onUpdateItems;
          updateFunction(command.items, operation);
          
          const operationText = operation === "add" ? "adicionadas" : "atualizadas";
          const locationText = allSheets ? "em todas as abas" : "na aba atual";
          toast({
            title: `? Quantidades ${operationText} ${locationText}`,
            description: `${command.items.length} item(s) processado(s)`,
          });
          setInput("");
        } else {
          toast({
            title: `?? ${notFound.length} item(ns) não encontrado(s)`,
            description: "Verifique as sugestões abaixo para corrigir",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "? Formato inválido",
          description: "Use o formato: \"Tomate 5, Batata 3\"",
          variant: "destructive",
        });
      }
    } else {
      // Handle other commands
      const command = CommandParser.parse(input);
      switch (command.type) {
        case "export":
          if (sheets.length > 0) {
            XLSXHandler.exportToXLSX(sheets);
            toast({
              title: "?? Exportação concluída",
              description: "Planilha baixada com sucesso!",
            });
          } else {
            toast({
              title: "?? Nenhuma planilha",
              description: "Importe uma planilha primeiro",
              variant: "destructive",
            });
          }
          break;

        case "help":
          setShowHelp(true);
          setTimeout(() => setShowHelp(false), 5000);
          break;

        case "update":
          toast({
            title: "?? Use os botões",
            description: "Use os botões para processar itens",
          });
          break;

        case "unknown":
          toast({
            title: "? Comando não reconhecido",
            description: command.message,
            variant: "destructive",
          });
          break;
      }
      setInput("");
    }

    setIsProcessing(false);
  };

  const handleUseSuggestion = (originalName: string, suggestion: { name: string }) => {
    const newInput = input.replace(originalName, suggestion.name);
    setInput(newInput);
    
    const updatedNotFound = notFoundItems.filter(item => item.name !== originalName);
    setNotFoundItems(updatedNotFound);
    if (updatedNotFound.length === 0) {
      setShowSuggestions(false);
    }

    toast({
      title: "? Item corrigido",
      description: `"${originalName}" foi substituído por "${suggestion.name}"`,
    });
  };

  const handleCreateNew = (itemName: string) => {
    const updatedNotFound = notFoundItems.filter(item => item.name !== itemName);
    setNotFoundItems(updatedNotFound);
    if (updatedNotFound.length === 0) {
      setShowSuggestions(false);
    }

    toast({
      title: "? Item será criado",
      description: `"${itemName}" será adicionado como novo item`,
    });
  };

  const handleIgnoreItem = (itemName: string) => {
    const updatedNotFound = notFoundItems.filter(item => item.name !== itemName);
    setNotFoundItems(updatedNotFound);
    if (updatedNotFound.length === 0) {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit("add", false);
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
                  <li>• <strong>Todas as Abas</strong>: Aplica em todas as planilhas</li>
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
              placeholder="Digite: \"Tomate 5, Batata 3\" ou /help"
              className="min-h-[60px] max-h-[120px] resize-none pr-10"
              disabled={isProcessing}
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 bottom-1 h-8 w-8"
              onClick={() => setInput("/help")}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleSubmit("add", false)}
            disabled={!input.trim() || isProcessing}
            className="bg-success hover:bg-success/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
          
          <Button
            onClick={() => handleSubmit("set", false)}
            disabled={!input.trim() || isProcessing}
            className="bg-primary hover:bg-primary/90"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
        
        {onUpdateItemsInAllSheets && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleSubmit("add", true)}
              disabled={!input.trim() || isProcessing}
              className="bg-success/80 hover:bg-success/70 text-white"
            >
              <Layers className="h-4 w-4 mr-2" />
              Adicionar (Todas)
            </Button>
            
            <Button
              onClick={() => handleSubmit("set", true)}
              disabled={!input.trim() || isProcessing}
              className="bg-primary/80 hover:bg-primary/70"
            >
              <Layers className="h-4 w-4 mr-2" />
              Atualizar (Todas)
            </Button>
          </div>
        )}
        
        <Button
          onClick={() => {
            setInput("/exportar");
            handleSubmit("command");
          }}
          variant="outline"
          className="w-full"
          disabled={sheets.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar Planilha
        </Button>

        {/* Sistema de Sugestões */}
        <AnimatePresence>
          {showSuggestions && notFoundItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Itens não encontrados
                    <Badge variant="destructive" className="ml-auto">
                      {notFoundItems.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {notFoundItems.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 border rounded-lg bg-background"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">"{item.name}"</span>
                          <Badge variant="outline">{item.quantity} unidades</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleIgnoreItem(item.name)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {item.suggestions.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Sugestões:</p>
                          <div className="grid gap-2">
                            {item.suggestions.map((suggestion, suggestionIndex) => (
                              <div
                                key={suggestionIndex}
                                className="flex items-center justify-between p-2 border rounded bg-muted/50"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{suggestion.name}</span>
                                  <Badge 
                                    variant={suggestion.matchType === "high" ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {Math.round(suggestion.similarity * 100)}%
                                  </Badge>
                                  {suggestion.category && (
                                    <Badge variant="outline" className="text-xs">
                                      {suggestion.category}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleUseSuggestion(item.name, suggestion)}
                                  className="h-8"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Usar
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma sugestão encontrada</p>
                      )}
                      
                      <div className="mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateNew(item.name)}
                          className="w-full"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Criar "{item.name}" como novo item
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
