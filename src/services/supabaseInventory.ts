import { supabase } from '@/config/supabase'
import { Sheet, InventoryItem, UpdateLog, Utensil, DailyChecklist, Recipe, RecipeIngredient } from '@/types/inventory'

type UpdateLogRow = {
  log_id: string
  item_name: string
  change: number
  new_quantity: number
  updated_by: string
  timestamp: string
  type?: string | null
  reason?: string | null
}

type ItemRow = {
  sheet_name: string
  item_id: string
  name: string
  quantity: number
  unit?: string | null
  category?: string | null
  last_updated?: string | null
  updated_by?: string | null
}

type UtensilRow = {
  id: string
  name: string
  category?: string | null
  status: string
  notes?: string | null
}

type DailyChecklistRow = {
  date: string
  categories: DailyChecklist['categories']
}

type WeeklyRuleRow = {
  id: string
  weekday: number
  category: string
  section?: string | null
  label: string
}

type DailyInventoryRow = {
  date: string
  plaza: string
  items: Array<{ name: string; quantity: number }>
}

type RecipeRow = {
  id: string
  name: string
  yield: number
  category?: string | null
  ingredients: RecipeIngredient[]
  cost?: number | null
  price?: number | null
  active?: boolean | null
}

export async function clearInventory(kitchenCode: string): Promise<void> {
  if (!supabase) return
  try {
    const { error: errorItems } = await supabase.from('items').delete().eq('kitchen_code', kitchenCode)
    if (errorItems) throw errorItems
    const { error: errorSheets } = await supabase.from('sheets').delete().eq('kitchen_code', kitchenCode)
    if (errorSheets) throw errorSheets
    const { error: errorLogs } = await supabase.from('update_logs').delete().eq('kitchen_code', kitchenCode)
    if (errorLogs) throw errorLogs
  } catch (error) {
    console.error('Error clearing inventory:', error)
    throw error
  }
}

