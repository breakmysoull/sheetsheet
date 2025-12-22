import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/config/supabase'
import { upsertKitchenUser, fetchKitchenCodeForUser, fetchUserRole, upsertUserProfile } from '@/services/supabaseInventory'

type Role = 'super_admin' | 'gerente' | 'funcionario' | 'auxiliar'
interface AuthState {
  user: { id: string; email?: string; name?: string } | null
  role: Role
  permissions: Record<string, boolean>
  can: (perm: string) => boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setRoleLocal: (role: Role) => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthState['user']>(null)
  const [role, setRole] = useState<Role>('funcionario')
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})

  const computePermissions = (r: Role): Record<string, boolean> => {
    const base: Record<string, boolean> = {}
    const allow = (key: string) => { base[key] = true }
    if (r === 'super_admin') {
      ['inventory.view','inventory.edit','inventory.add','inventory.remove','inventory.import','inventory.export',
       'recipes.view','recipes.create','recipes.edit','recipes.delete','recipes.viewCosts','recipes.changeUnits',
       'production.register','production.viewHistory','production.edit','production.cancel',
       'purchases.register','purchases.viewPrevious','purchases.edit','purchases.delete',
       'requests.view', 'requests.create', 'requests.edit', 'requests.delete',
       'reports.viewDaily','reports.viewWeekly','reports.viewMonthly','reports.cmv','reports.forecast','reports.audit',
       'admin.viewUsers','admin.createUsers','admin.editPermissions','admin.deleteUsers','admin.backup','admin.systemConfig',
       'logs.viewAll','checklist.use','utensils.edit','tabs.accessHidden'].forEach(allow)
    } else if (r === 'gerente') {
      ['inventory.view','inventory.edit','inventory.add','inventory.import',
       'recipes.view','recipes.create',
       'purchases.register',
       'requests.view', 'requests.create', 'requests.edit', 'requests.delete',
       'reports.viewDaily','reports.viewMonthly',
       'logs.viewKitchen','checklist.use','utensils.edit','tabs.accessHidden'].forEach(allow)
    } else if (r === 'funcionario') {
      ['inventory.view','inventory.edit',
       'checklist.use',
       'recipes.view',
       'requests.view', 'requests.create', 'requests.edit', 'requests.delete'].forEach(allow)
    } else if (r === 'auxiliar') {
      ['inventory.view','checklist.use','recipes.view'].forEach(allow)
    }
    return base
  }

  useEffect(() => {
    const existing = localStorage.getItem('auth_role') as Role | null
    if (existing) {
      setRole(existing)
      setPermissions(computePermissions(existing))
    } else {
      setPermissions(computePermissions(role))
    }
    const session = (supabase as any)?.auth?.getSession ? null : null
  }, [])

  useEffect(() => {
    if (!supabase?.auth) return
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser({ id: data.user.id, email: data.user.email || undefined })
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser({ id: session.user.id, email: session.user.email || undefined })
      else setUser(null)
    })
    return () => { sub?.subscription?.unsubscribe?.() }
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!supabase || !supabase.auth) {
      console.error("Supabase client not initialized. Check environment variables.")
      throw new Error("Erro de conexão: Servidor de login não configurado. Verifique as variáveis de ambiente (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).")
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setUser({ id: data.user!.id, email: data.user!.email || undefined })
    const defAdmin = import.meta.env.VITE_DEFAULT_ADMIN_EMAIL
    let r: Role = 'funcionario'
    const uEmail = data.user!.email || ''
    if (uEmail === 'petipeti@peti.com') r = 'super_admin'
    else if (uEmail === 'peti@peti.com') r = 'funcionario'
    else if (uEmail === defAdmin) r = 'super_admin'
    else {
      const backendRole = await fetchUserRole(data.user!.id)
      r = (backendRole as Role) || (localStorage.getItem('auth_role') as Role) || 'funcionario'
    }
    setRole(r)
    localStorage.setItem('auth_role', r)
    setPermissions(computePermissions(r))
    try {
      const existing = await fetchKitchenCodeForUser(data.user!.id)
      if (!existing) {
        const code = Math.random().toString(36).slice(2, 8).toUpperCase()
        await upsertKitchenUser(data.user!.id, code)
        localStorage.setItem('kitchen_code', code)
      } else {
        localStorage.setItem('kitchen_code', existing)
      }
      await upsertUserProfile(data.user!.id, r)
    } catch {}
  }

  const signUp = async (email: string, password: string) => {
    if (!supabase || !supabase.auth) {
      throw new Error("Erro de conexão: Servidor de login não configurado.")
    }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    const u = data.user
    if (u) {
      setUser({ id: u.id, email: u.email || undefined })
      const defAdmin = import.meta.env.VITE_DEFAULT_ADMIN_EMAIL
      const r: Role = u.email === 'petipeti@peti.com' ? 'super_admin' : (u.email === 'peti@peti.com' ? 'funcionario' : (u.email === defAdmin ? 'super_admin' : 'funcionario'))
      setRole(r)
      localStorage.setItem('auth_role', r)
      setPermissions(computePermissions(r))
      try {
        const code = Math.random().toString(36).slice(2, 8).toUpperCase()
        await upsertKitchenUser(u.id, code)
        localStorage.setItem('kitchen_code', code)
        await upsertUserProfile(u.id, r)
      } catch {}
    }
  }

  const signOut = async () => {
    try {
      if (supabase?.auth) {
        await supabase.auth.signOut()
      }
    } catch {}
    try {
      localStorage.removeItem('auth_role')
      localStorage.removeItem('kitchen_code')
    } catch {}
    setUser(null)
    setRole('funcionario')
    setPermissions(computePermissions('funcionario'))
  }

  const can = (perm: string) => !!permissions[perm]

  const setRoleLocal = (r: Role) => {
    setRole(r)
    try { localStorage.setItem('auth_role', r) } catch {}
    setPermissions(computePermissions(r))
  }

  return (
    <AuthContext.Provider value={{ user, role, permissions, can, signIn, signUp, signOut, setRoleLocal }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
