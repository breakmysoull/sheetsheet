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

const env = { ...loadDotEnv(), ...process.env }
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
const cli = parseArgs()
const email = cli.email || env.EMAIL
const password = cli.password || env.PASSWORD

if (!url || !key) {
  console.error('missing_supabase_env')
  process.exit(1)
}
if (!email || !password) {
  console.error('missing_credentials')
  process.exit(1)
}

const supabase = createClient(url, key)

const { data, error } = await supabase.auth.signInWithPassword({ email, password })
if (error) {
  console.error(JSON.stringify({ ok: false, code: error.status, message: error.message }))
  process.exit(1)
}
console.log(JSON.stringify({ ok: true, userId: data.user.id }))
