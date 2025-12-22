import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, Calendar as CalendarIcon, Loader2, ChevronDown, ChevronUp, Plus, Edit2, Check, X, Save, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Request, RequestItem, RequestStatus } from '@/types/inventory';
import { fetchRequests, subscribeRequestsRealtime, fetchRequestItems, updateRequestStatus, updateRequestItem, deleteRequestItem } from '@/services/requestsService';
import { fetchUserRole } from '@/services/supabaseInventory';
import { supabase } from '@/config/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500 hover:bg-yellow-600',
  approved: 'bg-blue-500 hover:bg-blue-600',
  adjusted: 'bg-purple-500 hover:bg-purple-600',
  fulfilled: 'bg-green-500 hover:bg-green-600',
  canceled: 'bg-red-500 hover:bg-red-600',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  adjusted: 'Ajustado',
  fulfilled: 'Concluído',
  canceled: 'Cancelado',
};

const priorityColors: Record<string, string> = {
  high: 'text-red-600 bg-red-100 border-red-200',
  medium: 'text-amber-600 bg-amber-100 border-amber-200',
  low: 'text-green-600 bg-green-100 border-green-200',
};

const priorityLabels: Record<string, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const RequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Estado para controlar quais cards estão expandidos e seus itens
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [requestItems, setRequestItems] = useState<Record<string, RequestItem[]>>({});
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

  // Estados de Edição
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editedItems, setEditedItems] = useState<Record<string, RequestItem>>({});
  
  // Estado de Confirmação de Ação
  const [actionConfirm, setActionConfirm] = useState<{ isOpen: boolean, type: 'approve' | 'cancel', requestId: string | null }>({
    isOpen: false,
    type: 'approve',
    requestId: null
  });

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchRequests(filterDate || undefined);
      setRequests(data);
    } catch (error) {
      console.error('Falha ao carregar solicitações', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const role = await fetchUserRole(user.id);
      setUserRole(role);
      setIsAdmin(['gerente', 'super_admin', 'chef'].includes(role || ''));
    }
  };

  const requestsRef = React.useRef(requests);
  
  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  useEffect(() => {
    checkUserRole();
    loadRequests();
    
    const { unsubscribe } = subscribeRequestsRealtime((payload: any) => {
      if (payload.eventType === 'UPDATE') {
         const newStatus = payload.new.status;
         const reqId = payload.new.id;
         const currentReqs = requestsRef.current;
         const oldReq = currentReqs.find(r => r.id === reqId);
         
         if (oldReq && oldReq.status !== newStatus) {
             const label = statusLabels[newStatus] || newStatus;
             toast({
                 title: "Status Atualizado",
                 description: `Solicitação para ${format(new Date(oldReq.date_for), "dd/MM")} mudou para ${label}.`,
             });
         }
      } else if (payload.eventType === 'INSERT') {
         toast({
            title: "Nova Solicitação",
            description: "Uma nova solicitação foi recebida.",
         });
      }
      
      loadRequests(); 
    });

    return () => unsubscribe();
  }, [filterDate]);

  const toggleExpand = async (requestId: string) => {
    if (expandedRequestId === requestId) {
      setExpandedRequestId(null);
      setEditingRequestId(null); // Cancel edit if closing
      return;
    }

    setExpandedRequestId(requestId);

    if (!requestItems[requestId]) {
      setLoadingItems(prev => ({ ...prev, [requestId]: true }));
      try {
        const items = await fetchRequestItems(requestId);
        setRequestItems(prev => ({ ...prev, [requestId]: items }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingItems(prev => ({ ...prev, [requestId]: false }));
      }
    }
  };

  // Funções de Admin
  const handleStatusChange = async (requestId: string, newStatus: RequestStatus) => {
    try {
      await updateRequestStatus(requestId, newStatus);
      toast({
        title: "Status atualizado",
        description: `Solicitação marcada como ${statusLabels[newStatus]}.`,
      });
      loadRequests(); // Refresh list
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openActionConfirm = (requestId: string, type: 'approve' | 'cancel') => {
    setActionConfirm({ isOpen: true, type, requestId });
  };

  const confirmAction = async () => {
    if (actionConfirm.requestId) {
      const newStatus = actionConfirm.type === 'approve' ? 'approved' : 'canceled';
      await handleStatusChange(actionConfirm.requestId, newStatus);
    }
    setActionConfirm({ ...actionConfirm, isOpen: false });
  };

  const startEditing = (requestId: string) => {
    setEditingRequestId(requestId);
    // Clonar itens para edição
    const currentItems = requestItems[requestId] || [];
    const itemsMap: Record<string, RequestItem> = {};
    currentItems.forEach(item => {
      itemsMap[item.id] = { ...item };
    });
    setEditedItems(itemsMap);
  };

  const cancelEditing = () => {
    setEditingRequestId(null);
    setEditedItems({});
  };

  const handleItemChange = (itemId: string, field: keyof RequestItem, value: any) => {
    setEditedItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value }
    }));
  };

  const saveChanges = async (requestId: string) => {
    try {
      const originalItems = requestItems[requestId];
      const updates = [];
      
      for (const item of originalItems) {
        const edited = editedItems[item.id];
        if (edited && (edited.quantity !== item.quantity || edited.unit !== item.unit || edited.note !== item.note)) {
          updates.push(updateRequestItem(item.id, {
            quantity: edited.quantity,
            unit: edited.unit,
            note: edited.note
          }));
        }
      }

      await Promise.all(updates);
      
      // Se houve alterações, mudar status para "adjusted" se ainda estiver "pending"
      const request = requests.find(r => r.id === requestId);
      if (request?.status === 'pending' && updates.length > 0) {
        await updateRequestStatus(requestId, 'adjusted');
      }

      toast({
        title: "Alterações salvas",
        description: "Os itens foram atualizados com sucesso.",
      });
      
      // Reload items
      const updatedItems = await fetchRequestItems(requestId);
      setRequestItems(prev => ({ ...prev, [requestId]: updatedItems }));
      cancelEditing();
      loadRequests(); // Update status in list if changed
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteItem = async (requestId: string, itemId: string) => {
    try {
      await deleteRequestItem(itemId);
      
      // Update local state
      const updatedItems = editedItems;
      delete updatedItems[itemId];
      setEditedItems({ ...updatedItems });

      setRequestItems(prev => ({
        ...prev,
        [requestId]: prev[requestId].filter(i => i.id !== itemId)
      }));

      toast({ title: "Item removido" });
    } catch (error: any) {
      toast({
        title: "Erro ao remover item",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filterStatus !== 'all' && req.status !== filterStatus) return false;
    if (filterPriority !== 'all' && (req.priority || 'medium') !== filterPriority) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 pb-20">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Solicitações</h1>
            {isAdmin && <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 border-blue-200">Admin</Badge>}
            {!isAdmin && userRole && <Badge variant="outline" className="ml-2 text-xs text-muted-foreground" title="Seu nível de acesso">{userRole}</Badge>}
          </div>
          <Button size="sm" onClick={() => navigate('/requests/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4 grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Data</label>
              <div className="relative">
                <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="date" 
                  className="pl-9" 
                  value={filterDate} 
                  onChange={(e) => setFilterDate(e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="adjusted">Ajustado</SelectItem>
                  <SelectItem value="fulfilled">Concluído</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
               <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
               <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Solicitações */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhuma solicitação encontrada.</p>
            {(filterDate || filterStatus !== 'all' || filterPriority !== 'all') && (
               <Button variant="link" onClick={() => {
                 setFilterDate('');
                 setFilterStatus('all');
                 setFilterPriority('all');
               }}>
                 Limpar filtros
               </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((req) => {
              const isEditing = editingRequestId === req.id;
              const canEdit = isAdmin && (req.status === 'pending' || req.status === 'adjusted');
              const canApprove = isAdmin && (req.status === 'pending' || req.status === 'adjusted');

              return (
                <Card key={req.id} className="overflow-hidden">
                  <Collapsible open={expandedRequestId === req.id} onOpenChange={() => toggleExpand(req.id)}>
                    <div className="p-4 flex items-start justify-between cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => toggleExpand(req.id)}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-lg">
                            {format(new Date(req.date_for), "dd 'de' MMMM", { locale: ptBR })}
                          </span>
                          <Badge className={cn("text-white capitalize", statusColors[req.status] || "bg-gray-500")}>
                            {statusLabels[req.status] || req.status}
                          </Badge>
                           <Badge variant="outline" className={cn(priorityColors[req.priority || 'medium'])}>
                              {priorityLabels[req.priority || 'medium']}
                           </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                           {req.request_type && (
                             <span className="bg-muted px-1.5 py-0.5 rounded font-medium text-foreground/80">
                               {req.request_type === 'daily_restock' ? 'Reposição' : req.request_type}
                             </span>
                           )}
                           <span>•</span>
                           <span>{format(new Date(req.created_at), "HH:mm")}</span>
                           <span>•</span>
                           <span>{req.created_by?.slice(0, 8)}...</span>
                        </div>
                        {req.notes && (
                           <p className="text-xs text-muted-foreground italic mt-1 line-clamp-1">
                             Obs: {req.notes}
                           </p>
                        )}
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                          {expandedRequestId === req.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span className="sr-only">Toggle</span>
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 border-t pt-4 bg-muted/20">
                        {loadingItems[req.id] ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : (requestItems[req.id] || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center">Nenhum item nesta solicitação.</p>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Itens Solicitados</h4>
                              {isAdmin && canEdit && !isEditing && (
                                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => startEditing(req.id)}>
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Ajustar
                                </Button>
                              )}
                              {isEditing && (
                                <div className="flex gap-2">
                                  <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={cancelEditing}>
                                    <X className="h-3 w-3 mr-1" />
                                    Cancelar
                                  </Button>
                                  <Button size="sm" variant="default" className="h-6 text-xs" onClick={() => saveChanges(req.id)}>
                                    <Save className="h-3 w-3 mr-1" />
                                    Salvar
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            <ScrollArea className="h-auto max-h-[400px]">
                              <ul className="space-y-2">
                                {(requestItems[req.id] || []).map((item) => {
                                  const itemEditing = isEditing ? editedItems[item.id] : item;
                                  // Fallback se algo der errado no estado de edição
                                  if (isEditing && !itemEditing) return null; 

                                  return (
                                    <li key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm p-3 bg-background rounded border gap-2">
                                      <div className="flex-1">
                                        <span className="font-medium">{item.product_name || 'Produto sem nome'}</span>
                                        {!isEditing && item.note && <p className="text-xs text-muted-foreground italic">{item.note}</p>}
                                        {isEditing && (
                                          <Input 
                                            className="mt-1 h-7 text-xs" 
                                            placeholder="Observação" 
                                            value={itemEditing.note || ''} 
                                            onChange={(e) => handleItemChange(item.id, 'note', e.target.value)}
                                          />
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center gap-2 sm:justify-end min-w-[120px]">
                                        {isEditing ? (
                                          <>
                                            <Input 
                                              type="number" 
                                              inputMode="decimal"
                                              className="h-8 w-20 text-right" 
                                              value={itemEditing.quantity}
                                              onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))}
                                            />
                                            <Input 
                                              className="h-8 w-16 text-center" 
                                              value={itemEditing.unit}
                                              onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                                            />
                                            <Button 
                                              size="icon" 
                                              variant="ghost" 
                                              className="h-8 w-8 text-destructive"
                                              onClick={() => handleDeleteItem(req.id, item.id)}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </>
                                        ) : (
                                          <span className="font-mono font-medium bg-muted px-2 py-1 rounded">
                                            {item.quantity} {item.unit}
                                          </span>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </ScrollArea>
                          </div>
                        )}
                        
                        {/* Ações Administrativas */}
                        {isAdmin && expandedRequestId === req.id && (
                          <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                             {canApprove && (
                               <>
                                 <Button 
                                   variant="outline" 
                                   className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto"
                                   onClick={() => openActionConfirm(req.id, 'cancel')}
                                   disabled={isEditing}
                                 >
                                   <X className="h-4 w-4 mr-2" />
                                   Cancelar Solicitação
                                 </Button>
                                 <Button 
                                   className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                                   onClick={() => openActionConfirm(req.id, 'approve')}
                                   disabled={isEditing}
                                 >
                                   <Check className="h-4 w-4 mr-2" />
                                   Aprovar Pedido
                                 </Button>
                               </>
                             )}
                             {/* Se já estiver aprovado/concluído, talvez mostrar botão para reverter ou apenas info */}
                             {req.status === 'approved' && (
                               <Button variant="outline" size="sm" disabled>
                                 <Check className="h-4 w-4 mr-2" />
                                 Aprovado
                               </Button>
                             )}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={actionConfirm.isOpen} onOpenChange={(open) => setActionConfirm(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
            <AlertDialogDescription>
              {actionConfirm.type === 'approve' 
                ? "Deseja realmente aprovar esta solicitação? Isso notificará o solicitante."
                : "Deseja realmente cancelar esta solicitação? Essa ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAction}
              className={actionConfirm.type === 'cancel' ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RequestsPage;
