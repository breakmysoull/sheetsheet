import React from 'react'
import { useInventory } from '@/hooks/useInventory'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, UserPlus, ArrowLeft } from 'lucide-react'

type Responsible = { id: string; name: string; plaza: string; active: boolean }

const StorageKey = 'responsibles'

const InventoryDailyPage: React.FC = () => {
  const navigate = useNavigate()
  const { setSelectedResponsible, setSelectedDailyPlaza } = useInventory() as any
  const [responsibles, setResponsibles] = React.useState<Responsible[]>(() => {
    const raw = localStorage.getItem(StorageKey)
    return raw ? JSON.parse(raw) : []
  })
  const [name, setName] = React.useState('')
  const [plaza, setPlaza] = React.useState('')
  const [active, setActive] = React.useState(true)

  React.useEffect(() => {
    localStorage.setItem(StorageKey, JSON.stringify(responsibles))
  }, [responsibles])

  const addResponsible = () => {
    if (!name.trim() || !plaza) return
    const id = Date.now().toString()
    const next = [{ id, name: name.trim(), plaza, active }, ...responsibles]
    setResponsibles(next)
    setName('')
    setPlaza('')
    setActive(true)
  }

  const selectResponsible = (r: Responsible) => {
    setSelectedResponsible(r.name)
    setSelectedDailyPlaza(r.plaza)
    navigate('/inventory-daily-check', { state: { responsible: r.name, plaza: r.plaza } })
  }

  const activeList = responsibles.filter(r => r.active)

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/home'); }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            <h1 className="text-2xl md:text-3xl font-bold">Inventário diário por praças</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Selecione o responsável</CardTitle>
          </CardHeader>
          <CardContent>
            {activeList.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum responsável ativo. Cadastre abaixo.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {activeList.map(r => (
                  <Button key={r.id} variant="outline" className="h-20 flex flex-col items-center justify-center gap-1" onClick={() => selectResponsible(r)}>
                    <span className="font-medium">{r.name}</span>
                    <Badge variant="secondary">{r.plaza}</Badge>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><UserPlus className="h-4 w-4" /> Cadastrar responsável</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} />
            <Select value={plaza} onValueChange={setPlaza}>
              <SelectTrigger><SelectValue placeholder="Praça" /></SelectTrigger>
              <SelectContent>
                {['Entradas','Principais','Sobremesas'].map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <span className="text-sm">Ativo</span>
            </div>
            <Button onClick={addResponsible}>Adicionar</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default InventoryDailyPage
