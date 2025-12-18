import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ChefHat, BarChart3, Factory, ShoppingCart, CheckSquare, Wrench, TrendingUp, Package, ClipboardList, LogOut, Sun, Moon } from 'lucide-react';
import { ImportButton } from '@/components/ImportButton';
import { saveSheets, upsertRestaurant, adminCreateUser } from '@/services/supabaseInventory';
import { useInventory } from '@/hooks/useInventory';
import { useAuth } from '@/context/AuthContext';
import { XLSXHandler } from '@/services/xlsxHandler';
import { toast } from '@/hooks/use-toast';
import { Sheet } from '@/types/inventory';

const Home = () => {
  const navigate = useNavigate();
  const { can, signOut, role, setRoleLocal, user } = useAuth() as any;
  const {
    sheets,
    updateLogs,
    recipes,
    purchases,
    dailyChecklists,
    utensils,
    kitchenCode,
    undoLastChange,
    loadSheets,
  } = useInventory() as any;
  const [openProfile, setOpenProfile] = React.useState(false)
  const [tmpRole, setTmpRole] = React.useState<string>('funcionario')
  const [tmpCode, setTmpCode] = React.useState<string>('')
  React.useEffect(() => { setTmpRole(role); setTmpCode(kitchenCode || '') }, [role, kitchenCode])

  const [theme, setTheme] = React.useState<'light'|'dark'>(() => {
    try {
      const stored = localStorage.getItem('theme') as 'light'|'dark' | null
      if (stored === 'light' || stored === 'dark') return stored
    } catch {}
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })
  React.useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  const handleExport = async () => {
    if (sheets.length === 0) {
      toast({ title: 'Nada para exportar', description: 'Importe uma planilha primeiro', variant: 'destructive' });
      return;
    }
    XLSXHandler.exportToXLSX(sheets);
    toast({ title: 'Planilha exportada', description: 'Download iniciado com sucesso!' });
  };

  const handleImport = async (importedSheets: Sheet[]) => {
    const totalItems = importedSheets.reduce((acc, s) => acc + (s.items?.length || 0), 0)
    if (totalItems === 0) {
      toast({ title: 'Nenhum item importado', description: 'Verifique o formato do arquivo', variant: 'destructive' })
      return
    }
    loadSheets(importedSheets)
    
    if (!kitchenCode) {
      toast({ 
        title: 'Erro de configuração', 
        description: 'Código da cozinha não encontrado. Os dados não serão salvos permanentemente.',
        variant: 'destructive' 
      })
    }

    toast({ title: 'Importação iniciada', description: `Enviando ${totalItems} item(ns) em ${importedSheets.length} planilha(s)` })
    navigate('/inventory')
  };

  const handleBackup = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      kitchenCode,
      sheets,
      updateLogs,
      recipes,
      purchases,
      dailyChecklists,
      utensils,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_inventario_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Backup exportado', description: 'Download iniciado com sucesso!' });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              Cozzi
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie sua cozinha de forma inteligente</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Alternar tema">
              {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </Button>
            <Button variant="outline" size="sm" onClick={async () => { try { await signOut(); navigate('/login'); } catch {} }}>
              <LogOut className="h-4 w-4 mr-2" />
              Deslogar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {can('admin.systemConfig') && (
            <Dialog open={openProfile} onOpenChange={setOpenProfile}>
              <DialogTrigger asChild>
                <Button className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
                  Perfil e Restaurante
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configuração rápida</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-sm">Papel</span>
                    <div className="grid grid-cols-2 gap-2">
                      {['super_admin','gerente','funcionario','auxiliar'].map((r) => (
                        <Card key={r} onClick={() => setTmpRole(r)} className={`cursor-pointer border ${tmpRole===r?'border-primary bg-primary/5':'border-muted'}`}>
                          <CardContent className="py-2 px-3 text-sm capitalize">{r.replace('_',' ')}</CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm">Código do restaurante</span>
                    <Input value={tmpCode} onChange={(e)=>setTmpCode(e.target.value.toUpperCase())} placeholder="Ex: PETI123" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={()=>setOpenProfile(false)}>Cancelar</Button>
                    <Button onClick={()=>{ setRoleLocal(tmpRole as any); try{ localStorage.setItem('auth_role', tmpRole) }catch{}; try{ localStorage.setItem('kitchen_code', tmpCode) }catch{}; window.location.reload() }}>Salvar</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {can('inventory.import') && (
            <ImportButton onImport={handleImport} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border" />
          )}
          {can('inventory.export') && (
            <Button onClick={handleExport} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              Exportar
            </Button>
          )}
          {sheets.length > 0 && can('inventory.view') && (
            <Button onClick={() => navigate('/inventory')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <Package className="h-6 w-6" />
              Inventário
            </Button>
          )}
          {sheets.length > 0 && can('inventory.view') && (
            <Button onClick={() => navigate('/inventory-daily')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <ClipboardList className="h-6 w-6" />
              Inventário diário
            </Button>
          )}
          {can('recipes.view') && (
            <Button onClick={() => navigate('/recipes')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <ChefHat className="h-6 w-6" />
              Fichas Técnicas
            </Button>
          )}
          {can('reports.viewMonthly') && (
            <Button onClick={() => navigate('/reports')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <BarChart3 className="h-6 w-6" />
              Relatório
            </Button>
          )}
          {can('production.register') && (
            <Button onClick={() => navigate('/production')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <Factory className="h-6 w-6" />
              Produção
            </Button>
          )}
          {can('purchases.register') && (
            <Button onClick={() => navigate('/requests')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <ShoppingCart className="h-6 w-6" />
              Solicitações
            </Button>
          )}
          {can('checklist.use') && (
            <Button onClick={() => navigate('/checklist')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <CheckSquare className="h-6 w-6" />
              Checklist
            </Button>
          )}

          {can('reports.forecast') && (
            <Button onClick={() => navigate('/forecast')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              <TrendingUp className="h-6 w-6" />
              Previsão
            </Button>
          )}
          {can('reports.audit') && (
            <Button onClick={() => navigate('/audit')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              Auditoria
            </Button>
          )}
          {can('admin.backup') && (
            <Button onClick={handleBackup} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              Backup
            </Button>
          )}
          {can('admin.systemConfig') && (
            <AdminPanelButton userId={user?.id} />
          )}
          {can('admin.systemConfig') && (
            <Button onClick={() => navigate('/super-admin')} className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
              Super Admin (Página)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;

function AdminPanelButton({ userId }: { userId?: string }) {
  const [open, setOpen] = React.useState(false)
  const [tab, setTab] = React.useState<'restaurants'|'users'>('restaurants')
  const [restName, setRestName] = React.useState('')
  const [restCode, setRestCode] = React.useState('')
  const [userEmail, setUserEmail] = React.useState('')
  const [userPass, setUserPass] = React.useState('')
  const [userRole, setUserRole] = React.useState<'gerente'|'funcionario'|'auxiliar'>('gerente')
  const [userKitchen, setUserKitchen] = React.useState('')
  const handleCreateRestaurant = async () => {
    const name = restName.trim()
    const code = restCode.trim().toUpperCase()
    if (!name || !code) { toast({ title: 'Informe nome e código', variant: 'destructive' }); return }
    await upsertRestaurant(name, code, userId)
    toast({ title: 'Restaurante cadastrado', description: `${name} (${code})` })
    setRestName(''); setRestCode('')
  }
  const handleCreateUser = async () => {
    const email = userEmail.trim().toLowerCase()
    const pass = userPass
    const code = userKitchen.trim().toUpperCase()
    if (!email || !pass || !code) { toast({ title: 'Preencha email, senha e código', variant: 'destructive' }); return }
    const id = await adminCreateUser(email, pass, userRole, code)
    if (id) {
      toast({ title: 'Usuário criado', description: `${email} vinculado a ${code}` })
      setUserEmail(''); setUserPass(''); setUserKitchen('')
    } else {
      toast({ title: 'Falha ao criar usuário', variant: 'destructive' })
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-24 flex flex-col items-center justify-center gap-2 bg-white text-black border">
          Admin (Super)
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Painel do Super Admin</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-3">
          <Button variant={tab==='restaurants'?'default':'outline'} onClick={()=>setTab('restaurants')}>Restaurantes</Button>
          <Button variant={tab==='users'?'default':'outline'} onClick={()=>setTab('users')}>Usuários</Button>
        </div>
        {tab==='restaurants' ? (
          <div className="space-y-3">
            <Input placeholder="Nome do restaurante" value={restName} onChange={e=>setRestName(e.target.value)} />
            <Input placeholder="Código (ex: PETI123)" value={restCode} onChange={e=>setRestCode(e.target.value.toUpperCase())} />
            <div className="flex justify-end"><Button onClick={handleCreateRestaurant}>Cadastrar</Button></div>
          </div>
        ) : (
          <div className="space-y-3">
            <Input placeholder="Email" value={userEmail} onChange={e=>setUserEmail(e.target.value)} />
            <Input placeholder="Senha" type="password" value={userPass} onChange={e=>setUserPass(e.target.value)} />
            <div className="flex gap-2">
              {(['gerente','funcionario','auxiliar'] as const).map(r => (
                <Card key={r} onClick={()=>setUserRole(r)} className={`cursor-pointer border ${userRole===r?'border-primary bg-primary/5':'border-muted'}`}>
                  <CardContent className="py-2 px-3 text-sm capitalize">{r}</CardContent>
                </Card>
              ))}
            </div>
            <Input placeholder="Código do restaurante (ex: PETI123)" value={userKitchen} onChange={e=>setUserKitchen(e.target.value.toUpperCase())} />
            <div className="flex justify-end"><Button onClick={handleCreateUser}>Criar usuário</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
