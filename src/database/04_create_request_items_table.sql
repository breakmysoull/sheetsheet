-- Tabela de Itens da Solicitação
-- Armazena os detalhes de cada produto solicitado dentro de um pedido maior
-- Ex: "5kg de Tomate" dentro da solicitação #123

CREATE TABLE IF NOT EXISTS request_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE, -- Vínculo forte: se a solicitação for apagada, os itens somem
    kitchen_code TEXT NOT NULL, -- Redundância intencional para segurança (RLS) e performance
    product_id TEXT NOT NULL, -- Referência ao produto (assumindo que o ID do produto pode ser texto ou UUID dependendo da sua tabela products)
    product_name TEXT, -- Cache do nome do produto para evitar JOINs em listagens simples (Opcional, mas recomendado)
    quantity NUMERIC(10, 4) NOT NULL, -- Quantidade com precisão decimal (ex: 0.500 kg)
    unit TEXT NOT NULL, -- Unidade de medida (kg, un, lt)
    note TEXT, -- Observação específica do item (ex: "Bem maduro", "Marca X")
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para otimização
-- Essencial para carregar os itens de uma solicitação rapidamente
CREATE INDEX IF NOT EXISTS idx_request_items_request_id ON request_items(request_id);

-- Útil para relatórios: "Quantas vezes pedimos Tomate?"
CREATE INDEX IF NOT EXISTS idx_request_items_product_id ON request_items(product_id);

-- Útil para segurança (RLS)
CREATE INDEX IF NOT EXISTS idx_request_items_kitchen ON request_items(kitchen_code);

-- Comentários explicativos
COMMENT ON TABLE request_items IS 'Itens individuais contidos em uma solicitação de compra/produção.';
COMMENT ON COLUMN request_items.quantity IS 'Quantidade solicitada. Suporta até 4 casas decimais.';