export async function saveSheets(sheets: Sheet[], kitchenCode?: string): Promise<void> {
  if (!supabase) return

  try {
    console.log(`[SaveSheets] Iniciando persistência para ${sheets.length} abas.`)

    // 1. Garantir que as planilhas (sheets) existam
    const sheetNames = sheets.map(s => s.name)
    const { data: existingSheets } = await supabase
      .from('sheets')
      .select('name')
      .eq('kitchen_code', kitchenCode)
      .in('name', sheetNames)
    
    const existingSet = new Set(existingSheets?.map(s => s.name) || [])
    const newSheets = sheetNames.filter(name => !existingSet.has(name))

    if (newSheets.length > 0) {
      const sheetRows = newSheets.map(name => ({ name, kitchen_code: kitchenCode }))
      const { error } = await supabase.from('sheets').upsert(sheetRows, { onConflict: 'name,kitchen_code' })
      if (error) console.error('[SaveSheets] Error upserting sheets:', error)
      else console.log(`[SaveSheets] Criadas/confirmadas ${newSheets.length} abas.`)
    }

    // 2. Atualizar itens (Estratégia: Delete + Insert por aba para evitar erro de constraint ausente)
    // Isso contorna o erro 400 se a constraint unique(item_id, kitchen_code) não existir
    for (const sheet of sheets) {
      console.log(`[SaveSheets] Processando aba "${sheet.name}" com ${sheet.items.length} itens.`)

      // Só apaga se tiver itens para substituir. Se o parser retornou vazio, não faz nada para evitar apagar dados por engano.
      if (sheet.items.length === 0) {
        console.warn(`[SaveSheets] ⚠️ Ignorando salvamento da aba vazia: ${sheet.name}`)
        continue
      }

      // Remove itens antigos desta aba
      const { error: deleteError, count: deletedCount } = await supabase.from('items')
        .delete({ count: 'exact' })
        .eq('kitchen_code', kitchenCode)
        .eq('sheet_name', sheet.name)
      
      if (deleteError) console.error(`[SaveSheets] Erro ao deletar itens da aba ${sheet.name}:`, deleteError)
      else console.log(`[SaveSheets] Deletados ${deletedCount} itens antigos da aba ${sheet.name}`)

      const itemRows = sheet.items.map(i => ({
        sheet_name: sheet.name,
        item_id: i.id, // Nota: se o ID for baseado em index, cuidado com reordenação
        name: i.name,
        quantity: i.quantity,
        unit: i.unit || 'un',
        category: i.category || sheet.name,
        last_updated: i.lastUpdated ? new Date(i.lastUpdated).toISOString() : new Date().toISOString(),
        updated_by: i.updatedBy || 'Usuário',
        kitchen_code: kitchenCode
      }))

      if (itemRows.length > 0) {
        let insertedCount = 0
        // Inserir em lotes de 100 para evitar payload too large
        const chunkSize = 100
        for (let k = 0; k < itemRows.length; k += chunkSize) {
          const chunk = itemRows.slice(k, k + chunkSize)
          // Usar upsert em vez de insert para lidar com IDs duplicados dentro da mesma aba
          const { error } = await supabase.from('items').upsert(chunk, { onConflict: 'item_id,kitchen_code,sheet_name' })
          if (error) {
            console.error(`[SaveSheets] Error saving items chunk for ${sheet.name}:`, error)
            throw error
          } else {
            insertedCount += chunk.length
          }
        }
        console.log(`[SaveSheets] Inseridos/Atualizados ${insertedCount} itens na aba ${sheet.name}`)
        const { data: remoteItems } = await supabase
          .from('items')
          .select('*')
          .eq('kitchen_code', kitchenCode)
          .eq('sheet_name', sheet.name)
        const remoteCount = (remoteItems || []).length
        if (remoteCount !== insertedCount) {
          console.warn(`[SaveSheets] Divergência de contagem na aba ${sheet.name}: esperado ${insertedCount}, remoto ${remoteCount}`)
          const remoteIds = new Set<string>((remoteItems || []).map((r: ItemRow) => String(r.item_id)))
          const missing = itemRows.filter(r => !remoteIds.has(String(r.item_id)))
          if (missing.length > 0) {
            console.warn(`[SaveSheets] Regravação de ${missing.length} itens ausentes em ${sheet.name}`)
            for (const row of missing) {
              const { error: singleErr } = await supabase.from('items').upsert(row, { onConflict: 'item_id,kitchen_code,sheet_name' })
              if (singleErr) console.error(`[SaveSheets] Falha ao regravar item ${row.name} (${row.item_id}) em ${sheet.name}:`, singleErr)
            }
            const { count: finalCount } = await supabase
              .from('items')
              .select('item_id', { count: 'exact', head: true })
              .eq('kitchen_code', kitchenCode)
              .eq('sheet_name', sheet.name)
            console.log(`[SaveSheets] Contagem final em ${sheet.name}: ${finalCount ?? 'n/a'}`)
          }
        }
      }
    }
    console.log(`[SaveSheets] Persistência concluída.`)
  } catch (e) {
    console.error('Exception in saveSheets:', e)
    throw e
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
  try { await supabase.from('items').upsert(row, { onConflict: 'item_id,kitchen_code,sheet_name' }) } catch {}
}

export async function insertLog(log: UpdateLog, kitchenCode?: string): Promise<void> {
  if (!supabase) return
  const row = {
    log_id: log.id || `${Date.now()}`,
    item_name: log.itemName || log.item,
    change: log.change ?? log.quantidadeAlterada,
    new_quantity: log.novaQuantidade,
    updated_by: log.usuario || log.updatedBy || 'Usuário',
    timestamp: log.timestamp ? new Date(log.timestamp).toISOString() : log.dataHora,
    type: log.type || null,
    reason: log.reason ?? null,
    kitchen_code: kitchenCode
  }
  try { await supabase.from('update_logs').insert(row) } catch (e) { console.error('Error inserting log:', e) }
}

export async function fetchUpdateLogs(kitchenCode?: string): Promise<UpdateLog[]> {
  if (!supabase) return []
  const query = supabase.from('update_logs').select('*').order('timestamp', { ascending: false }).limit(50)
  const { data } = kitchenCode ? await query.eq('kitchen_code', kitchenCode) : await query
  return (data || []).map((row: UpdateLogRow) => ({
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
  }))
}

export function subscribeUpdateLogsRealtime(kitchenCode: string, onChange: (payload: unknown) => void) {
  if (!supabase) return { unsubscribe: () => {} }
  const channel = supabase.channel('update-logs-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'update_logs', filter: `kitchen_code=eq.${kitchenCode}` }, (payload) => {
      onChange(payload)
    })
    .subscribe()
  return { unsubscribe: () => { try { supabase.removeChannel(channel) } catch {} } }
}

