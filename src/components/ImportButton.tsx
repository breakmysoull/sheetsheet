import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileSpreadsheet, 
  Upload
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { XLSXHandler } from '@/services/xlsxHandler';
import { analyzeSheets, fixSheetsAggregateDuplicates, ImportWarning } from '@/services/importValidator';
import { distributeItemsByCategory } from '@/services/categoryDistributor';
import { Sheet } from '@/types/inventory';
import { toast } from '@/hooks/use-toast';

interface ImportButtonProps {
  onImport: (sheets: Sheet[]) => void;
  isLoading?: boolean;
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
  disabled?: boolean;
}

export const ImportButton: React.FC<ImportButtonProps> = ({
  onImport,
  isLoading = false,
  variant = 'default',
  className,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [parsedSheets, setParsedSheets] = useState<Sheet[] | null>(null);
  const [warnings, setWarnings] = useState<ImportWarning[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const sheets = await XLSXHandler.parseFile(file);
      const totalItems = sheets.reduce((acc, s) => acc + (s.items?.length || 0), 0);
      if (totalItems === 0) {
        toast({ title: 'Nenhum item válido encontrado', description: 'Revise o arquivo: colunas Produto, Quantidade, Unidade, Categoria', variant: 'destructive' });
        setParsedSheets(null);
        setWarnings([]);
        setIsDialogOpen(true);
        return;
      }
      setParsedSheets(sheets);
      const w = analyzeSheets(sheets);
      setWarnings(w);
      if (w.length > 0) {
        toast({ title: 'Arquivo analisado', description: `${w.length} aviso(s) encontrado(s)` })
      } else {
        onImport(sheets);
        setIsDialogOpen(false);
        setParsedSheets(null);
      }
    } catch (error) {
      toast({
        title: "❌ Erro ao importar",
        description: "Verifique se o arquivo é uma planilha válida (.xlsx)",
        variant: "destructive",
      });
      console.error('Error parsing file:', error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          disabled={isLoading || disabled}
          className={`gap-2 ${className ?? ''}`}
          onClick={() => setIsDialogOpen(true)}
        >
          <Upload className="h-4 w-4" />
          {isLoading ? 'Importando...' : 'Importar'}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Planilha
          </DialogTitle>
          <DialogDescription>
            Escolha como importar seus dados de inventário
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="xlsx" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="xlsx">Arquivo XLSX</TabsTrigger>
          </TabsList>

          <TabsContent value="xlsx" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Arquivo Local</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>• Suporte para múltiplas abas</p>
                  <p>• Colunas: Produto, Quantidade, Unidade, Categoria</p>
                  <p>• Formato: .xlsx (Excel)</p>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                  disabled={isLoading || disabled}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Arquivo
                </Button>
              </CardContent>
            </Card>

            {parsedSheets && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Revisão antes de importar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">{warnings.length} aviso(s):</div>
                  <div className="text-xs text-muted-foreground max-h-40 overflow-auto space-y-1">
                    {warnings.map((w, idx) => (
                      <div key={idx}>• [{w.type}] {w.message}</div>
                    ))}
                    {warnings.length === 0 && (<div>Sem avisos</div>)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const fixed = fixSheetsAggregateDuplicates(parsedSheets)
                        setParsedSheets(fixed)
                        const w2 = analyzeSheets(fixed)
                        setWarnings(w2)
                        toast({ title: 'Correção aplicada', description: 'Duplicados agregados' })
                      }}
                      disabled={disabled || isLoading}
                    >Corrigir duplicados</Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (!parsedSheets) return
                        const { sheets: distributed, transfers } = distributeItemsByCategory(parsedSheets)
                        setParsedSheets(distributed)
                        const w2 = analyzeSheets(distributed)
                        setWarnings(w2)
                        toast({ 
                          title: 'Redistribuição aplicada', 
                          description: `${transfers.length} itens movidos para abas corretas.` 
                        })
                        if (transfers.length > 0) {
                          console.log('[Import] Transferências:', transfers)
                        }
                      }}
                      disabled={disabled || isLoading}
                    >Auto-classificar Abas</Button>
                    <Button
                      onClick={() => {
                        if (!parsedSheets) return
                        const total = parsedSheets.reduce((acc, s) => acc + (s.items?.length || 0), 0)
                        if (total === 0) {
                          toast({ title: 'Nenhum item para importar', description: 'A planilha não possui linhas válidas', variant: 'destructive' })
                          return
                        }
                        onImport(parsedSheets)
                        setParsedSheets(null)
                        setWarnings([])
                        setIsDialogOpen(false)
                      }}
                      disabled={disabled || isLoading}
                    >Confirmar importação</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
