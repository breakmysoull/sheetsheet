import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Plus } from 'lucide-react'
import { useInventory } from '@/hooks/useInventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

const brazilTodayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
const fetchBrazilDateOnline = async (): Promise<string> => {
  try {
    const res = await fetch('https://worldtimeapi.org/api/timezone/America/Sao_Paulo', { cache: 'no-store' })
    if (res.ok) {
      const j = await res.json()
      const d = new Date(j.datetime)
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
    }
  } catch {}
  return brazilTodayIso()
}
const parseIsoToDateLocal = (iso: string) => { const [y,m,d] = iso.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1) }
const formatBr = (iso: string) => { const [y,m,d] = iso.split('-'); return `${String(d||'').padStart(2,'0')}/${String(m||'').padStart(2,'0')}/${y}` }
const toIsoBr = (dateObj: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(dateObj)

const ChecklistPage: React.FC = () => {
  const { getChecklistForDate, toggleChecklistItem, setChecklistCategoryAll, resetChecklist, addChecklistItem, addChecklistItemsBulk, updateChecklistItem, deleteChecklistItem, addChecklistCategory, weeklyRules, addWeeklyRule, deleteWeeklyRule } = useInventory()
  const [date, setDate] = useState<string>(brazilTodayIso())
  const checklist = useMemo(() => getChecklistForDate(date), [date, getChecklistForDate])
  const [openCats, setOpenCats] = useState<string[]>([])
  const toggleCat = (name: string) => {
    setOpenCats(prev => prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name])
  }
  const areaNames = useMemo(() => checklist.categories.map(c => c.name), [checklist])
  const [selectedArea, setSelectedArea] = useState<string>('')
  React.useEffect(() => {
    if (selectedArea) return
    let saved = ''
    try { saved = localStorage.getItem('selectedChecklistArea') || '' } catch {}
    if (saved) {
      setSelectedArea(saved)
    } else {
      const first = areaNames.find(n => n !== 'Limpeza')
      setSelectedArea(first || 'Limpeza')
    }
  }, [areaNames, selectedArea])
  const visibleCats = useMemo(() => {
    if (!selectedArea) return checklist.categories
    return checklist.categories.filter(c => c.name === selectedArea || c.name === 'Limpeza')
  }, [checklist, selectedArea])
  const total = visibleCats.reduce((sum, c) => sum + c.items.length, 0)
  const done = visibleCats.reduce((sum, c) => sum + c.items.filter(i => i.checked).length, 0)
  const [newArea, setNewArea] = useState<string>('Entradas')
  const [newSection, setNewSection] = useState<'pre' | 'mont'>('pre')
  const [newLabel, setNewLabel] = useState<string>('')
  const percentGeneral = total > 0 ? Math.round((done / total) * 100) : 0
  const [openAdd, setOpenAdd] = useState(false)
  const navigate = useNavigate()
  const catStyles = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('entrada')) return 'bg-blue-50 border-blue-200'
    if (n.includes('principal')) return 'bg-green-50 border-green-200'
    if (n.includes('sobremesa')) return 'bg-pink-50 border-pink-200'
    if (n.includes('limpeza')) return 'bg-amber-50 border-amber-200'
    return 'bg-card border-muted'
  }
  const [newCatName, setNewCatName] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editLabel, setEditLabel] = useState('')
  const [editSection, setEditSection] = useState<'pre' | 'mont'>('pre')
  const [editCtx, setEditCtx] = useState<{ cat: string; id: string } | null>(null)
  const [delOpen, setDelOpen] = useState(false)
  const [delCtx, setDelCtx] = useState<{ cat: string; id: string } | null>(null)
  const [wrWeekday, setWrWeekday] = useState<number>(2)
  const [wrCategory, setWrCategory] = useState<string>('Limpeza')
  const [wrSection, setWrSection] = useState<'pre' | 'mont'>('pre')
  const [wrLabel, setWrLabel] = useState<string>('')
  const weekdayLabel = (n: number) => ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][n] || String(n)
  React.useEffect(() => {
    let mounted = true
    fetchBrazilDateOnline().then(d => { if (mounted) setDate(d) })
    return () => { mounted = false }
  }, [])

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
        <Button variant="ghost" size="sm" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/home'); }}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        </div>
        <Card>
          <CardHeader className="py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CardTitle>Checklist Diário</CardTitle>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 px-3">{formatBr(date)}</Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-2">
                    <Calendar mode="single" selected={parseIsoToDateLocal(date)} onSelect={(d) => { if (d) setDate(toIsoBr(d)) }} />
                  </PopoverContent>
                </Popover>
                <div className="hidden sm:flex items-center gap-2">
                  <Label className="text-sm">Minha área</Label>
                  <div className="flex flex-wrap gap-2">
                    {areaNames.map(name => (
                      <Card
                        key={name}
                        onClick={() => { setSelectedArea(name); try { localStorage.setItem('selectedChecklistArea', name) } catch {} }}
                        className={`cursor-pointer border ${selectedArea === name ? 'border-primary bg-primary/5' : 'border-muted'} h-8`}
                      >
                        <CardContent className="py-1 px-3 flex items-center justify-center">
                          <span className="text-sm">{name}</span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex-1 hidden sm:block">
                <div className="w-full h-2 bg-muted rounded overflow-hidden">
                  <div className="h-full bg-success" style={{ width: `${percentGeneral}%` }} />
                </div>
              </div>
              <div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="whitespace-nowrap">Resetar dia</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Resetar checklist</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação limpará os itens concluídos do dia {date}. Deseja continuar?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => resetChecklist(date)}>Resetar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <div className="sm:hidden mt-2">
              <div className="w-full h-2 bg-muted rounded overflow-hidden">
                <div className="h-full bg-success" style={{ width: `${percentGeneral}%` }} />
              </div>
            </div>
            <div className="sm:hidden mt-2">
              <Label className="text-sm">Minha área</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {areaNames.map(name => (
                  <Card
                    key={name}
                    onClick={() => { setSelectedArea(name); try { localStorage.setItem('selectedChecklistArea', name) } catch {} }}
                    className={`cursor-pointer border ${selectedArea === name ? 'border-primary bg-primary/5' : 'border-muted'}`}
                  >
                    <CardContent className="py-2 px-3 flex items-center justify-center">
                      <span className="text-sm">{name}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="space-y-3">
              <Accordion type="multiple" value={openCats} onValueChange={setOpenCats} className="space-y-2">
                {visibleCats.map(cat => {
                  const doneCat = cat.items.filter(i => i.checked).length
                  const totalCat = cat.items.length
                  const percent = totalCat > 0 ? Math.round((doneCat / totalCat) * 100) : 0
                  return (
                    <AccordionItem key={cat.name} value={cat.name}>
                      <AccordionTrigger className={`px-2 rounded-md border ${catStyles(cat.name)}`}>
                        <div className="flex w-full items-center justify-between">
                          <span className={`font-medium ${percent === 100 ? 'text-success' : ''}`}>{cat.name} ({doneCat}/{totalCat})</span>
                          <div className="flex items-center gap-3">
                            <div className="w-28 h-2 bg-muted rounded overflow-hidden">
                              <div className="h-full bg-success" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {cat.name === 'Limpeza' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[...cat.items].sort((a,b) => Number(a.checked) - Number(b.checked)).map(item => (
                              <div key={item.id} onClick={() => toggleChecklistItem(date, cat.name, item.id, !item.checked)} className={`border rounded p-3 flex items-center gap-3 cursor-pointer transition ${item.checked ? 'opacity-60' : ''}`}>
                                <Checkbox className={`h-6 w-6 pointer-events-none ${item.checked ? 'data-[state=checked]:bg-success' : ''}`} checked={item.checked} />
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{item.label}</div>
                                  {item.checked && (
                                    <div className="text-xs text-muted-foreground">Concluído por {cat.items.find(i => i.id === item.id)?.completedBy || '—'} em {new Date(cat.items.find(i => i.id === item.id)?.completedAt || '').toLocaleString()}</div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditCtx({ cat: cat.name, id: item.id }); setEditLabel(item.label); setEditOpen(true) }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDelCtx({ cat: cat.name, id: item.id }); setDelOpen(true) }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Pré-preparo</span>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="secondary" onClick={() => { setEditCtx({ cat: cat.name, id: '' }); setEditLabel(''); setEditOpen(true); }}><Plus className="h-4 w-4 mr-1" />Adicionar item</Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {cat.items.filter(i => i.id.startsWith(`${cat.name.toLowerCase()}-pre-`)).sort((a,b) => Number(a.checked) - Number(b.checked)).map(item => (
                                  <div key={item.id} onClick={() => toggleChecklistItem(date, cat.name, item.id, !item.checked)} className={`border rounded p-3 flex items-center gap-3 cursor-pointer transition ${item.checked ? 'opacity-60' : ''}`}>
                                    <Checkbox className={`h-6 w-6 pointer-events-none ${item.checked ? 'data-[state=checked]:bg-success' : ''}`} checked={item.checked} />
                                    <div className="flex-1">
                                      <div className="text-sm font-medium">{item.label.replace(/^Pré-preparo:\s*/,'')}</div>
                                      {item.checked && (
                                        <div className="text-xs text-muted-foreground">Concluído por {cat.items.find(i => i.id === item.id)?.completedBy || '—'} em {new Date(cat.items.find(i => i.id === item.id)?.completedAt || '').toLocaleString()}</div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditCtx({ cat: cat.name, id: item.id }); setEditLabel(item.label); setEditOpen(true) }}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDelCtx({ cat: cat.name, id: item.id }); setDelOpen(true) }}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Montagem de praça</span>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="secondary" onClick={() => { setEditCtx({ cat: cat.name, id: '' }); setEditLabel(''); setEditOpen(true) }}><Plus className="h-4 w-4 mr-1" />Adicionar item</Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {cat.items.filter(i => i.id.startsWith(`${cat.name.toLowerCase()}-mont-`)).sort((a,b) => Number(a.checked) - Number(b.checked)).map(item => (
                                  <div key={item.id} onClick={() => toggleChecklistItem(date, cat.name, item.id, !item.checked)} className={`border rounded p-3 flex items-center gap-3 cursor-pointer transition ${item.checked ? 'opacity-60' : ''}`}>
                                    <Checkbox className={`h-6 w-6 pointer-events-none ${item.checked ? 'data-[state=checked]:bg-success' : ''}`} checked={item.checked} />
                                    <div className="flex-1">
                                      <div className="text-sm font-medium">{item.label.replace(/^Montagem:\s*/,'')}</div>
                                      {item.checked && (
                                        <div className="text-xs text-muted-foreground">Concluído por {cat.items.find(i => i.id === item.id)?.completedBy || '—'} em {new Date(cat.items.find(i => i.id === item.id)?.completedAt || '').toLocaleString()}</div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditCtx({ cat: cat.name, id: item.id }); setEditLabel(item.label); setEditOpen(true) }}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDelCtx({ cat: cat.name, id: item.id }); setDelOpen(true) }}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </div>

            <AlertDialog open={editOpen} onOpenChange={setEditOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{editCtx?.id ? 'Editar item' : 'Adicionar item'}</AlertDialogTitle>
                  <AlertDialogDescription>Informe a descrição do item (separe por vírgulas para adicionar vários).</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="Ex: Porcionar ingredientes" />
                  {(!editCtx?.id && editCtx?.cat !== 'Limpeza') && (
                    <div className="space-y-1">
                      <Label>Seção</Label>
                      <Select value={editSection} onValueChange={(v) => setEditSection(v as 'pre' | 'mont')}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pre">Pré-preparo</SelectItem>
                          <SelectItem value="mont">Montagem</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    const v = editLabel.trim()
                    if (!v) { toast({ title: 'Informe a descrição', variant: 'destructive' }); return }
                    if (!editCtx?.id) {
                      const section: 'pre' | 'mont' = editSection
                      if (v.includes(',') || v.includes(';') || v.includes('\n')) {
                        addChecklistItemsBulk(date, editCtx?.cat || 'Entradas', section, v)
                      } else {
                        addChecklistItem(date, editCtx?.cat || 'Entradas', section, v)
                      }
                    } else {
                      updateChecklistItem(date, editCtx.cat, editCtx.id, v)
                    }
                    setEditOpen(false)
                    setEditCtx(null)
                    setEditLabel('')
                    setEditSection('pre')
                  }}>Salvar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir item</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { if (delCtx) deleteChecklistItem(date, delCtx.cat, delCtx.id); setDelOpen(false); setDelCtx(null) }}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex items-center justify-between pt-2">
              <div />
              <div className="flex gap-2">
                <Collapsible open={openAdd} onOpenChange={setOpenAdd}>
                  <CollapsibleTrigger asChild>
                    <Button onClick={() => setOpenAdd(!openAdd)} className="">Adicionar Categoria</Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent asChild>
                    <div className="space-y-3 mt-3">
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Criar nova categoria</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2 space-y-2">
                            <Label>Nome da categoria</Label>
                            <Input placeholder="Ex: Confeitaria" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                          </div>
                          <div className="flex items-end">
                            <Button onClick={() => {
                              const name = newCatName.trim()
                              if (!name) { toast({ title: 'Informe o nome da categoria', variant: 'destructive' }); return }
                              addChecklistCategory(date, name)
                              setNewCatName('')
                              toast({ title: 'Categoria criada', description: name })
                            }}>Adicionar</Button>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Regras semanais</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            <div className="space-y-2">
                              <Label>Dia da semana</Label>
                              <Select value={String(wrWeekday)} onValueChange={(v) => setWrWeekday(Number(v))}>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Segunda</SelectItem>
                                  <SelectItem value="2">Terça</SelectItem>
                                  <SelectItem value="3">Quarta</SelectItem>
                                  <SelectItem value="4">Quinta</SelectItem>
                                  <SelectItem value="5">Sexta</SelectItem>
                                  <SelectItem value="6">Sábado</SelectItem>
                                  <SelectItem value="0">Domingo</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Área</Label>
                              <Select value={wrCategory} onValueChange={setWrCategory}>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                  {areaNames.map(n => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </div>
                            {wrCategory !== 'Limpeza' && (
                              <div className="space-y-2">
                                <Label>Seção</Label>
                                <Select value={wrSection} onValueChange={(v) => setWrSection(v as 'pre' | 'mont')}>
                                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pre">Pré-preparo</SelectItem>
                                    <SelectItem value="mont">Montagem</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="md:col-span-2 space-y-2">
                              <Label>Descrição</Label>
                              <Input placeholder="Ex: Limpar geladeiras" value={wrLabel} onChange={e => setWrLabel(e.target.value)} />
                            </div>
                            <div className="flex items-end">
                              <Button onClick={() => {
                                const label = wrLabel.trim()
                                if (!label) { toast({ title: 'Informe a descrição', variant: 'destructive' }); return }
                                addWeeklyRule(wrWeekday, wrCategory, wrCategory === 'Limpeza' ? undefined : wrSection, label)
                                setWrLabel('')
                                toast({ title: 'Regra semanal criada', description: `${weekdayLabel(wrWeekday)} • ${wrCategory}${wrCategory !== 'Limpeza' ? ' • ' + (wrSection === 'pre' ? 'Pré-preparo' : 'Montagem') : ''}: ${label}` })
                              }}>Adicionar regra</Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Regras existentes</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {weeklyRules.length === 0 && (<div className="text-sm text-muted-foreground">Nenhuma regra semanal</div>)}
                              {weeklyRules.map(r => (
                                <div key={r.id} className="border rounded p-2 flex items-center justify-between">
                                  <div className="text-sm">{weekdayLabel(r.weekday)} • {r.category}{r.category !== 'Limpeza' ? ` • ${r.section === 'mont' ? 'Montagem' : 'Pré-preparo'}` : ''}: {r.label}</div>
                                  <Button size="sm" variant="outline" onClick={() => deleteWeeklyRule(r.id)}>Remover</Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ChecklistPage
