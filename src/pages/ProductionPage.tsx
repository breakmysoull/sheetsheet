import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useInventory } from '@/hooks/useInventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ProductionPage: React.FC = () => {
  const { recipes, registerProduction } = useInventory()
  const [recipeId, setRecipeId] = useState<string>('')
  const [portions, setPortions] = useState<number>(0)
  const recipe = useMemo(() => recipes.find(r => r.id === recipeId) || null, [recipes, recipeId])
  const factor = useMemo(() => (recipe && recipe.yield > 0 ? portions / recipe.yield : 0), [recipe, portions])
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/home'); }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <Card>
          <CardHeader><CardTitle>Registrar Produção</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Receita</Label>
                <Select value={recipeId} onValueChange={setRecipeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipes.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Porções produzidas</Label>
                <Input type="number" step="1" min="0" value={portions} onChange={(e) => setPortions(Number(e.target.value))} />
              </div>
            </div>
            {recipe && factor > 0 && (
              <div className="overflow-x-auto">
              <Table className="min-w-[480px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantidade a descontar</TableHead>
                    <TableHead>Unidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipe.ingredients.map(ing => (
                    <TableRow key={ing.itemName}>
                      <TableCell>{ing.itemName}</TableCell>
                      <TableCell>{(ing.quantity * factor).toFixed(3)}</TableCell>
                      <TableCell>{ing.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
            <Button disabled={!recipe || factor <= 0} onClick={() => registerProduction(recipeId, portions)}>Confirmar e descontar</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ProductionPage
