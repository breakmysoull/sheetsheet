import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Sheet, InventoryItem, UpdateLog, Recipe, Purchase, DailyChecklist, ChecklistCategory, Utensil, UtensilStatus } from '@/types/inventory';
import { toast } from '@/hooks/use-toast';
import { saveSheets, upsertItem, insertLog, fetchSheetsWithItems, subscribeItemsRealtime, fetchUtensils, upsertUtensil, subscribeUtensilsRealtime, fetchDailyChecklists, upsertDailyChecklist, subscribeChecklistsRealtime, fetchKitchenCodeForUser } from '@/services/supabaseInventory';
import { sendWhatsAppAlert, buildLowStockMessage } from '@/services/alerts';

export const useInventory = () => {
  const { user } = useAuth() as any;
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [updateLogs, setUpdateLogs] = useState<UpdateLog[]>([]);
  const [undoEntry, setUndoEntry] = useState<{ itemName: string; previousQuantity: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [kitchenCode, setKitchenCode] = useState<string>(() => localStorage.getItem('kitchen_code') || '');
  const [dailyChecklists, setDailyChecklists] = useState<DailyChecklist[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [utensils, setUtensils] = useState<Utensil[]>([]);
  
  const mergeSheets = (a: Sheet[], b: Sheet[]): Sheet[] => {
    const byName: Record<string, InventoryItem[]> = {};
    [...a, ...b].forEach(sheet => {
      const existing = byName[sheet.name] || [];
      const map: Record<string, InventoryItem> = {};
      existing.forEach(i => { map[i.id || i.name] = i; });
      sheet.items.forEach(i => { map[i.id || i.name] = i; });
      byName[sheet.name] = Object.values(map);
    });
    return Object.keys(byName).map(name => ({ name, items: byName[name] }));
  };

  // Load data from localStorage on mount
  useEffect(() => {
    const savedSheets = localStorage.getItem('inventory_sheets');
    const savedLogs = localStorage.getItem('update_logs');
    const savedRecipes = localStorage.getItem('recipes');
    const savedPurchases = localStorage.getItem('purchases');
    const savedChecklists = localStorage.getItem('daily_checklists');
    const savedUtensils = localStorage.getItem('utensils');
    if (savedSheets) setSheets(JSON.parse(savedSheets));
    if (savedLogs) setUpdateLogs(JSON.parse(savedLogs));
    if (savedRecipes) setRecipes(JSON.parse(savedRecipes));
    if (savedPurchases) setPurchases(JSON.parse(savedPurchases));
    if (savedChecklists) setDailyChecklists(JSON.parse(savedChecklists));
    if (savedUtensils) setUtensils(JSON.parse(savedUtensils));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const uid = user?.id
        if (!uid) return
        const remoteCode = await fetchKitchenCodeForUser(uid)
        if (remoteCode && remoteCode !== kitchenCode) {
          setKitchenCode(remoteCode)
          localStorage.setItem('kitchen_code', remoteCode)
        }
      } catch {}
    })()
  }, [user?.id])

  // Try to load from Supabase if configured
  useEffect(() => {
    (async () => {
      try {
        const remote = await fetchSheetsWithItems(kitchenCode || undefined);
        if (remote && remote.length > 0) {
          const savedSheets = localStorage.getItem('inventory_sheets');
          const local = savedSheets ? JSON.parse(savedSheets) as Sheet[] : [];
          const merged = mergeSheets(remote, local);
          setSheets(merged);
          setActiveSheetIndex(0);
          saveSheets(merged, kitchenCode || undefined).catch(() => {});
        }
        const remoteUtensils = await fetchUtensils(kitchenCode || undefined)
        if (remoteUtensils && remoteUtensils.length > 0) {
          const localUt = localStorage.getItem('utensils')
          const localList: Utensil[] = localUt ? JSON.parse(localUt) : []
          const byName = new Map<string, Utensil>()
          ;[...remoteUtensils, ...localList].forEach(u => { byName.set(u.name.toLowerCase(), u) })
          setUtensils(Array.from(byName.values()))
        }
        const remoteChecklists = await fetchDailyChecklists(kitchenCode || undefined)
        if (remoteChecklists && remoteChecklists.length > 0) {
          const localCl = localStorage.getItem('daily_checklists')
          const localList: DailyChecklist[] = localCl ? JSON.parse(localCl) : []
          const byDate = new Map<string, DailyChecklist>()
          ;[...localList, ...remoteChecklists].forEach(c => { byDate.set(c.date, c) })
          setDailyChecklists(Array.from(byDate.values()))
        }
      } catch {}
    })();
  }, [kitchenCode]);
  
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
  useEffect(() => {
    localStorage.setItem('recipes', JSON.stringify(recipes));
  }, [recipes]);
  useEffect(() => {
    localStorage.setItem('purchases', JSON.stringify(purchases));
  }, [purchases]);
  useEffect(() => {
    localStorage.setItem('daily_checklists', JSON.stringify(dailyChecklists));
  }, [dailyChecklists]);

  useEffect(() => {
    localStorage.setItem('utensils', JSON.stringify(utensils));
  }, [utensils]);
  
  const syncRef = useRef<number | null>(null);
  const scheduleSync = useCallback(() => {
    if (syncRef.current) clearTimeout(syncRef.current);
    syncRef.current = window.setTimeout(() => {
      saveSheets(sheets, kitchenCode || undefined).catch(() => {});
    }, 300);
  }, [sheets, kitchenCode]);

  const loadSheets = useCallback((newSheets: Sheet[]) => {
    console.log('🔄 loadSheets chamado com:', newSheets);
    console.log('📊 Total de planilhas:', newSheets.length);
    
    newSheets.forEach((sheet, index) => {
      console.log(`📋 Planilha ${index}: ${sheet.name} com ${sheet.items.length} itens`);
      if (sheet.items.length > 0) {
        console.log('📦 Primeiro item:', sheet.items[0]);
      }
    });
    
    setSheets(newSheets);
    setActiveSheetIndex(0);
    console.log('✅ Sheets state atualizado');
    saveSheets(newSheets, kitchenCode || undefined).catch(() => {})
  }, []);

  const defaultChecklistCategories = useCallback((): ChecklistCategory[] => ([
    {
      name: 'Pré-preparo',
      items: [
        { id: 'mises', label: 'Separar mise en place', checked: false },
        { id: 'descongelar', label: 'Descongelar proteínas', checked: false },
        { id: 'marinar', label: 'Marinar carnes', checked: false },
      ]
    },
    {
      name: 'Limpeza',
      items: [
        { id: 'bancadas', label: 'Higienizar bancadas', checked: false },
        { id: 'pias', label: 'Limpar pias', checked: false },
        { id: 'chao', label: 'Lavar chão', checked: false },
      ]
    },
    {
      name: 'Montagem da praça',
      items: [
        { id: 'utensilios', label: 'Dispor utensílios', checked: false },
        { id: 'condimentos', label: 'Abastecer condimentos', checked: false },
        { id: 'organizacao', label: 'Organizar estação', checked: false },
      ]
    },
    {
      name: 'Temperaturas',
      items: [
        { id: 'geladeira', label: 'Aferir geladeiras', checked: false },
        { id: 'freezer', label: 'Aferir freezers', checked: false },
        { id: 'banho', label: 'Verificar banho-maria', checked: false },
      ]
    },
    {
      name: 'Utensílios',
      items: [
        { id: 'facas', label: 'Conferir facas', checked: false },
        { id: 'panelas', label: 'Conferir panelas', checked: false },
        { id: 'formas', label: 'Conferir formas/assadeiras', checked: false },
      ]
    },
  ]), [])

  const getChecklistForDate = useCallback((date: string): DailyChecklist => {
    const idx = dailyChecklists.findIndex(c => c.date === date)
    if (idx !== -1) return dailyChecklists[idx]
    const created: DailyChecklist = { date, categories: defaultChecklistCategories() }
    setDailyChecklists(prev => [created, ...prev])
    return created
  }, [dailyChecklists, defaultChecklistCategories])

  const toggleChecklistItem = useCallback((date: string, categoryName: string, itemId: string, checked: boolean) => {
    setDailyChecklists(prev => {
      const next = [...prev]
      const idx = next.findIndex(c => c.date === date)
      const target = idx !== -1 ? next[idx] : { date, categories: defaultChecklistCategories() }
      if (idx === -1) next.unshift(target as DailyChecklist)
      const cat = target.categories.find(c => c.name === categoryName)
      if (!cat) return next
      const it = cat.items.find(i => i.id === itemId)
      if (!it) return next
      it.checked = checked
      upsertDailyChecklist(target as DailyChecklist, kitchenCode || undefined).catch(() => {})
      return next
    })
  }, [defaultChecklistCategories])

  const setChecklistCategoryAll = useCallback((date: string, categoryName: string, checked: boolean) => {
    setDailyChecklists(prev => {
      const next = [...prev]
      const idx = next.findIndex(c => c.date === date)
      const target = idx !== -1 ? next[idx] : { date, categories: defaultChecklistCategories() }
      if (idx === -1) next.unshift(target as DailyChecklist)
      const cat = target.categories.find(c => c.name === categoryName)
      if (cat) cat.items.forEach(i => { i.checked = checked })
      upsertDailyChecklist(target as DailyChecklist, kitchenCode || undefined).catch(() => {})
      return next
    })
  }, [defaultChecklistCategories])

  const resetChecklist = useCallback((date: string) => {
    setDailyChecklists(prev => {
      const next = [...prev]
      const idx = next.findIndex(c => c.date === date)
      if (idx !== -1) next[idx] = { date, categories: defaultChecklistCategories() }
      else next.unshift({ date, categories: defaultChecklistCategories() })
      const target = next.find(c => c.date === date) as DailyChecklist
      if (target) upsertDailyChecklist(target, kitchenCode || undefined).catch(() => {})
      return next
    })
  }, [defaultChecklistCategories])

  const addUtensil = useCallback((u: Omit<Utensil, 'id'>) => {
    const id = Date.now().toString()
    const created = { ...u, id }
    setUtensils(prev => [created, ...prev])
    upsertUtensil(created, kitchenCode || undefined).catch(() => {})
  }, [])

  const updateUtensilStatus = useCallback((id: string, status: UtensilStatus, notes?: string) => {
    setUtensils(prev => {
      const next = [...prev]
      const idx = next.findIndex(u => u.id === id)
      if (idx !== -1) {
        next[idx] = { ...next[idx], status, notes }
        upsertUtensil(next[idx], kitchenCode || undefined).catch(() => {})
      }
      return next
    })
  }, [])
  const addRecipe = useCallback((recipe: Omit<Recipe, 'id'>) => {
    setRecipes(prev => [{ ...recipe, id: Date.now().toString() }, ...prev]);
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
        item.updatedBy = user?.email || 'Usuário';
        
        // Add to update log
        const log: UpdateLog = {
          item: item.name,
          quantidadeAlterada: operation === 'add' ? quantity : item.quantity - oldQuantity,
          novaQuantidade: item.quantity,
          usuario: user?.email || 'Usuário',
          dataHora: new Date().toISOString(),
          // Manter compatibilidade
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          itemName: item.name,
          change: operation === 'add' ? quantity : item.quantity - oldQuantity,
          timestamp: new Date(),
          updatedBy: user?.email || 'Usuário',
          type: operation
        };
        
        setUpdateLogs(prev => [log, ...prev].slice(0, 50));
        setUndoEntry({ itemName: log.itemName || log.item, previousQuantity: oldQuantity });
        upsertItem(activeSheet.name, item, kitchenCode || undefined).catch(() => {})
        insertLog(log, kitchenCode || undefined).catch(() => {})
        scheduleSync();
      } else {
        // Create new item if not found
        const newItem: InventoryItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: itemName,
          quantity: quantity,
          unit: 'un',
          category: activeSheet.name,
          lastUpdated: new Date(),
          updatedBy: user?.email || 'Usuário'
        };
        
        activeSheet.items.push(newItem);
        
        const log: UpdateLog = {
          item: itemName,
          quantidadeAlterada: quantity,
          novaQuantidade: quantity,
          usuario: user?.email || 'Usuário',
          dataHora: new Date().toISOString(),
          // Manter compatibilidade
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          itemName: itemName,
          change: quantity,
          timestamp: new Date(),
          updatedBy: user?.email || 'Usuário',
          type: 'add'
        };
        
        setUpdateLogs(prev => [log, ...prev].slice(0, 50));
        setUndoEntry({ itemName: log.itemName || log.item, previousQuantity: 0 });
        upsertItem(activeSheet.name, newItem, kitchenCode || undefined).catch(() => {})
        insertLog(log, kitchenCode || undefined).catch(() => {})
        scheduleSync();
      }
      
      return newSheets;
    });
  }, [activeSheetIndex]);

  const updateItemInAllSheets = useCallback((itemName: string, quantity: number, operation: 'add' | 'set' = 'add') => {
    setSheets(prevSheets => {
      const newSheets = [...prevSheets];
      
      newSheets.forEach((sheet) => {
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
          item.updatedBy = user?.email || 'Usuário';

          const log: UpdateLog = {
            item: item.name,
            quantidadeAlterada: operation === 'add' ? quantity : item.quantity - oldQuantity,
            novaQuantidade: item.quantity,
            usuario: user?.email || 'Usuário',
            dataHora: new Date().toISOString(),
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            itemName: item.name,
            change: operation === 'add' ? quantity : item.quantity - oldQuantity,
            timestamp: new Date(),
            updatedBy: user?.email || 'Usuário',
            type: operation
          };
          setUpdateLogs(prev => [log, ...prev].slice(0, 50));
          setUndoEntry({ itemName: log.itemName || log.item, previousQuantity: oldQuantity });
          upsertItem(sheet.name, item, kitchenCode || undefined).catch(() => {})
          insertLog(log, kitchenCode || undefined).catch(() => {})
          scheduleSync();
        } else {
          const newItem: InventoryItem = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: itemName,
            quantity: quantity,
            unit: 'un',
            category: sheet.name,
            lastUpdated: new Date(),
            updatedBy: user?.email || 'Usuário'
          };
          sheet.items.push(newItem);

          const log: UpdateLog = {
            item: itemName,
            quantidadeAlterada: quantity,
            novaQuantidade: quantity,
            usuario: user?.email || 'Usuário',
            dataHora: new Date().toISOString(),
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            itemName: itemName,
            change: quantity,
            timestamp: new Date(),
            updatedBy: user?.email || 'Usuário',
            type: 'add'
          };
          setUpdateLogs(prev => [log, ...prev].slice(0, 50));
          setUndoEntry({ itemName: log.itemName || log.item, previousQuantity: 0 });
          upsertItem(sheet.name, newItem, kitchenCode || undefined).catch(() => {})
          insertLog(log, kitchenCode || undefined).catch(() => {})
          scheduleSync();
        }
      });

      return newSheets;
    });
  }, []);

  const undoLastChange = useCallback(() => {
    if (!undoEntry) return;
    setSheets(prevSheets => {
      const newSheets = [...prevSheets];
      const sheet = newSheets[activeSheetIndex];
      if (!sheet) return prevSheets;
      const idx = sheet.items.findIndex(i => i.name.toLowerCase() === undoEntry.itemName.toLowerCase());
      if (idx === -1) return prevSheets;
      const item = sheet.items[idx];
      item.quantity = undoEntry.previousQuantity;
      item.lastUpdated = new Date();
      item.updatedBy = user?.email || 'Usuário';
      const log: UpdateLog = {
        item: item.name,
        quantidadeAlterada: undoEntry.previousQuantity - (item.quantity),
        novaQuantidade: item.quantity,
        usuario: user?.email || 'Usuário',
        dataHora: new Date().toISOString(),
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        itemName: item.name,
        change: undoEntry.previousQuantity - (item.quantity),
        timestamp: new Date(),
        updatedBy: user?.email || 'Usuário',
        type: 'set',
        reason: 'Undo'
      };
      setUpdateLogs(prev => [log, ...prev].slice(0, 50));
      setUndoEntry(null);
      upsertItem(sheet.name, item, kitchenCode || undefined).catch(() => {})
      insertLog(log, kitchenCode || undefined).catch(() => {})
      scheduleSync();
      return newSheets;
    })
  }, [undoEntry, activeSheetIndex, kitchenCode, scheduleSync]);

  const adjustByInventory = useCallback((counts: Array<{ id?: string; name: string; counted: number }>, scope: 'active' | 'all' = 'active') => {
    setSheets(prevSheets => {
      const newSheets = [...prevSheets];
      const targetSheets = scope === 'active' ? [newSheets[activeSheetIndex]].filter(Boolean) as Sheet[] : newSheets;
      targetSheets.forEach(sheet => {
        counts.forEach(({ name, counted }) => {
          const idx = sheet.items.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
          if (idx !== -1) {
            const item = sheet.items[idx];
            const oldQuantity = item.quantity;
            item.quantity = counted;
            item.lastUpdated = new Date();
            item.updatedBy = user?.email || 'Usuário';
            const log: UpdateLog = {
              item: item.name,
              quantidadeAlterada: counted - oldQuantity,
              novaQuantidade: item.quantity,
              usuario: user?.email || 'Usuário',
              dataHora: new Date().toISOString(),
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              itemName: item.name,
              change: counted - oldQuantity,
              timestamp: new Date(),
              updatedBy: user?.email || 'Usuário',
              type: 'set',
              reason: 'Inventário'
            };
            setUpdateLogs(prev => [log, ...prev].slice(0, 50));
            upsertItem(sheet.name, item, kitchenCode || undefined).catch(() => {})
            insertLog(log, kitchenCode || undefined).catch(() => {})
          } else if (counted > 0) {
            const newItem: InventoryItem = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              name,
              quantity: counted,
              unit: 'un',
              category: sheet.name,
              lastUpdated: new Date(),
            updatedBy: user?.email || 'Usuário'
            };
            sheet.items.push(newItem);
            const log: UpdateLog = {
              item: name,
              quantidadeAlterada: counted,
              novaQuantidade: counted,
              usuario: user?.email || 'Usuário',
              dataHora: new Date().toISOString(),
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              itemName: name,
              change: counted,
              timestamp: new Date(),
              updatedBy: user?.email || 'Usuário',
              type: 'set',
              reason: 'Inventário'
            };
            setUpdateLogs(prev => [log, ...prev].slice(0, 50));
            upsertItem(sheet.name, newItem, kitchenCode || undefined).catch(() => {})
            insertLog(log, kitchenCode || undefined).catch(() => {})
          }
        });
      });
      return newSheets;
    });
  }, [activeSheetIndex]);
  
  const mutateItem = useCallback((itemName: string, quantity: number, adjustment: 'entrada' | 'saida' | 'correcao', reason?: string, minimum?: number, unitCost?: number) => {
    const op: 'add' | 'set' = adjustment === 'correcao' ? 'set' : 'add';
    const qty = adjustment === 'saida' ? -Math.abs(quantity) : quantity;
    setSheets(prevSheets => {
      const newSheets = [...prevSheets];
      const activeSheet = newSheets[activeSheetIndex];
      if (!activeSheet) return prevSheets;
      const itemIndex = activeSheet.items.findIndex(item => 
        item.name.toLowerCase().includes(itemName.toLowerCase()) ||
        itemName.toLowerCase().includes(item.name.toLowerCase())
      );
      if (itemIndex !== -1) {
        const item = activeSheet.items[itemIndex];
        const oldQuantity = item.quantity;
        if (op === 'add') item.quantity += qty; else item.quantity = qty;
        item.lastUpdated = new Date();
        item.updatedBy = user?.email || 'Usuário';
        if (typeof minimum === 'number') item.minimum = minimum;
        if (typeof unitCost === 'number') item.unitCost = unitCost;
        const log: UpdateLog = {
          item: item.name,
          quantidadeAlterada: op === 'add' ? qty : item.quantity - oldQuantity,
          novaQuantidade: item.quantity,
          usuario: user?.email || 'Usuário',
          dataHora: new Date().toISOString(),
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          itemName: item.name,
          change: op === 'add' ? qty : item.quantity - oldQuantity,
          timestamp: new Date(),
          updatedBy: user?.email || 'Usuário',
          type: op === 'add' ? (qty >= 0 ? 'add' : 'subtract') : 'set',
          reason
        };
        setUpdateLogs(prev => [log, ...prev].slice(0, 50));
        upsertItem(activeSheet.name, item, kitchenCode || undefined).catch(() => {})
        insertLog(log, kitchenCode || undefined).catch(() => {})
        scheduleSync();
        if (typeof item.minimum === 'number' && item.minimum > 0 && item.quantity < item.minimum) {
          try { sendWhatsAppAlert(buildLowStockMessage(item.name, item.quantity, item.minimum)); } catch {}
        }
      } else {
        const newItem: InventoryItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: itemName,
          quantity: op === 'add' ? qty : qty,
          unit: 'un',
          category: activeSheet.name,
          lastUpdated: new Date(),
          updatedBy: 'Usuário',
          minimum: typeof minimum === 'number' ? minimum : 0,
          unitCost: typeof unitCost === 'number' ? unitCost : undefined
        };
        activeSheet.items.push(newItem);
        const log: UpdateLog = {
          item: itemName,
          quantidadeAlterada: qty,
          novaQuantidade: newItem.quantity,
          usuario: user?.email || 'Usuário',
          dataHora: new Date().toISOString(),
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          itemName: itemName,
          change: qty,
          timestamp: new Date(),
          updatedBy: user?.email || 'Usuário',
          type: op === 'add' ? (qty >= 0 ? 'add' : 'subtract') : 'set',
          reason
        };
        setUpdateLogs(prev => [log, ...prev].slice(0, 50));
        upsertItem(activeSheet.name, newItem, kitchenCode || undefined).catch(() => {})
        insertLog(log, kitchenCode || undefined).catch(() => {})
        scheduleSync();
        if (typeof newItem.minimum === 'number' && newItem.minimum > 0 && newItem.quantity < newItem.minimum) {
          try { sendWhatsAppAlert(buildLowStockMessage(newItem.name, newItem.quantity, newItem.minimum)); } catch {}
        }
      }
      return newSheets;
    });
  }, [activeSheetIndex, scheduleSync]);
  const registerProduction = useCallback((recipeId: string, portions: number) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe || portions <= 0 || recipe.yield <= 0) return;
    const factor = portions / recipe.yield;
    recipe.ingredients.forEach(ing => {
      const qty = ing.quantity * factor;
      mutateItem(ing.itemName, qty, 'saida', 'Produção');
    });
  }, [recipes, mutateItem]);
  const addPurchase = useCallback((purchase: Omit<Purchase, 'id'>) => {
    const id = Date.now().toString();
    setPurchases(prev => [{ ...purchase, id }, ...prev]);
    const unitCost = purchase.price && purchase.quantity > 0 ? purchase.price / purchase.quantity : undefined;
    mutateItem(purchase.itemName, purchase.quantity, 'entrada', 'Compra', undefined, unitCost);
  }, [mutateItem]);

  useEffect(() => {
    const id = window.setInterval(async () => {
      try {
        if (!kitchenCode) return;
        const remote = await fetchSheetsWithItems(kitchenCode);
        if (!remote || remote.length === 0) return;
        const merged = mergeSheets(remote, sheets);
        setSheets(merged);
      } catch {}
    }, 15000);
    return () => window.clearInterval(id);
  }, [kitchenCode]);

  useEffect(() => {
    if (!kitchenCode) return;
    const sub = subscribeItemsRealtime(kitchenCode, (payload) => {
      try {
        const row: any = payload.new || payload.old
        if (!row) return
        setSheets(prev => {
          const next = [...prev]
          const sheetIdx = next.findIndex(s => s.name === row.sheet_name)
          if (sheetIdx === -1) return prev
          const sheet = next[sheetIdx]
          const idx = sheet.items.findIndex(i => i.id === String(row.item_id))
          const updated: InventoryItem = {
            id: String(row.item_id),
            name: String(row.name),
            quantity: Number(row.quantity) || 0,
            unit: row.unit || 'un',
            category: row.category || sheet.name,
            lastUpdated: row.last_updated ? new Date(row.last_updated) : new Date(),
            updatedBy: row.updated_by || 'Usuário',
            unitCost: idx !== -1 ? (sheet.items[idx] as any).unitCost : undefined
          }
          if (idx !== -1) sheet.items[idx] = updated; else sheet.items.push(updated)
          return next
        })
      } catch {}
    })
    const subUt = subscribeUtensilsRealtime(kitchenCode, (payload) => {
      try {
        const row: any = payload.new || payload.old
        if (!row) return
        setUtensils(prev => {
          const next = [...prev]
          const idx = next.findIndex(u => u.id === String(row.id))
          const updated: Utensil = {
            id: String(row.id),
            name: String(row.name),
            category: String(row.category || 'geral'),
            status: String(row.status) as UtensilStatus,
            notes: row.notes ? String(row.notes) : undefined
          }
          if (idx !== -1) next[idx] = updated; else next.push(updated)
          return next
        })
      } catch {}
    })
    const subCl = subscribeChecklistsRealtime(kitchenCode, (payload) => {
      try {
        const row: any = payload.new || payload.old
        if (!row) return
        setDailyChecklists(prev => {
          const next = [...prev]
          const idx = next.findIndex(c => c.date === String(row.date))
          const updated: DailyChecklist = {
            date: String(row.date),
            categories: (row.categories || []) as any
          }
          if (idx !== -1) next[idx] = updated; else next.push(updated)
          return next
        })
      } catch {}
    })
    return () => { sub.unsubscribe(); subUt.unsubscribe(); subCl.unsubscribe() }
  }, [kitchenCode])
  
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
    mutateItem,
    adjustByInventory,
    kitchenCode,
    setKitchenCode,
    undoLastChange,
    dailyChecklists,
    getChecklistForDate,
    toggleChecklistItem,
    setChecklistCategoryAll,
    resetChecklist,
    utensils,
    addUtensil,
    updateUtensilStatus,
    recipes,
    addRecipe,
    registerProduction,
    purchases,
    addPurchase,
  };
};
