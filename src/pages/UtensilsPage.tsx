import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useInventory } from '@/hooks/useInventory'
import { UtensilStatus } from '@/types/inventory'

const UtensilsPage: React.FC = () => {
  const { utensils, addUtensil, updateUtensilStatus } = useInventory()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('geral')
  const [status, setStatus] = useState<UtensilStatus>('ok')
  const [notes, setNotes] = useState('')
  const [filter, setFilter] = useState<'all' | UtensilStatus>('all')
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    return utensils.filter(u => filter === 'all' ? true : u.status === filter)
  }, [utensils, filter])

  const onAdd = () => {
    if (!name.trim()) return
    addUtensil({ name: name.trim(), category, status, notes: notes.trim() || undefined })
    setName('')
    setNotes('')
    setStatus('ok')
    setCategory('geral')
  }

  const statusBadge = (s: UtensilStatus) => {
    if (s === 'ok') return <Badge variant="secondary">OK</Badge>
    if (s === 'danificado') return <Badge variant="destructive">Danificado</Badge>
    return <Badge variant="outline">Manutenção</Badge>
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/home'); }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Utensílios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm">Nome</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Faca chef 8" />
              </div>
              <div>
                <label className="text-sm">Categoria</label>
                <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: facas" />
              </div>
              <div>
                <label className="text-sm">Status</label>
                <Select value={status} onValueChange={v => setStatus(v as UtensilStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ok">OK</SelectItem>
                    <SelectItem value="danificado">Danificado</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={onAdd}>Adicionar</Button>
              </div>
              <div className="md:col-span-4">
                <label className="text-sm">Observações</label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: afiar semanalmente" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{filtered.length} utensílio(s)</Badge>
              <Select value={filter} onValueChange={(v) => setFilter(v as ('all' | UtensilStatus))}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ok">OK</SelectItem>
                  <SelectItem value="danificado">Danificado</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.category}</TableCell>
                    <TableCell>{statusBadge(u.status)}</TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="outline" size="sm" onClick={() => updateUtensilStatus(u.id, 'ok')}>OK</Button>
                      <Button variant="outline" size="sm" onClick={() => updateUtensilStatus(u.id, 'danificado')}>Danificado</Button>
                      <Button variant="outline" size="sm" onClick={() => updateUtensilStatus(u.id, 'manutencao')}>Manutenção</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default UtensilsPage
