import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useInventory } from '@/hooks/useInventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const DashboardPage: React.FC = () => {
  const { sheets, updateLogs, recipes } = useInventory()
  const navigate = useNavigate()
  const items = sheets.flatMap(s => s.items)
  const belowMin = items.filter(i => typeof i.minimum === 'number' && i.minimum > 0 && i.quantity < i.minimum)
  const totalQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)
  const recentLogs = updateLogs.slice(0, 10)

  const today = new Date()
  const isSameDay = (d: Date, t: Date) => d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
  const isSameMonth = (d: Date, t: Date) => d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()

  const consumedToday = updateLogs.filter(l => {
    const dt = l.timestamp ? new Date(l.timestamp) : new Date(l.dataHora)
    return isSameDay(dt, today) && (l.type === 'subtract')
  })
  const consumedMonth = updateLogs.filter(l => {
    const dt = l.timestamp ? new Date(l.timestamp) : new Date(l.dataHora)
    return isSameMonth(dt, today) && (l.type === 'subtract')
  })
  const qtyConsumedToday = consumedToday.reduce((sum, l) => sum + Math.abs(Number(l.change ?? l.quantidadeAlterada) || 0), 0)
  const qtyConsumedMonth = consumedMonth.reduce((sum, l) => sum + Math.abs(Number(l.change ?? l.quantidadeAlterada) || 0), 0)

  const cmvForLogs = (logs: typeof updateLogs) => {
    const byItem = new Map<string, number>()
    logs.forEach(l => {
      const name = (l.itemName || l.item || '').toLowerCase()
      const qty = Math.abs(Number(l.change ?? l.quantidadeAlterada) || 0)
      byItem.set(name, (byItem.get(name) || 0) + qty)
    })
    let total = 0
    byItem.forEach((qty, name) => {
      const item = items.find(i => i.name.toLowerCase() === name)
      const cost = item?.unitCost || 0
      total += qty * cost
    })
    return total
  }

  const cmvDia = cmvForLogs(consumedToday)
  const cmvMes = cmvForLogs(consumedMonth)
  const topCusto = items.filter(i => (i.unitCost || 0) > 0).sort((a, b) => (b.unitCost || 0) - (a.unitCost || 0)).slice(0, 5)

  const weekly = updateLogs.filter(l => {
    const dt = l.timestamp ? new Date(l.timestamp) : new Date(l.dataHora)
    return (l.type === 'subtract') && ((new Date().getTime() - dt.getTime()) / (1000 * 60 * 60 * 24) <= 7)
  })
  const weeklyAgg: Record<string, number> = {}
  weekly.forEach(l => {
    const name = (l.itemName || l.item || '').toLowerCase()
    const qty = Math.abs(Number(l.change ?? l.quantidadeAlterada) || 0)
    weeklyAgg[name] = (weeklyAgg[name] || 0) + qty
  })
  const suggestions = belowMin.map(i => {
    const name = i.name.toLowerCase()
    const needToMin = Math.max((i.minimum || 0) - i.quantity, 0)
    const weeklyUse = weeklyAgg[name] || 0
    const suggested = Math.max(needToMin, weeklyUse)
    return { item: i.name, suggested }
  }).sort((a, b) => b.suggested - a.suggested).slice(0, 10)

  const recipeCosts = recipes.map(r => {
    const cost = r.ingredients.reduce((sum, ing) => {
      const item = items.find(it => it.name.toLowerCase() === ing.itemName.toLowerCase())
      const unitCost = item?.unitCost || 0
      const perPortionQty = ing.quantity / (r.yield || 1)
      return sum + perPortionQty * unitCost
    }, 0)
    return { name: r.name, cost }
  }).sort((a, b) => b.cost - a.cost).slice(0, 10)

  const wastedMonth = updateLogs.filter(l => {
    const dt = l.timestamp ? new Date(l.timestamp) : new Date(l.dataHora)
    const isMonth = isSameMonth(dt, today)
    const isWaste = (l.type === 'subtract') && String((l as any).reason || '').toLowerCase().includes('perda')
    return isMonth && isWaste
  }).reduce((sum, l) => sum + Math.abs(Number(l.change ?? l.quantidadeAlterada) || 0), 0)

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto mb-4">
        <Button variant="ghost" size="sm" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/home'); }}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle>Produtos abaixo do mínimo</CardTitle></CardHeader>
          <CardContent>
            <Badge variant="destructive">{belowMin.length}</Badge>
            <div className="overflow-x-auto">
            <Table className="min-w-[360px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Min</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {belowMin.slice(0, 10).map(i => (
                  <TableRow key={i.id}><TableCell>{i.name}</TableCell><TableCell>{i.quantity}</TableCell><TableCell>{i.minimum}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Últimas 10 movimentações</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table className="min-w-[480px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map(l => (
                  <TableRow key={l.id}><TableCell>{l.itemName || l.item}</TableCell><TableCell>{l.type}</TableCell><TableCell>{l.change ?? l.quantidadeAlterada}</TableCell><TableCell>{l.reason}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Quantidade total no estoque</CardTitle></CardHeader>
          <CardContent>
            <Badge variant="secondary">{totalQty}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Consumo do dia / mês</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Badge variant="outline">Dia: {qtyConsumedToday}</Badge>
              <Badge variant="outline">Mês: {qtyConsumedMonth}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>CMV (dia / mês)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Badge variant="secondary">R$ {cmvDia.toFixed(2)}</Badge>
              <Badge variant="secondary">R$ {cmvMes.toFixed(2)}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Itens com maior custo unitário</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table className="min-w-[360px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Custo (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCusto.map(i => (
                  <TableRow key={i.id}><TableCell>{i.name}</TableCell><TableCell>{(i.unitCost || 0).toFixed(2)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Sugestão de lista de compras</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table className="min-w-[360px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Sugerido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map(s => (
                  <TableRow key={s.item}><TableCell>{s.item}</TableCell><TableCell>{s.suggested.toFixed(2)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Custo por prato (por porção)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table className="min-w-[360px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Receita</TableHead>
                  <TableHead>Custo (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipeCosts.map(r => (
                  <TableRow key={r.name}><TableCell>{r.name}</TableCell><TableCell>{r.cost.toFixed(2)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Desperdício estimado no mês</CardTitle></CardHeader>
          <CardContent>
            <Badge variant="destructive">{wastedMonth}</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
