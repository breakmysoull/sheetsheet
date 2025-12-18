import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Sheet, InventoryItem, UpdateLog, Recipe, Purchase, DailyChecklist, ChecklistCategory, Utensil, UtensilStatus } from '@/types/inventory';
import { toast } from '@/hooks/use-toast';
import { clearInventory, saveSheets, upsertItem, insertLog, fetchSheetsWithItems, subscribeItemsRealtime, fetchUtensils, upsertUtensil, subscribeUtensilsRealtime, fetchDailyChecklists, upsertDailyChecklist, subscribeChecklistsRealtime, fetchKitchenCodeForUser, fetchWeeklyRules, upsertWeeklyRule, deleteWeeklyRule, subscribeWeeklyRulesRealtime, fetchDailyInventories, upsertDailyInventory, subscribeDailyInventoriesRealtime, fetchRecipes, upsertRecipe, deleteRecipe, subscribeRecipesRealtime, fetchPurchases, upsertPurchase, subscribePurchasesRealtime, fetchUpdateLogs, subscribeUpdateLogsRealtime, upsertKitchenUser, ensureRestaurantExists } from '@/services/supabaseInventory';
import { sendWhatsAppAlert, buildLowStockMessage } from '@/services/alerts';

export const useInventory = () => {
  const { user } = useAuth() as any;
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [updateLogs, setUpdateLogs] = useState<UpdateLog[]>([]);
  const [undoEntry, setUndoEntry] = useState<{ itemName: string; previousQuantity: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [kitchenCode, setKitchenCode] = useState<string>(() => localStorage.getItem('kitchen_code') || (import.meta.env.VITE_DEFAULT_KITCHEN_CODE as string || ''));
  const [dailyChecklists, setDailyChecklists] = useState<DailyChecklist[]>([]);
  const [weeklyRules, setWeeklyRules] = useState<Array<{ id: string; weekday: number; category: string; section?: 'pre' | 'mont'; label: string }>>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [utensils, setUtensils] = useState<Utensil[]>([]);
  
  const [selectedDailyPlaza, setSelectedDailyPlaza] = useState<string | null>(null);
  const [dailyInventories, setDailyInventories] = useState<Array<{ date: string; plaza: string; items: Array<{ name: string; quantity: number }> }>>([]);
  const [selectedResponsible, setSelectedResponsible] = useState<string | null>(null);
  const [selectedDailyRecipeIds, setSelectedDailyRecipeIds] = useState<string[]>([])
  
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

  // Load data from localStorage on mount (removed recipes/purchases as they are now in Supabase)
  useEffect(() => {
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
        // Sheets
        const remote = await fetchSheetsWithItems(kitchenCode || undefined);
        if (remote && remote.length > 0) {
          setSheets(remote);
          setActiveSheetIndex(0);
        }
        // Utensils
        const remoteUtensils = await fetchUtensils(kitchenCode || undefined)
        if (remoteUtensils && remoteUtensils.length > 0) {
          setUtensils(remoteUtensils)
        }
        // Daily Checklists
        const remoteChecklists = await fetchDailyChecklists(kitchenCode || undefined)
        if (remoteChecklists && remoteChecklists.length > 0) {
          setDailyChecklists(remoteChecklists)
        }
        // Weekly Rules
        const remoteRules = await fetchWeeklyRules(kitchenCode || undefined)
        if (remoteRules && remoteRules.length > 0) {
          setWeeklyRules(remoteRules)
        }
        // Daily Inventories
        const remoteInventories = await fetchDailyInventories(kitchenCode || undefined)
        if (remoteInventories && remoteInventories.length > 0) {
          setDailyInventories(remoteInventories)
        }
        // Recipes
        const remoteRecipes = await fetchRecipes(kitchenCode || undefined)
        if (remoteRecipes && remoteRecipes.length > 0) {
          setRecipes(remoteRecipes)
        }
        // Purchases
        const remotePurchases = await fetchPurchases(kitchenCode || undefined)
        if (remotePurchases && remotePurchases.length > 0) {
          setPurchases(remotePurchases)
        }
        // Logs
        const remoteLogs = await fetchUpdateLogs(kitchenCode || undefined)
        if (remoteLogs && remoteLogs.length > 0) {
          setUpdateLogs(remoteLogs)
        }
      } catch {}
    })();
  }, [kitchenCode]);
  
  const isSavingRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Realtime Subscriptions
  useEffect(() => {
    if (!kitchenCode) return
    const subItems = subscribeItemsRealtime(kitchenCode, () => {
      if (isSavingRef.current) {
        console.log('🔒 Realtime update ignorado durante salvamento em massa')
        return
      }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        fetchSheetsWithItems(kitchenCode).then(data => { 
          if(data.length) {
             console.log('🔄 Realtime update aplicado')
             setSheets(data) 
          }
        })
      }, 1000)
    })
    const subUtensils = subscribeUtensilsRealtime(kitchenCode, () => {
      fetchUtensils(kitchenCode).then(data => { if(data.length) setUtensils(data) })
    })
    const subChecklists = subscribeChecklistsRealtime(kitchenCode, () => {
      fetchDailyChecklists(kitchenCode).then(data => { if(data.length) setDailyChecklists(data) })
    })
    const subRules = subscribeWeeklyRulesRealtime(kitchenCode, () => {
      fetchWeeklyRules(kitchenCode).then(data => { if(data.length) setWeeklyRules(data) })
    })
    const subInventories = subscribeDailyInventoriesRealtime(kitchenCode, () => {
      fetchDailyInventories(kitchenCode).then(data => { if(data.length) setDailyInventories(data) })
    })
    const subRecipes = subscribeRecipesRealtime(kitchenCode, () => {
      fetchRecipes(kitchenCode).then(data => { if(data.length) setRecipes(data) })
    })
    const subPurchases = subscribePurchasesRealtime(kitchenCode, () => {
      fetchPurchases(kitchenCode).then(data => { if(data) setPurchases(data) })
    })
    const subLogs = subscribeUpdateLogsRealtime(kitchenCode, (payload) => {
      try {
        const row: any = payload.new
        if (!row) return
        const newLog: UpdateLog = {
          id: String(row.log_id),
          item: String(row.item_name),
          itemName: String(row.item_name),
          quantidadeAlterada: Number(row.change),
          change: Number(row.change),
          novaQuantidade: Number(row.new_quantity),
          usuario: String(row.updated_by),
          updatedBy: String(row.updated_by),
          dataHora: row.timestamp,
          timestamp: new Date(row.timestamp),
          type: row.type,
          reason: row.reason
        }
        setUpdateLogs(prev => [newLog, ...prev].slice(0, 50))
      } catch {}
    })
    return () => {
      subItems.unsubscribe()
      subUtensils.unsubscribe()
      subChecklists.unsubscribe()
      subRules.unsubscribe()
      subInventories.unsubscribe()
      subRecipes.unsubscribe()
      subPurchases.unsubscribe()
      subLogs.unsubscribe()
    }
  }, [kitchenCode])
  
  // LocalStorage sync removed for migrated types
  
  const syncRef = useRef<number | null>(null);
  const scheduleSync = useCallback(() => {
    if (!kitchenCode) return; // evita erro RLS quando não há kitchenCode
    if (syncRef.current) clearTimeout(syncRef.current);
    syncRef.current = window.setTimeout(() => {
      (async () => {
        try {
          if (user?.id && kitchenCode) {
            const ok = await ensureRestaurantExists(kitchenCode)
            if (!ok) return
            await upsertKitchenUser(user.id, kitchenCode)
          }
        } catch {}
        saveSheets(sheets, kitchenCode).catch(() => {});
      })();
    }, 300);
  }, [sheets, kitchenCode, user?.id]);

  const loadSheets = useCallback(async (newSheets: Sheet[]) => {
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
    
    isSavingRef.current = true;
    try {
      const payload = { kitchenCode: kitchenCode || null, sheets: newSheets, createdAt: Date.now() }
      localStorage.setItem('pending_import_payload', JSON.stringify(payload))
    } catch {}
    try {
      if (!kitchenCode) {
        toast({ title: 'Importação local', description: 'Defina o código da cozinha para persistir no Supabase.', variant: 'destructive' })
      } else {
        try {
          const ok = await ensureRestaurantExists(kitchenCode)
          if (!ok) return
          if (user?.id) await upsertKitchenUser(user.id, kitchenCode)
        } catch {}
        await saveSheets(newSheets, kitchenCode)
        console.log('💾 Sheets salvos no Supabase com sucesso');
        try { localStorage.removeItem('pending_import_payload') } catch {}
      }
    } catch (error) {
      console.error('❌ Erro ao salvar sheets:', error);
      toast({ title: 'Erro ao salvar', description: 'Falha ao persistir dados.', variant: 'destructive' });
    } finally {
      // Mantém flag true por mais um tempo para evitar race com realtime tardio
      setTimeout(() => { isSavingRef.current = false }, 2000);
    }
  }, [kitchenCode]);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem('pending_import_payload')
        if (!raw) return
        const parsed = JSON.parse(raw)
        const kc = parsed?.kitchenCode || null
        const sheetsPayload = parsed?.sheets || []
        if (!sheetsPayload || sheetsPayload.length === 0) return
        if (kc && String(kc) !== String(kitchenCode || '')) return
        isSavingRef.current = true
        setSheets(sheetsPayload)
        setActiveSheetIndex(0)
        try {
          await saveSheets(sheetsPayload, kitchenCode || undefined)
          localStorage.removeItem('pending_import_payload')
        } catch {}
        setTimeout(() => { isSavingRef.current = false }, 2000)
      } catch {}
    })()
  }, [kitchenCode])

  const defaultChecklistCategories = useCallback((): ChecklistCategory[] => ([
    {
      name: 'Entradas',
      items: [
        { id: 'entradas-pre-mise', label: 'Pré-preparo: separar mise da praça', checked: false },
        { id: 'entradas-pre-ingredientes', label: 'Pré-preparo: porcionar ingredientes', checked: false },
        { id: 'entradas-mont-utensilios', label: 'Montagem: dispor utensílios', checked: false },
        { id: 'entradas-mont-estacao', label: 'Montagem: organizar estação', checked: false },
      ]
    },
    {
      name: 'Principais',
      items: [
        { id: 'principais-pre-mise', label: 'Pré-preparo: separar mise da praça', checked: false },
        { id: 'principais-pre-ingredientes', label: 'Pré-preparo: porcionar ingredientes', checked: false },
        { id: 'principais-mont-utensilios', label: 'Montagem: dispor utensílios', checked: false },
        { id: 'principais-mont-estacao', label: 'Montagem: organizar estação', checked: false },
      ]
    },
    {
      name: 'Sobremesas',
      items: [
        { id: 'sobremesas-pre-mise', label: 'Pré-preparo: separar mise da praça', checked: false },
        { id: 'sobremesas-pre-ingredientes', label: 'Pré-preparo: porcionar ingredientes', checked: false },
        { id: 'sobremesas-mont-utensilios', label: 'Montagem: dispor utensílios', checked: false },
        { id: 'sobremesas-mont-estacao', label: 'Montagem: organizar estação', checked: false },
      ]
    },
    {
      name: 'Limpeza',
      items: [
        { id: 'limpeza-bancadas', label: 'Higienizar bancadas', checked: false },
        { id: 'limpeza-pias', label: 'Limpar pias', checked: false },
        { id: 'limpeza-chao', label: 'Lavar chão', checked: false },
      ]
    },
  ]), [])

  const weeklyTasksForDate = useCallback((dateIso: string) => {
    const [y,m,d] = dateIso.split('-').map(Number)
    const base = new Date(y, (m || 1) - 1, d || 1)
    const weekdayName = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).format(base).toLowerCase()
    const map: Record<string, number> = {
      'dom.': 0, 'domingo': 0,
      'seg.': 1, 'segunda': 1,
      'ter.': 2, 'terça': 2,
      'qua.': 3, 'quarta': 3,
      'qui.': 4, 'quinta': 4,
      'sex.': 5, 'sexta': 5,
      'sáb.': 6, 'sábado': 6
    }
    const weekday = map[weekdayName] ?? base.getDay()
    const tasks = weeklyRules.filter(r => r.weekday === weekday)
    return tasks
  }, [weeklyRules])

  const getChecklistForDate = useCallback((date: string): DailyChecklist => {
    const idx = dailyChecklists.findIndex(c => c.date === date)
    if (idx !== -1) return dailyChecklists[idx]
    const created: DailyChecklist = { date, categories: defaultChecklistCategories() }
    const weekly = weeklyTasksForDate(date)
    weekly.forEach(r => {
      const cat = created.categories.find(c => c.name === r.category)
      if (!cat) return
      const slug = r.label.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
      const prefix = r.category.toLowerCase() === 'limpeza' ? 'limpeza-semanal' : `${r.category.toLowerCase()}-${r.section || 'pre'}`
      const id = `${prefix}-${r.weekday}-${slug}`
      if (!cat.items.some(i => i.id === id)) {
        const label = r.category.toLowerCase() === 'limpeza' ? r.label : (r.section === 'mont' ? `Montagem: ${r.label}` : `Pré-preparo: ${r.label}`)
        cat.items.push({ id, label, checked: false })
      }
    })
    setDailyChecklists(prev => [created, ...prev])
    return created
  }, [dailyChecklists, defaultChecklistCategories, weeklyTasksForDate])

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
      if (checked) {
        it.completedBy = (user?.email as string) || 'local'
        it.completedAt = new Date().toISOString()
      } else {
        it.completedBy = undefined
        it.completedAt = undefined
      }
      upsertDailyChecklist(target as DailyChecklist, kitchenCode || undefined).catch(() => {})
      return next
    })
  }, [defaultChecklistCategories, user?.email])

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
      const base = { date, categories: defaultChecklistCategories() }
      const weekly = weeklyTasksForDate(date)
      weekly.forEach(r => {
        const cat = base.categories.find(c => c.name === r.category)
        if (!cat) return
        const slug = r.label.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
        const prefix = r.category.toLowerCase() === 'limpeza' ? 'limpeza-semanal' : `${r.category.toLowerCase()}-${r.section || 'pre'}`
        const id = `${prefix}-${r.weekday}-${slug}`
        if (!cat.items.some(i => i.id === id)) {
          const label = r.category.toLowerCase() === 'limpeza' ? r.label : (r.section === 'mont' ? `Montagem: ${r.label}` : `Pré-preparo: ${r.label}`)
          cat.items.push({ id, label, checked: false })
        }
      })
      const idx = next.findIndex(c => c.date === date)
      if (idx !== -1) next[idx] = base
      else next.unshift(base)
      const target = next.find(c => c.date === date) as DailyChecklist
      if (target) upsertDailyChecklist(target, kitchenCode || undefined).catch(() => {})
      return next
    })
  }, [defaultChecklistCategories, weeklyTasksForDate])

  const addChecklistItem = useCallback((date: string, areaName: string, section: 'pre' | 'mont', label: string) => {
    setDailyChecklists(prev => {
      const next = [...prev]
      const idx = next.findIndex(c => c.date === date)
      const target = idx !== -1 ? next[idx] : { date, categories: defaultChecklistCategories() }
      if (idx === -1) next.unshift(target as DailyChecklist)
      const cat = target.categories.find(c => c.name === areaName)
      if (!cat) return next
      const id = `${areaName.toLowerCase()}-${section}-${Date.now().toString(36)}`
      cat.items.push({ id, label, checked: false })
      upsertDailyChecklist(target as DailyChecklist, kitchenCode || undefined).catch(() => {})
      return next
    })
  }, [defaultChecklistCategories])

  const addChecklistItemsBulk = useCallback((date: string, areaName: string, section: 'pre' | 'mont', raw: string) => {
    const parts = raw.split(/[,;\n]/).map(s => s.trim()).filter(s => s.length > 0)
    if (parts.length === 0) return
    setDailyChecklists(prev => {
      const next = [...prev]
      const idx = next.findIndex(c => c.date === date)
      const target = idx !== -1 ? next[idx] : { date, categories: defaultChecklistCategories() }
      if (idx === -1) next.unshift(target as DailyChecklist)
      const cat = target.categories.find(c => c.name === areaName)
      if (!cat) return next
      parts.forEach(lbl0 => {
        let lbl = lbl0
        let sec = section
        const lower = lbl0.toLowerCase()
        if (lower.startsWith('pre:') || lower.startsWith('pré:')) { sec = 'pre'; lbl = lbl0.replace(/^pre:\s*|^pré:\s*/i,'').trim() }
        else if (lower.startsWith('mont:') || lower.startsWith('montagem:')) { sec = 'mont'; lbl = lbl0.replace(/^mont:\s*|^montagem:\s*/i,'').trim() }
        const base = areaName.toLowerCase()
        const id = `${base}-${sec}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`
        cat.items.push({ id, label: lbl, checked: false })
      })
      upsertDailyChecklist(target as DailyChecklist, kitchenCode || undefined).catch(() => {})
      return next
    })
  }, [defaultChecklistCategories])

  const updateChecklistItem = useCallback((date: string, areaName: string, itemId: string, newLabel: string) => {
    setDailyChecklists(prev => {
      const next = [...prev]
      const idx = next.findIndex(c => c.date === date)
      const target = idx !== -1 ? next[idx] : { date, categories: defaultChecklistCategories() }
      if (idx === -1) next.unshift(target as DailyChecklist)
      const cat = target.categories.find(c => c.name === areaName)
      if (!cat) return next
      const it = cat.items.find(i => i.id === itemId)
      if (!it) return next
      it.label = newLabel
      upsertDailyChecklist(target as DailyChecklist, kitchenCode || undefined).catch(() => {})
      return next
    })
  }, [defaultChecklistCategories])

  const deleteChecklistItem = useCallback((date: string, areaName: string, itemId: string) => {
    setDailyChecklists(prev => {
      const next = [...prev]
      const idx = next.findIndex(c => c.date === date)
      const target = idx !== -1 ? next[idx] : { date, categories: defaultChecklistCategories() }
      if (idx === -1) next.unshift(target as DailyChecklist)
      const cat = target.categories.find(c => c.name === areaName)
      if (!cat) return next
      cat.items = cat.items.filter(i => i.id !== itemId)
      upsertDailyChecklist(target as DailyChecklist, kitchenCode || undefined).catch(() => {})
      return next
    })
  }, [defaultChecklistCategories])

  const addChecklistCategory = useCallback((date: string, name: string) => {
    setDailyChecklists(prev => {
      const next = [...prev]
      const idx = next.findIndex(c => c.date === date)
      const target = idx !== -1 ? next[idx] : { date, categories: defaultChecklistCategories() }
      if (idx === -1) next.unshift(target as DailyChecklist)
      const exists = target.categories.some(c => c.name.toLowerCase() === name.toLowerCase())
      if (!exists) {
        target.categories.push({ name, items: [] })
        upsertDailyChecklist(target as DailyChecklist, kitchenCode || undefined).catch(() => {})
      }
      return next
    })
  }, [defaultChecklistCategories])

  const addWeeklyRule = useCallback((weekday: number, category: string, section: 'pre' | 'mont' | undefined, label: string) => {
    const rule = { weekday, category, section, label }
    upsertWeeklyRule(rule, kitchenCode || undefined).catch(() => {})
  }, [kitchenCode])

  const deleteWeeklyRuleHook = useCallback((id: string) => {
    deleteWeeklyRule(id, kitchenCode || undefined).catch(() => {})
  }, [kitchenCode])

  const getDailyInventory = useCallback((plaza: string, date: string): { date: string; plaza: string; items: Array<{ name: string; quantity: number }> } | null => {
    const found = dailyInventories.find(di => di.plaza === plaza && di.date === date)
    return found || null
  }, [dailyInventories])

  const upsertDailyInventoryHook = useCallback((plaza: string, date: string, items: Array<{ name: string; quantity: number }>) => {
    upsertDailyInventory({ date, plaza, items }, kitchenCode || undefined).catch(() => {})
  }, [kitchenCode])

  const getLatestInventory = useCallback((plaza: string): { date: string; plaza: string; items: Array<{ name: string; quantity: number }> } | null => {
    const list = dailyInventories.filter(di => di.plaza === plaza)
    if (list.length === 0) return null
    const sorted = [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    return sorted[0]
  }, [dailyInventories])

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
    const newRecipe = { ...recipe, id: Date.now().toString(), active: true }
    upsertRecipe(newRecipe, kitchenCode || undefined).catch(() => {})
  }, [kitchenCode]);

  const updateRecipe = useCallback((id: string, patch: Partial<Recipe>) => {
    setRecipes(prev => {
      const found = prev.find(r => r.id === id)
      if (found) {
        const updated = { ...found, ...patch }
        upsertRecipe(updated, kitchenCode || undefined).catch(() => {})
      }
      return prev // Optimistic updates handled by subscription or next fetch, but can be added here
    })
  }, [kitchenCode])

  const duplicateRecipe = useCallback((id: string, newName?: string) => {
    setRecipes(prev => {
      const src = prev.find(r => r.id === id)
      if (!src) return prev
      const copy: Recipe = { ...src, id: Date.now().toString(), name: newName || `${src.name} (cópia)` }
      upsertRecipe(copy, kitchenCode || undefined).catch(() => {})
      return prev
    })
  }, [kitchenCode])

  const deleteRecipeHook = useCallback((id: string) => {
    deleteRecipe(id, kitchenCode || undefined).catch(() => {})
  }, [kitchenCode])
  
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
        item.updatedBy = selectedResponsible || user?.email || 'Usuário';
        
        // Add to update log
        const log: UpdateLog = {
          item: item.name,
          quantidadeAlterada: operation === 'add' ? quantity : item.quantity - oldQuantity,
          novaQuantidade: item.quantity,
          usuario: selectedResponsible || user?.email || 'Usuário',
          dataHora: new Date().toISOString(),
          // Manter compatibilidade
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          itemName: item.name,
          change: operation === 'add' ? quantity : item.quantity - oldQuantity,
          timestamp: new Date(),
          updatedBy: selectedResponsible || user?.email || 'Usuário',
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
          updatedBy: selectedResponsible || user?.email || 'Usuário'
        };
        
        activeSheet.items.push(newItem);
        
        const log: UpdateLog = {
          item: itemName,
          quantidadeAlterada: quantity,
          novaQuantidade: quantity,
          usuario: selectedResponsible || user?.email || 'Usuário',
          dataHora: new Date().toISOString(),
          // Manter compatibilidade
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          itemName: itemName,
          change: quantity,
          timestamp: new Date(),
          updatedBy: selectedResponsible || user?.email || 'Usuário',
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
  }, [activeSheetIndex, kitchenCode, user?.email, scheduleSync]);

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
  }, [kitchenCode, user?.email, scheduleSync]);

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
      item.updatedBy = selectedResponsible || user?.email || 'Usuário';
      const log: UpdateLog = {
        item: item.name,
        quantidadeAlterada: undoEntry.previousQuantity - (item.quantity),
        novaQuantidade: item.quantity,
        usuario: selectedResponsible || user?.email || 'Usuário',
        dataHora: new Date().toISOString(),
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        itemName: item.name,
        change: undoEntry.previousQuantity - (item.quantity),
        timestamp: new Date(),
        updatedBy: selectedResponsible || user?.email || 'Usuário',
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
  }, [undoEntry, activeSheetIndex, kitchenCode, scheduleSync, selectedResponsible, user?.email]);

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
            item.updatedBy = selectedResponsible || user?.email || 'Usuário';
            const log: UpdateLog = {
              item: item.name,
              quantidadeAlterada: counted - oldQuantity,
              novaQuantidade: item.quantity,
              usuario: selectedResponsible || user?.email || 'Usuário',
              dataHora: new Date().toISOString(),
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              itemName: item.name,
              change: counted - oldQuantity,
              timestamp: new Date(),
              updatedBy: selectedResponsible || user?.email || 'Usuário',
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
            updatedBy: selectedResponsible || user?.email || 'Usuário'
            };
            sheet.items.push(newItem);
            const log: UpdateLog = {
              item: name,
              quantidadeAlterada: counted,
              novaQuantidade: counted,
              usuario: selectedResponsible || user?.email || 'Usuário',
              dataHora: new Date().toISOString(),
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              itemName: name,
              change: counted,
              timestamp: new Date(),
              updatedBy: selectedResponsible || user?.email || 'Usuário',
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
        item.updatedBy = selectedResponsible || user?.email || 'Usuário';
        if (typeof minimum === 'number') item.minimum = minimum;
        if (typeof unitCost === 'number') item.unitCost = unitCost;
        const log: UpdateLog = {
          item: item.name,
          quantidadeAlterada: op === 'add' ? qty : item.quantity - oldQuantity,
          novaQuantidade: item.quantity,
          usuario: selectedResponsible || user?.email || 'Usuário',
          dataHora: new Date().toISOString(),
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          itemName: item.name,
          change: op === 'add' ? qty : item.quantity - oldQuantity,
          timestamp: new Date(),
          updatedBy: selectedResponsible || user?.email || 'Usuário',
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
          usuario: selectedResponsible || user?.email || 'Usuário',
          dataHora: new Date().toISOString(),
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          itemName: itemName,
          change: qty,
          timestamp: new Date(),
          updatedBy: selectedResponsible || user?.email || 'Usuário',
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
      if (ing.isSubRecipe && ing.recipeId) {
        const sub = recipes.find(r => r.id === ing.recipeId || r.name === ing.itemName);
        if (sub && sub.yield > 0) {
          const subFactor = (ing.quantity * factor) / sub.yield;
          sub.ingredients.forEach(sing => {
            const qty = sing.quantity * subFactor;
            mutateItem(sing.itemName, qty, 'saida', 'Produção');
          });
        }
      } else {
        const qty = ing.quantity * factor;
        mutateItem(ing.itemName, qty, 'saida', 'Produção');
      }
    });
  }, [recipes, mutateItem]);
  const addPurchase = useCallback((purchase: Purchase) => {
    upsertPurchase(purchase, kitchenCode || undefined).catch(() => {})
  }, [kitchenCode]);

  const updatePurchaseStatus = useCallback((id: string, status: 'received' | 'cancelled') => {
    setPurchases(prev => {
      const found = prev.find(p => p.id === id)
      if (found) {
        const updated = { ...found, status }
        upsertPurchase(updated, kitchenCode || undefined).catch(() => {})
        
        if (status === 'received') {
          updated.items.forEach((item: any) => {
            updateItemInAllSheets(item.name, item.quantity, 'add');
          });
        }
      }
      return prev
    })
  }, [kitchenCode, updateItemInAllSheets])

  useEffect(() => {
    const id = window.setInterval(async () => {
      // Se não houver kitchenCode ou sheets estiver vazio (após limpar), não puxa dados automaticamente para evitar re-popular com cache antigo ou dados deletados recentemente
      try {
        if (!kitchenCode) return;
        // Comentei a lógica de sync periódico reverso que estava causando o problema de "zumbis" voltando
        // O Realtime já deve cuidar das atualizações. O sync periódico aqui estava pegando dados antigos.
        
        /*
        const remote = await fetchSheetsWithItems(kitchenCode);
        if (!remote || remote.length === 0) return;
        const merged = mergeSheets(remote, sheets);
        setSheets(merged);
        */
      } catch {}
    }, 15000);
    return () => window.clearInterval(id);
  }, [kitchenCode, sheets]);

  useEffect(() => {
    if (!kitchenCode) return;
    const sub = subscribeItemsRealtime(kitchenCode, (payload) => {
      try {
        const { eventType, new: newRow, old: oldRow } = payload
        
        setSheets(prev => {
          // Deep copy das sheets e items para evitar mutação direta do state
          const next = prev.map(s => ({ ...s, items: [...s.items] }))

          // Helper para mapear row -> item
          const mapRowToItem = (row: any, sheetName: string, existingItem?: InventoryItem): InventoryItem => ({
            id: String(row.item_id),
            name: String(row.name),
            quantity: Number(row.quantity) || 0,
            unit: row.unit || 'un',
            category: row.category || sheetName,
            lastUpdated: row.last_updated ? new Date(row.last_updated) : new Date(),
            updatedBy: row.updated_by || 'Usuário',
            unitCost: existingItem?.unitCost // Preserva custo unitário se não vier do banco
          })

          // DELETE
          if (eventType === 'DELETE' && oldRow) {
            const sheetIdx = next.findIndex(s => s.name === oldRow.sheet_name)
            if (sheetIdx !== -1) {
              next[sheetIdx].items = next[sheetIdx].items.filter(i => i.id !== String(oldRow.item_id))
            }
            return next
          }

          // INSERT
          if (eventType === 'INSERT' && newRow) {
            const sheetIdx = next.findIndex(s => s.name === newRow.sheet_name)
            // Se a aba não existe localmente, não fazemos nada (ou poderíamos criar, mas o padrão é sync de sheets separada)
            if (sheetIdx !== -1) {
              const sheet = next[sheetIdx]
              const exists = sheet.items.some(i => i.id === String(newRow.item_id))
              if (!exists) {
                sheet.items.push(mapRowToItem(newRow, sheet.name))
              }
            }
            return next
          }

          // UPDATE
          if (eventType === 'UPDATE' && newRow) {
            const oldSheetName = oldRow?.sheet_name || newRow.sheet_name
            
            // Se mudou de aba
            if (oldRow && newRow.sheet_name !== oldSheetName) {
              // Remove da velha
              const oldSheetIdx = next.findIndex(s => s.name === oldSheetName)
              if (oldSheetIdx !== -1) {
                next[oldSheetIdx].items = next[oldSheetIdx].items.filter(i => i.id !== String(oldRow.item_id))
              }
              // Adiciona na nova
              const newSheetIdx = next.findIndex(s => s.name === newRow.sheet_name)
              if (newSheetIdx !== -1) {
                next[newSheetIdx].items.push(mapRowToItem(newRow, newRow.sheet_name))
              }
            } else {
              // Mesma aba
              const sheetIdx = next.findIndex(s => s.name === newRow.sheet_name)
              if (sheetIdx !== -1) {
                const sheet = next[sheetIdx]
                const idx = sheet.items.findIndex(i => i.id === String(newRow.item_id))
                const updated = mapRowToItem(newRow, sheet.name, idx !== -1 ? sheet.items[idx] : undefined)
                
                if (idx !== -1) {
                  sheet.items[idx] = updated
                } else {
                  sheet.items.push(updated)
                }
              }
            }
            return next
          }

          return next
        })
      } catch (e) { console.error('Realtime error:', e) }
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
  
  const dailyItems = useMemo(() => {
    if (!selectedDailyPlaza) return [] as InventoryItem[]
    const names = new Set<string>()
    const lowerPlaza = selectedDailyPlaza.toLowerCase()
    const recipePool = recipes.filter(r => (r.category || '').toLowerCase().includes(lowerPlaza) && ((r.active ?? true) === true))
    const selectedPool = selectedDailyRecipeIds.length > 0 ? recipePool.filter(r => selectedDailyRecipeIds.includes(r.id)) : recipePool
    selectedPool.forEach(r => r.ingredients.forEach(ing => names.add(ing.itemName)))
    if (names.size === 0) {
      const d = new Date(); d.setDate(d.getDate() - 1)
      const prev = dailyInventories.find(di => di.plaza === selectedDailyPlaza && di.date === d.toISOString().slice(0,10))
      const prevItems = prev?.items || []
      prevItems.forEach(i => names.add(i.name))
    }
    const allItems = sheets.flatMap(s => s.items)
    const byName = new Map<string, InventoryItem>()
    allItems.forEach(i => { const k = i.name.toLowerCase(); if (!byName.has(k)) byName.set(k, i) })
    return Array.from(names).map(n => {
      const found = byName.get(n.toLowerCase())
      return found ? found : { id: n, name: n, quantity: 0, unit: 'un', category: selectedDailyPlaza || undefined }
    })
  }, [selectedDailyPlaza, recipes, sheets, dailyInventories, selectedDailyRecipeIds])
  
  const clearAllData = useCallback(async () => {
    try {
      const code = kitchenCode || (user?.id ? await fetchKitchenCodeForUser(user.id) : undefined)
      if (!code) {
        toast({ title: 'Erro', description: 'Cozinha não identificada para limpeza.', variant: 'destructive' })
        return
      }
      await clearInventory(code)
      setSheets([])
      toast({ title: 'Inventário limpo', description: 'Todos os itens foram removidos.' })
    } catch (error) {
      const description = (error as any)?.message || 'Falha ao limpar inventário.'
      toast({ title: 'Erro', description, variant: 'destructive' })
    }
  }, [kitchenCode, user?.id])

  return {
    sheets,
    activeSheetIndex,
    setActiveSheetIndex,
    selectedResponsible,
    setSelectedResponsible,
    selectedDailyPlaza,
    setSelectedDailyPlaza,
    selectedDailyRecipeIds,
    setSelectedDailyRecipeIds,
    dailyInventories,
    getDailyInventory,
    getLatestInventory,
    upsertDailyInventory,
    updateLogs,
    searchQuery,
    setSearchQuery,
    filteredItems,
    dailyItems,
    loadSheets,
    updateItem,
    updateItemInAllSheets,
    mutateItem,
    adjustByInventory,
    kitchenCode,
    setKitchenCode,
    undoLastChange,
    dailyChecklists,
    toggleChecklistItem,
    getChecklistForDate,
    setChecklistCategoryAll,
    resetChecklist,
    addChecklistItem,
    addChecklistItemsBulk,
    updateChecklistItem,
    deleteChecklistItem,
    addChecklistCategory,
    weeklyRules,
    addWeeklyRule,
    deleteWeeklyRule,
    utensils,
    addUtensil,
    updateUtensilStatus,
    recipes,
    addRecipe,
    updateRecipe,
    duplicateRecipe,
    deleteRecipe,
    registerProduction,
    purchases,
    addPurchase,
    clearAllData,
  };
};
