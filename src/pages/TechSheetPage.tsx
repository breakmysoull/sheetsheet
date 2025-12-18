import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, FileDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { motion } from 'framer-motion'

const TechSheetPage: React.FC = () => {
  const navigate = useNavigate()
  const [name, setName] = React.useState('')
  const [category, setCategory] = React.useState<string>('')
  const [subcategory, setSubcategory] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [portions, setPortions] = React.useState<number>(1)
  const [finalWeight, setFinalWeight] = React.useState<number>(0)
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)

  type Ingredient = { name: string; quantity: number; unit: string; unitCost: number; totalCost: number }
  const [ingredients, setIngredients] = React.useState<Ingredient[]>([])
  const addIngredient = () => {
    setIngredients(prev => [...prev, { name: '', quantity: 0, unit: 'un', unitCost: 0, totalCost: 0 }])
  }
  const removeIngredient = (idx: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== idx))
  }
  const updateIngredient = (idx: number, patch: Partial<Ingredient>) => {
    setIngredients(prev => {
      const next = [...prev]
      const merged = { ...next[idx], ...patch }
      const q = Number(merged.quantity) || 0
      const c = Number(merged.unitCost) || 0
      merged.totalCost = Number((q * c).toFixed(2))
      next[idx] = merged
      return next
    })
  }

  type Step = { title: string; description: string; timeMin: number }
  const [steps, setSteps] = React.useState<Step[]>([])
  const addStep = () => setSteps(prev => [...prev, { title: '', description: '', timeMin: 0 }])
  const removeStep = (idx: number) => setSteps(prev => prev.filter((_, i) => i !== idx))
  const updateStep = (idx: number, patch: Partial<Step>) => {
    setSteps(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }
  const moveStepUp = (idx: number) => {
    if (idx <= 0) return
    setSteps(prev => {
      const next = [...prev]
      const tmp = next[idx - 1]
      next[idx - 1] = next[idx]
      next[idx] = tmp
      return next
    })
  }
  const moveStepDown = (idx: number) => {
    setSteps(prev => {
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      const tmp = next[idx + 1]
      next[idx + 1] = next[idx]
      next[idx] = tmp
      return next
    })
  }

  const [equipments, setEquipments] = React.useState<Array<{ label: string; checked: boolean }>>([
    { label: 'Forno', checked: false },
    { label: 'Fogão', checked: false },
    { label: 'Batedeira', checked: false }
  ])
  const addEquipment = () => setEquipments(prev => [...prev, { label: '', checked: false }])

  const [nutrition, setNutrition] = React.useState<{ calories?: number; proteins?: number; carbs?: number; fats?: number }>({})
  const [lossesPercent, setLossesPercent] = React.useState<number>(0)
  const [markupPercent, setMarkupPercent] = React.useState<number>(0)

  const ingredientsTotal = React.useMemo(() => {
    return Number(ingredients.reduce((sum, i) => sum + (Number(i.totalCost) || 0), 0).toFixed(2))
  }, [ingredients])
  const totalAfterLosses = React.useMemo(() => {
    const lossesFactor = 1 + ((Number(lossesPercent) || 0) / 100)
    return Number((ingredientsTotal * lossesFactor).toFixed(2))
  }, [ingredientsTotal, lossesPercent])
  const costPerPortion = React.useMemo(() => {
    const p = Number(portions) || 1
    return Number((totalAfterLosses / p).toFixed(2))
  }, [totalAfterLosses, portions])
  const priceSuggestion = React.useMemo(() => {
    const factor = 1 + ((Number(markupPercent) || 0) / 100)
    return Number((costPerPortion * factor).toFixed(2))
  }, [costPerPortion, markupPercent])

  const [imageFile, setImageFile] = React.useState<File | null>(null)
  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(String(reader.result))
    reader.readAsDataURL(file)
  }
  const onDropImage = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(String(reader.result))
    reader.readAsDataURL(file)
  }


  const storageKey = 'tech_sheet_draft'
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const data = JSON.parse(raw)
      setName(data.name || '')
      setCategory(data.category || '')
      setSubcategory(data.subcategory || '')
      setDescription(data.description || '')
      setPortions(Number(data.portions) || 1)
      setFinalWeight(Number(data.finalWeight) || 0)
      setIngredients(Array.isArray(data.ingredients) ? data.ingredients : [])
      setSteps(Array.isArray(data.steps) ? data.steps : [])
      setEquipments(Array.isArray(data.equipments) ? data.equipments : equipments)
      setNutrition(data.nutrition || {})
      setLossesPercent(Number(data.lossesPercent) || 0)
      setMarkupPercent(Number(data.markupPercent) || 0)
      setImagePreview(data.imagePreview || null)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveDraft = React.useCallback(() => {
    const payload = {
      name,
      category,
      subcategory,
      description,
      portions,
      finalWeight,
      imagePreview,
      ingredients,
      steps,
      equipments,
      nutrition,
      lossesPercent,
      markupPercent,
      totals: { ingredientsTotal, totalAfterLosses, costPerPortion, priceSuggestion }
    }
    try { localStorage.setItem(storageKey, JSON.stringify(payload)) } catch {}
  }, [name, category, subcategory, description, portions, finalWeight, imagePreview, ingredients, steps, equipments, nutrition, lossesPercent, markupPercent, ingredientsTotal, totalAfterLosses, costPerPortion, priceSuggestion])

  React.useEffect(() => {
    const t = setTimeout(saveDraft, 250)
    return () => clearTimeout(t)
  }, [saveDraft])

  const handleExportPDF = () => {
    toast({ title: 'Exportação', description: 'Estrutura de exportação pronta. Integração pendente.' })
  }
  const handleSave = () => {
    saveDraft()
    toast({ title: 'Rascunho salvo', description: 'Dados armazenados localmente.' })
    // INTEGRAÇÃO BACKEND: enviar payload para endpoint e salvar ficha
  }
  const handleDuplicate = () => {
    saveDraft()
    toast({ title: 'Duplicar', description: 'Função pronta para integrar com backend.' })
    // INTEGRAÇÃO BACKEND: criar nova ficha baseada no payload
  }
  const handleDelete = () => {
    try { localStorage.removeItem(storageKey) } catch {}
    setName('')
    setCategory('')
    setSubcategory('')
    setDescription('')
    setPortions(1)
    setFinalWeight(0)
    setIngredients([])
    setSteps([])
    setEquipments([{ label: 'Forno', checked: false }, { label: 'Fogão', checked: false }, { label: 'Batedeira', checked: false }])
    setNutrition({})
    setLossesPercent(0)
    setMarkupPercent(0)
    setImagePreview(null)
    toast({ title: 'Ficha limpa', description: 'Rascunho removido.' })
    // INTEGRAÇÃO BACKEND: deletar ficha no servidor
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button aria-label="Voltar" className="btn-secondary" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/home') }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="section-title">Ficha Técnica</h1>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button aria-label="Exportar PDF" className="btn-secondary" onClick={handleExportPDF}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </TooltipTrigger>
              <TooltipContent>Gerar PDF desta ficha</TooltipContent>
            </Tooltip>
            <nav aria-label="Navegação de seções" className="hidden md:flex items-center gap-2">
              <a href="#basics" className="btn-secondary">Dados</a>
              <a href="#ingredients" className="btn-secondary">Ingredientes</a>
              <a href="#steps" className="btn-secondary">Preparo</a>
              <a href="#equipments" className="btn-secondary">Equipamentos</a>
              <a href="#nutrition" className="btn-secondary">Nutrição</a>
              <a href="#costs" className="btn-secondary">Custos</a>
            </nav>
          </div>
        </div>

        {/* Informações Básicas do Prato */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Card id="basics" className="card">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="section-title">Informações Básicas do Prato</CardTitle>
            <Accordion type="single" collapsible defaultValue="open-basics" className="w-full">
              <AccordionItem value="open-basics" className="border-0 w-full">
                <AccordionTrigger className="py-2 text-sm">Mostrar/Esconder</AccordionTrigger>
                <AccordionContent>
          <div className="space-y-4" role="region" aria-label="Informações básicas">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do prato</Label>
                  <Input aria-label="Nome do prato" placeholder="Ex: Risoto de cogumelos" className="input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                <Label>Categoria</Label>
                <Select>
                  <SelectTrigger className="input">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entradas" onClick={() => setCategory('Entradas')}>Entradas</SelectItem>
                    <SelectItem value="principais" onClick={() => setCategory('Principais')}>Principais</SelectItem>
                    <SelectItem value="sobremesas" onClick={() => setCategory('Sobremesas')}>Sobremesas</SelectItem>
                  </SelectContent>
                </Select>
                </div>
              <div className="space-y-2">
                <Label>Subcategoria</Label>
                <Input aria-label="Subcategoria" placeholder="Ex: Vegetarianos" className="input" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Porções produzidas</Label>
                <Input aria-label="Porções produzidas" type="number" min={1} step={1} className="input" value={portions} onChange={(e) => setPortions(Math.max(1, Number(e.target.value) || 1))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Descrição curta</Label>
                <Textarea aria-label="Descrição curta" placeholder="Resumo do prato e notas de preparo" className="input min-h-[100px]" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Peso final / rendimento</Label>
                <Input aria-label="Peso final" type="number" min={0} step={0.01} className="input" value={finalWeight} onChange={(e) => setFinalWeight(Math.max(0, Number(e.target.value) || 0))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Imagem do prato</Label>
              <div className="card p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div onDragOver={(e) => e.preventDefault()} onDrop={onDropImage} className="h-28 md:h-32 flex items-center justify-center rounded bg-muted" role="img" aria-label="Prévia da imagem">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Imagem do prato" className="h-full object-contain" />
                    ) : (
                      <span className="text-sm text-muted-foreground">Prévia da imagem</span>
                    )}
                  </div>
                  <Input aria-label="Selecionar imagem" type="file" accept="image/*" className="input" onChange={onPickImage} />
                </div>
              </div>
              {/* INTEGRAÇÃO BACKEND: upload de imagem para storage, salvar URL da foto */}
            </div>
          </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardHeader>
        </Card>
        </motion.div>

        {/* Ingredientes */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Card id="ingredients" className="card">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="section-title">Ingredientes</CardTitle>
            <Accordion type="single" collapsible defaultValue="open-ingredients" className="w-full">
              <AccordionItem value="open-ingredients" className="border-0 w-full">
                <AccordionTrigger className="py-2 text-sm">Mostrar/Esconder</AccordionTrigger>
                <AccordionContent>
          <CardContent className="space-y-3" role="region" aria-label="Ingredientes">
            <div className="hidden md:grid md:grid-cols-5 gap-2 text-sm text-muted-foreground">
              <div>Ingrediente</div>
              <div>Quantidade</div>
              <div>Unidade</div>
              <div>Custo unitário</div>
              <div>Custo total</div>
            </div>
            <div className="space-y-2 table-wrapper p-2">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  <Input aria-label={`Ingrediente ${idx+1}`} placeholder="Ex: Arroz" className="input" value={ing.name} onChange={(e)=>updateIngredient(idx,{ name: e.target.value })} />
                  <Input aria-label={`Quantidade ${idx+1}`} placeholder="Ex: 0.5" type="number" min={0} step={0.01} className="input" value={ing.quantity} onChange={(e)=>updateIngredient(idx,{ quantity: Math.max(0, Number(e.target.value) || 0) })} />
                  <Input aria-label={`Unidade ${idx+1}`} placeholder="Ex: kg" className="input" value={ing.unit} onChange={(e)=>updateIngredient(idx,{ unit: e.target.value })} />
                  <Input aria-label={`Custo unitário ${idx+1}`} placeholder="Ex: 12.90" type="number" min={0} step={0.01} className="input" value={ing.unitCost} onChange={(e)=>updateIngredient(idx,{ unitCost: Math.max(0, Number(e.target.value) || 0) })} />
                  <div className="flex items-center gap-2">
                    <Input aria-label={`Custo total ${idx+1}`} placeholder="Custo total (auto)" readOnly className="input" value={ing.totalCost} />
                    <Button aria-label={`Remover ingrediente ${idx+1}`} variant="outline" className="min-h-[48px]" onClick={()=>removeIngredient(idx)}>Remover</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2">
              <Button aria-label="Adicionar ingrediente" className="btn-primary" onClick={addIngredient}>Adicionar ingrediente</Button>
              <div className="text-sm text-muted-foreground">Custo total dos ingredientes: R$ {ingredientsTotal.toFixed(2)}</div>
            </div>
            {/* INTEGRAÇÃO BACKEND: carregar lista de itens do estoque, calcular custos, persistir ingredientes da ficha */}
          </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardHeader>
        </Card>
        </motion.div>

        {/* Etapas do Preparo */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Card id="steps" className="card">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="section-title">Etapas do Preparo</CardTitle>
            <Accordion type="single" collapsible defaultValue="open-steps" className="w-full">
              <AccordionItem value="open-steps" className="border-0 w-full">
                <AccordionTrigger className="py-2 text-sm">Mostrar/Esconder</AccordionTrigger>
                <AccordionContent>
          <CardContent className="space-y-3" role="region" aria-label="Etapas de preparo">
            <ol className="space-y-3" role="list" aria-label="Lista de etapas">
              {steps.map((s, idx) => (
                <li key={idx} className="space-y-2" role="listitem" aria-label={`Etapa ${idx+1}`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label>Título da etapa</Label>
                      <Input aria-label={`Título etapa ${idx+1}`} placeholder="Ex: Pré-preparo" className="input" value={s.title} onChange={(e)=>updateStep(idx,{ title: e.target.value })} />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Descrição</Label>
                      <Textarea aria-label={`Descrição etapa ${idx+1}`} placeholder="Descreva o procedimento" className="input" value={s.description} onChange={(e)=>updateStep(idx,{ description: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tempo estimado (min)</Label>
                    <Input aria-label={`Tempo etapa ${idx+1}`} type="number" min={0} step={1} className="input w-40" value={s.timeMin} onChange={(e)=>updateStep(idx,{ timeMin: Math.max(0, Number(e.target.value) || 0) })} />
                  </div>
                  <div className="flex gap-2">
                    <Button aria-label={`Mover etapa ${idx+1} para cima`} className="btn-secondary" onClick={()=>moveStepUp(idx)}>Subir</Button>
                    <Button aria-label={`Mover etapa ${idx+1} para baixo`} className="btn-secondary" onClick={()=>moveStepDown(idx)}>Descer</Button>
                    <Button aria-label={`Remover etapa ${idx+1}`} variant="destructive" className="min-h-[48px]" onClick={()=>removeStep(idx)}>Remover</Button>
                  </div>
                </li>
              ))}
            </ol>
            <Button aria-label="Adicionar etapa" className="btn-primary" onClick={addStep}>Adicionar etapa</Button>
            {/* INTEGRAÇÃO BACKEND: salvar lista de passos (JSON) e tempos */}
          </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardHeader>
        </Card>
        </motion.div>

        {/* Equipamentos Necessários */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Card id="equipments" className="card">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="section-title">Equipamentos Necessários</CardTitle>
            <Accordion type="single" collapsible defaultValue="open-equipments" className="w-full">
              <AccordionItem value="open-equipments" className="border-0 w-full">
                <AccordionTrigger className="py-2 text-sm">Mostrar/Esconder</AccordionTrigger>
                <AccordionContent>
          <CardContent className="space-y-3" role="region" aria-label="Equipamentos necessários">
            <div className="space-y-2">
              {equipments.map((eq, idx) => (
                <label key={idx} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={eq.checked} onCheckedChange={(val)=>{
                    setEquipments(prev=>{
                      const next=[...prev]; next[idx]={...next[idx], checked: !!val}; return next
                    })
                  }} />
                  <Input aria-label={`Equipamento ${idx+1}`} placeholder="Ex: Forno combinado" className="input" value={eq.label} onChange={(e)=>{
                    setEquipments(prev=>{ const next=[...prev]; next[idx]={...next[idx], label: e.target.value}; return next })
                  }} />
                </label>
              ))}
            </div>
            <Button aria-label="Adicionar equipamento" className="btn-primary" onClick={addEquipment}>Adicionar equipamento</Button>
            {/* INTEGRAÇÃO BACKEND: persistir equipamentos selecionados por ficha */}
          </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardHeader>
        </Card>
        </motion.div>

        {/* Informações Nutricionais (opcional) */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Card id="nutrition" className="card">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="section-title">Informações Nutricionais (opcional)</CardTitle>
            <Accordion type="single" collapsible defaultValue="open-nutrition" className="w-full">
              <AccordionItem value="open-nutrition" className="border-0 w-full">
                <AccordionTrigger className="py-2 text-sm">Mostrar/Esconder</AccordionTrigger>
                <AccordionContent>
          <CardContent className="grid-nutrition">
            <div className="space-y-2">
              <Label>Calorias</Label>
              <Input aria-label="Calorias" placeholder="kcal" type="number" min={0} step={1} className="input" onChange={(e)=>setNutrition(prev=>({ ...prev, calories: Math.max(0, Number(e.target.value) || 0) }))} />
            </div>
            <div className="space-y-2">
              <Label>Proteínas</Label>
              <Input aria-label="Proteínas" placeholder="g" type="number" min={0} step={0.1} className="input" onChange={(e)=>setNutrition(prev=>({ ...prev, proteins: Math.max(0, Number(e.target.value) || 0) }))} />
            </div>
            <div className="space-y-2">
              <Label>Carboidratos</Label>
              <Input aria-label="Carboidratos" placeholder="g" type="number" min={0} step={0.1} className="input" onChange={(e)=>setNutrition(prev=>({ ...prev, carbs: Math.max(0, Number(e.target.value) || 0) }))} />
            </div>
            <div className="space-y-2">
              <Label>Gorduras</Label>
              <Input aria-label="Gorduras" placeholder="g" type="number" min={0} step={0.1} className="input" onChange={(e)=>setNutrition(prev=>({ ...prev, fats: Math.max(0, Number(e.target.value) || 0) }))} />
            </div>
            {/* INTEGRAÇÃO BACKEND: armazenar informações nutricionais quando fornecidas */}
          </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardHeader>
        </Card>
        </motion.div>

        {/* Controles e Custos */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Card id="costs" className="card">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="section-title">Controles e Custos</CardTitle>
            <Accordion type="single" collapsible defaultValue="open-costs" className="w-full">
              <AccordionItem value="open-costs" className="border-0 w-full">
                <AccordionTrigger className="py-2 text-sm">Mostrar/Esconder</AccordionTrigger>
                <AccordionContent>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4" role="region" aria-label="Custos e preços">
            <div className="space-y-2">
              <Label>% de perdas</Label>
              <Input aria-label="Percentual de perdas" type="number" min={0} step={0.1} className="input w-40" value={lossesPercent} onChange={(e)=>setLossesPercent(Math.max(0, Number(e.target.value) || 0))} />
            </div>
            <div className="space-y-2">
              <Label>Markup (%)</Label>
              <Input aria-label="Markup" type="number" min={0} step={0.1} className="input w-40" value={markupPercent} onChange={(e)=>setMarkupPercent(Math.max(0, Number(e.target.value) || 0))} />
            </div>
            <div className="space-y-2">
              <Label>Custo total da receita (auto)</Label>
              <Input aria-label="Custo total" readOnly className="input" value={totalAfterLosses} />
            </div>
            <div className="space-y-2">
              <Label>Custo por porção (auto)</Label>
              <Input aria-label="Custo por porção" readOnly className="input" value={costPerPortion} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Sugestão de preço (auto)</Label>
              <Input aria-label="Sugestão de preço" readOnly className="input" value={priceSuggestion} />
            </div>
            {/* INTEGRAÇÃO BACKEND: cálculo de custo e preço, salvando campos derivados */}
          </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardHeader>
        </Card>
        </motion.div>
      </div>

      {/* FOOTER FIXO */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-3">
        <div className="max-w-7xl mx-auto flex items-center justify-end gap-2">
          <Button aria-label="Duplicar ficha" className="btn-secondary" onClick={handleDuplicate}>Duplicar ficha</Button>
          <Button aria-label="Excluir ficha" variant="destructive" className="min-h-[48px]" onClick={handleDelete}>Excluir ficha</Button>
          <Button aria-label="Salvar ficha" className="btn-primary" onClick={handleSave}>Salvar</Button>
        </div>
        {/* INTEGRAÇÃO BACKEND: ações de salvar, duplicar e excluir (CRUD) */}
      </div>
    </div>
  )
}

export default TechSheetPage
