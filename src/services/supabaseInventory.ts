import { supabase } from '@/config/supabase'
import { Sheet, InventoryItem, UpdateLog, Utensil, DailyChecklist } from '@/types/inventory'

export async function saveSheets(sheets: Sheet[], kitchenCode?: string): Promise<void> {
  if (!supabase) return
  const sheetRows = sheets.map(s => ({ name: s.name, kitchen_code: kitchenCode }))
  try { await supabase.from('sheets').upsert(sheetRows, { onConflict: 'name,kitchen_code' }) } catch {}
  const itemRows = sheets.flatMap(s => s.items.map(i => ({
    sheet_name: s.name,
    item_id: i.id,
    name: i.name,
    quantity: i.quantity,
    unit: i.unit || 'un',
    category: i.category || s.name,
    last_updated: i.lastUpdated ? new Date(i.lastUpdated).toISOString() : null,
    updated_by: i.updatedBy || 'Usuário',
    kitchen_code: kitchenCode
  })))
  if (itemRows.length > 0) {
    try { await supabase.from('items').upsert(itemRows, { onConflict: 'item_id' }) } catch {}
  }
}

export async function upsertItem(sheetName: string, item: InventoryItem, kitchenCode?: string): Promise<void> {
  if (!supabase) return
  const row = {
    sheet_name: sheetName,
    item_id: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit || 'un',
    category: item.category || sheetName,
    last_updated: item.lastUpdated ? new Date(item.lastUpdated).toISOString() : new Date().toISOString(),
    updated_by: item.updatedBy || 'Usuário',
    kitchen_code: kitchenCode
  }
  try { await supabase.from('items').upsert(row, { onConflict: 'item_id' }) } catch {}
}

export async function insertLog(log: UpdateLog, kitchenCode?: string): Promise<void> {
  if (!supabase) return
  const row = {
    log_id: log.id || `${Date.now()}`,
    item_name: log.itemName || log.item,
    change: log.change ?? log.quantidadeAlterada,
    new_quantity: log.novaQuantidade,
    user: log.usuario || log.updatedBy || 'Usuário',
    timestamp: log.timestamp ? new Date(log.timestamp).toISOString() : log.dataHora,
    type: log.type || null,
    reason: (log as any).reason || null,
    kitchen_code: kitchenCode
  }
  try { await supabase.from('update_logs').insert(row) } catch {}
}

export async function fetchSheetsWithItems(kitchenCode?: string): Promise<Sheet[]> {
  if (!supabase) return []
  const sheetsQuery = supabase.from('sheets').select('name')
  const itemsQuery = supabase.from('items').select('*')
  const { data: sheetsData } = kitchenCode ? await sheetsQuery.eq('kitchen_code', kitchenCode) : await sheetsQuery
  const { data: itemsData } = kitchenCode ? await itemsQuery.eq('kitchen_code', kitchenCode) : await itemsQuery
  const names = (sheetsData || []).map(s => s.name as string)
  const grouped: Record<string, InventoryItem[]> = {};
  (itemsData || []).forEach((row: any) => {
    const sheetName = row.sheet_name as string
    const item: InventoryItem = {
      id: String(row.item_id),
      name: String(row.name),
      quantity: Number(row.quantity) || 0,
      unit: row.unit ? String(row.unit) : 'un',
      category: row.category ? String(row.category) : sheetName,
      lastUpdated: row.last_updated ? new Date(row.last_updated) : new Date(),
      updatedBy: row.updated_by ? String(row.updated_by) : 'Usuário'
    }
    if (!grouped[sheetName]) grouped[sheetName] = []
    grouped[sheetName].push(item)
  })
  const allSheetNames = new Set<string>([...names, ...Object.keys(grouped)])
  return Array.from(allSheetNames).map(name => ({
    name,
    items: grouped[name] || []
  }))
}

