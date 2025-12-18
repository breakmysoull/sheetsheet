import { supabase } from '@/config/supabase';
import { Request, RequestItem, RequestStatus } from '@/types/inventory';
import { fetchKitchenCodeForUser, fetchUserRole } from './supabaseInventory';

export interface ProductSuggestion {
  id: string;
  name: string;
  unit: string;
  category?: string;
}

export async function searchProducts(query: string): Promise<ProductSuggestion[]> {
  if (!supabase) return [];
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    let kitchenCode = null;
    if (user) {
      kitchenCode = await fetchKitchenCodeForUser(user.id);
    }

    // Busca na tabela de itens do inventário (items)
    // Precisamos do kitchen_code pois a tabela items é isolada por cozinha
    if (!kitchenCode) return [];

    const { data, error } = await supabase
      .from('items')
      .select('item_id, name, unit, category, sheet_name')
      .eq('kitchen_code', kitchenCode)
      .ilike('name', `%${query}%`)
      .limit(20);

    if (error) {
      console.error('Error searching inventory items:', error);
      return [];
    }

    // Mapear para o formato ProductSuggestion
    return (data || []).map((item: any) => ({
      id: item.item_id,
      name: item.name,
      unit: item.unit,
      category: item.category || item.sheet_name
    }));
  } catch (err) {
    console.error('Exception searching products:', err);
    return [];
  }
}

export interface CreateRequestItemInput {
  productId?: string;
  quantity: number;
  unit: string;
  note?: string;
  productName: string;
}

export async function createRequest(items: CreateRequestItemInput[]): Promise<{ request: Request; items: RequestItem[] } | null> {
  if (!supabase) throw new Error('Supabase client not initialized');

  // 1. Validar entradas
  if (!items || items.length === 0) {
    throw new Error('A solicitação deve conter pelo menos um item.');
  }

  const invalidItems = items.filter(item => item.quantity <= 0);
  if (invalidItems.length > 0) {
    throw new Error('Todos os itens devem ter quantidade maior que zero.');
  }

  // 2. Obter Usuário e Kitchen Code
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  const kitchenCode = await fetchKitchenCodeForUser(user.id);
  if (!kitchenCode) {
    throw new Error('Código da cozinha não encontrado para o usuário.');
  }

  // 3. Calcular Data (Amanhã)
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  // Formatar YYYY-MM-DD usando hora local para evitar problemas de fuso horário UTC
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  const dateFor = `${year}-${month}-${day}`;

  // 4. Criar Solicitação (Header)
  const { data: requestData, error: requestError } = await supabase
    .from('requests')
    .insert({
      kitchen_code: kitchenCode,
      date_for: dateFor,
      status: 'pending',
      created_by: user.id,
      notes: 'Solicitação criada via app'
    })
    .select()
    .single();

  if (requestError || !requestData) {
    console.error('Erro ao criar solicitação:', requestError);
    throw new Error(`Falha ao criar a solicitação: ${requestError.message}`);
  }

  const newRequest = requestData as Request;

  // 5. Criar Itens da Solicitação
  const requestItemsData = items.map(item => ({
    request_id: newRequest.id,
    kitchen_code: kitchenCode,
    product_id: item.productId || null,
    product_name: item.productName || null,
    quantity: item.quantity,
    unit: item.unit,
    note: item.note || null
  }));

  const { data: createdItemsData, error: itemsError } = await supabase
    .from('request_items')
    .insert(requestItemsData)
    .select();

  if (itemsError) {
    console.error('Erro ao criar itens da solicitação:', itemsError);
    // Tentar rollback manual (excluir a solicitação criada) se falhar a inserção dos itens
    await supabase.from('requests').delete().eq('id', newRequest.id);
    throw new Error(`Falha ao adicionar itens à solicitação: ${itemsError.message}`);
  }

  return {
    request: newRequest,
    items: createdItemsData as RequestItem[]
  };
}

/**
 * Atualiza o status de uma solicitação.
 * Apenas usuários administrativos (gerente, super_admin) podem realizar essa ação.
 * Verifica transições de status permitidas.
 */
export async function updateRequestStatus(requestId: string, newStatus: RequestStatus): Promise<Request> {
  if (!supabase) throw new Error('Supabase client not initialized');

  // 1. Verificar Autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  // 2. Verificar Permissão Administrativa
  const role = await fetchUserRole(user.id);
  const allowedRoles = ['gerente', 'super_admin'];
  if (!role || !allowedRoles.includes(role)) {
    throw new Error('Apenas usuários administrativos podem alterar o status de solicitações.');
  }

  // 3. Buscar Solicitação Atual
  const { data: currentRequest, error: fetchError } = await supabase
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !currentRequest) {
    throw new Error('Solicitação não encontrada.');
  }

  const currentStatus = currentRequest.status as RequestStatus;

  // 4. Validar Transição de Status
  if (currentStatus === 'fulfilled' || currentStatus === 'canceled') {
    throw new Error(`Não é possível alterar uma solicitação com status final: ${currentStatus}.`);
  }

  if (newStatus === currentStatus) {
    return currentRequest as Request; // Nenhuma alteração necessária
  }

  // Definir transições permitidas (Grafo Direcionado)
  const allowedTransitions: Record<RequestStatus, RequestStatus[]> = {
    'pending': ['approved', 'canceled', 'adjusted'],
    'approved': ['fulfilled', 'canceled', 'adjusted'],
    'adjusted': ['approved', 'fulfilled', 'canceled'],
    'fulfilled': [], // Status final
    'canceled': []   // Status final
  };

  if (!allowedTransitions[currentStatus].includes(newStatus)) {
    throw new Error(`Transição de status inválida: de '${currentStatus}' para '${newStatus}'.`);
  }

  // 5. Atualizar Status
  const { data: updatedRequest, error: updateError } = await supabase
    .from('requests')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select()
    .single();

  if (updateError || !updatedRequest) {
    console.error('Erro ao atualizar status:', updateError);
    throw new Error(`Falha ao atualizar o status da solicitação: ${updateError.message}`);
  }

  return updatedRequest as Request;
}

export async function fetchRequests(date?: string): Promise<Request[]> {
  if (!supabase) return [];
  
  // RLS já filtra por kitchen_code
  let query = supabase
    .from('requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (date) {
    query = query.eq('date_for', date);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar solicitações:', error);
    return [];
  }

  return (data || []) as Request[];
}

export async function fetchRequestItems(requestId: string): Promise<RequestItem[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('request_items')
    .select('*')
    .eq('request_id', requestId);

  if (error) {
    console.error('Erro ao buscar itens da solicitação:', error);
    return [];
  }

  return (data || []) as RequestItem[];
}

export async function updateRequestItem(itemId: string, updates: { quantity?: number; unit?: string; note?: string }): Promise<RequestItem | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('request_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar item da solicitação:', error);
    throw new Error(`Falha ao atualizar item: ${error.message}`);
  }

  return data as RequestItem;
}

export async function deleteRequestItem(itemId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('request_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('Erro ao remover item da solicitação:', error);
    throw new Error(`Falha ao remover item: ${error.message}`);
  }
}

export function subscribeRequestsRealtime(onChange: (payload: any) => void) {
  if (!supabase) return { unsubscribe: () => {} };

  const channel = supabase.channel('requests-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, (payload) => {
      onChange(payload);
    })
    .subscribe();

  return {
    unsubscribe: () => {
      try { supabase.removeChannel(channel); } catch {}
    }
  };
}