export async function fetchSheetsWithItems(kitchenCode?: string): Promise<Sheet[]> {
  if (!supabase) return []
  const sheetsQuery = supabase.from('sheets').select('name')
  const { data: sheetsData } = kitchenCode ? await sheetsQuery.eq('kitchen_code', kitchenCode) : await sheetsQuery

  // Paginação robusta sem depender de count (continua enquanto vierem páginas cheias)
  const itemsData: ItemRow[] = []
  const chunkSize = 1000
  let start = 0
  while (true) {
    const end = start + chunkSize - 1
    const pageQuery = kitchenCode
      ? supabase.from('items').select('*').range(start, end).eq('kitchen_code', kitchenCode)
      : supabase.from('items').select('*').range(start, end)
    const { data: page } = await pageQuery
    const pageData = (page || []) as ItemRow[]
    itemsData.push(...pageData)
    if (pageData.length < chunkSize) break
    start += chunkSize
    // Proteção contra loop infinito
    if (start > 100000) break
  }
  const names = (sheetsData || []).map(s => s.name as string)
  const grouped: Record<string, InventoryItem[]> = {};
  (itemsData || []).forEach((row: ItemRow) => {
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

export function subscribeItemsRealtime(kitchenCode: string, onChange: (payload: unknown) => void) {
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
  try { await supabase.from('utensils').upsert(row, { onConflict: 'id,kitchen_code' }) } catch {}
}

export async function fetchUtensils(kitchenCode?: string): Promise<Utensil[]> {
  if (!supabase) return []
  const query = supabase.from('utensils').select('*')
  const { data } = kitchenCode ? await query.eq('kitchen_code', kitchenCode) : await query
  return (data || []).map((row: UtensilRow) => ({
    id: String(row.id),
    name: String(row.name),
    category: String(row.category || 'geral'),
    status: String(row.status) as Utensil['status'],
    notes: row.notes ? String(row.notes) : undefined,
  }))
}

export function subscribeUtensilsRealtime(kitchenCode: string, onChange: (payload: unknown) => void) {
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
    categories: checklist.categories as unknown,
    kitchen_code: kitchenCode
  }
  try { await supabase.from('daily_checklists').upsert(row, { onConflict: 'date,kitchen_code' }) } catch {}
}

export async function fetchDailyChecklists(kitchenCode?: string): Promise<DailyChecklist[]> {
  if (!supabase) return []
  const query = supabase.from('daily_checklists').select('*')
  const { data } = kitchenCode ? await query.eq('kitchen_code', kitchenCode) : await query
  return (data || []).map((row: DailyChecklistRow) => ({
    date: String(row.date),
    categories: (row.categories || []) as DailyChecklist['categories']
  }))
}

export function subscribeChecklistsRealtime(kitchenCode: string, onChange: (payload: unknown) => void) {
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
  try {
    // Usar upsert com ignoreDuplicates para evitar erro 409 se já existir
    await supabase.from('kitchens_users').upsert(
      { user_id: userId, kitchen_code: kitchenCode },
      { onConflict: 'user_id,kitchen_code', ignoreDuplicates: true }
    )
  } catch {}
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
    const { data, error } = await supabase.from('profiles').select('role').eq('user_id', userId).limit(1)
    if (error) {
      console.error('Error fetching user role:', error)
      return null
    }
    const row = (data || [])[0]
    return row ? String(row.role) : null
  } catch (err) {
    console.error('Exception fetching user role:', err)
    return null
  }
}

export async function upsertUserProfile(userId: string, role: string): Promise<void> {
  if (!supabase) return
  try { await supabase.from('profiles').upsert({ user_id: userId, role }, { onConflict: 'user_id' }) } catch {}
}

export async function fetchProfiles(): Promise<Array<{ user_id: string, role: string }>> {
  if (!supabase) return []
  try {
    const { data } = await supabase.from('profiles').select('user_id,role')
    return (data || []).map((r: { user_id: string; role?: string | null }) => ({ user_id: String(r.user_id), role: String(r.role || '') }))
  } catch {
    return []
  }
}

export async function setUserRole(userId: string, role: string): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('profiles').upsert({ user_id: userId, role }, { onConflict: 'user_id' })
    return !error
  } catch {
    return false
  }
}

