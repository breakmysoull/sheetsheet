import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileSpreadsheet, 
  Upload, 
  Link, 
  Settings, 
  LogIn,
  AlertCircle,
  CheckCircle,
  Download
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
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
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
  const [googleSheetId, setGoogleSheetId] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');

  const {
    isAuthenticated,
    isLoading: googleLoading,
    initializeGoogleAPI,
    signIn,
    importFromGoogleSheet
  } = useGoogleSheets();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsedSheets = await XLSXHandler.parseFile(file);
      onImport(parsedSheets);
      setIsDialogOpen(false);
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

  const handleGoogleSheetsSetup = async () => {
    if (!googleApiKey.trim() || !googleClientId.trim()) {
      toast({
        title: "❌ Configuração incompleta",
        description: "Preencha API Key e Client ID",
        variant: "destructive",
      });
      return;
    }

    try {
      await initializeGoogleAPI(googleApiKey, googleClientId);
    } catch (error) {
      console.error('Error setting up Google Sheets:', error);
    }
  };

  const handleGoogleSheetsImport = async () => {
    if (!googleSheetId.trim()) {
      toast({
        title: "❌ ID da planilha obrigatório",
        description: "Insira o ID da planilha do Google Sheets",
        variant: "destructive",
      });
      return;
    }

    try {
      const items = await importFromGoogleSheet(googleSheetId);
      const sheet: Sheet = {
        name: 'Google Sheets',
        items
      };
      
      onImport([sheet]);
      setIsDialogOpen(false);
      setGoogleSheetId('');
    } catch (error) {
      console.error('Error importing from Google Sheets:', error);
    }
  };

  const extractSheetIdFromUrl = (url: string): string => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  };

  const handleSheetUrlChange = (value: string) => {
    const id = extractSheetIdFromUrl(value);
    setGoogleSheetId(id);
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="xlsx">Arquivo XLSX</TabsTrigger>
            <TabsTrigger value="google">Google Sheets</TabsTrigger>
          </TabsList>

          {/* Importação XLSX */}
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
          </TabsContent>

          {/* Importação Google Sheets */}
          <TabsContent value="google" className="space-y-4">
            {/* Configuração da API */}
            {!isAuthenticated && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configuração Google API
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key *</Label>
                    <Input
                      id="apiKey"
                      placeholder="Sua Google Sheets API Key"
                      value={googleApiKey}
                      onChange={(e) => setGoogleApiKey(e.target.value)}
                      type="password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client ID *</Label>
                    <Input
                      id="clientId"
                      placeholder="Seu Google OAuth Client ID"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                    />
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Para obter credenciais:</p>
                    <p>1. Acesse Google Cloud Console</p>
                    <p>2. Ative Google Sheets API</p>
                    <p>3. Crie credenciais OAuth 2.0</p>
                  </div>

                  <Button
                    onClick={handleGoogleSheetsSetup}
                    disabled={googleLoading || !googleApiKey.trim() || !googleClientId.trim()}
                    className="w-full"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {googleLoading ? 'Configurando...' : 'Configurar API'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Autenticação */}
            {!isAuthenticated && googleApiKey && googleClientId && (
              <Card>
                <CardContent className="pt-6">
                  <Button
                    onClick={signIn}
                    disabled={googleLoading}
                    variant="outline"
                    className="w-full"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    {googleLoading ? 'Autenticando...' : 'Fazer Login Google'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Status da autenticação */}
            {isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Badge variant="default" className="bg-green-500 text-white mb-4">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Autenticado no Google
                </Badge>
              </motion.div>
            )}

            {/* Importação da planilha */}
            {isAuthenticated && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Importar Planilha
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sheetUrl">URL ou ID da Planilha *</Label>
                    <Input
                      id="sheetUrl"
                      placeholder="https://docs.google.com/spreadsheets/d/... ou apenas o ID"
                      onChange={(e) => handleSheetUrlChange(e.target.value)}
                    />
                    {googleSheetId && (
                      <p className="text-xs text-muted-foreground">
                        ID extraído: {googleSheetId}
                      </p>
                    )}
                  </div>

                                     <div className="text-sm text-muted-foreground">
                     <p>Dicas:</p>
                     <p>• Planilha deve ser pública ou compartilhada</p>
                     <p>• Primeira linha = cabeçalhos</p>
                     <p>• Colunas: Produto, Quantidade, Unidade, Categoria</p>
                   </div>

                  <Button
                    onClick={handleGoogleSheetsImport}
                    disabled={googleLoading || !googleSheetId.trim()}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {googleLoading ? 'Importando...' : 'Importar do Google Sheets'}
                  </Button>
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