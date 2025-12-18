import React from 'react';
import { motion } from 'framer-motion';
import { InventoryItem, UpdateLog } from '@/types/inventory';

import { TrendingUp, TrendingDown, Package2, History } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ItemHistoryModal } from '@/components/ItemHistoryModal';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InventoryTableProps {
  items: InventoryItem[];
  updateLogs: UpdateLog[];
}

export const InventoryTable = ({ items, updateLogs }: InventoryTableProps) => {
  const [open, setOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<string>('');
  const getRecentUpdate = React.useCallback((itemName: string) => {
    return updateLogs.find(log => log.itemName === itemName || log.item === itemName);
  }, [updateLogs]);

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <Package2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhum item encontrado
        </h3>
        <p className="text-muted-foreground">
          Importe uma planilha ou adicione itens pelo campo de texto
        </p>
      </motion.div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-320px)] md:h-[calc(100vh-280px)]">
      {/* Lista compacta para mobile */}
      <div className="md:hidden space-y-2">
        {items.map((inventoryItem) => {
          const recentUpdate = getRecentUpdate(inventoryItem.name);
          const isRecent = recentUpdate && 
            (new Date().getTime() - new Date(recentUpdate.timestamp || (recentUpdate as any).dataHora).getTime()) < 300000;
          return (
            <div key={inventoryItem.id} className={`border rounded-md p-3 text-sm ${isRecent ? 'bg-primary/5' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{inventoryItem.name}</span>
                    {typeof inventoryItem.minimum === 'number' && inventoryItem.minimum > 0 && inventoryItem.quantity < inventoryItem.minimum && (
                      <Badge variant="destructive" className="text-xs">Crítico</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    <span className="font-semibold text-foreground mr-1">{inventoryItem.quantity}</span>
                    <span className="text-xs">{inventoryItem.unit || (inventoryItem as any).unidade || 'un'}</span>
                    {typeof inventoryItem.minimum === 'number' && inventoryItem.minimum > 0 && (
                      <span className="text-xs ml-2">min {inventoryItem.minimum}</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {recentUpdate && (
                      <span className={`text-xs flex items-center gap-1 ${((recentUpdate as any).change || (recentUpdate as any).quantidadeAlterada || 0) > 0 ? 'text-success' : 'text-destructive'}`}>
                        {((recentUpdate as any).change || (recentUpdate as any).quantidadeAlterada || 0) > 0 ? (
                          <>
                            <TrendingUp className="h-3 w-3" />
                            +{(recentUpdate as any).change || (recentUpdate as any).quantidadeAlterada}
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-3 w-3" />
                            {(recentUpdate as any).change || (recentUpdate as any).quantidadeAlterada}
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="h-8"
                  onClick={() => { setSelectedItem(inventoryItem.name); setOpen(true); }}
                >
                  <History className="h-4 w-4 mr-2" />
                  Histórico
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabela para telas maiores */}
      <div className="hidden md:block overflow-x-auto">
      <Table className="min-w-[360px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Produto</TableHead>
            <TableHead className="text-center w-[20%]">Quantidade</TableHead>
            <TableHead className="text-center w-[20%] hidden sm:table-cell">Categoria</TableHead>
            <TableHead className="text-center w-[20%]">Status</TableHead>
            <TableHead className="text-center w-[20%] hidden md:table-cell">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((inventoryItem) => {
            const recentUpdate = getRecentUpdate(inventoryItem.name);
            const isRecent = recentUpdate && 
              (new Date().getTime() - new Date(recentUpdate.timestamp || recentUpdate.dataHora).getTime()) < 300000; // 5 minutes

            return (
              <TableRow
                key={inventoryItem.id}
                className={`transition-colors ${isRecent ? 'bg-primary/5' : ''}`}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">{inventoryItem.name}</span>
                    {typeof inventoryItem.minimum === 'number' && inventoryItem.minimum > 0 && inventoryItem.quantity < inventoryItem.minimum && (
                      <Badge variant="destructive" className="text-xs">
                        Crítico
                      </Badge>
                    )}
                    {isRecent && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                      >
                        <Badge variant="secondary" className="text-xs bg-gradient-primary text-primary-foreground">
                          Novo
                        </Badge>
                      </motion.div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell className="text-center w-[20%]">
                  <div className="flex flex-col items-center gap-1 min-h-[60px] justify-center">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {inventoryItem.quantity}
                      </span>
                      {typeof inventoryItem.minimum === 'number' && inventoryItem.minimum > 0 && (
                        <span className="text-xs text-muted-foreground">/ min {inventoryItem.minimum}</span>
                      )}
                      {recentUpdate && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`text-xs flex items-center gap-1 ${
                            (recentUpdate.change || recentUpdate.quantidadeAlterada || 0) > 0 ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {(recentUpdate.change || recentUpdate.quantidadeAlterada || 0) > 0 ? (
                            <>
                              <TrendingUp className="h-3 w-3" />
                              +{recentUpdate.change || recentUpdate.quantidadeAlterada}
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3" />
                              {recentUpdate.change || recentUpdate.quantidadeAlterada}
                            </>
                          )}
                        </motion.span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {inventoryItem.unit || inventoryItem.unidade || 'un'}
                    </span>
                  </div>
                </TableCell>
                
                <TableCell className="text-center w-[20%] hidden sm:table-cell">
                  <div className="flex flex-col items-center gap-1 min-h-[60px] justify-center">
                    <Badge variant="outline" className="text-xs max-w-[100px] truncate">
                      {inventoryItem.category || inventoryItem.categoria || 'Geral'}
                    </Badge>
                  </div>
                </TableCell>
                
                <TableCell className="text-center w-[20%]">
                  <div className="flex flex-col items-center gap-1 min-h-[60px] justify-center">
                    {inventoryItem.lastUpdated && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(inventoryItem.lastUpdated).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-center w-[20%] hidden md:table-cell">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectedItem(inventoryItem.name); setOpen(true); }}
                  >
                    <History className="h-4 w-4 mr-2" />
                    Histórico
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
      <ItemHistoryModal itemName={selectedItem} logs={updateLogs} open={open} onOpenChange={setOpen} />
    </ScrollArea>
  );
};
