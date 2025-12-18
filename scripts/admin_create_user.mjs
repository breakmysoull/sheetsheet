import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function loadDotEnv() {
  try {
    const p = path.join(process.cwd(), '.env')
    const text = fs.readFileSync(p, 'utf8')
    const vars = {}
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=([\s\S]*)$/)
      if (m) vars[m[1].trim()] = m[2].trim()
    }
    return vars
  } catch {
    return {}
  }
}

const env = { ...loadDotEnv(), ...process.env }
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}
const supabase = createClient(url, key)

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '')
      const val = args[i + 1]
      out[key] = val
      i++
    }
  }
  return out
}

const cli = parseArgs()
const email = cli.email || env.EMAIL
const password = cli.password || env.PASSWORD
const role = (cli.role || env.ROLE || 'super_admin')
const kitchenCode = (cli.kitchen || env.KITCHEN_CODE || 'COZZI01').toUpperCase()

if (!email || !password) {
  console.error('Missing email or password (use --email and --password)')
  process.exit(1)
}

async function run() {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      console.error('signUp error:', error.message)
      process.exit(1)
    }
    const u = data.user
    if (!u?.id) {
      console.error('Missing user id after signUp')
      process.exit(1)
    }
    const userId = u.id
    await supabase.from('profiles').upsert({ user_id: userId, role }, { onConflict: 'user_id' })
    await supabase.from('kitchens_users').upsert({ user_id: userId, kitchen_code: kitchenCode, role }, { onConflict: 'user_id,kitchen_code' })
    console.log(JSON.stringify({ ok: true, userId, email, role, kitchenCode }))
  } catch (e) {
    console.error('Unexpected error:', e)
    process.exit(1)
  }
}

run()
