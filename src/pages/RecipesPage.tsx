import React from 'react'
import { useInventory } from '@/hooks/useInventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  name: z.string().min(1),
  yield: z.number().min(1),
  category: z.string().optional(),
  ingredients: z.array(z.object({
    itemName: z.string().min(1),
    quantity: z.number().min(0.0001),
    unit: z.string().min(1)
  })).min(1)
})

type FormData = z.infer<typeof schema>

const RecipesPage: React.FC = () => {
  const { recipes, addRecipe, filteredItems } = useInventory()
  const { register, control, handleSubmit, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      yield: 1,
      category: '',
      ingredients: [{ itemName: '', quantity: 0, unit: 'un' }]
    }
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'ingredients' })

  const onSubmit = (data: FormData) => {
    addRecipe({ name: data.name, yield: data.yield, category: data.category, ingredients: data.ingredients })
    reset()
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Cadastrar Receita</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input {...register('name')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rendimento</Label>
                  <Input type="number" step="1" min="1" {...register('yield', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input {...register('category')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ingredientes</Label>
                <div className="space-y-2">
                  {fields.map((f, idx) => (
                    <div key={f.id} className="grid grid-cols-3 gap-2">
                      <Input list="items" placeholder="Item" {...register(`ingredients.${idx}.itemName` as const)} />
                      <Input type="number" step="0.01" min="0" placeholder="Qtd" {...register(`ingredients.${idx}.quantity` as const, { valueAsNumber: true })} />
                      <Input placeholder="Unidade" {...register(`ingredients.${idx}.unit` as const)} />
                      <Button type="button" variant="outline" onClick={() => remove(idx)}>Remover</Button>
                    </div>
                  ))}
                  <Button type="button" onClick={() => append({ itemName: '', quantity: 0, unit: 'un' })}>Adicionar ingrediente</Button>
                </div>
              </div>
              <Button type="submit">Salvar Receita</Button>
            </form>
            <datalist id="items">
              {filteredItems.map(i => (<option key={i.id} value={i.name} />))}
            </datalist>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Receitas</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Rendimento</TableHead>
                  <TableHead>Categoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.yield}</TableCell>
                    <TableCell>{r.category}</TableCell>
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

export default RecipesPage
