import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChefHat, BarChart3, Factory, ShoppingCart, CheckSquare, Wrench, TrendingUp, Package, ClipboardList, LogOut } from 'lucide-react';
import { ImportButton } from '@/components/ImportButton';
import { useInventory } from '@/hooks/useInventory';
import { useAuth } from '@/context/AuthContext';
import { XLSXHandler } from '@/services/xlsxHandler';
import { toast } from '@/hooks/use-toast';
import { Sheet } from '@/types/inventory';

const Home = () => {
  const navigate = useNavigate();
  const { can, signOut } = useAuth();
  const {
    sheets,
    updateLogs,
    recipes,
    purchases,
    dailyChecklists,
    utensils,
    kitchenCode,
    undoLastChange,
    loadSheets,
  } = useInventory();

  const handleExport = async () => {
    if (sheets.length === 0) {
      toast({ title: 'Nada para exportar', description: 'Importe uma planilha primeiro', variant: 'destructive' });
      return;
    }
    XLSXHandler.exportToXLSX(sheets);
    toast({ title: 'Planilha exportada', description: 'Download iniciado com sucesso!' });
  };

  const handleImport = (importedSheets: Sheet[]) => {
    loadSheets(importedSheets);
    toast({ title: 'Importação concluída', description: `${importedSheets.length} planilha(s) importada(s)` });
    navigate('/inventory');
  };

  const handleBackup = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      kitchenCode,
      sheets,
      updateLogs,
      recipes,
      purchases,
      dailyChecklists,
      utensils,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_inventario_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Backup exportado', description: 'Download iniciado com sucesso!' });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              Inventário Cozzi
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie seu estoque de forma inteligente</p>
          </div>
          <Button variant="outline" size="sm" onClick={async () => { try { await signOut(); navigate('/login'); } catch {} }}>
            <LogOut className="h-4 w-4 mr-2" />
            Deslogar
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {can('inventory.import') && (
            <ImportButton onImport={handleImport} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border" />
          )}
          {can('inventory.export') && (
            <Button onClick={handleExport} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              Exportar
            </Button>
          )}
          {sheets.length > 0 && can('inventory.view') && (
            <Button onClick={() => navigate('/inventory')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <Package className="h-6 w-6" />
              Inventário
            </Button>
          )}
          {sheets.length > 0 && can('inventory.view') && (
            <Button onClick={() => navigate('/inventory-daily')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <ClipboardList className="h-6 w-6" />
              Inventário diário
            </Button>
          )}
          {can('recipes.view') && (
            <Button onClick={() => navigate('/recipes')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <ChefHat className="h-6 w-6" />
              Receitas
            </Button>
          )}
          {can('reports.viewMonthly') && (
            <Button onClick={() => navigate('/reports')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <BarChart3 className="h-6 w-6" />
              Relatório
            </Button>
          )}
          {can('production.register') && (
            <Button onClick={() => navigate('/production')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <Factory className="h-6 w-6" />
              Produção
            </Button>
          )}
          {can('purchases.register') && (
            <Button onClick={() => navigate('/purchases')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <ShoppingCart className="h-6 w-6" />
              Compras
            </Button>
          )}
          {can('checklist.use') && (
            <Button onClick={() => navigate('/checklist')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <CheckSquare className="h-6 w-6" />
              Checklist
            </Button>
          )}
          {can('utensils.edit') && (
            <Button onClick={() => navigate('/utensils')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <Wrench className="h-6 w-6" />
              Utensílios
            </Button>
          )}
          {can('reports.forecast') && (
            <Button onClick={() => navigate('/forecast')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <TrendingUp className="h-6 w-6" />
              Previsão
            </Button>
          )}
          {can('reports.audit') && (
            <Button onClick={() => navigate('/audit')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              Auditoria
            </Button>
          )}
          {can('admin.backup') && (
            <Button onClick={handleBackup} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              Backup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
