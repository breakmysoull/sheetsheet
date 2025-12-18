import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { useInventory } from '@/hooks/useInventory'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/config/supabase'

type TenantRow = { kitchen_code: string, name: string, active?: boolean | null }

const TenantSelector: React.FC = () => {
  const { user, role } = useAuth() as any
  const { kitchenCode, setKitchenCode } = useInventory() as any
  const [list, setList] = React.useState<TenantRow[]>([])
  const [q, setQ] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const loadTenants = React.useCallback(async () => {
    try {
      setLoading(true)
      if (!supabase) {
        const local = (localStorage.getItem('kitchen_code') || '').trim()
        if (local) setList([{ kitchen_code: local, name: local }])
        return
      }
      if (role === 'super_admin') {
        const { data, error } = await supabase.from('restaurants').select('kitchen_code,name,active').order('name', { ascending: true })
        if (error) throw error
        setList((data || []).filter(r => r.active !== false) as TenantRow[])
      } else {
        const { data: ku, error: e1 } = await supabase.from('kitchens_users').select('kitchen_code').eq('user_id', user?.id)
        if (e1) throw e1
        const codes = (ku || []).map((r: any) => r.kitchen_code).filter(Boolean)
        if (codes.length === 0) { setList([]); return }
        const { data, error } = await supabase.from('restaurants').select('kitchen_code,name,active').in('kitchen_code', codes).order('name', { ascending: true })
        if (error) throw error
        setList((data || []).filter(r => r.active !== false) as TenantRow[])
      }
    } catch (e: any) {
      toast({ title: 'Erro ao carregar tenants', description: e.message || 'Falha ao listar organizações', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [role, user?.id])

  React.useEffect(() => { loadTenants() }, [loadTenants])

  const filtered = list.filter(r => {
    const s = `${r.name} ${r.kitchen_code}`.toLowerCase()
    return s.includes(q.toLowerCase())
  })

  const onSelect = async (code: string) => {
    try {
      setKitchenCode(code)
      try { localStorage.setItem('kitchen_code', code) } catch {}
      toast({ title: 'Tenant selecionado', description: `Filtrando por ${code}` })
    } catch (e: any) {
      toast({ title: 'Erro ao selecionar tenant', description: e.message || 'Falha ao aplicar filtro', variant: 'destructive' })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-64">
        <Select value={kitchenCode || ''} onValueChange={onSelect} disabled={loading || filtered.length === 0}>
          <SelectTrigger>
            <SelectValue placeholder={loading ? 'Carregando...' : (kitchenCode || 'Selecione o restaurante')} />
          </SelectTrigger>
          <SelectContent>
            {filtered.map(r => (
              <SelectItem key={r.kitchen_code} value={r.kitchen_code}>
                {r.name} ({r.kitchen_code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input placeholder="Buscar" value={q} onChange={e=>setQ(e.target.value)} className="w-48" />
      <Button variant="outline" onClick={loadTenants} disabled={loading}>Atualizar</Button>
    </div>
  )
}

export default TenantSelector