export async function upsertRestaurant(name: string, kitchenCode: string, ownerUserId?: string, plan?: 'Free'|'Pro'|'Enterprise'): Promise<void> {
  if (!supabase) return
  
  // Tentar via RPC (Função Segura de Admin) primeiro para evitar problemas de RLS
  try {
    const { error } = await supabase.rpc('admin_create_restaurant', {
      p_name: name,
      p_kitchen_code: kitchenCode,
      p_owner_user_id: ownerUserId || null,
      p_plan: plan || 'Free'
    })
    if (!error) return // Sucesso
    console.warn('RPC admin_create_restaurant falhou, tentando método tradicional...', error)
  } catch (e) {
    console.warn('Erro ao chamar RPC:', e)
  }

  // Fallback: Método tradicional (caso a RPC não tenha sido criada ainda)
  const row: { name: string; kitchen_code: string; owner_user_id?: string; plan?: 'Free'|'Pro'|'Enterprise' } = { name, kitchen_code: kitchenCode }
  if (ownerUserId) row.owner_user_id = ownerUserId
  if (plan) row.plan = plan
  const { error } = await supabase.from('restaurants').upsert(row, { onConflict: 'kitchen_code' })
  if (error) throw error
}

export async function ensureRestaurantExists(kitchenCode: string, name?: string): Promise<boolean> {
  if (!supabase) return false
  try {
    const { data } = await supabase.from('restaurants').select('kitchen_code').eq('kitchen_code', kitchenCode).limit(1)
    if ((data || []).length > 0) return true
    const n = name || kitchenCode
    const { error } = await supabase.from('restaurants').upsert({ kitchen_code: kitchenCode, name: n }, { onConflict: 'kitchen_code' })
    return !error
  } catch {
    return false
  }
}

export async function fetchAdminStats(): Promise<{ activeRestaurants: number, inactiveOrBlockedRestaurants: number, totalUsers: number, updatedInventories24h: number }> {
  if (!supabase) return { activeRestaurants: 0, inactiveOrBlockedRestaurants: 0, totalUsers: 0, updatedInventories24h: 0 }
  let activeRestaurants = 0
  let inactiveOrBlockedRestaurants = 0
  let totalUsers = 0
  let updatedInventories24h = 0
  try {
    const { data: restaurants } = await supabase.from('restaurants').select('kitchen_code,active,status')
    const rows = restaurants || []
    activeRestaurants = rows.filter((r: { status?: string | null; active?: boolean | null }) => (r?.status !== 'blocked') && (r?.active !== false)).length
    inactiveOrBlockedRestaurants = rows.length - activeRestaurants
  } catch {}
  try {
    const { count } = await supabase.from('kitchens_users').select('user_id', { count: 'exact', head: true })
    totalUsers = Number(count || 0)
  } catch {}
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabase.from('daily_inventories').select('id', { count: 'exact', head: true }).gt('updated_at', since)
    updatedInventories24h = Number(count || 0)
  } catch {}
  return { activeRestaurants, inactiveOrBlockedRestaurants, totalUsers, updatedInventories24h }
}

