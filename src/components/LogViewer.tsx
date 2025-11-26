import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { UpdateLogs } from '@/components/UpdateLogs';
import { useInventory } from '@/hooks/useInventory';
import { ScrollText, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const LogViewer: React.FC = React.memo(() => {
  const { updateLogs, sheets, undoLastChange } = useInventory();

  const stats = React.useMemo(() => {
    const total = updateLogs.length;
    const additions = updateLogs.filter(log => (log.change || log.quantidadeAlterada) > 0).length;
    const subtractions = updateLogs.filter(log => (log.change || log.quantidadeAlterada) < 0).length;
    
    return { total, additions, subtractions };
  }, [updateLogs]);

  const hasSheets = React.useMemo(() => sheets.length === 0, [sheets.length]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Logs</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <ScrollText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Adições</p>
                  <p className="text-2xl font-bold text-success">{stats.additions}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reduções</p>
                  <p className="text-2xl font-bold text-destructive">{stats.subtractions}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Logs Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Histórico de Alterações
                <Badge variant="secondary" className="ml-auto">
                  {updateLogs.length} registros
                </Badge>
                {updateLogs.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => undoLastChange()}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Desfazer última
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
          <CardContent>
            {updateLogs.length > 0 ? (
              <div className="space-y-4">
                <UpdateLogs logs={updateLogs} />
                
                {updateLogs.length > 10 && (
                  <div className="text-center">
                    <Badge variant="outline">
                      Mostrando os 10 registros mais recentes de {updateLogs.length} total
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum registro encontrado</h3>
                <p className="text-sm text-center max-w-md">
                  Quando você fizer alterações no inventário, elas aparecerão aqui.
                  {hasSheets && " Importe uma planilha primeiro para começar."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
});

LogViewer.displayName = 'LogViewer'; 
