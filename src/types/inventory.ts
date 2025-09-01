export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  lastUpdated?: Date;
  updatedBy?: string;
}

export interface UpdateLog {
  id: string;
  itemName: string;
  change: number;
  timestamp: Date;
  updatedBy: string;
  type: 'add' | 'subtract' | 'set';
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