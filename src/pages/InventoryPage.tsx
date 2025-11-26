import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { Package, Search, Filter, Plus, Download, BarChart3, MessageSquare, ScrollText, AlertTriangle, ClipboardList } from 'lucide-react';
import { Wrench } from 'lucide-react';
import { TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { InventoryTable } from '@/components/InventoryTable';
import { SheetTabs } from '@/components/SheetTabs';
import { ImportButton } from '@/components/ImportButton';
import { UpdateForm } from '@/components/UpdateForm';
import { LossForm } from '@/components/LossForm';
import { LogViewer } from '@/components/LogViewer';
import { CommandInput } from '@/components/CommandInput';

import { useInventory } from '@/hooks/useInventory';
import { useAuth } from '@/context/AuthContext';
import { XLSXHandler } from '@/services/xlsxHandler';


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
  } = useInventory();
  const { can, user } = useAuth();

  

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
  const tabs = React.useMemo(() => ['inventory', 'critical', 'update', 'commands', 'logs'], []);
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

  

  const handleImport = React.useCallback((importedSheets: Sheet[]) => {
    loadSheets(importedSheets);
    toast({
      title: "Importação concluída",
      description: `${importedSheets.length} planilha(s) importada(s)`,
    });
  }, [loadSheets]);

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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              Inventário SheetChef
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seu estoque de forma inteligente
            </p>
          </div>
          
          <div className="flex gap-2">
            <ImportButton onImport={handleImport} />
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={!can('inventory.export')}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button
              onClick={handleBackup}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              Backup
            </Button>
            <Button
              onClick={() => undoLastChange()}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              Desfazer última
            </Button>
            <Button
              onClick={() => navigate('/inventory-check')}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Inventário
            </Button>
            <Button
              onClick={() => navigate('/audit')}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              Auditoria
            </Button>
            <Button
              onClick={() => navigate('/reports')}
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={!can('reports.viewMonthly')}
            >
              Relatórios
            </Button>
            <Button
              onClick={() => navigate('/recipes')}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              Receitas
            </Button>
            <Button
              onClick={() => navigate('/production')}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              Produção
            </Button>
            <Button
              onClick={() => navigate('/purchases')}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              Compras
            </Button>
            <Button
              onClick={() => navigate('/checklist')}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              Checklist
            </Button>
            <Button
              onClick={() => navigate('/utensils')}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              <Wrench className="h-4 w-4 mr-2" />
              Utensílios
            </Button>
            <Button
              onClick={() => navigate('/forecast')}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Previsão
            </Button>
          </div>
        </motion.div>

        {/* Sheet Tabs */}
        {sheets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <SheetTabs
              sheets={sheets}
              activeIndex={activeSheetIndex}
              onTabChange={setActiveSheetIndex}
            />
          </motion.div>
        )}

        {/* Main Content with Swipe Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Inventário</span>
            </TabsTrigger>
            <TabsTrigger value="critical" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Críticos</span>
            </TabsTrigger>
            <TabsTrigger value="update" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Adicionar</span>
            </TabsTrigger>
            <TabsTrigger value="commands" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Comandos</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {/* Search and Filters */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar produtos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-40">
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
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={usedTodayOnly} onChange={e => setUsedTodayOnly(e.target.checked)} />
                      Usados hoje
                    </label>
                  </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      {totalCount} item(ns)
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Inventory Table */}
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

          <TabsContent value="update">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UpdateForm
                    onSubmit={(data) => {
                      mutateItem(data.name, data.quantity, data.adjustmentType, data.reason, data.minimum, data.unitCost);
                    }}
                  />
                  <LossForm
                    items={sheets[activeSheetIndex]?.items || []}
                    onSubmit={({ itemId, quantity, reason }) => {
                      const item = (sheets[activeSheetIndex]?.items || []).find(i => i.id === itemId)
                      if (!item) {
                        toast({ title: 'Item não encontrado', variant: 'destructive' })
                        return
                      }
                      mutateItem(item.name, quantity, 'saida', reason)
                    }}
                  />
                </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="commands">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <CommandInput
                onUpdateItems={handleUpdateItems}
                sheets={sheets}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="logs">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <LogViewer />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InventoryPage;
