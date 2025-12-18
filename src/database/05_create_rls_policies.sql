-- Políticas de Segurança (RLS) para o módulo de Solicitações
-- Garante isolamento por tenant e controle de acesso baseado em papel (RBAC)

-- 1. Habilitar RLS (caso não tenha sido feito no script anterior)
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- TABELA: REQUESTS
-- =====================================================================================

-- VISUALIZAR: Todos os usuários vinculados à cozinha podem ver as solicitações
DROP POLICY IF EXISTS "View requests" ON requests;
CREATE POLICY "View requests" ON requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM kitchens_users ku
    WHERE ku.user_id = auth.uid()
    AND ku.kitchen_code = requests.kitchen_code
  )
);

-- CRIAR: Usuários vinculados podem criar solicitações para sua cozinha
DROP POLICY IF EXISTS "Create requests" ON requests;
CREATE POLICY "Create requests" ON requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM kitchens_users ku
    WHERE ku.user_id = auth.uid()
    AND ku.kitchen_code = requests.kitchen_code
  )
);

-- ATUALIZAR: 
-- 1. Administradores (gerente/super_admin) podem editar qualquer solicitação da sua cozinha.
-- 2. O próprio autor pode editar se estiver 'pending'.
DROP POLICY IF EXISTS "Update requests" ON requests;
CREATE POLICY "Update requests" ON requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM kitchens_users ku
    WHERE ku.user_id = auth.uid()
    AND ku.kitchen_code = requests.kitchen_code
    AND (
      ku.role IN ('gerente', 'super_admin') -- Admin
      OR (requests.created_by = auth.uid()::text AND requests.status = 'pending') -- Autor (se pendente)
    )
  )
);

-- EXCLUIR:
-- Apenas administradores ou o autor (se pendente)
DROP POLICY IF EXISTS "Delete requests" ON requests;
CREATE POLICY "Delete requests" ON requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM kitchens_users ku
    WHERE ku.user_id = auth.uid()
    AND ku.kitchen_code = requests.kitchen_code
    AND (
      ku.role IN ('gerente', 'super_admin')
      OR (requests.created_by = auth.uid()::text AND requests.status = 'pending')
    )
  )
);

-- =====================================================================================
-- TABELA: REQUEST_ITEMS
-- =====================================================================================

-- VISUALIZAR: Mesma regra da tabela pai
DROP POLICY IF EXISTS "View request items" ON request_items;
CREATE POLICY "View request items" ON request_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM kitchens_users ku
    WHERE ku.user_id = auth.uid()
    AND ku.kitchen_code = request_items.kitchen_code
  )
);

-- CRIAR: Mesma regra
DROP POLICY IF EXISTS "Create request items" ON request_items;
CREATE POLICY "Create request items" ON request_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM kitchens_users ku
    WHERE ku.user_id = auth.uid()
    AND ku.kitchen_code = request_items.kitchen_code
  )
);

-- ATUALIZAR/EXCLUIR ITENS:
-- Precisamos checar o status da solicitação pai para garantir integridade
DROP POLICY IF EXISTS "Modify request items" ON request_items;
CREATE POLICY "Modify request items" ON request_items
FOR ALL -- Cobre UPDATE e DELETE
USING (
  EXISTS (
    SELECT 1 FROM kitchens_users ku
    WHERE ku.user_id = auth.uid()
    AND ku.kitchen_code = request_items.kitchen_code
    AND (
        -- Se for admin, pode tudo
        ku.role IN ('gerente', 'super_admin')
        OR 
        -- Se for operacional, precisa ser dono da request pai E ela estar pendente
        EXISTS (
            SELECT 1 FROM requests r 
            WHERE r.id = request_items.request_id 
            AND r.created_by = auth.uid()::text 
            AND r.status = 'pending'
        )
    )
  )
);
