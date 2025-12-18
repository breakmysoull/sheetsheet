import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useInventory } from '@/hooks/useInventory'

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

const ForecastPage: React.FC = () => {
  const { sheets, updateLogs } = useInventory()
  const navigate = useNavigate()

  const items = useMemo(() => {
    return sheets.flatMap(s => s.items)
  }, [sheets])

  const consumption7d = useMemo(() => {
    const cutoff = daysAgo(7)
    const map = new Map<string, number>()
    updateLogs.forEach(l => {
      const dt = l.timestamp ? new Date(l.timestamp) : new Date(l.dataHora)
      if (dt >= cutoff) {
        const name = (l.itemName || l.item).toLowerCase()
        const change = l.change ?? l.quantidadeAlterada
        const qty = typeof change === 'number' ? change : 0
        if (qty < 0 || (l.type === 'subtract')) {
          const used = Math.abs(qty)
          map.set(name, (map.get(name) || 0) + used)
        }
      }
    })
    return map
  }, [updateLogs])

  const recommendations = useMemo(() => {
    const byName = new Map<string, { name: string; quantity: number; minimum?: number }>()
    items.forEach(i => {
      const key = i.name.toLowerCase()
      const existing = byName.get(key)
      if (!existing) byName.set(key, { name: i.name, quantity: i.quantity, minimum: i.minimum })
      else byName.set(key, { ...existing, quantity: existing.quantity + i.quantity })
    })
    const rows: Array<{ name: string; qty: number; avgDaily: number; current: number; minimum?: number }> = []
    byName.forEach((val, key) => {
      const used7 = consumption7d.get(key) || 0
      const avgDaily = used7 / 7
      const buffer = Math.ceil(avgDaily * 3)
      let rec = 0
      if (typeof val.minimum === 'number' && val.minimum > 0) {
        if (val.quantity < val.minimum) rec = (val.minimum - val.quantity) + buffer
      } else if (avgDaily > 0) {
        const target = buffer
        if (val.quantity < target) rec = target - val.quantity
      }
      if (rec > 0) rows.push({ name: val.name, qty: Math.ceil(rec), avgDaily: Number(avgDaily.toFixed(2)), current: val.quantity, minimum: val.minimum })
    })
    return rows.sort((a, b) => b.qty - a.qty)
  }, [items, consumption7d])

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/home'); }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Previsão de Compra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{recommendations.length} item(ns) recomendados</Badge>
            </div>
            <div className="overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Atual</TableHead>
                  <TableHead>Mínimo</TableHead>
                  <TableHead>Média diária (7d)</TableHead>
                  <TableHead>Comprar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendations.map(r => (
                  <TableRow key={r.name}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.current}</TableCell>
                    <TableCell>{typeof r.minimum === 'number' ? r.minimum : '-'}</TableCell>
                    <TableCell>{r.avgDaily}</TableCell>
                    <TableCell className="font-semibold">{r.qty}</TableCell>
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

export default ForecastPage
