import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useInventory } from '@/hooks/useInventory';
import { Header } from '@/components/Header';
import { SheetTabs } from '@/components/SheetTabs';
import { SearchBar } from '@/components/SearchBar';
import { CommandInput } from '@/components/CommandInput';
import { InventoryTable } from '@/components/InventoryTable';
import { UpdateLogs } from '@/components/UpdateLogs';
import { XLSXHandler } from '@/services/xlsxHandler';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

const Home = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  } = useInventory();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('🚀 Iniciando importação do arquivo:', file.name);

    try {
      const parsedSheets = await XLSXHandler.parseFile(file);
      console.log('📊 Planilhas parseadas:', parsedSheets);
      console.log('📈 Total de planilhas:', parsedSheets.length);
      
      parsedSheets.forEach((sheet, index) => {
        console.log(`📋 Planilha ${index + 1}: ${sheet.name} - ${sheet.items.length} itens`);
        console.log('📦 Itens da planilha:', sheet.items);
      });
      
      loadSheets(parsedSheets);
      
      toast({
        title: "✅ Importação concluída",
        description: `${parsedSheets.length} aba(s) carregada(s) com ${parsedSheets.reduce((total, sheet) => total + sheet.items.length, 0)} itens`,
      });
    } catch (error) {
      toast({
        title: "❌ Erro ao importar",
        description: "Verifique se o arquivo é uma planilha válida (.xlsx)",
        variant: "destructive",
      });
      console.error('❌ Error parsing file:', error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdateItems = (items: Array<{ name: string; quantity: number }>) => {
    items.forEach(item => {
      updateItem(item.name, item.quantity);
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
      />

      <Header onImportClick={() => fileInputRef.current?.click()} />

      <main className="container mx-auto px-4 py-6 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SheetTabs
            sheets={sheets}
            activeIndex={activeSheetIndex}
            onTabChange={setActiveSheetIndex}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-4 md:grid-cols-3"
        >
          <div className="md:col-span-2 space-y-4">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar produtos..."
            />
            
            <Card className="p-4">
              <InventoryTable
                items={filteredItems}
                updateLogs={updateLogs}
              />
            </Card>
          </div>

          <div className="space-y-4">
            <UpdateLogs logs={updateLogs} />
            
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">
                Atualização Rápida
              </h3>
              <CommandInput
                onUpdateItems={handleUpdateItems}
                sheets={sheets}
              />
            </Card>
          </div>
        </motion.div>

        {sheets.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-12"
          >
            <Card className="inline-block p-8 bg-gradient-hero">
              <h2 className="text-2xl font-bold mb-4 text-foreground">
                Bem-vindo ao Inventário
              </h2>
              <p className="text-muted-foreground mb-6">
                Importe uma planilha Excel para começar a gerenciar seu estoque
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-gradient-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Importar Planilha (.xlsx)
              </button>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Home;