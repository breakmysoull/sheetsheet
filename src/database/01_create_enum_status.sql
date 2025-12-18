-- Criação do tipo ENUM para status das solicitações
-- Este enum controla o fluxo de vida de uma solicitação de compra/produção
CREATE TYPE request_status AS ENUM (
    'pending',   -- Solicitação criada pela cozinha, aguardando revisão do chef/gerente
    'approved',  -- Solicitação revisada e aprovada para compra/produção
    'adjusted',  -- Solicitação modificada pelo gestor (ex: quantidade alterada) antes da aprovação
    'fulfilled', -- Solicitação atendida (insumos comprados ou produzidos) - Estado Final
    'canceled'   -- Solicitação recusada ou cancelada - Estado Final
);

-- Comentário explicativo sobre o tipo (documentação no banco)
COMMENT ON TYPE request_status IS 'Status possíveis para o fluxo de solicitações de compra/produção';
