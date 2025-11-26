import React from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { InventoryItem } from '@/types/inventory'

const lossSchema = z.object({
  itemId: z.string().min(1, 'Selecione o item'),
  quantity: z.number().min(0.0001, 'Quantidade deve ser maior que 0').max(999999, 'Quantidade muito alta'),
  reason: z.string().min(1, 'Motivo é obrigatório').max(200)
})

type LossFormData = z.infer<typeof lossSchema>

interface LossFormProps {
  items: InventoryItem[]
  onSubmit: (data: { itemId: string; quantity: number; reason: string }) => void
}

export const LossForm: React.FC<LossFormProps> = ({ items, onSubmit }) => {
  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<LossFormData>({
    resolver: zodResolver(lossSchema),
    defaultValues: { itemId: '', quantity: 0, reason: '' }
  })

  const submit = (data: LossFormData) => {
    onSubmit({ itemId: data.itemId, quantity: data.quantity, reason: data.reason })
    reset()
    toast({ title: 'Perda registrada', description: `${data.quantity} do item` })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Registrar perda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="itemId">Item *</Label>
          <Select onValueChange={(value) => setValue('itemId', value)}>
            <SelectTrigger className={errors.itemId ? 'border-red-500' : ''}>
              <SelectValue placeholder="Selecione o item" />
            </SelectTrigger>
            <SelectContent>
              {items.map(i => (
                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.itemId && (
            <p className="text-sm text-red-500">{errors.itemId.message as string}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.1"
              min="0"
              placeholder="0"
              {...register('quantity', { valueAsNumber: true })}
              className={errors.quantity ? 'border-red-500' : ''}
            />
            {errors.quantity && (
              <p className="text-sm text-red-500">{errors.quantity.message as string}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo *</Label>
            <Input
              id="reason"
              placeholder="Ex: vencimento, avaria"
              {...register('reason')}
              className={errors.reason ? 'border-red-500' : ''}
            />
            {errors.reason && (
              <p className="text-sm text-red-500">{errors.reason.message as string}</p>
            )}
          </div>
        </div>

        <Button onClick={handleSubmit(submit)} className="w-full">Registrar perda</Button>
      </CardContent>
    </Card>
  )
}

