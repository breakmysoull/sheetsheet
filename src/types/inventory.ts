export interface InventoryItem {
  id: string; // nome único do item
  name: string;
  quantity: number;
  unidade?: string; // ex: kg, un, caixa  
  categoria?: string; // ex: legumes, carnes, laticínios
  unit?: string; // mantém compatibilidade
  category?: string; // mantém compatibilidade
  lastUpdated?: Date;
  updatedBy?: string;
}



export interface UpdateLog {
  item: string;
  quantidadeAlterada: number;
  novaQuantidade: number;
  usuario?: string;
  dataHora: string; // ISO string
  // Manter campos antigos para compatibilidade
  id?: string;
  itemName?: string;
  change?: number;
  timestamp?: Date;
  updatedBy?: string;
  type?: 'add' | 'subtract' | 'set';
}

export interface Sheet {
  name: string;
  items: InventoryItem[];
}

export interface ParsedCommand {
  type: 'update' | 'export' | 'help' | 'unknown';
  items?: Array<{ name: string; quantity: number }>;
  message?: string;
}