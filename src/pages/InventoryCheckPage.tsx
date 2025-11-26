import React from 'react'
import { motion } from 'framer-motion'
import { useInventory } from '@/hooks/useInventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'

const InventoryCheckPage: React.FC = () => {
  const navigate = useNavigate()
  const { sheets, activeSheetIndex, adjustByInventory } = useInventory() as any
  const activeSheet = sheets[activeSheetIndex]
  const [counts, setCounts] = React.useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    ;(activeSheet?.items || []).forEach(i => { init[i.id] = i.quantity })
    return init
  })

  const setAll = (value: number) => {
    const next: Record<string, number> = {}
    ;(activeSheet?.items || []).forEach(i => { next[i.id] = value })
    setCounts(next)
  }

  const finalize = () => {
    const payload = (activeSheet?.items || []).map(i => ({ id: i.id, name: i.name, counted: counts[i.id] ?? i.quantity }))
    adjustByInventory(payload, 'active')
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Inventário (Contagem Real)</h1>
            <p className="text-muted-foreground">Ajuste o estoque com base na contagem física</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/')}>Voltar</Button>
            <Button onClick={() => setAll(0)} variant="secondary">Zerar todos</Button>
            <Button onClick={finalize}>Finalizar inventário</Button>
          </div>
        </motion.div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Aba: <Badge variant="secondary">{activeSheet?.name || 'Sem abas'}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Sistema</TableHead>
                  <TableHead className="text-center">Contado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activeSheet?.items || []).map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default InventoryCheckPage