export async function adminCreateUser(email: string, password: string, role: string, kitchenCode: string): Promise<string | null> {
  if (import.meta.env.VITE_ENABLE_ADMIN_API === 'true') {
    try {
      const response = await fetch('/api/admin/createUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, kitchenCode })
      })
      if (response.ok) {
        const json = await response.json()
        if (json.userId) return json.userId
      }
    } catch {}
  }

  // Fallback para client-side (pode falhar por sessão ou email confirm)
  if (!supabase?.auth) return null
  try {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return null
    const u = data.user
    if (!u?.id) return null
    try { 
      // Tentar inserir perfil, ignorando erro se já existir
      const { error: pError } = await supabase.from('profiles').upsert({ user_id: u.id, role }, { onConflict: 'user_id', ignoreDuplicates: true })
      if (pError) console.warn('Profile upsert warning:', pError)
    } catch {}
    try { 
      // Tentar inserir vínculo, ignorando erro se já existir (evita 409)
      const { error: kError } = await supabase.from('kitchens_users').upsert({ user_id: u.id, kitchen_code: kitchenCode, role }, { onConflict: 'user_id,kitchen_code', ignoreDuplicates: true })
      if (kError) console.warn('KitchenUser upsert warning:', kError)
    } catch {}
    return u.id
  } catch {
    return null
  }
}

export async function fetchTenantUsers(kitchenCode: string): Promise<Array<{ user_id: string; name: string; email: string; role: string }>> {
  if (!supabase) return []
  try {
    // Busca vínculos em kitchens_users
    const { data: links } = await supabase.from('kitchens_users').select('user_id,role').eq('kitchen_code', kitchenCode)
    if (!links || links.length === 0) return []

    const userIds = links.map((l: { user_id: string }) => l.user_id)
    
    // Busca perfis
    const { data: profiles } = await supabase.from('profiles').select('user_id,name,role').in('user_id', userIds)
    
    // Mapeia resultados combinando profile com role específico do tenant (se houver divergência, prioriza kitchens_users.role)
    return links.map((link: { user_id: string; role?: string | null }) => {
      const profile = (profiles || []).find((p: { user_id: string; name?: string | null; role?: string | null }) => p.user_id === link.user_id)
      return {
        user_id: link.user_id,
        name: profile?.name || 'Usuário sem nome',
        email: '—', // Email não está em profiles por padrão de segurança, mas owner pode saber se tiver endpoint admin
        role: String(link.role || profile?.role || 'funcionario')
      }
    })
  } catch {
    return []
  }
}

export async function removeUserFromTenant(userId: string, kitchenCode: string): Promise<void> {
  if (!supabase) return
  try { await supabase.from('kitchens_users').delete().eq('user_id', userId).eq('kitchen_code', kitchenCode) } catch {}
}

export async function adminDeleteUser(userId: string): Promise<void> {
  if (!supabase?.auth) return
  try { await supabase.auth.admin.deleteUser(userId) } catch {}
}

