import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useInventory } from '@/hooks/useInventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'

const AuditPage: React.FC = () => {
  const { updateLogs } = useInventory()
  const [q, setQ] = React.useState('')
  const navigate = useNavigate()
  const logs = React.useMemo(() => {
    return updateLogs.filter(l => {
      const s = `${l.itemName || l.item} ${l.usuario} ${l.type} ${l.reason || ''}`.toLowerCase()
      return s.includes(q.toLowerCase())
    })
  }, [updateLogs, q])
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/home'); }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Auditoria de Movimentações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Buscar por item, usuário, tipo, motivo" value={q} onChange={e => setQ(e.target.value)} />
            <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Δ</TableHead>
                  <TableHead>Novo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>{(l.timestamp ? new Date(l.timestamp) : new Date(l.dataHora)).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{l.usuario}</TableCell>
                    <TableCell>{l.itemName || l.item}</TableCell>
                    <TableCell>{l.type}</TableCell>
                    <TableCell>{l.reason}</TableCell>
                    <TableCell>{l.change ?? l.quantidadeAlterada}</TableCell>
                    <TableCell>{l.novaQuantidade}</TableCell>
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

export default AuditPage
