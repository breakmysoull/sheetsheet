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
  brand?: string;
  isSubRecipe?: boolean;
  recipeId?: string;
}

export interface Recipe {
  id: string;
  name: string;
  yield: number;
  category?: string;
  active?: boolean;
  ingredients: RecipeIngredient[];
  cost?: number;
  price?: number;
  prepSector?: string;
  revision?: number;
  lastChangedAt?: string;
  versions?: Array<{ version: number; date: string; snapshot: unknown }>;
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
  completedBy?: string;
  completedAt?: string; // ISO string
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

export type RequestStatus = 'pending' | 'approved' | 'adjusted' | 'fulfilled' | 'canceled';

export interface Request {
  id: string; // UUID
  kitchen_code: string;
  date_for: string; // YYYY-MM-DD
  status: RequestStatus;
  notes?: string;
  created_by?: string;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export interface RequestItem {
  id: string; // UUID
  request_id: string; // UUID
  kitchen_code: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit: string;
  note?: string;
  created_at: string; // ISO string
}
