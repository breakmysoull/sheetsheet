import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useInventory } from '@/hooks/useInventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

const todayStr = () => new Date().toISOString().slice(0, 10)

const ChecklistPage: React.FC = () => {
  const { getChecklistForDate, toggleChecklistItem, setChecklistCategoryAll, resetChecklist } = useInventory()
  const [date, setDate] = useState<string>(todayStr())
  const checklist = useMemo(() => getChecklistForDate(date), [date, getChecklistForDate])
  const total = checklist.categories.reduce((sum, c) => sum + c.items.length, 0)
  const done = checklist.categories.reduce((sum, c) => sum + c.items.filter(i => i.checked).length, 0)
  const navigate = useNavigate()

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
          <CardHeader><CardTitle>Checklist Diário</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Badge variant="secondary">{done}/{total} concluídos</Badge>
                <Button variant="outline" onClick={() => resetChecklist(date)}>Resetar dia</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {checklist.categories.map(cat => (
                <Card key={cat.name}>
                  <CardHeader className="pb-2"><CardTitle>{cat.name}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setChecklistCategoryAll(date, cat.name, true)}>Marcar tudo</Button>
                      <Button size="sm" variant="outline" onClick={() => setChecklistCategoryAll(date, cat.name, false)}>Limpar</Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Tarefa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cat.items.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Checkbox checked={item.checked} onCheckedChange={(v) => toggleChecklistItem(date, cat.name, item.id, Boolean(v))} />
                            </TableCell>
                            <TableCell>{item.label}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ChecklistPage
