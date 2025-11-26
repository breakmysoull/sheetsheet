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
import { Sheet } from '@/types/inventory';
import { toast } from '@/hooks/use-toast';

interface ImportButtonProps {
  onImport: (sheets: Sheet[]) => void;
  isLoading?: boolean;
  variant?: 'default' | 'outline' | 'secondary';
}

export const ImportButton: React.FC<ImportButtonProps> = ({
  onImport,
  isLoading = false,
  variant = 'default'
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
          disabled={isLoading}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {isLoading ? 'Importando...' : 'Importar'}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
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
                  disabled={isLoading}
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const fixed = fixSheetsAggregateDuplicates(parsedSheets)
                        setParsedSheets(fixed)
                        const w2 = analyzeSheets(fixed)
                        setWarnings(w2)
                        toast({ title: 'Correção aplicada', description: 'Duplicados agregados' })
                      }}
                    >Corrigir duplicados</Button>
                    <Button
                      onClick={() => {
                        if (!parsedSheets) return
                        onImport(parsedSheets)
                        setParsedSheets(null)
                        setWarnings([])
                        setIsDialogOpen(false)
                      }}
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
