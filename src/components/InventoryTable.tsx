import { motion } from 'framer-motion';
import { InventoryItem, UpdateLog } from '@/types/inventory';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Package2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InventoryTableProps {
  items: InventoryItem[];
  updateLogs: UpdateLog[];
}

export const InventoryTable = ({ items, updateLogs }: InventoryTableProps) => {
  const getRecentUpdate = (itemName: string) => {
    return updateLogs.find(log => log.itemName === itemName);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead className="text-center">Quantidade</TableHead>
            <TableHead className="hidden sm:table-cell">Categoria</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <motion.tbody
            variants={container}
            initial="hidden"
            animate="show"
          >
            {items.map((inventoryItem) => {
              const recentUpdate = getRecentUpdate(inventoryItem.name);
              const isRecent = recentUpdate && 
                (new Date().getTime() - new Date(recentUpdate.timestamp).getTime()) < 300000; // 5 minutes

              return (
                <motion.tr
                  key={inventoryItem.id}
                  variants={item}
                  className={`transition-colors ${isRecent ? 'bg-primary/5' : ''}`}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{inventoryItem.name}</span>
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
                  
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-semibold text-foreground">
                        {inventoryItem.quantity}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {inventoryItem.unit || 'un'}
                      </span>
                      {recentUpdate && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`text-xs flex items-center gap-1 ${
                            recentUpdate.change > 0 ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {recentUpdate.change > 0 ? (
                            <>
                              <TrendingUp className="h-3 w-3" />
                              +{recentUpdate.change}
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3" />
                              {recentUpdate.change}
                            </>
                          )}
                        </motion.span>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline">
                      {inventoryItem.category || 'Geral'}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    {inventoryItem.lastUpdated && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(inventoryItem.lastUpdated), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                    )}
                  </TableCell>
                </motion.tr>
              );
            })}
          </motion.tbody>
        </TableBody>
      </Table>
    </ScrollArea>
  );
};