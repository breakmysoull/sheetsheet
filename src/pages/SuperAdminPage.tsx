import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/config/supabase'
import { adminCreateUser, upsertRestaurant, fetchAdminStats, fetchSheetsWithItems, fetchTenantUsers, removeUserFromTenant, deleteRestaurant, adminDeleteUser } from '@/services/supabaseInventory'
import { useAuth } from '@/context/AuthContext'
import { XLSXHandler } from '@/services/xlsxHandler'
import { useInventory } from '@/hooks/useInventory'

type Restaurant = { kitchen_code: string, name: string, owner_user_id?: string | null, created_at?: string | null, last_activity_at?: string | null, active?: boolean | null, status?: string | null, plan?: 'Free'|'Pro'|'Enterprise' | null, user_count?: number, item_count?: number }

const SuperAdminPage: React.FC = () => {
  const navigate = useNavigate()
  const { can, role, signOut } = useAuth() as any
  const [loading, setLoading] = React.useState(false)
  const [list, setList] = React.useState<Restaurant[]>([])
  const [q, setQ] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [openCreate, setOpenCreate] = React.useState(false)
  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [ownerEmail, setOwnerEmail] = React.useState('')
  const [initialPassword, setInitialPassword] = React.useState('') // New state for initial password
  const [openEdit, setOpenEdit] = React.useState(false)
  const [editItem, setEditItem] = React.useState<Restaurant | null>(null)
  const [editName, setEditName] = React.useState('')
  const [editOwnerEmail, setEditOwnerEmail] = React.useState('')
  const [editOwnerDisplay, setEditOwnerDisplay] = React.useState('—')
  const [editStatus, setEditStatus] = React.useState<'Ativo'|'Inativo'|'Bloqueado'>('Ativo')
  const [editPlan, setEditPlan] = React.useState<'Free'|'Pro'|'Enterprise'>('Free')
  const { setKitchenCode } = useInventory() as any
  const [stats, setStats] = React.useState<{ activeRestaurants: number, inactiveOrBlockedRestaurants: number, totalUsers: number, updatedInventories24h: number } | null>(null)

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const load = async () => {
    if (!supabase) {
      toast({ title: 'Backend não configurado', description: 'Configure Supabase para listar restaurantes.', variant: 'destructive' })
      return
    }
    try {
      setLoading(true)
      try {
        if (import.meta.env.VITE_ENABLE_API_MAINTENANCE === 'true') {
          await fetch('/api/maintenance/ensurePlanColumn', { method: 'POST' })
        }
      } catch {}
      
      // Fetch main data sorted by creation date (newest first)
      const { data, error } = await supabase
        .from('restaurants')
        .select('kitchen_code,name,owner_user_id,created_at,last_activity_at,active,status,plan')
        .order('created_at', { ascending: false })
        
      if (error) throw error
      const base = (data || []) as Restaurant[]
      
      // Enrich with counts (optional, kept for now)
      const enriched = await Promise.all(base.map(async (r) => {
        const code = r.kitchen_code
        let user_count = 0
        let item_count = 0
        try {
          const { count: uc } = await supabase.from('kitchens_users').select('user_id', { count: 'exact', head: true }).eq('kitchen_code', code)
          user_count = Number(uc || 0)
        } catch {}
        try {
          const { count: ic } = await supabase.from('items').select('item_id', { count: 'exact', head: true }).eq('kitchen_code', code)
          item_count = Number(ic || 0)
        } catch {}
        return { ...r, user_count, item_count }
      }))
      setList(enriched)
      try { const s = await fetchAdminStats(); setStats(s) } catch {}
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message || 'Falha ao listar restaurantes', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { load() }, [])
  React.useEffect(() => { setPage(1) }, [q])

  const generatePassword = () => Math.random().toString(36).slice(2, 10) + 'A1!'

  const createRestaurant = async () => {
    if (!name.trim() || !code.trim()) { toast({ title: 'Informe nome e código', variant: 'destructive' }); return }
    try {
      setLoading(true)
      let ownerId: string | null = null
      if (ownerEmail.trim()) {
        if (!supabase) throw new Error('Supabase não configurado')
        const pass = initialPassword.trim() || generatePassword()
        ownerId = await adminCreateUser(ownerEmail.trim().toLowerCase(), pass, 'gerente', code.trim().toUpperCase())
        if (ownerId) toast({ title: 'Proprietário criado', description: `Senha: ${pass}` })
      }
      await upsertRestaurant(name.trim(), code.trim().toUpperCase(), ownerId || undefined)
      toast({ title: 'Restaurante cadastrado', description: `${name} (${code.toUpperCase()})` })
      setOpenCreate(false); setName(''); setCode(''); setOwnerEmail(''); setInitialPassword('')
      await load()
    } catch (e: any) {
      toast({ title: 'Erro ao cadastrar', description: e.message || 'Falha ao criar tenant', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const [tenantUsers, setTenantUsers] = React.useState<any[]>([])
  const [newUserEmail, setNewUserEmail] = React.useState('')
  const [newUserRole, setNewUserRole] = React.useState('funcionario')
  const [newUserPassword, setNewUserPassword] = React.useState('') // New state for manual password

  const loadTenantUsers = async (code: string) => {
    const users = await fetchTenantUsers(code)
    setTenantUsers(users)
  }

  const addUserToTenant = async () => {
    if (!editItem || !newUserEmail.trim()) return
    try {
      setLoading(true)
      const pass = newUserPassword.trim() || generatePassword() // Use manual or generated
      const id = await adminCreateUser(newUserEmail.trim().toLowerCase(), pass, newUserRole, editItem.kitchen_code)
      if (id) {
        toast({ title: 'Usuário adicionado', description: `Senha: ${pass}` })
        setNewUserEmail('')
        setNewUserPassword('') // Clear manual password
        await loadTenantUsers(editItem.kitchen_code)
      } else {
        toast({ title: 'Erro ao adicionar', description: 'Não foi possível criar o usuário', variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)

  const removeUser = async (userId: string) => {
    if (!editItem) return
    if (!confirm('Tem certeza que deseja remover este usuário do restaurante?')) return
    try {
      setLoading(true)
      await removeUserFromTenant(userId, editItem.kitchen_code)
      await adminDeleteUser(userId) // Remove também da Auth para limpeza completa
      toast({ title: 'Usuário removido' })
      await loadTenantUsers(editItem.kitchen_code)
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = (code: string) => {
    setDeleteTarget(code)
    setDeleteConfirmOpen(true)
  }

  const executeDelete = async () => {
    if (!deleteTarget) return
    try {
      setLoading(true)
      // Opcional: apagar usuários da Auth
      const users = await fetchTenantUsers(deleteTarget)
      for (const u of users) {
        try { await adminDeleteUser(u.user_id) } catch {}
      }
      await deleteRestaurant(deleteTarget)
      toast({ title: 'Restaurante excluído', description: `Todos os dados de ${deleteTarget} foram apagados.` })
      setDeleteConfirmOpen(false)
      setDeleteTarget(null)
      await load()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = async (r: Restaurant) => {
    setEditItem(r)
    setEditName(r.name)
    setEditOwnerEmail('')
    try {
      if (r.owner_user_id) {
        const { data } = await supabase.from('profiles').select('name').eq('user_id', r.owner_user_id).limit(1)
        const nm = ((data || [])[0] as any)?.name
        setEditOwnerDisplay(nm ? String(nm) : String(r.owner_user_id))
      } else {
        setEditOwnerDisplay('—')
      }
    } catch {
      setEditOwnerDisplay(r.owner_user_id ? String(r.owner_user_id) : '—')
    }
    setEditStatus(r.active === false ? 'Inativo' : 'Ativo')
    setEditPlan((r.plan as any) || 'Free')
    setOpenEdit(true)
    loadTenantUsers(r.kitchen_code)
  }

  const saveEdit = async () => {
    if (!editItem) return
    try {
      setLoading(true)
      let ownerId: string | null = editItem.owner_user_id || null
      if (editOwnerEmail.trim()) {
        const pass = generatePassword()
        const id = await adminCreateUser(editOwnerEmail.trim().toLowerCase(), pass, 'gerente', editItem.kitchen_code)
        if (id) { ownerId = id; toast({ title: 'Proprietário criado', description: `Senha temporária: ${pass}` }) }
      }
      await upsertRestaurant(editName.trim(), editItem.kitchen_code, ownerId || undefined, editPlan)
      try {
        if (editStatus === 'Bloqueado') {
          const { error: e1 } = await supabase.from('restaurants').update({ status: 'blocked' }).eq('kitchen_code', editItem.kitchen_code)
          if (e1) {
            const { error: e2 } = await supabase.from('restaurants').update({ active: false }).eq('kitchen_code', editItem.kitchen_code)
            if (e2) throw e2
          }
        } else if (editStatus === 'Inativo') {
          const { error } = await supabase.from('restaurants').update({ active: false }).eq('kitchen_code', editItem.kitchen_code)
          if (error) throw error
        } else {
          const { error } = await supabase.from('restaurants').update({ active: true }).eq('kitchen_code', editItem.kitchen_code)
          if (error) throw error
        }
        const { error: ePlan } = await supabase.from('restaurants').update({ plan: editPlan }).eq('kitchen_code', editItem.kitchen_code)
        if (ePlan) throw ePlan
      } catch (e: any) {
        toast({ title: 'Falha ao atualizar status', description: e.message || 'Verifique colunas active/status', variant: 'destructive' })
      }
      toast({ title: 'Restaurante atualizado', description: `${editName} (${editItem.kitchen_code})` })
      setOpenEdit(false)
      await load()
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message || 'Falha ao atualizar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (r: Restaurant) => {
    if (!supabase) { toast({ title: 'Backend não configurado', variant: 'destructive' }); return }
    try {
      const next = r.active === true ? false : true
      const { error } = await supabase.from('restaurants').update({ active: next }).eq('kitchen_code', r.kitchen_code)
      if (error) throw error
      toast({ title: next ? 'Restaurante ativado' : 'Restaurante desativado', description: `${r.name}` })
      await load()
    } catch (e: any) {
      toast({ title: 'Erro ao alterar status', description: e.message || 'Talvez falte a coluna "active" em restaurants. Solicite migration para adicionar: active boolean default true.', variant: 'destructive' })
    }
  }

  const executeImpersonation = (code: string) => {
    try {
      const orig = (localStorage.getItem('kitchen_code') || '').trim()
      try { localStorage.setItem('impersonation_original_kitchen_code', orig) } catch {}
      try { localStorage.setItem('impersonation_active', 'true') } catch {}
      try { localStorage.setItem('kitchen_code', code) } catch {}
    } catch {}
    setKitchenCode(code)
    window.location.reload()
  }

  const impersonateAndNavigate = (code: string, path: string) => {
    try {
      const orig = (localStorage.getItem('kitchen_code') || '').trim()
      try { localStorage.setItem('impersonation_original_kitchen_code', orig) } catch {}
      try { localStorage.setItem('impersonation_active', 'true') } catch {}
      try { localStorage.setItem('kitchen_code', code) } catch {}
    } catch {}
    setKitchenCode(code)
    navigate(path)
  }


  /* 
  // REMOVIDO: Função antiga substituída por executeDelete com modal
  const confirmDelete = async (code: string) => {
    if (!confirm(`ATENÇÃO: Esta ação apagará TODO o histórico, usuários e itens do restaurante ${code}.\n\nDeseja continuar?`)) return
    if (!confirm(`Confirme novamente: Apagar permanentemente o restaurante ${code}?`)) return
    try {
      setLoading(true)
      await deleteRestaurant(code)
      toast({ title: 'Restaurante excluído', description: `Todos os dados de ${code} foram apagados.` })
      await load()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  } 
  */

  const exportRestaurant = async (code: string) => {
    try {
      const sheets = await fetchSheetsWithItems(code)
      if (!sheets || sheets.length === 0) {
        toast({ title: 'Sem dados', description: 'Nenhuma planilha encontrada para exportar', variant: 'destructive' })
        return
      }
      XLSXHandler.exportToXLSX(sheets)
      toast({ title: 'Exportação iniciada', description: `Exportando ${sheets.length} planilha(s)` })
    } catch (e: any) {
      toast({ title: 'Erro ao exportar', description: e.message || 'Falha ao exportar dados', variant: 'destructive' })
    }
  }

  const filtered = list.filter(r => {
    const s = `${r.name} ${r.kitchen_code}`.toLowerCase()
    return s.includes(q.toLowerCase())
  })
  const perPage = 10
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  React.useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages])
  const startIndex = (page - 1) * perPage
  const endIndex = Math.min(startIndex + perPage, total)
  const pageItems = filtered.slice(startIndex, endIndex)

  if (!can('admin.systemConfig')) {
    navigate('/home')
    return null
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">Super Admin</h1>
          <Button variant="outline" onClick={async ()=>{ try { await signOut(); navigate('/login') } catch {} }}>Deslogar</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow">
            <CardHeader><CardTitle className="text-sm">Restaurantes ativos</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold">{stats ? stats.activeRestaurants : '—'}</CardContent>
          </Card>
          <Card className="shadow">
            <CardHeader><CardTitle className="text-sm">Inativos/Bloqueados</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold">{stats ? stats.inactiveOrBlockedRestaurants : '—'}</CardContent>
          </Card>
          <Card className="shadow">
            <CardHeader><CardTitle className="text-sm">Usuários cadastrados</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold">{stats ? stats.totalUsers : '—'}</CardContent>
          </Card>
          <Card className="shadow">
            <CardHeader><CardTitle className="text-sm">Inventários 24h</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold">{stats ? stats.updatedInventories24h : '—'}</CardContent>
          </Card>
        </div>
        <div className="flex items-center justify-between">
          <Input placeholder="Buscar por nome ou código" value={q} onChange={e=>setQ(e.target.value)} className="w-64" />
          <Button onClick={()=>setOpenCreate(true)}>Novo Restaurante</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Restaurantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Proprietário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Criação</TableHead>
              <TableHead>Última atividade</TableHead>
              <TableHead>Usuários</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((r) => (
                  <TableRow key={r.kitchen_code}>
                    <TableCell className="font-medium">{r.kitchen_code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.owner_user_id ? r.owner_user_id : '—'}</TableCell>
                <TableCell>{r.active === false ? 'Inativo' : 'Ativo'}</TableCell>
                <TableCell>{r.plan || 'Free'}</TableCell>
                <TableCell>{formatDateTime(r.created_at)}</TableCell>
                <TableCell>{formatDateTime(r.last_activity_at)}</TableCell>
                <TableCell>{Number(r.user_count || 0)}</TableCell>
                <TableCell>{Number(r.item_count || 0)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={()=>openEditModal(r)}>Editar</Button>
                    <Button variant="secondary" onClick={()=>executeImpersonation(r.kitchen_code)}>Acessar como</Button>
                    {role === 'super_admin' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Ações">⋮</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={()=>impersonateAndNavigate(r.kitchen_code, '/audit')}>Ver logs do restaurante</DropdownMenuItem>
                          <DropdownMenuItem onClick={()=>impersonateAndNavigate(r.kitchen_code, '/admin')}>Ver usuários do restaurante</DropdownMenuItem>
                          <DropdownMenuItem onClick={()=>impersonateAndNavigate(r.kitchen_code, '/inventory')}>Ver inventário</DropdownMenuItem>
                          <DropdownMenuItem onClick={()=>exportRestaurant(r.kitchen_code)}>Exportar dados do restaurante</DropdownMenuItem>
                          <DropdownMenuItem onClick={()=>toggleActive(r)}>{r.active === false ? 'Ativar restaurante' : 'Desativar restaurante'}</DropdownMenuItem>
                          <DropdownMenuItem onClick={()=>confirmDelete(r.kitchen_code)} className="text-destructive focus:text-destructive">Excluir restaurante</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button variant={r.active === false ? 'default' : 'destructive'} onClick={()=>toggleActive(r)}>
                      {r.active === false ? 'Ativar' : 'Desativar'}
                    </Button>
                  </div>
                </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">Nenhum restaurante encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-4">
              <div className="text-sm text-muted-foreground">Mostrando {total === 0 ? 0 : (startIndex + 1)}–{endIndex} de {total} restaurantes</div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={()=>setPage(p=>Math.max(1, p-1))} disabled={page<=1}>Anterior</Button>
                <Button variant="outline" onClick={()=>setPage(p=>Math.min(totalPages, p+1))} disabled={page>=totalPages}>Próxima</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogContent className="w-[95vw] max-w-2xl sm:max-w-2xl max-h-[calc(100vh-3rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Restaurante</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={e=>setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Ex: COZZI01" />
              </div>
              <div className="space-y-2">
                <Label>E-mail do proprietário</Label>
                <div className="flex gap-2">
                  <Input value={ownerEmail} onChange={e=>setOwnerEmail(e.target.value)} placeholder="exemplo@dominio.com" className="flex-1" />
                  <Input value={initialPassword} onChange={e=>setInitialPassword(e.target.value)} placeholder="Senha (opcional)" className="w-40" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={()=>setOpenCreate(false)}>Cancelar</Button>
                <Button onClick={createRestaurant} disabled={loading}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogContent className="w-[95vw] max-w-2xl sm:max-w-3xl max-h-[calc(100vh-3rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Restaurante</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive p-3 text-sm">Você está editando informações sensíveis deste restaurante.</div>
              <div className="space-y-2">
                <Label>Nome do restaurante</Label>
                <Input value={editName} onChange={e=>setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={editItem?.kitchen_code || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Proprietário atual</Label>
                <div className="flex items-center gap-2">
                  <Input value={editOwnerDisplay} disabled className="flex-1" />
                  <Button variant="outline" onClick={()=>setEditOwnerEmail('')}>Trocar Proprietário</Button>
                </div>
                <Input value={editOwnerEmail} onChange={e=>setEditOwnerEmail(e.target.value)} placeholder="novo proprietario (email)" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select value={editStatus} onChange={e=>setEditStatus(e.target.value as any)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option>Ativo</option>
                  <option>Inativo</option>
                  <option>Bloqueado</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <select value={editPlan} onChange={e=>setEditPlan(e.target.value as any)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option>Free</option>
                  <option>Pro</option>
                  <option>Enterprise</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data de criação</Label>
                  <Input value={formatDateTime(editItem?.created_at)} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Última atividade</Label>
                  <Input value={formatDateTime(editItem?.last_activity_at)} disabled />
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <Label className="text-base font-semibold mb-2 block">Gerenciar Usuários</Label>
                <div className="space-y-2 mb-4">
                  <div className="flex gap-2 flex-wrap">
                    <Input placeholder="Novo usuário (email)" value={newUserEmail} onChange={e=>setNewUserEmail(e.target.value)} className="flex-1 min-w-[200px]" />
                    <Input placeholder="Senha (opcional)" value={newUserPassword} onChange={e=>setNewUserPassword(e.target.value)} className="w-40" />
                    <select value={newUserRole} onChange={e=>setNewUserRole(e.target.value)} className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="funcionario">Funcionário</option>
                      <option value="gerente">Gerente</option>
                    </select>
                    <Button onClick={addUserToTenant} disabled={loading}>Adicionar</Button>
                  </div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                  {tenantUsers.length === 0 ? <div className="text-sm text-muted-foreground text-center">Nenhum usuário extra</div> : 
                    tenantUsers.map(u => (
                      <div key={u.user_id} className="flex justify-between items-center text-sm border-b pb-1 mb-1 last:border-0 last:mb-0">
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.role}</div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={()=>removeUser(u.user_id)}>✕</Button>
                      </div>
                    ))
                  }
                </div>
              </div>

              <div className="flex justify-between gap-2 pt-4 border-t">
                <Button variant="secondary" onClick={()=>{ if (editItem?.kitchen_code) { try { localStorage.setItem('kitchen_code', editItem.kitchen_code) } catch {}; setKitchenCode(editItem.kitchen_code); window.location.reload() } }}>Ir para o restaurante</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={()=>setOpenEdit(false)}>Cancelar</Button>
                  <Button onClick={saveEdit} disabled={loading}>Salvar alterações</Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Esta ação apagará <strong>permanentemente</strong> o restaurante {deleteTarget} e todos os seus dados:</p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                <li>Histórico de inventários</li>
                <li>Itens, receitas e compras</li>
                <li>Todos os usuários vinculados</li>
                <li>Logs de atividade</li>
              </ul>
              <p className="font-bold text-destructive">Esta ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={()=>setDeleteConfirmOpen(false)}>Cancelar</Button>
                <Button variant="destructive" onClick={executeDelete} disabled={loading}>
                  {loading ? 'Excluindo...' : 'Sim, excluir tudo'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default SuperAdminPage
