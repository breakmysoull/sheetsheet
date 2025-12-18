-- Tabela de Solicitações (Cabeçalho)
-- Esta tabela armazena o agrupamento dos pedidos feitos para uma data específica.
-- Ex: "Pedido do dia 25/10 para produção/compra do dia 26/10"

CREATE TABLE IF NOT EXISTS requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- Identificador único global
    kitchen_code TEXT NOT NULL, -- Identificador do restaurante (Multi-tenant)
    date_for DATE NOT NULL, -- Data de competência da solicitação (normalmente D+1)
    status request_status DEFAULT 'pending'::request_status NOT NULL, -- Fluxo de aprovação
    notes TEXT, -- Observações gerais do pedido (opcional)
    created_by TEXT, -- Quem criou a solicitação (ID ou Email)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL, -- Auditoria de criação
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL -- Auditoria de atualização
);

-- Índices para otimização de consultas
-- Permite filtrar rapidamente os pedidos de um restaurante específico por data (tela principal)
CREATE INDEX IF NOT EXISTS idx_requests_kitchen_date ON requests(kitchen_code, date_for);

-- Permite filtrar rapidamente os pedidos por status (dashboard do gestor: "o que está pendente?")
CREATE INDEX IF NOT EXISTS idx_requests_kitchen_status ON requests(kitchen_code, status);

-- Comentários na tabela para documentação
COMMENT ON TABLE requests IS 'Armazena as solicitações de compra/produção agrupadas por data e cozinha.';
COMMENT ON COLUMN requests.date_for IS 'Data para a qual os insumos são necessários (data de uso).';
COMMENT ON COLUMN requests.kitchen_code IS 'Código do estabelecimento para isolamento multi-tenant.';