export async function deleteRestaurant(kitchenCode: string): Promise<void> {
  if (!supabase) return
  try {
    // Busca usuários para apagar da Auth se necessário (opcional, aqui apenas desvincula)
    // Se quiser apagar da Auth: 
    // const users = await fetchTenantUsers(kitchenCode)
    // for (const u of users) await adminDeleteUser(u.user_id)

    // Apagar dados dependentes primeiro para evitar FK errors se não houver cascade
    await supabase.from('kitchens_users').delete().eq('kitchen_code', kitchenCode)
    await supabase.from('items').delete().eq('kitchen_code', kitchenCode)
    await supabase.from('sheets').delete().eq('kitchen_code', kitchenCode)
    await supabase.from('update_logs').delete().eq('kitchen_code', kitchenCode)
    await supabase.from('daily_checklists').delete().eq('kitchen_code', kitchenCode)
    await supabase.from('weekly_rules').delete().eq('kitchen_code', kitchenCode)
    await supabase.from('daily_inventories').delete().eq('kitchen_code', kitchenCode)
    await supabase.from('recipes').delete().eq('kitchen_code', kitchenCode)
    await supabase.from('purchases').delete().eq('kitchen_code', kitchenCode)
    await supabase.from('utensils').delete().eq('kitchen_code', kitchenCode)
    
    // Finalmente apagar o restaurante
    const { error } = await supabase.from('restaurants').delete().eq('kitchen_code', kitchenCode)
    if (error) throw error
  } catch (e) {
    console.error('Erro ao deletar restaurante:', e)
    throw e
  }
}

export async function upsertWeeklyRule(rule: { weekday: number, category: string, section?: string, label: string }, kitchenCode?: string): Promise<void> {
  if (!supabase) return
  const row = {
    weekday: rule.weekday,
    category: rule.category,
    section: rule.section || null,
    label: rule.label,
    kitchen_code: kitchenCode
  }
  try { await supabase.from('weekly_rules').insert(row) } catch {}
}

export async function deleteWeeklyRule(id: string, kitchenCode?: string): Promise<void> {
  if (!supabase) return
  try { await supabase.from('weekly_rules').delete().eq('id', id).eq('kitchen_code', kitchenCode) } catch {}
}

export async function fetchWeeklyRules(kitchenCode?: string): Promise<WeeklyRuleRow[]> {
  if (!supabase) return []
  const query = supabase.from('weekly_rules').select('*')
  const { data } = kitchenCode ? await query.eq('kitchen_code', kitchenCode) : await query
  return (data || []).map((row: WeeklyRuleRow) => ({
    id: String(row.id),
    weekday: Number(row.weekday),
    category: String(row.category),
    section: row.section ? String(row.section) : undefined,
    label: String(row.label)
  }))
}

export function subscribeWeeklyRulesRealtime(kitchenCode: string, onChange: (payload: unknown) => void) {
  if (!supabase) return { unsubscribe: () => {} }
  const channel = supabase.channel('weekly-rules-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_rules', filter: `kitchen_code=eq.${kitchenCode}` }, (payload) => {
      onChange(payload)
    })
    .subscribe()
  return { unsubscribe: () => { try { supabase.removeChannel(channel) } catch {} } }
}

export async function upsertDailyInventory(inventory: { date: string, plaza: string, items: Array<{ name: string; quantity: number }> }, kitchenCode?: string): Promise<void> {
  if (!supabase) return
  const row = {
    date: inventory.date,
    plaza: inventory.plaza,
    items: inventory.items,
    kitchen_code: kitchenCode
  }
  try { await supabase.from('daily_inventories').upsert(row, { onConflict: 'date,plaza,kitchen_code' }) } catch {}
}

export async function fetchDailyInventories(kitchenCode?: string): Promise<DailyInventoryRow[]> {
  if (!supabase) return []
  const query = supabase.from('daily_inventories').select('*')
  const { data } = kitchenCode ? await query.eq('kitchen_code', kitchenCode) : await query
  return (data || []).map((row: DailyInventoryRow) => ({
    date: String(row.date),
    plaza: String(row.plaza),
    items: (row.items || [])
  }))
}

