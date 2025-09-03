import { useState, useCallback, useEffect, useMemo } from 'react';
import { Sheet, InventoryItem, UpdateLog } from '@/types/inventory';
import { toast } from '@/hooks/use-toast';

export const useInventory = () => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [updateLogs, setUpdateLogs] = useState<UpdateLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Load data from localStorage on mount
  useEffect(() => {
    const savedSheets = localStorage.getItem('inventory_sheets');
    const savedLogs = localStorage.getItem('update_logs');
    
    if (savedSheets) {
      setSheets(JSON.parse(savedSheets));
    }
    
    if (savedLogs) {
      setUpdateLogs(JSON.parse(savedLogs));
    }
  }, []);
  
  // Save to localStorage whenever data changes
  useEffect(() => {
    if (sheets.length > 0) {
      localStorage.setItem('inventory_sheets', JSON.stringify(sheets));
    }
  }, [sheets]);
  
  useEffect(() => {
    if (updateLogs.length > 0) {
      localStorage.setItem('update_logs', JSON.stringify(updateLogs));
    }
  }, [updateLogs]);
  
  const loadSheets = useCallback((newSheets: Sheet[]) => {
    console.log('🔄 loadSheets chamado com:', newSheets);
    console.log('📊 Total de planilhas:', newSheets.length);
    
    newSheets.forEach((sheet, index) => {
      console.log(📋 Planilha :  com  itens);
      if (sheet.items.length > 0) {
        console.log('📦 Primeiro item:', sheet.items[0]);
      }
    });
    
    setSheets(newSheets);
    setActiveSheetIndex(0);
    console.log('✅ Sheets state atualizado');
  }, []);
  
  const updateItem = useCallback((itemName: string, quantity: number, operation: 'add' | 'set' = 'add') => {
    setSheets(prevSheets => {
      const newSheets = [...prevSheets];
      const activeSheet = newSheets[activeSheetIndex];
      
      if (!activeSheet) return prevSheets;
      
      // Find item by name (case-insensitive, partial match)
      const itemIndex = activeSheet.items.findIndex(item => 
        item.name.toLowerCase().includes(itemName.toLowerCase()) ||
        itemName.toLowerCase().includes(item.name.toLowerCase())
      );
      
      if (itemIndex !== -1) {
        const item = activeSheet.items[itemIndex];
        const oldQuantity = item.quantity;
        
        if (operation === 'add') {
          item.quantity += quantity;
        } else {
          item.quantity = quantity;
        }
        
        item.lastUpdated = new Date();
        item.updatedBy = 'Usuário';
        
        // Add to update log
        const log: UpdateLog = {
          item: item.name,
          quantidadeAlterada: operation === 'add' ? quantity : item.quantity - oldQuantity,
          novaQuantidade: item.quantity,
          usuario: 'Usuário',
          dataHora: new Date().toISOString(),
          // Manter compatibilidade
          id: Date.now().toString(),
          itemName: item.name,
          change: operation === 'add' ? quantity : item.quantity - oldQuantity,
          timestamp: new Date(),
          updatedBy: 'Usuário',
          type: operation
        };
        
        setUpdateLogs(prev => [log, ...prev].slice(0, 50)); // Keep last 50 logs
      } else {
        // Create new item if not found
        const newItem: InventoryItem = {
          id: Date.now().toString(),
          name: itemName,
          quantity: quantity,
          unit: 'un',
          category: activeSheet.name,
          lastUpdated: new Date(),
          updatedBy: 'Usuário'
        };
        
        activeSheet.items.push(newItem);
        
        const log: UpdateLog = {
          item: itemName,
          quantidadeAlterada: quantity,
          novaQuantidade: quantity,
          usuario: 'Usuário',
          dataHora: new Date().toISOString(),
          // Manter compatibilidade
          id: Date.now().toString(),
          itemName: itemName,
          change: quantity,
          timestamp: new Date(),
          updatedBy: 'Usuário',
          type: 'add'
        };
        
        setUpdateLogs(prev => [log, ...prev].slice(0, 50));
      }
      
      return newSheets;
    });
  }, [activeSheetIndex]);

  const updateItemInAllSheets = useCallback((itemName: string, quantity: number, operation: 'add' | 'set' = 'add') => {
    setSheets(prevSheets => {
      const newSheets = [...prevSheets];
      let totalUpdated = 0;
      const updatedSheets: string[] = [];

      newSheets.forEach((sheet, sheetIndex) => {
        // Find item by name (case-insensitive, partial match)
        const itemIndex = sheet.items.findIndex(item => 
          item.name.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(item.name.toLowerCase())
        );
        
        if (itemIndex !== -1) {
          const item = sheet.items[itemIndex];
          const oldQuantity = item.quantity;
          
          if (operation === 'add') {
            item.quantity += quantity;
          } else {
            item.quantity = quantity;
          }
          
          item.lastUpdated = new Date();
          item.updatedBy = 'Usuário';
          
          totalUpdated++;
          updatedSheets.push(sheet.name);
          
          // Add to update log
          const log: UpdateLog = {
            item: item.name,
            quantidadeAlterada: operation === 'add' ? quantity : item.quantity - oldQuantity,
            novaQuantidade: item.quantity,
            usuario: 'Usuário',
            dataHora: new Date().toISOString(),
            // Manter compatibilidade
            id: Date.now().toString() + sheetIndex,
            itemName: item.name,
            change: operation === 'add' ? quantity : item.quantity - oldQuantity,
            timestamp: new Date(),
            updatedBy: 'Usuário',
            type: operation
          };
          
          setUpdateLogs(prev => [log, ...prev].slice(0, 50));
        } else {
          // Create new item if not found in this sheet
          const newItem: InventoryItem = {
            id: Date.now().toString() + sheetIndex,
            name: itemName,
            quantity: quantity,
            unit: 'un',
            category: sheet.name,
            lastUpdated: new Date(),
            updatedBy: 'Usuário'
          };
          
          sheet.items.push(newItem);
          totalUpdated++;
          updatedSheets.push(sheet.name);
          
          const log: UpdateLog = {
            item: itemName,
            quantidadeAlterada: quantity,
            novaQuantidade: quantity,
            usuario: 'Usuário',
            dataHora: new Date().toISOString(),
            // Manter compatibilidade
            id: Date.now().toString() + sheetIndex,
            itemName: itemName,
            change: quantity,
            timestamp: new Date(),
            updatedBy: 'Usuário',
            type: 'add'
          };
          
          setUpdateLogs(prev => [log, ...prev].slice(0, 50));
        }
      });

      // Show summary toast
      if (totalUpdated > 0) {
        const operationText = operation === 'add' ? 'adicionado' : 'atualizado';
        toast({
          title: ✅ Item  em  planilha(s),
          description: ${itemName} em: ,
        });
      }
      
      return newSheets;
    });
  }, []);
  
  const filteredItems = useMemo(() => {
    return sheets[activeSheetIndex]?.items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];
  }, [sheets, activeSheetIndex, searchQuery]);
  
  return {
    sheets,
    activeSheetIndex,
    setActiveSheetIndex,
    updateLogs,
    searchQuery,
    setSearchQuery,
    filteredItems,
    loadSheets,
    updateItem,
    updateItemInAllSheets,
  };
};
