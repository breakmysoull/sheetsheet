import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { Package, Search, Filter, Plus, Download, BarChart3, MessageSquare, ScrollText, AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import { InventoryTable } from '@/components/InventoryTable';
import { SheetTabs } from '@/components/SheetTabs';
import { ImportButton } from '@/components/ImportButton';
import { UpdateForm } from '@/components/UpdateForm';
import { LossForm } from '@/components/LossForm';
import { LogViewer } from '@/components/LogViewer';
import { CommandInput } from '@/components/CommandInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { useInventory } from '@/hooks/useInventory';
import { useAuth } from '@/context/AuthContext';
import { XLSXHandler } from '@/services/xlsxHandler';
import { fetchSheetsWithItems } from '@/services/supabaseInventory';


import { toast } from '@/hooks/use-toast';
import { Sheet } from '@/types/inventory';
import { useNavigate } from 'react-router-dom';

const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [usedTodayOnly, setUsedTodayOnly] = useState<boolean>(false);

  const {
    sheets,
    activeSheetIndex,
    setActiveSheetIndex,
    updateLogs,
    searchQuery,
    setSearchQuery,
    filteredItems,
    loadSheets,
    updateItem,
    updateItemInAllSheets,
    mutateItem,
    kitchenCode,
    setKitchenCode,
    undoLastChange,
    dailyChecklists,
    recipes,
    purchases,
    utensils,
    clearAllData,
  } = useInventory();
  const { can, user, role } = useAuth();

  

  // Filter items by category
  const categoryFilteredItems = React.useMemo(() => {
    let base = filteredItems;
    if (categoryFilter !== 'all') {
      base = base.filter(item => {
        const category = item.category || item.categoria || 'geral';
        return category.toLowerCase().includes(categoryFilter.toLowerCase());
      });
    }
    if (usedTodayOnly) {
      const today = new Date();
      const isToday = (d: Date) => d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      const usedSet = new Set<string>();
      updateLogs.forEach(l => {
        const dt = l.timestamp ? new Date(l.timestamp) : new Date(l.dataHora);
        if (isToday(dt)) usedSet.add((l.itemName || l.item).toLowerCase());
      })
      base = base.filter(i => usedSet.has(i.name.toLowerCase()));
    }
    return base;
  }, [filteredItems, categoryFilter, usedTodayOnly, updateLogs]);

  // Get unique categories for filter
  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    filteredItems.forEach(item => {
      const category = item.category || item.categoria || 'geral';
      cats.add(category.toLowerCase());
    });
    return Array.from(cats);
  }, [filteredItems]);

  // Swipe handlers for tab navigation
  const tabs = React.useMemo(() => ['inventory', 'critical', 'logs'], []);
  const currentTabIndex = tabs.indexOf(activeTab);

  const onSwipedLeft = React.useCallback(() => {
    const nextIndex = Math.min(currentTabIndex + 1, tabs.length - 1);
    setActiveTab(tabs[nextIndex]);
  }, [currentTabIndex, tabs]);

  const onSwipedRight = React.useCallback(() => {
    const prevIndex = Math.max(currentTabIndex - 1, 0);
    setActiveTab(tabs[prevIndex]);
  }, [currentTabIndex, tabs]);

  const handlers = useSwipeable({
    onSwipedLeft,
    onSwipedRight,
    trackMouse: false, // Only track touch on mobile
    preventScrollOnSwipe: true,
  });

  const handleExport = React.useCallback(async () => {
    try {
      if (sheets.length === 0) {
        toast({
          title: "Nada para exportar",
          description: "Importe uma planilha primeiro",
          variant: "destructive",
        });
        return;
      }

      XLSXHandler.exportToXLSX(sheets);
      toast({
        title: "Planilha exportada",
        description: "Download iniciado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Falha ao exportar planilha",
        variant: "destructive",
      });
    }
  }, [sheets]);

  const handleBackup = React.useCallback(() => {
    const payload = {
      generatedAt: new Date().toISOString(),
      kitchenCode,
      sheets,
      updateLogs,
      recipes,
      purchases,
      dailyChecklists,
      utensils,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup_inventario_${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Backup exportado', description: 'Download iniciado com sucesso!' })
  }, [sheets, updateLogs, recipes, purchases, dailyChecklists, utensils, kitchenCode])

  const handleImport = React.useCallback(async (importedSheets: Sheet[]) => {
    const totalItems = importedSheets.reduce((acc, s) => acc + (s.items?.length || 0), 0)
    if (totalItems === 0) {
      toast({ title: 'Nenhum item importado', description: 'Verifique o formato do arquivo', variant: 'destructive' })
      return
    }
    await loadSheets(importedSheets);
    const remote = await fetchSheetsWithItems(kitchenCode || undefined)
    const remoteTotal = remote.reduce((acc, s) => acc + (s.items?.length || 0), 0)
    const msg = remoteTotal === totalItems 
      ? `Todos os ${remoteTotal} itens persistidos.` 
      : `Persistidos ${remoteTotal}/${totalItems} itens. Verifique logs.`
    toast({
      title: 'Importação concluída',
      description: msg,
      variant: remoteTotal === totalItems ? undefined : 'destructive'
    });
  }, [loadSheets, kitchenCode]);

  const handleUpdateItems = React.useCallback((items: Array<{ name: string; quantity: number }>, operation: 'add' | 'set' = 'add') => {
    items.forEach(({ name, quantity }) => {
      updateItem(name, quantity, operation);
    });
    
    const operationText = operation === 'add' ? 'adicionados' : 'atualizados';
    toast({
      title: `Itens ${operationText}`,
      description: `${items.length} item(ns) processado(s)`,
    });
  }, [updateItem]);

  const handleUpdateItemsInAllSheets = React.useCallback((items: Array<{ name: string; quantity: number }>, operation: 'add' | 'set' = 'add') => {
    items.forEach(({ name, quantity }) => {
      updateItemInAllSheets(name, quantity, operation);
    });
    const operationText = operation === 'add' ? 'adicionados' : 'atualizados';
    toast({
      title: `Itens ${operationText} em todas as abas`,
      description: `${items.length} item(s) processado(s)`,
    });
  }, [updateItemInAllSheets]);


  const handleCommandSubmit = React.useCallback((input: string) => {
    if (input.startsWith('/exportar')) {
      handleExport();
    } else if (input.startsWith('/help')) {
      toast({
        title: "Comandos disponíveis",
        description: "/exportar - Exportar planilha atual\n/help - Mostrar esta ajuda",
      });
    } else {
      // Try to parse as update message
      const lines = input.split('\n').filter(line => line.trim());
      const updates: Array<{ name: string; quantity: number }> = [];
      
      lines.forEach(line => {
        const match = line.match(/(\w+)\s+(\d+)/);
        if (match) {
          updates.push({
            name: match[1],
            quantity: parseInt(match[2])
          });
        }
      });
      
      if (updates.length > 0) {
        handleUpdateItems(updates);
      } else {
        toast({
          title: "Comando não reconhecido",
          description: "Digite /help para ver comandos disponíveis",
          variant: "destructive",
        });
      }
    }
  }, [handleExport, handleUpdateItems]);

  const totalCount = categoryFilteredItems.length;
  const criticalItems = React.useMemo(() => {
    return categoryFilteredItems.filter(i => typeof i.minimum === 'number' && i.minimum > 0 && i.quantity < i.minimum);
  }, [categoryFilteredItems]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6" {...handlers}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top nav */}
        <div>
          <Button variant="ghost" size="sm" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/home'); }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              Inventário Cozzi
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seu estoque de forma inteligente
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {role === 'super_admin' && (
              <>
                <ImportButton onImport={handleImport} />
                <Button
                  onClick={handleExport}
                  variant="outline"
                  size="sm"
                  className="shrink-0 whitespace-nowrap"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Button
                  onClick={handleBackup}
                  variant="outline"
                  size="sm"
                  className="shrink-0 whitespace-nowrap"
                >
                  Backup
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="shrink-0 whitespace-nowrap gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Limpar Inventário
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Essa ação não pode ser desfeita. Isso excluirá permanentemente todos os itens e planilhas do inventário atual.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={clearAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Confirmar Exclusão
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </motion.div>

        {/* Navegação principal (Abas do sistema) */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex border-b border-muted-foreground/20 bg-transparent p-0">
            <TabsTrigger value="inventory" className="flex items-center gap-2 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary text-muted-foreground data-[state=active]:text-foreground">
              <BarChart3 className="h-4 w-4" />
              <span>Inventário</span>
            </TabsTrigger>
            <TabsTrigger value="critical" className="flex items-center gap-2 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary text-muted-foreground data-[state=active]:text-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span>Críticos</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary text-muted-foreground data-[state=active]:text-foreground">
              <ScrollText className="h-4 w-4" />
              <span>Logs</span>
            </TabsTrigger>
          </TabsList>
        
          {/* Barra de ações da página (Busca e botões) */}
          <Card className="mt-[14px]">
            <CardContent className="p-3">
              <div className="space-y-3">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produtos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-8 w-8 p-0" title="Filtros" aria-label="Filtros">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Filtros</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={usedTodayOnly} onChange={e => setUsedTodayOnly(e.target.checked)} />
                          Usados hoje
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Categoria</span>
                          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setActiveTab('inventory'); }}>
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              {categories.map(category => (
                                <SelectItem key={category} value={category}>
                                  {category.charAt(0).toUpperCase() + category.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="whitespace-nowrap h-8">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar/Atualizar item</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <UpdateForm
                          onSubmit={(data) => {
                            mutateItem(data.name, data.quantity, data.adjustmentType, data.reason, data.minimum, data.unitCost);
                          }}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="whitespace-nowrap h-8 bg-sky-600 hover:bg-sky-700 text-white">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Comandos
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Atualização por comandos</DialogTitle>
                      </DialogHeader>
                      <CommandInput onUpdateItems={handleUpdateItems} sheets={sheets} />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categoria chips/carrossel (mostrar apenas quando filtro = todas) */}
          

          {/* Filtros por abas (planilhas) */}
          {sheets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-[14px]"
            >
              <SheetTabs
                sheets={sheets}
                activeIndex={activeSheetIndex}
                onTabChange={(idx) => { setActiveSheetIndex(idx); setActiveTab('inventory'); }}
              />
            </motion.div>
          )}

          {/* Conteúdos por aba */}

          <TabsContent value="inventory" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <InventoryTable
                items={categoryFilteredItems}
                updateLogs={updateLogs}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="critical" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="destructive">
                      {criticalItems.length} crítico(s)
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <InventoryTable
                items={criticalItems}
                updateLogs={updateLogs}
              />
            </motion.div>
          </TabsContent>

          
        
          <TabsContent value="logs">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <LogViewer 
                logs={updateLogs} 
                sheets={sheets} 
                onUndo={undoLastChange} 
              />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InventoryPage;