export function subscribeDailyInventoriesRealtime(kitchenCode: string, onChange: (payload: unknown) => void) {
  if (!supabase) return { unsubscribe: () => {} }
  const channel = supabase.channel('daily-inventories-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_inventories', filter: `kitchen_code=eq.${kitchenCode}` }, (payload) => {
      onChange(payload)
    })
    .subscribe()
  return { unsubscribe: () => { try { supabase.removeChannel(channel) } catch {} } }
}

// Recipes
export async function upsertRecipe(recipe: Recipe, kitchenCode?: string): Promise<void> {
  if (!supabase) return
  const row = {
    id: recipe.id,
    name: recipe.name,
    yield: recipe.yield,
    category: recipe.category,
    ingredients: recipe.ingredients,
    cost: recipe.cost,
    price: recipe.price,
    active: recipe.active,
    kitchen_code: kitchenCode
  }
  try { await supabase.from('recipes').upsert(row, { onConflict: 'id,kitchen_code' }) } catch {}
}

export async function fetchRecipes(kitchenCode?: string): Promise<Recipe[]> {
  if (!supabase) return []
  const query = supabase.from('recipes').select('*')
  const { data } = kitchenCode ? await query.eq('kitchen_code', kitchenCode) : await query
  return (data || []).map((row: RecipeRow) => ({
    id: String(row.id),
    name: String(row.name),
    yield: Number(row.yield) || 0,
    category: String(row.category || ''),
    ingredients: (row.ingredients || []),
    cost: Number(row.cost) || 0,
    price: Number(row.price) || 0,
    active: (row.active ?? true) as boolean
  }))
}

export async function deleteRecipe(id: string, kitchenCode?: string): Promise<void> {
  if (!supabase) return
  try { await supabase.from('recipes').delete().eq('id', id).eq('kitchen_code', kitchenCode) } catch {}
}

export function subscribeRecipesRealtime(kitchenCode: string, onChange: (payload: unknown) => void) {
  if (!supabase) return { unsubscribe: () => {} }
  const channel = supabase.channel('recipes-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes', filter: `kitchen_code=eq.${kitchenCode}` }, (payload) => {
      onChange(payload)
    })
    .subscribe()
  return { unsubscribe: () => { try { supabase.removeChannel(channel) } catch {} } }
}

// Purchases
export async function upsertPurchase(purchase: { id: string; date: string; supplier?: string; totalCost: number; items: unknown[]; status?: string }, kitchenCode?: string): Promise<void> {
  if (!supabase) return
  const row = {
    id: purchase.id,
    date: purchase.date,
    supplier: purchase.supplier,
    total_cost: purchase.totalCost,
    items: purchase.items,
    status: purchase.status,
    kitchen_code: kitchenCode
  }
  try { await supabase.from('purchases').upsert(row, { onConflict: 'id,kitchen_code' }) } catch {}
}

export async function fetchPurchases(kitchenCode?: string): Promise<Array<{ id: string; date: string; supplier: string; totalCost: number; items: unknown[]; status: string }>> {
  if (!supabase) return []
  const query = supabase.from('purchases').select('*')
  const { data } = kitchenCode ? await query.eq('kitchen_code', kitchenCode) : await query
  return (data || []).map((row: { id: string; date: string; supplier?: string | null; total_cost?: number | null; items?: unknown[]; status?: string | null }) => ({
    id: String(row.id),
    date: String(row.date),
    supplier: String(row.supplier || ''),
    totalCost: Number(row.total_cost) || 0,
    items: (row.items || []),
    status: String(row.status || 'pending')
  }))
}

export function subscribePurchasesRealtime(kitchenCode: string, onChange: (payload: unknown) => void) {
  if (!supabase) return { unsubscribe: () => {} }
  const channel = supabase.channel('purchases-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases', filter: `kitchen_code=eq.${kitchenCode}` }, (payload) => {
      onChange(payload)
    })
    .subscribe()
  return { unsubscribe: () => { try { supabase.removeChannel(channel) } catch {} } }
}
