import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(url, serviceKey)

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed' })
      return
    }

    const { email, password, role, kitchenCode } = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {}

    if (!email || !password || !kitchenCode) {
      res.status(400).json({ error: 'missing_fields' })
      return
    }

    if (!url || !serviceKey) {
      res.status(500).json({ error: 'missing_service_env' })
      return
    }

    // Cria usuário no Auth com email confirmado
    const { data: authData, error: authError } = await (supabase as any).auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true
    })

    if (authError) {
      res.status(500).json({ error: authError.message })
      return
    }

    const userId = authData.user?.id
    if (!userId) {
      res.status(500).json({ error: 'user_creation_failed' })
      return
    }

    // Cria profile
    const userRole = role || 'funcionario'
    await supabase.from('profiles').upsert({ user_id: userId, role: userRole }, { onConflict: 'user_id' })

    // Vincula ao tenant
    // Define role no tenant: se o role global for 'gerente', assume 'owner' ou 'manager' no tenant?
    // Vamos simplificar: usa o mesmo role passado (funcionario/gerente) ou 'owner' se for proprietário
    const tenantRole = userRole === 'gerente' ? 'manager' : 'employee'
    // Mas o frontend passa 'gerente' ou 'funcionario'.
    // O sistema atual usa 'owner' para proprietário principal.
    // Vou manter o role passado no body se for compatível, ou mapear.
    
    await supabase.from('kitchens_users').upsert({ 
      user_id: userId, 
      kitchen_code: kitchenCode, 
      role: userRole 
    }, { onConflict: 'user_id,kitchen_code' })

    res.status(200).json({ ok: true, userId })

  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: e?.message || 'unexpected_error' })
  }
}
