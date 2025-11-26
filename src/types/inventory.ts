export interface InventoryItem {
  id: string; // nome único do item
  name: string;
  quantity: number;
  unidade?: string; // ex: kg, un, caixa  
  categoria?: string; // ex: legumes, carnes, laticínios
  unit?: string; // mantém compatibilidade
  category?: string; // mantém compatibilidade
  minimum?: number;
  unitCost?: number;
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
  reason?: string;
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

export interface RecipeIngredient {
  itemName: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  yield: number;
  category?: string;
  ingredients: RecipeIngredient[];
}

export interface Purchase {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  supplier?: string;
  price?: number;
  date: string;
  photoUrl?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface ChecklistCategory {
  name: string;
  items: ChecklistItem[];
}

export interface DailyChecklist {
  date: string; // YYYY-MM-DD
  categories: ChecklistCategory[];
}

export type UtensilStatus = 'ok' | 'danificado' | 'manutencao'

export interface Utensil {
  id: string;
  name: string;
  category: string;
  status: UtensilStatus;
  notes?: string;
}
