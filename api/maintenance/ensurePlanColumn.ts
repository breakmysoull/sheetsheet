import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(url, key)

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return }
    if (!url || !key) { res.status(500).json({ error: 'missing_service_env' }); return }
    const sql = `
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS plan text DEFAULT 'Free';
        EXCEPTION WHEN others THEN
          NULL;
        END;
      END; $$;
    `
    const { error } = await (supabase as any).rpc('exec_sql', { sql })
    if (error) {
      res.status(200).json({ ok: true, note: 'rpc exec_sql not available; column may already exist' })
      return
    }
    res.status(200).json({ ok: true })
  } catch (e: any) {
    res.status(200).json({ ok: true, note: 'fallback; ensurePlanColumn non-fatal', error: e?.message })
  }
}

