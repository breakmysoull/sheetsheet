import React from 'react'
import { motion } from 'framer-motion'
import { useInventory } from '@/hooks/useInventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
 
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'

const InventoryCheckPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation() as any
  const { sheets, activeSheetIndex, dailyItems, selectedDailyPlaza, setSelectedDailyPlaza, selectedResponsible, setSelectedResponsible, getLatestInventory, upsertDailyInventory, recipes, selectedDailyRecipeIds, setSelectedDailyRecipeIds } = useInventory() as any
  const activeSheet = sheets[activeSheetIndex]
  const itemsToDisplay = dailyItems
  const [extraItems, setExtraItems] = React.useState<Array<{ id: string; name: string; quantity: number }>>([])
  
  const recipeOptions = React.useMemo(() => {
    const plazaLc = String(selectedDailyPlaza || '').toLowerCase()
    return (recipes || []).filter((r: any) => (r.category || '').toLowerCase().includes(plazaLc) && ((r.active ?? true) === true))
  }, [recipes, selectedDailyPlaza])
  const [counts, setCounts] = React.useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    const list = (itemsToDisplay || [])
    list.forEach((i: any) => { init[i.id] = '0' })
    return init
  })

  

  React.useEffect(() => {
    const s = location?.state || {}
    if (s?.plaza) setSelectedDailyPlaza(s.plaza)
    if (s?.responsible) setSelectedResponsible(s.responsible)
  }, [location?.state, setSelectedDailyPlaza, setSelectedResponsible])

  const prev = React.useMemo(() => selectedDailyPlaza ? getLatestInventory(selectedDailyPlaza) : null, [selectedDailyPlaza, getLatestInventory])
  const prevMap = React.useMemo(() => {
    const map: Record<string, number> = {}
    const arr = prev?.items || []
    arr.forEach(i => { map[i.name.toLowerCase()] = i.quantity })
    return map
  }, [prev])
  const unitMap = React.useMemo(() => {
    const map: Record<string, { unit?: string; minimum?: number }> = {}
    sheets.flatMap((s: any) => s.items).forEach((i: any) => {
      map[i.name.toLowerCase()] = { unit: i.unit, minimum: i.minimum }
    })
    return map
  }, [sheets])

  const finalize = () => {
    const list = [...(itemsToDisplay || []), ...extraItems]
    const payload = list.map((i: any) => {
      const c = counts[i.id]
      const counted = (c === undefined || c === '') ? i.quantity : Number(c)
      return { id: i.id, name: i.name, counted }
    })
    if (selectedDailyPlaza) {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
      upsertDailyInventory(selectedDailyPlaza, today, payload.map(p => ({ name: p.name, quantity: p.counted })))
    }
    const zeroed: Record<string, string> = {}
    list.forEach((i: any) => { zeroed[i.id] = '0' })
    setCounts(zeroed)
    setExtraItems([])
    toast({ title: 'Turno salvo', description: 'Inventário diário salvo com sucesso.' })
  }

  React.useEffect(() => {
    const zeroed: Record<string, string> = {}
    ;(itemsToDisplay || []).forEach((i: any) => { zeroed[i.id] = '0' })
    setCounts(zeroed)
    setExtraItems([])
  }, [location.key, itemsToDisplay])

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/home'); }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-3 sm:gap-0 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Inventário diário — {selectedDailyPlaza || 'Praça'}{selectedResponsible ? ` (${selectedResponsible})` : ''}</h1>
            <p className="text-muted-foreground">Ajuste o estoque com base na contagem da praça selecionada</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={finalize}>Salvar turno</Button>
          </div>
        </motion.div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Praça: <Badge variant="secondary">{selectedDailyPlaza || 'Selecione uma praça'}</Badge>
            </CardTitle>
          </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                <div className="text-sm font-medium">Receitas do dia</div>
                <div className="flex flex-wrap gap-2">
                  {recipeOptions.map((r: any) => {
                    const checked = selectedDailyRecipeIds.includes(r.id)
                    return (
                      <Button key={r.id} variant={checked ? 'secondary' : 'outline'} size="sm" onClick={() => {
                        setSelectedDailyRecipeIds((prev: string[]) => checked ? prev.filter(id => id !== r.id) : [...prev, r.id])
                      }}>
                        {r.name}
                      </Button>
                    )
                  })}
                  {recipeOptions.length === 0 && (
                    <Badge variant="outline">Nenhuma receita cadastrada nesta praça</Badge>
                  )}
                </div>
                
              </div>
              {((itemsToDisplay || []).length === 0 && extraItems.length === 0) && (
                <div className="mb-4 text-sm text-muted-foreground">Nenhum item para exibir. Selecione receitas acima ou adicione abaixo.</div>
              )}
              
              <div className="overflow-x-auto">
              <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Dia anterior</TableHead>
                  <TableHead className="text-center">Contado</TableHead>
                  <TableHead className="text-center">Unidade</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...(itemsToDisplay || []), ...extraItems].map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-center">{prevMap[item.name.toLowerCase()] ?? 0}</TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        step="0.1"
                        value={counts[item.id] ?? String(item.quantity)}
                        onChange={(e) => setCounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-32 mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-center">{unitMap[item.name.toLowerCase()]?.unit || item.unit || 'un'}</TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const min = unitMap[item.name.toLowerCase()]?.minimum
                        const raw = counts[item.id]
                        const qty = (raw === undefined || raw === '') ? item.quantity : Number(raw)
                        return (typeof min === 'number' && min > 0 && qty < min) ? (
                          <Badge variant="destructive">crítico</Badge>
                        ) : (
                          <Badge variant="secondary">ok</Badge>
                        )
                      })()}
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

export default InventoryCheckPage
