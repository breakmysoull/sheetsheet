import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useInventory } from '@/hooks/useInventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/context/AuthContext'
import { XLSXHandler } from '@/services/xlsxHandler'

const ReportsPage: React.FC = () => {
  const { sheets, updateLogs } = useInventory()
  const { role } = useAuth()
  const navigate = useNavigate()
  const items = sheets.flatMap(s => s.items)

  const today = new Date()
  const isSameDay = (d: Date, t: Date) => d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
  const isWithinDays = (d: Date, days: number) => {
    const diff = (new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= days
  }

  const logsToday = updateLogs.filter(l => {
    const dt = l.timestamp ? new Date(l.timestamp) : new Date(l.dataHora)
    return isSameDay(dt, today) && (l.type === 'subtract')
  })
  const logsWeek = updateLogs.filter(l => {
    const dt = l.timestamp ? new Date(l.timestamp) : new Date(l.dataHora)
    return isWithinDays(dt, 7) && (l.type === 'subtract')
  })

  const handleExportReports = () => {
    XLSXHandler.exportReports(sheets, updateLogs, 'relatorios_inventario.xlsx')
  }

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
          <Card>
            <CardHeader><CardTitle>Acesso restrito</CardTitle></CardHeader>
            <CardContent>
              Apenas administradores podem gerar relatórios.
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <Card>
          <CardHeader><CardTitle>Relatórios e Exportação</CardTitle></CardHeader>
          <CardContent className="flex gap-4">
            <Button onClick={handleExportReports}>Exportar XLSX</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Consumo diário (top 10)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(logsToday.reduce((acc: Record<string, number>, l) => {
                  const name = (l.itemName || l.item || '').toLowerCase()
                  const qty = Math.abs(Number(l.change ?? l.quantidadeAlterada) || 0)
                  acc[name] = (acc[name] || 0) + qty
                  return acc
                }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, qty]) => (
                  <TableRow key={name}><TableCell>{name}</TableCell><TableCell>{qty}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Consumo semanal (top 10)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(logsWeek.reduce((acc: Record<string, number>, l) => {
                  const name = (l.itemName || l.item || '').toLowerCase()
                  const qty = Math.abs(Number(l.change ?? l.quantidadeAlterada) || 0)
                  acc[name] = (acc[name] || 0) + qty
                  return acc
                }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, qty]) => (
                  <TableRow key={name}><TableCell>{name}</TableCell><TableCell>{qty}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ReportsPage