export function subscribeItemsRealtime(kitchenCode: string, onChange: (payload: any) => void) {
  if (!supabase) return { unsubscribe: () => {} }
  const channel = supabase.channel('items-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `kitchen_code=eq.${kitchenCode}` }, (payload) => {
      onChange(payload)
    })
    .subscribe()
  return {
    unsubscribe: () => { try { supabase.removeChannel(channel) } catch {} }
  }
}

export async function upsertUtensil(utensil: Utensil, kitchenCode?: string): Promise<void> {
  if (!supabase) return
  const row = {
    id: utensil.id,
    name: utensil.name,
    category: utensil.category,
    status: utensil.status,
    notes: utensil.notes || null,
    kitchen_code: kitchenCode
  }
  try { await supabase.from('utensils').upsert(row, { onConflict: 'id' }) } catch {}
}

export async function fetchUtensils(kitchenCode?: string): Promise<Utensil[]> {
  if (!supabase) return []
  const query = supabase.from('utensils').select('*')
  const { data } = kitchenCode ? await query.eq('kitchen_code', kitchenCode) : await query
  return (data || []).map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    category: String(row.category || 'geral'),
    status: String(row.status) as Utensil['status'],
    notes: row.notes ? String(row.notes) : undefined,
  }))
}

export function subscribeUtensilsRealtime(kitchenCode: string, onChange: (payload: any) => void) {
  if (!supabase) return { unsubscribe: () => {} }
  const channel = supabase.channel('utensils-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'utensils', filter: `kitchen_code=eq.${kitchenCode}` }, (payload) => {
      onChange(payload)
    })
    .subscribe()
  return { unsubscribe: () => { try { supabase.removeChannel(channel) } catch {} } }
}

export async function upsertDailyChecklist(checklist: DailyChecklist, kitchenCode?: string): Promise<void> {
  if (!supabase) return
  const row = {
    date: checklist.date,
    categories: checklist.categories as any,
    kitchen_code: kitchenCode
  }
  try { await supabase.from('daily_checklists').upsert(row, { onConflict: 'date,kitchen_code' }) } catch {}
}

export async function fetchDailyChecklists(kitchenCode?: string): Promise<DailyChecklist[]> {
  if (!supabase) return []
  const query = supabase.from('daily_checklists').select('*')
  const { data } = kitchenCode ? await query.eq('kitchen_code', kitchenCode) : await query
  return (data || []).map((row: any) => ({
    date: String(row.date),
    categories: (row.categories || []) as any
  }))
}

export function subscribeChecklistsRealtime(kitchenCode: string, onChange: (payload: any) => void) {
  if (!supabase) return { unsubscribe: () => {} }
  const channel = supabase.channel('daily-checklists-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_checklists', filter: `kitchen_code=eq.${kitchenCode}` }, (payload) => {
      onChange(payload)
    })
    .subscribe()
  return { unsubscribe: () => { try { supabase.removeChannel(channel) } catch {} } }
}

export async function upsertKitchenUser(userId: string, kitchenCode: string): Promise<void> {
  if (!supabase) return
  try { await supabase.from('kitchens_users').upsert({ user_id: userId, kitchen_code: kitchenCode }) } catch {}
}

export async function fetchKitchenCodeForUser(userId: string): Promise<string | null> {
  if (!supabase) return null
  try {
    const { data } = await supabase.from('kitchens_users').select('kitchen_code').eq('user_id', userId).limit(1)
    const row = (data || [])[0]
    return row ? String(row.kitchen_code) : null
  } catch {
    return null
  }
}

export async function fetchUserRole(userId: string): Promise<string | null> {
  if (!supabase) return null
  try {
    const { data } = await supabase.from('profiles').select('role').eq('user_id', userId).limit(1)
    const row = (data || [])[0]
    return row ? String(row.role) : null
  } catch {
    return null
  }
}

export async function upsertUserProfile(userId: string, role: string): Promise<void> {
  if (!supabase) return
  try { await supabase.from('profiles').upsert({ user_id: userId, role }, { onConflict: 'user_id' }) } catch {}
}
