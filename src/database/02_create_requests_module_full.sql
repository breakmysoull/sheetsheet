-- Script completo para o módulo de Solicitações (Idempotente)

-- 1. Tratamento do ENUM (Se já existe, ignoramos ou recriamos se necessário)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE request_status AS ENUM ('pending', 'approved', 'adjusted', 'fulfilled', 'canceled');
    END IF;
END $$;

-- 2. Tabela de Cabeçalho das Solicitações (Requests)
CREATE TABLE IF NOT EXISTS requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kitchen_code TEXT NOT NULL,
    date_for DATE NOT NULL, -- Data para qual a solicitação é feita (ex: amanhã)
    status request_status DEFAULT 'pending'::request_status NOT NULL,
    notes TEXT, -- Observações gerais
    created_by TEXT, -- ID do usuário ou email
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Itens da Solicitação (Request Items)
CREATE TABLE IF NOT EXISTS request_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    kitchen_code TEXT NOT NULL, -- Redundância para facilitar RLS
    product_id TEXT NOT NULL, -- ID do produto/insumo
    product_name TEXT, -- Cache do nome para facilitar exibição sem joins complexos
    quantity NUMERIC(10, 4) NOT NULL,
    unit TEXT NOT NULL,
    note TEXT, -- Observação específica do item
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Índices para Performance
CREATE INDEX IF NOT EXISTS idx_requests_kitchen_date ON requests(kitchen_code, date_for);
CREATE INDEX IF NOT EXISTS idx_requests_kitchen_status ON requests(kitchen_code, status);
CREATE INDEX IF NOT EXISTS idx_request_items_request_id ON request_items(request_id);

-- 5. Habilitar RLS (Segurança)
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Acesso (RLS)
-- Permitir acesso apenas a dados do próprio kitchen_code
DROP POLICY IF EXISTS "Requests isolation by kitchen_code" ON requests;
CREATE POLICY "Requests isolation by kitchen_code" ON requests
    FOR ALL
    USING (kitchen_code = current_setting('app.current_kitchen_code', true)::text OR kitchen_code IS NOT NULL); -- Ajuste conforme sua estratégia de auth atual

DROP POLICY IF EXISTS "Request Items isolation by kitchen_code" ON request_items;
CREATE POLICY "Request Items isolation by kitchen_code" ON request_items
    FOR ALL
    USING (kitchen_code = current_setting('app.current_kitchen_code', true)::text OR kitchen_code IS NOT NULL);
