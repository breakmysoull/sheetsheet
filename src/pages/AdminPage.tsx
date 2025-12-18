import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'
import { adminCreateUser, fetchProfiles, setUserRole } from '@/services/supabaseInventory'
import { supabase } from '@/config/supabase'

const roles = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'funcionario', label: 'Funcionário' },
  { value: 'auxiliar', label: 'Auxiliar' }
]

const AdminPage: React.FC = () => {
  const { user, role } = useAuth()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [newRole, setNewRole] = React.useState('funcionario')
  const [kitchenCode, setKitchenCode] = React.useState(() => localStorage.getItem('kitchen_code') || '')
  const [loading, setLoading] = React.useState(false)
  const [profiles, setProfiles] = React.useState<Array<{ user_id: string, role: string }>>([])

  const load = async () => {
    try {
      const data = await fetchProfiles()
      setProfiles(data)
    } catch {}
  }

  React.useEffect(() => { load() }, [])

  const createUser = async () => {
    if (!supabase) {
      toast({
        title: 'Backend não configurado',
        description: 'Configure Supabase para criar contas reais. Como alternativa, o e‑mail em .env será tratado como admin ao logar.',
        variant: 'destructive'
      })
      return
    }
    try {
      setLoading(true)
      const id = await adminCreateUser(email.trim(), password, newRole, kitchenCode.trim())
      if (id) {
        toast({ title: 'Usuário criado', description: `ID: ${id}` })
        setEmail(''); setPassword('')
        await load()
      } else {
        toast({ title: 'Falha ao criar usuário', variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  const updateRole = async (userId: string, roleValue: string) => {
    if (!supabase) {
      toast({ title: 'Backend não configurado', description: 'Não é possível persistir roles sem Supabase.', variant: 'destructive' })
      return
    }
    const ok = await setUserRole(userId, roleValue)
    if (ok) {
      toast({ title: 'Permissão atualizada' })
      await load()
    } else {
      toast({ title: 'Falha ao atualizar', variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Painel Administrativo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Usuário atual</div>
              <div className="font-medium">{user?.email || user?.id}</div>
              <div className="text-sm">Role: {role}</div>
            </div>
            <div>
              <Label className="mb-1 block">Kitchen Code</Label>
              <Input value={kitchenCode} onChange={(e) => setKitchenCode(e.target.value)} placeholder="EX: COZZI01" />
            </div>
            <div className="text-sm text-muted-foreground">
              Para criar contas e editar permissões é necessário Supabase configurado.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Criar Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Label className="mb-1 block">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label className="mb-1 block">Senha</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
            </div>
            <div>
              <Label className="mb-1 block">Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={createUser} disabled={loading || !email || !password}>Criar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Perfis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map(p => (
                <TableRow key={p.user_id}>
                  <TableCell className="font-mono text-xs">{p.user_id}</TableCell>
                  <TableCell>{p.role}</TableCell>
                  <TableCell className="text-right">
                    <Select value={p.role} onValueChange={(val) => updateRole(p.user_id, val)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum perfil encontrado</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminPage
