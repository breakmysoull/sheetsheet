import { Sheet, InventoryItem } from '@/types/inventory';

export interface DistributionResult {
  sheets: Sheet[];
  transfers: TransferRecord[];
  warnings: string[];
}

export interface TransferRecord {
  itemName: string;
  fromSheet: string;
  toSheet: string;
  category: string;
}

export const CATEGORY_MAPPINGS: Record<string, string> = {
  'bebida': 'Bebidas',
  'bebidas': 'Bebidas',
  'drink': 'Bebidas',
  'drinks': 'Bebidas',
  'hortifruti': 'Hortifruti',
  'horti': 'Hortifruti',
  'legumes': 'Hortifruti',
  'verduras': 'Hortifruti',
  'frutas': 'Hortifruti',
  'secos': 'Secos',
  'mercearia': 'Secos',
  'proteina': 'Proteínas Principal',
  'proteinas': 'Proteínas Principal',
  'carnes': 'Proteínas Principal',
  'limpeza': 'Limpeza',
  'descartaveis': 'Limpeza',
  'laticinios': 'Laticínios',
  'queijos': 'Laticínios',
  'congelados': 'Estoque Freezer',
  'freezer': 'Estoque Freezer',
};

export function distributeItemsByCategory(sourceSheets: Sheet[]): DistributionResult {
  const transfers: TransferRecord[] = [];
  const warnings: string[] = [];
  
  // 1. Flatten all items
  const allItems: (InventoryItem & { _originalSheet: string })[] = [];
  sourceSheets.forEach(sheet => {
    sheet.items.forEach(item => {
      allItems.push({ ...item, _originalSheet: sheet.name });
    });
  });

  // 2. Prepare target sheets map
  // Start with existing sheets to preserve their existence (unless they become empty? we'll see)
  // Actually, we want to group by target sheet name.
  const groupedItems = new Map<string, InventoryItem[]>();

  allItems.forEach(item => {
    let targetSheetName = item._originalSheet;
    const rawCategory = (item.category || item.categoria || '').trim();

    if (rawCategory) {
      // Normalize category
      const lowerCat = rawCategory.toLowerCase();
      
      // Check mappings
      let mappedTarget = null;
      for (const [key, target] of Object.entries(CATEGORY_MAPPINGS)) {
        if (lowerCat.includes(key)) {
          mappedTarget = target;
          break; // Prioritize first match? Or exact match?
        }
      }
      
      if (mappedTarget) {
        targetSheetName = mappedTarget;
      } else {
        // Use the category itself as the sheet name if it looks like a valid category name
        // Capitalize first letter
        targetSheetName = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);
      }
    } else {
        // Item without category
        // Check if original sheet is generic like "Sheet1" or "Página1", if so, maybe warn?
        // For now, keep in original sheet.
    }

    // Record transfer if changed
    if (targetSheetName.toLowerCase() !== item._originalSheet.toLowerCase()) {
      transfers.push({
        itemName: item.name,
        fromSheet: item._originalSheet,
        toSheet: targetSheetName,
        category: rawCategory
      });
    }

    if (!groupedItems.has(targetSheetName)) {
      groupedItems.set(targetSheetName, []);
    }
    groupedItems.get(targetSheetName)?.push(item);
  });

  // 3. Reconstruct sheets
  const newSheets: Sheet[] = Array.from(groupedItems.entries()).map(([name, items]) => ({
    name,
    items: items.map(({ _originalSheet, ...i }) => ({
        ...i,
        category: name // Ensure category matches the sheet (optional, but good for consistency)
    }))
  }));

  // Sort sheets? Maybe keep "Hortifruti", "Secos" etc in a standard order if possible, but alphabetical is fine for now.
  // Or preserve order of appearance from sourceSheets?

  return {
    sheets: newSheets,
    transfers,
    warnings
  };
}
