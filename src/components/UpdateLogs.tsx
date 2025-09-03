import { motion, AnimatePresence } from 'framer-motion';
import { UpdateLog } from '@/types/inventory';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import React from 'react';

interface UpdateLogsProps {
  logs: UpdateLog[];
}

export const UpdateLogs = React.memo(({ logs }: UpdateLogsProps) => {
  const displayLogs = React.useMemo(() => logs.slice(0, 10), [logs]);

  if (logs.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center text-muted-foreground">
          <Clock className="h-4 w-4 mr-2" />
          <span className="text-sm">Nenhuma atualização recente</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3 text-foreground">Atualizações Recentes</h3>
      <ScrollArea className="h-32">
        <AnimatePresence mode="popLayout">
          {displayLogs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              layout
              className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/50 rounded transition-colors"
            >
              <div className="flex items-center gap-2">
                {log.change > 0 ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className="text-sm text-foreground">
                  {log.itemName}
                </span>
                <span className={`text-sm font-semibold ${
                  log.change > 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {log.change > 0 ? '+' : ''}{log.change}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(log.timestamp), {
                  addSuffix: true,
                  locale: ptBR
                })}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </ScrollArea>
    </Card>
  );
});