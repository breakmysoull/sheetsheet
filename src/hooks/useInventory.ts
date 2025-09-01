import { useState, useCallback, useEffect } from 'react';
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
    setSheets(newSheets);
    setActiveSheetIndex(0);
    toast({
      title: "✅ Planilha carregada",
      description: `${newSheets.length} aba(s) importada(s) com sucesso!`,
    });
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
          id: Date.now().toString(),
          itemName: item.name,
          change: operation === 'add' ? quantity : item.quantity - oldQuantity,
          timestamp: new Date(),
          updatedBy: 'Usuário',
          type: operation
        };
        
        setUpdateLogs(prev => [log, ...prev].slice(0, 50)); // Keep last 50 logs
        
        toast({
          title: "✅ Item atualizado",
          description: `${item.name}: ${oldQuantity} → ${item.quantity} ${item.unit || 'un'}`,
        });
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
          id: Date.now().toString(),
          itemName: itemName,
          change: quantity,
          timestamp: new Date(),
          updatedBy: 'Usuário',
          type: 'add'
        };
        
        setUpdateLogs(prev => [log, ...prev].slice(0, 50));
        
        toast({
          title: "✅ Novo item adicionado",
          description: `${itemName}: ${quantity} un`,
        });
      }
      
      return newSheets;
    });
  }, [activeSheetIndex]);
  
  const filteredItems = sheets[activeSheetIndex]?.items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
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
  };
};