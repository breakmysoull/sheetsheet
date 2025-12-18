import { createClient } from '@supabase/supabase-js'

function getEnv(name: string): string | undefined {
  return process.env[name]
}

const url = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || ''
const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(url, serviceKey)

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed' })
      return
    }
    const { name, kitchenCode, ownerEmail } = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {}
    const code = String(kitchenCode || '').trim().toUpperCase()
    const restName = String(name || '').trim()
    const email = ownerEmail ? String(ownerEmail).trim().toLowerCase() : ''
    if (!url || !serviceKey) {
      res.status(500).json({ error: 'missing_service_env' })
      return
    }
    if (!code || !restName) {
      res.status(400).json({ error: 'missing_fields' })
      return
    }

    const upsertRest = await supabase.from('restaurants').upsert({ kitchen_code: code, name: restName, active: true }, { onConflict: 'kitchen_code' })
    if (upsertRest.error) {
      res.status(500).json({ error: upsertRest.error.message })
      return
    }

    let ownerId: string | null = null
    if (email) {
      const pass = Math.random().toString(36).slice(2, 10) + 'A1!'
      const created = await (supabase as any).auth.admin.createUser({ email, password: pass, email_confirm: true })
      if (created.error) {
        res.status(500).json({ error: created.error.message })
        return
      }
      ownerId = created.data.user?.id || null
      if (ownerId) {
        await supabase.from('profiles').upsert({ user_id: ownerId, role: 'gerente' }, { onConflict: 'user_id' })
        await supabase.from('kitchens_users').upsert({ user_id: ownerId, kitchen_code: code, role: 'owner' }, { onConflict: 'user_id,kitchen_code' })
        await supabase.from('restaurants').update({ owner_user_id: ownerId }).eq('kitchen_code', code)
      }
    }

    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('daily_checklists').upsert({ date: today, categories: [{ label: 'Geral', items: [] }], kitchen_code: code }, { onConflict: 'date,kitchen_code' })
    await supabase.from('weekly_rules').upsert({ weekday: 1, category: 'Geral', section: null, label: 'Revisão de Estoque', kitchen_code: code })

    res.status(200).json({ ok: true, kitchen_code: code, name: restName, owner_user_id: ownerId })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'unexpected_error' })
  }
}

