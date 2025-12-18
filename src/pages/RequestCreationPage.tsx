import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Search, Save, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { createRequest, searchProducts, ProductSuggestion, CreateRequestItemInput } from '../services/requestsService';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RequestCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Estados do formulário de adição de item
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductSuggestion | null>(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [note, setNote] = useState('');
  
  // Estado da lista de itens (carrinho)
  const [items, setItems] = useState<CreateRequestItemInput[]>([]);
  
  // Estados gerais
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounce para busca
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2 && !selectedProduct) {
        setIsSearching(true);
        try {
          const results = await searchProducts(searchTerm);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Erro na busca:', error);
        } finally {
          setIsSearching(false);
        }
      } else if (searchTerm.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedProduct]);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchRef]);

  const handleSelectProduct = (product: ProductSuggestion) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
    setUnit(product.unit || 'un');
    setShowSuggestions(false);
  };

  const clearSelection = () => {
    setSelectedProduct(null);
    setSearchTerm('');
    setQuantity('');
    setUnit('');
    setNote('');
  };

  const handleAddItem = () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Nome do produto obrigatório",
        description: "Digite o nome do produto.",
        variant: "destructive"
      });
      return;
    }

    const qty = parseFloat(quantity.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "Insira uma quantidade válida maior que zero.",
        variant: "destructive"
      });
      return;
    }

    if (!unit.trim()) {
      toast({
        title: "Unidade obrigatória",
        description: "Informe a unidade de medida.",
        variant: "destructive"
      });
      return;
    }

    const newItem: CreateRequestItemInput = {
      productId: selectedProduct?.id,
      productName: selectedProduct ? selectedProduct.name : searchTerm.trim(),
      quantity: qty,
      unit: unit,
      note: note.trim() || undefined
    };

    setItems(prev => [...prev, newItem]);
    
    // Limpar formulário para próximo item
    // Mantém a unidade do item anterior para facilitar se for o mesmo tipo, ou limpa?
    // Melhor limpar para evitar confusão, mas manter o foco seria bom.
    // O usuário pediu "visual simples e objetiva".
    
    setQuantity('');
    setNote('');
    // Não limpamos o produto imediatamente para permitir adição rápida de variantes? 
    // Não, o fluxo normal é buscar outro produto.
    clearSelection();
    
    toast({
      title: "Item adicionado",
      description: `${newItem.productName} foi adicionado à lista.`,
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast({
        title: "Lista vazia",
        description: "Adicione pelo menos um item antes de solicitar.",
        variant: "destructive"
      });
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmDialog(false);
    
    try {
      const result = await createRequest(items);
      if (result) {
        toast({
          title: "Solicitação criada!",
          description: "Sua solicitação foi enviada com sucesso.",
          variant: "default",
        });
        navigate('/requests');
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar solicitação",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 pb-32">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/requests')} className="pl-0 hover:pl-2 transition-all">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-xl font-bold">Nova Solicitação</h1>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg border border-dashed border-muted-foreground/20 text-center">
          <p className="text-sm text-muted-foreground">
            Solicitando para: <span className="font-semibold text-foreground">{format(tomorrow, "dd 'de' MMMM", { locale: ptBR })}</span>
          </p>
        </div>

        {/* Formulário de Adição */}
        <Card className="border-2 border-muted/40 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2 relative" ref={searchRef}>
              <label className="text-xs font-medium text-muted-foreground uppercase">Produto</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (selectedProduct && e.target.value !== selectedProduct.name) {
                      setSelectedProduct(null);
                    }
                  }}
                  className="pl-9 pr-8"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
                {isSearching && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {selectedProduct && !isSearching && (
                  <button 
                    onClick={clearSelection}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Lista de Sugestões */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full bg-popover text-popover-foreground rounded-md border shadow-xl mt-1 max-h-60 overflow-y-auto">
                  {suggestions.map((product) => (
                    <div
                      key={product.id}
                      className="p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm flex justify-between items-center border-b last:border-0"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div className="flex flex-col text-left">
                        <span className="font-medium">{product.name}</span>
                        {product.category && <span className="text-xs text-muted-foreground">{product.category}</span>}
                      </div>
                      <Badge variant="secondary" className="text-xs">{product.unit}</Badge>
                    </div>
                  ))}
                </div>
              )}
              
              {showSuggestions && suggestions.length === 0 && searchTerm.length >= 2 && !isSearching && (
                 <div className="absolute z-50 w-full bg-popover text-popover-foreground rounded-md border shadow-md mt-1 p-3 text-sm text-muted-foreground text-center">
                   Produto não encontrado. Você pode adicioná-lo preenchendo os campos abaixo.
                 </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase">Quantidade</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={!searchTerm || isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase">Unidade</label>
                <Input
                  placeholder="Un"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  disabled={!searchTerm || isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Observação (Opcional)</label>
              <Input
                placeholder="Ex: Marca específica, maduro, etc."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={!searchTerm || isSubmitting}
              />
            </div>

            <Button 
              className="w-full h-10" 
              onClick={handleAddItem}
              disabled={!searchTerm || !quantity || isSubmitting}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Item
            </Button>
          </CardContent>
        </Card>

        {/* Lista de Itens Adicionados */}
        {items.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Itens da Solicitação ({items.length})</h3>
            <div className="space-y-2">
              {items.map((item, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.productName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.quantity} {item.unit}
                        {item.note && <span className="italic ml-2">- Obs: {item.note}</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveItem(index)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Fixo com Botão de Salvar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-20">
        <div className="max-w-3xl mx-auto">
          <Button 
            className="w-full h-12 text-lg font-semibold shadow-lg" 
            onClick={handleSubmit}
            disabled={items.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Save className="h-5 w-5 mr-2" />
            )}
            Solicitar para Amanhã
          </Button>
        </div>
      </div>

      {/* Modal de Confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Solicitação</DialogTitle>
            <DialogDescription>
              Você está prestes a enviar uma solicitação com {items.length} itens para o dia {format(tomorrow, "dd/MM/yyyy")}.
              Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={confirmSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestCreationPage;
