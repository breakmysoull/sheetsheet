import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useInventory } from '@/hooks/useInventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  name: z.string().min(1),
  yield: z.number().min(1),
  category: z.string().optional(),
  prePrep: z.number().min(0).optional(),
  finishPrep: z.number().min(0).optional(),
  ingredients: z.array(z.object({
    itemName: z.string().min(1),
    unit: z.string().min(1),
    qtyGross: z.number().min(0).optional(),
    qtyNet: z.number().min(0.0001),
    costUnit: z.number().min(0).optional(),
    correctionFactor: z.number().min(0).optional(),
    subtotal: z.number().min(0).optional(),
    sourceType: z.enum(['item','recipe']).optional(),
    sourceId: z.string().optional(),
    brand: z.string().optional()
  })).min(1),
  steps: z.array(z.string()).optional(),
  validityChilled: z.number().min(0).optional(),
  validityFrozen: z.number().min(0).optional(),
  allergens: z.array(z.string()).optional(),
  revision: z.number().min(0).optional(),
  lastChangedAt: z.string().optional()
})

type FormData = z.infer<typeof schema>

const RecipesPage: React.FC = () => {
  const { recipes, addRecipe, updateRecipe, duplicateRecipe, deleteRecipe, filteredItems } = useInventory()
  const navigate = useNavigate()
  const { register, control, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      yield: 1,
      category: '',
      prePrep: 0,
      finishPrep: 0,
      ingredients: [{ itemName: '', unit: 'un', qtyGross: 0, qtyNet: 0 }],
      steps: [''],
      validityChilled: 0,
      validityFrozen: 0,
      allergens: [],
      revision: 1,
      lastChangedAt: ''
    }
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'ingredients' })
  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({ control, name: 'steps' })
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)
  const allergensList = ['Glúten','Lactose','Amendoim','Ovos','Soja','Peixe','Frutos-do-mar','Nozes','Gergelim']

  const onDropImage = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImagePreview(String(reader.result))
    reader.readAsDataURL(file)
  }
  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImagePreview(String(reader.result))
    reader.readAsDataURL(file)
  }

  const onSubmit = (data: FormData) => {
    if (submitting) return
    setSubmitting(true)
    const nameNorm = (data.name || '').trim().toLowerCase()
    const catNorm = (data.category || '').trim().toLowerCase()
    const exists = recipes.some(r => (editingId ? r.id !== editingId : true) && (r.name || '').trim().toLowerCase() === nameNorm && (String(r.category || '').trim().toLowerCase() === catNorm))
    if (exists) {
      toast({ title: 'Receita duplicada', description: 'Já existe uma receita com esse nome na categoria selecionada.', variant: 'destructive' })
      setSubmitting(false)
      return
    }
    const mappedIngredients = data.ingredients.map(i => {
      const asRecipe = recipes.find(r => (r.name || '').toLowerCase() === (i.itemName || '').toLowerCase())
      return {
        itemName: i.itemName,
        quantity: i.qtyNet,
        unit: i.unit,
        qtyGross: i.qtyGross,
        brand: i.brand,
        isSubRecipe: !!asRecipe,
        recipeId: asRecipe?.id
      }
    })
    const extra = {
      prePrep: data.prePrep || 0,
      finishPrep: data.finishPrep || 0,
      steps: data.steps || [],
      validityChilled: data.validityChilled || 0,
      validityFrozen: data.validityFrozen || 0,
      allergens: data.allergens || [],
      imagePreview,
      lastChangedAt: new Date().toISOString(),
      revision: data.revision || 1
    }
    if (editingId) {
      updateRecipe(editingId, { name: data.name, yield: data.yield, category: data.category, ingredients: mappedIngredients, ...extra })
      toast({ title: 'Receita salva', description: 'Receita atualizada com sucesso.' })
      setEditingId(null)
    } else {
      addRecipe({ name: data.name, yield: data.yield, category: data.category, ingredients: mappedIngredients, ...extra })
      toast({ title: 'Receita salva', description: 'Receita criada com sucesso.' })
    }
    reset()
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto mb-4">
        <Button variant="ghost" size="sm" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/home'); }}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
      <div className="max-w-7xl mx-auto space-y-4">
        <Card>
          <CardHeader><CardTitle>Ficha Técnica</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input {...register('name')} />
                </div>
                <div className="space-y-2">
                  <Label>Setor de preparo</Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Entradas">Entradas</SelectItem>
                          <SelectItem value="Principais">Principais</SelectItem>
                          <SelectItem value="Sobremesas">Sobremesas</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rendimento</Label>
                  <Input type="number" step="1" min="1" {...register('yield', { valueAsNumber: true })} />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pré-preparo (min)</Label>
                    <Input type="number" step="1" min="0" {...register('prePrep', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Finalização (min)</Label>
                    <Input type="number" step="1" min="0" {...register('finishPrep', { valueAsNumber: true })} />
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDropImage}
                    className="border rounded-md p-4 flex items-center justify-center h-32 bg-muted/20"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Prévia" className="h-full object-contain" />
                    ) : (
                      <div className="text-sm text-muted-foreground text-center">
                        Arraste e solte a foto aqui ou
                        <div className="mt-2"><Input type="file" accept="image/*" onChange={onPickImage} /></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="mb-2 font-medium">Ingredientes</div>
                  <div className="space-y-2">
                    {fields.map((f, idx) => (
                      <div key={f.id} className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-2 xl:grid-cols-6 gap-2">
                        <Input list="itemsAndRecipes" placeholder="Ingrediente ou Sub-receita" {...register(`ingredients.${idx}.itemName` as const)} />
                        <Input placeholder="Unidade" {...register(`ingredients.${idx}.unit` as const)} />
                        <Input placeholder="Marca/Obs." {...register(`ingredients.${idx}.brand` as const)} />
                        <Input type="number" step="0.01" min="0" placeholder="Qtd líquida" {...register(`ingredients.${idx}.qtyNet` as const, { valueAsNumber: true })} />
                        <div className="col-span-2 md:col-span-2 lg:col-span-2 xl:col-span-2 flex items-center gap-2">
                          {(() => {
                            const name = watch(`ingredients.${idx}.itemName` as const)
                            const isRec = !!recipes.find(r => (r.name || '').toLowerCase() === String(name || '').toLowerCase())
                            const rec = isRec ? recipes.find(r => (r.name || '').toLowerCase() === String(name || '').toLowerCase()) : null
                            return (
                              <div className="flex items-center gap-2">
                                <Badge variant={isRec ? 'secondary' : 'outline'}>{isRec ? 'Sub-receita' : 'Ingrediente'}</Badge>
                                {isRec && rec ? (<span className="text-xs text-muted-foreground">Rendimento: {rec.yield}</span>) : null}
                                <Button type="button" variant="outline" size="sm" onClick={() => remove(idx)}>Remover</Button>
                              </div>
                            )
                          })()}
                        </div>
                        <Input type="number" step="0.01" min="0" {...register(`ingredients.${idx}.costUnit` as const, { valueAsNumber: true })} className="hidden" />
                        <Input type="number" step="0.01" min="0" {...register(`ingredients.${idx}.correctionFactor` as const, { valueAsNumber: true })} className="hidden" />
                        <Input type="number" step="0.01" min="0" {...register(`ingredients.${idx}.subtotal` as const, { valueAsNumber: true })} className="hidden" />
                      </div>
                    ))}
                    <Button type="button" onClick={() => append({ itemName: '', unit: 'un', qtyGross: 0, qtyNet: 0 })}>Adicionar ingrediente</Button>
                  </div>
                </div>
                <div>
                  <div className="mb-2 font-medium">Modo de preparo</div>
                  <div className="space-y-4">
                    {stepFields.map((s, idx) => (
                      <div key={s.id} className="space-y-3">
                        <Label>Passo {idx + 1}</Label>
                        <Textarea className="w-full" {...register(`steps.${idx}` as const)} placeholder="Descreva o passo" />
                        <div className="flex justify-end mt-2">
                          <Button type="button" className="relative z-0" variant="outline" size="sm" onClick={() => removeStep(idx)}>Remover passo</Button>
                        </div>
                      </div>
                    ))}
                    <div className="mt-4">
                      <Button type="button" className="w-full relative z-0" onClick={() => appendStep('')}>Adicionar passo</Button>
                    </div>
                  </div>
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="advanced">
                  <AccordionTrigger>Dados Avançados</AccordionTrigger>
                  <AccordionContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <div className="space-y-2">
                  <Label>Validade refrigerado (dias)</Label>
                  <Input type="number" step="1" min="0" {...register('validityChilled', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Validade congelado (dias)</Label>
                  <Input type="number" step="1" min="0" {...register('validityFrozen', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Alérgenos</Label>
                  <div className="flex flex-wrap gap-3">
                    {allergensList.map(a => {
                      const checked = (watch('allergens') || []).includes(a)
                      return (
                        <label key={a} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={checked} onCheckedChange={(val) => {
                            const curr = new Set(watch('allergens') || [])
                            if (val) curr.add(a); else curr.delete(a)
                            setValue('allergens', Array.from(curr))
                          }} />
                          <span>{a}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start mt-4">
                <div className="space-y-2">
                  <Label>Revisão nº</Label>
                  <Input type="number" step="1" min="0" {...register('revision', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Última alteração em</Label>
                  <Input readOnly {...register('lastChangedAt')} placeholder="Automático ao salvar" />
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="outline" onClick={() => {
                    try {
                      const snapshot = {
                        name: watch('name'),
                        yield: watch('yield'),
                        category: watch('category'),
                        ingredients: watch('ingredients'),
                        steps: watch('steps'),
                        validityChilled: watch('validityChilled'),
                        validityFrozen: watch('validityFrozen'),
                        allergens: watch('allergens')
                      }
                      const versionsKey = 'recipe_versions'
                      const raw = localStorage.getItem(versionsKey)
                      const all = raw ? JSON.parse(raw) : {}
                      const id = editingId || `draft-${Date.now()}`
                      const list = Array.isArray(all[id]) ? all[id] : []
                      const nextVersion = (Number(watch('revision') || 0) || 0) + 1
                      const entry = { version: nextVersion, date: new Date().toISOString(), snapshot }
                      const newList = [...list, entry]
                      all[id] = newList
                      localStorage.setItem(versionsKey, JSON.stringify(all))
                      setValue('revision', nextVersion)
                      toast({ title: 'Versão arquivada', description: `Versão ${nextVersion} salva.` })
                    } catch {}
                  }}>Arquivar versão atual</Button>
                </div>
              </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => reset()}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar'}</Button>
              </div>

              <datalist id="itemsAndRecipes">
                {filteredItems.map(i => (<option key={`item-${i.id}`} value={i.name} />))}
                {recipes.map(r => (<option key={`recipe-${r.id}`} value={r.name} />))}
              </datalist>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Fichas Técnicas salvas</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recipes.map(r => (
                <Card key={r.id} className="border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{r.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-xs text-muted-foreground">Setor de preparo: {r.category || '—'}</div>
                    <div className="text-xs text-muted-foreground">Porções: {r.yield}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Ativa</span>
                      <Switch checked={(r as any).active ?? true} onCheckedChange={(val) => updateRecipe(r.id, { active: val })} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                      <Button className="w-full overflow-hidden" variant="outline" size="sm" onClick={() => { setEditingId(r.id); reset({ name: r.name, yield: r.yield, category: r.category || '', prePrep: (r as any).prePrep || 0, finishPrep: (r as any).finishPrep || 0, steps: ((r as any).steps || []).length ? (r as any).steps : [''], validityChilled: (r as any).validityChilled || 0, validityFrozen: (r as any).validityFrozen || 0, allergens: (r as any).allergens || [], ingredients: (r.ingredients || []).map((i: any) => ({ itemName: i.itemName, unit: i.unit || 'un', qtyGross: Number(i.qtyGross ?? i.quantity ?? 0), qtyNet: Number(i.quantity ?? 0) })) }); setImagePreview((r as any).imagePreview || null); }}>
                        <span className="truncate">Editar receita</span>
                      </Button>
                      <Button className="w-full overflow-hidden" variant="outline" size="sm" onClick={() => duplicateRecipe(r.id)}>
                        <span className="truncate">Duplicar receita</span>
                      </Button>
                    </div>
                    <div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="w-full" variant="destructive" size="sm">Excluir receita</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir receita</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. Tem certeza que deseja excluir "{r.name}"?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { deleteRecipe(r.id); toast({ title: 'Receita excluída', description: `"${r.name}" foi removida.` }) }}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="text-xs">
                      {r.ingredients?.map((ing, idx) => (
                        <div key={idx}>• {ing.itemName} — {ing.quantity} {ing.unit}</div>
                      ))}
                    </div>
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

export default RecipesPage
