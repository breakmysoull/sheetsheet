import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useInventory } from '@/hooks/useInventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  itemName: z.string().min(1),
  quantity: z.number().min(0.0001),
  unit: z.string().min(1),
  supplier: z.string().optional(),
  price: z.number().min(0).optional(),
  date: z.string().min(1),
  photoUrl: z.string().url().optional()
})

type FormData = z.infer<typeof schema>

const PurchasesPage: React.FC = () => {
  const { purchases, addPurchase } = useInventory()
  const navigate = useNavigate()
  const { register, handleSubmit, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      itemName: '',
      quantity: 0,
      unit: 'un',
      supplier: '',
      price: undefined,
      date: new Date().toISOString().slice(0, 10),
      photoUrl: ''
    }
  })

  const onSubmit = (data: FormData) => {
    addPurchase(data)
    reset()
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Registrar Compra</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Item</Label>
                <Input {...register('itemName')} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input type="number" step="0.01" min="0" {...register('quantity', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Input {...register('unit')} />
                </div>
                <div className="space-y-2">
                  <Label>Preço Total (R$)</Label>
                  <Input type="number" step="0.01" min="0" {...register('price', { valueAsNumber: true })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Input {...register('supplier')} />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" {...register('date')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Foto (URL)</Label>
                <Input {...register('photoUrl')} />
              </div>
              <Button type="submit">Salvar Compra</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Histórico de Compras</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Un</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.itemName}</TableCell>
                    <TableCell>{p.quantity}</TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell>{p.supplier}</TableCell>
                    <TableCell>{p.price}</TableCell>
                    <TableCell>{p.date}</TableCell>
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

export default PurchasesPage
