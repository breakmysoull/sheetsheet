# Sistema de Gestão de Cozinha (Inventário, Produção e Checklist)

Este sistema é uma aplicação web completa para gerenciamento operacional de cozinhas profissionais. Ele permite controlar estoque, produção diária, receitas, checklists de rotina e compras, com suporte a múltiplos perfis de acesso e auditoria.

## 🚀 Funcionalidades Principais

### 1. Inventário Geral e Diário
- **Inventário Geral:**
  - Controle completo de itens (nome, categoria, unidade, quantidade, mínimo/máximo).
  - Importação/Exportação via Excel.
  - Filtros avançados e busca.
- **Inventário Diário (Contagem por Praça):**
  - Contagem separada por praça (ex: Confeitaria, Padaria).
  - Coluna "Dia anterior" mostra o último snapshot salvo.
  - Inputs zeram automaticamente ao reabrir a página para nova contagem.
  - Salva histórico diário sem afetar o estoque geral imediatamente (evita conflitos).

### 2. Gestão de Receitas e Fichas Técnicas
- **Cadastro Completo:** Nome, rendimento, categoria e lista de ingredientes.
- **Cálculo Automático:** Custo da receita baseado no preço dos insumos do inventário.
- **Ferramentas:**
  - Duplicação de receitas.
  - Exclusão com confirmação.
  - Validação de duplicidade (impede nomes iguais na mesma categoria).
- **Produção Diária:** Registro de produção vinculado ao estoque (baixa automática de insumos disponível para admin).

### 3. Checklist Digital e Rotinas
- **Organização por Áreas:**
  - Entradas, Principais, Sobremesas e Limpeza.
  - Subseções: Pré-preparo e Montagem de praça.
- **Interface "Ação Rápida":**
  - Cartões grandes para fácil toque em mobile.
  - Barra de progresso visual por área e geral.
  - Itens concluídos esmaecem e mostram auditoria (quem fez e quando).
- **Regras Semanais:**
  - Configuração de tarefas recorrentes (ex: "Limpar geladeiras" toda terça-feira).
  - Injeção automática no checklist do dia correspondente.
- **Data e Fuso:**
  - Sincronização automática com horário de Brasília (online/offline).
  - Seletor de data amigável (DD/MM/AAAA).

### 4. Compras e Pedidos
- **Lista de Compras Automática:**
  - Sugere itens abaixo do estoque mínimo.
  - Permite adicionar itens manualmente.
- **Exportação:** Gera PDF ou lista para envio ao fornecedor.

### 5. Controle de Acesso e Perfis
- **Perfis:**
  - `super_admin`: Acesso total (inclui Produção, Logs, Gestão de Usuários).
  - `gerente`: Acesso a inventário, receitas, relatórios, compras.
  - `funcionario`: Acesso restrito a contagem e checklist.
- **Segurança:**
  - Rotas protegidas por permissão.
  - Botão "Produção" visível apenas para administradores.

## 🛠 Tecnologias Utilizadas
- **Frontend:** React (Vite), TypeScript, Tailwind CSS.
- **UI Components:** Shadcn/ui (Radix UI), Lucide Icons.
- **Gerenciamento de Estado:** React Hooks (Context API para Auth, Hooks customizados para Inventário).
- **Persistência:** LocalStorage (com arquitetura pronta para Supabase).
- **Utilitários:**
  - `xlsx`: Manipulação de planilhas.
  - `jspdf`: Geração de relatórios PDF.
  - `date-fns` / `Intl`: Manipulação de datas e fuso horário.

## 📱 UX/UI e Design
- **Responsividade:** Layout otimizado para desktop e mobile (cartões grandes, menus colapsáveis).
- **Feedback Visual:**
  - Toasts para sucesso/erro.
  - Barras de progresso coloridas (verde para completo, laranja para pendente).
  - Modais para ações críticas (excluir, resetar dia).
- **Navegação:** Menu lateral (desktop) ou inferior (mobile) intuitivo.

## 📂 Estrutura do Projeto
- `/src/pages`: Telas principais (Home, Inventory, Recipes, Checklist, etc.).
- `/src/hooks`: Lógica de negócio (useInventory, useAuth).
- `/src/components`: Componentes reutilizáveis (Cards, Buttons, Inputs).
- `/src/types`: Definições de tipagem TypeScript.

---
*Documentação gerada em 02/12/2025 para revisão de funcionalidades.*
