import { useState, useCallback } from 'react';
import { InventoryItem } from '@/types/inventory';
import { toast } from '@/hooks/use-toast';

// Interfaces para Google Sheets API
interface GoogleSheetsConfig {
  apiKey: string;
  clientId: string;
}

interface SheetRange {
  sheetId: string;
  range?: string;
  tab?: string;
}

export const useGoogleSheets = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<GoogleSheetsConfig | null>(null);

  // Inicializar Google Sheets API
  const initializeGoogleAPI = useCallback(async (apiKey: string, clientId: string) => {
    try {
      setIsLoading(true);
      
      // Carregar Google API
      if (!window.gapi) {
        await loadGoogleAPI();
      }
      
      await window.gapi.load('client:auth2', async () => {
        await window.gapi.client.init({
          apiKey: apiKey,
          clientId: clientId,
          discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
          scope: 'https://www.googleapis.com/auth/spreadsheets'
        });
        
        setConfig({ apiKey, clientId });
        setIsAuthenticated(window.gapi.auth2.getAuthInstance().isSignedIn.get());
        
        toast({
          title: "✅ Google Sheets configurado",
          description: "API inicializada com sucesso!",
        });
      });
    } catch (error) {
      toast({
        title: "❌ Erro na configuração",
        description: "Falha ao inicializar Google Sheets API",
        variant: "destructive",
      });
      console.error('Error initializing Google API:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Autenticar usuário
  const signIn = useCallback(async () => {
    try {
      setIsLoading(true);
      const authInstance = window.gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      setIsAuthenticated(true);
      
      toast({
        title: "✅ Autenticado",
        description: "Login realizado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "❌ Erro de autenticação",
        description: "Falha no login do Google",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Importar dados do Google Sheets
  const importFromGoogleSheet = useCallback(async (
    sheetId: string, 
    tab?: string
  ): Promise<InventoryItem[]> => {
    if (!isAuthenticated) {
      throw new Error('Usuário não autenticado');
    }

    try {
      setIsLoading(true);
      
      const range = tab ? `${tab}!A:Z` : 'A:Z';
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
      });

      const rows = response.result.values || [];
      
      if (rows.length === 0) {
        return [];
      }

      // Assume primeira linha são os headers
      const headers = rows[0].map((h: string) => h.toLowerCase());
      const items: InventoryItem[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const item: InventoryItem = {
          id: `${sheetId}-${tab || 'sheet1'}-${i}`,
          name: getValueByHeaders(row, headers, ['produto', 'nome', 'item', 'name']) || '',
          quantity: parseFloat(getValueByHeaders(row, headers, ['quantidade', 'qty', 'estoque', 'quantity']) || '0') || 0,
          unidade: getValueByHeaders(row, headers, ['unidade', 'unit', 'medida']) || 'un',
          categoria: getValueByHeaders(row, headers, ['categoria', 'category', 'tipo']) || tab || 'Geral',
          lastUpdated: new Date(),
          updatedBy: 'Google Sheets'
        };

        if (item.name) {
          items.push(item);
        }
      }

      toast({
        title: "✅ Importação concluída",
        description: `${items.length} itens importados do Google Sheets`,
      });

      return items;
    } catch (error) {
      toast({
        title: "❌ Erro na importação",
        description: "Falha ao importar dados do Google Sheets",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Exportar dados para Google Sheets
  const exportToGoogleSheet = useCallback(async (
    sheetId: string, 
    data: InventoryItem[]
  ): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Usuário não autenticado');
    }

    try {
      setIsLoading(true);

      // Preparar dados para exportação
      const headers = ['Produto', 'Quantidade', 'Unidade', 'Categoria', 'Última Atualização', 'Atualizado Por'];
      const rows = [
        headers,
        ...data.map(item => [
          item.name,
          item.quantity.toString(),
          item.unidade || item.unit || 'un',
          item.categoria || item.category || 'Geral',
          item.lastUpdated ? new Date(item.lastUpdated).toLocaleString('pt-BR') : '',
          item.updatedBy || ''
        ])
      ];

      // Limpar planilha e inserir novos dados
      await window.gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: 'A:Z',
      });

      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'A1',
        valueInputOption: 'RAW',
        resource: {
          values: rows,
        },
      });

      toast({
        title: "✅ Exportação concluída",
        description: `${data.length} itens exportados para Google Sheets`,
      });
    } catch (error) {
      toast({
        title: "❌ Erro na exportação",
        description: "Falha ao exportar dados para Google Sheets",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  return {
    isAuthenticated,
    isLoading,
    config,
    initializeGoogleAPI,
    signIn,
    importFromGoogleSheet,
    exportToGoogleSheet,
  };
};

// Função auxiliar para carregar Google API
const loadGoogleAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.getElementById('google-api-script')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-api-script';
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google API'));
    document.head.appendChild(script);
  });
};

// Função auxiliar para buscar valores por headers possíveis
const getValueByHeaders = (
  row: string[], 
  headers: string[], 
  possibleHeaders: string[]
): string | undefined => {
  for (const possible of possibleHeaders) {
    const index = headers.findIndex(h => h.includes(possible));
    if (index !== -1 && row[index]) {
      return row[index];
    }
  }
  return undefined;
};

// Declaração global para TypeScript
declare global {
  interface Window {
    gapi: {
      load: (apis: string, callback: () => void) => void;
      client: {
        init: (config: object) => Promise<void>;
        sheets: {
          spreadsheets: {
            values: {
              get: (params: object) => Promise<{ result: { values: string[][] } }>;
              clear: (params: object) => Promise<void>;
              update: (params: object) => Promise<void>;
            };
          };
        };
      };
      auth2: {
        getAuthInstance: () => {
          isSignedIn: {
            get: () => boolean;
          };
          signIn: () => Promise<void>;
        };
      };
    };
  }
} 