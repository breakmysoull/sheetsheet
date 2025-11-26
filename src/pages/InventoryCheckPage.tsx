import React from 'react'
import { motion } from 'framer-motion'
import { useInventory } from '@/hooks/useInventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useLocation, useNavigate } from 'react-router-dom'

const InventoryCheckPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation() as any
  const { sheets, activeSheetIndex, adjustByInventory, dailyItems, selectedDailyPlaza, setSelectedDailyPlaza, selectedResponsible, setSelectedResponsible, getDailyInventory, upsertDailyInventory, recipes } = useInventory() as any
  const activeSheet = sheets[activeSheetIndex]
  const itemsToDisplay = dailyItems
  const [extraItems, setExtraItems] = React.useState<Array<{ id: string; name: string; quantity: number }>>([])
  const [newIngredient, setNewIngredient] = React.useState('')
  const ingredientOptions = React.useMemo(() => {
    const names = new Set<string>()
    const recipesArr = recipes || []
    const plazaLc = String(selectedDailyPlaza || '').toLowerCase()
    recipesArr.filter((r: any) => (r.category || '').toLowerCase() === plazaLc)
      .forEach((r: any) => r.ingredients.forEach((ing: any) => names.add(ing.itemName)))
    return Array.from(names)
  }, [recipes, selectedDailyPlaza])
  const [counts, setCounts] = React.useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    const list = (itemsToDisplay || [])
    list.forEach((i: any) => { init[i.id] = i.quantity })
    return init
  })

  const addItem = () => {
    const name = newIngredient.trim()
    if (!name) return
    const id = name.toLowerCase()
    const exists = extraItems.some(i => i.id === id) || (itemsToDisplay || []).some((i: any) => (i.id === id || i.name.toLowerCase() === id))
    if (exists) { setNewIngredient(''); return }
    const created = { id, name, quantity: 0 }
    setExtraItems(prev => [...prev, created])
    setCounts(prev => ({ ...prev, [id]: 0 }))
    setNewIngredient('')
  }

  React.useEffect(() => {
    const s = location?.state || {}
    if (s?.plaza) setSelectedDailyPlaza(s.plaza)
    if (s?.responsible) setSelectedResponsible(s.responsible)
  }, [location?.state, setSelectedDailyPlaza, setSelectedResponsible])

  const yesterday = React.useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0,10)
  }, [])
  const prev = React.useMemo(() => selectedDailyPlaza ? getDailyInventory(selectedDailyPlaza, yesterday) : null, [selectedDailyPlaza, yesterday, getDailyInventory])
  const prevMap = React.useMemo(() => {
    const map: Record<string, number> = {}
    const arr = prev?.items || []
    arr.forEach(i => { map[i.name.toLowerCase()] = i.quantity })
    return map
  }, [prev])

  const finalize = () => {
    const list = [...(itemsToDisplay || []), ...extraItems]
    const payload = list.map((i: any) => ({ id: i.id, name: i.name, counted: counts[i.id] ?? i.quantity }))
    if (selectedDailyPlaza) {
      const today = new Date().toISOString().slice(0,10)
      upsertDailyInventory(selectedDailyPlaza, today, payload.map(p => ({ name: p.name, quantity: p.counted })))
    }
    adjustByInventory(payload, 'all')
    navigate('/inventory')
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-3 sm:gap-0 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Inventário diário — {selectedDailyPlaza || 'Praça'}{selectedResponsible ? ` (${selectedResponsible})` : ''}</h1>
            <p className="text-muted-foreground">Ajuste o estoque com base na contagem da praça selecionada</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={finalize}>Finalizar inventário</Button>
          </div>
        </motion.div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Praça: <Badge variant="secondary">{selectedDailyPlaza || 'Selecione uma praça'}</Badge>
            </CardTitle>
          </CardHeader>
            <CardContent>
              {((itemsToDisplay || []).length === 0 && extraItems.length === 0) && (
                <div className="mb-4 text-sm text-muted-foreground">Nenhum item cadastrado para esta praça. Adicione abaixo.</div>
              )}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Select value={newIngredient} onValueChange={setNewIngredient}>
                  <SelectTrigger className="max-w-sm"><SelectValue placeholder="Adicionar item do cardápio" /></SelectTrigger>
                  <SelectContent>
                    {ingredientOptions.map(n => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="secondary" onClick={addItem}>Adicionar</Button>
              </div>
              <div className="overflow-x-auto">
              <Table className="min-w-[360px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Sistema</TableHead>
                  <TableHead className="text-center">Contado</TableHead>
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
                        value={counts[item.id] ?? item.quantity}
                        onChange={(e) => setCounts(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                        className="w-32 mx-auto"
                      />
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
