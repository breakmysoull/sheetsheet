import { Sheet } from '@/types/inventory'

export interface ImportWarning {
  type: 'duplicado' | 'colunas' | 'quantidade'
  message: string
}

export function analyzeSheets(sheets: Sheet[]): ImportWarning[] {
  const warnings: ImportWarning[] = []
  sheets.forEach(sheet => {
    const names = new Map<string, number>()
    sheet.items.forEach(i => {
      const key = i.name.trim().toLowerCase()
      names.set(key, (names.get(key) || 0) + 1)
      if (isNaN(Number(i.quantity))) {
        warnings.push({ type: 'quantidade', message: `Quantidade inválida em ${sheet.name}: ${i.name}` })
      }
      if (!i.unit && !i.unidade) {
        warnings.push({ type: 'colunas', message: `Unidade ausente em ${sheet.name}: ${i.name}` })
      }
    })
    names.forEach((count, key) => {
      if (count > 1) warnings.push({ type: 'duplicado', message: `Item duplicado em ${sheet.name}: ${key}` })
    })
  })
  return warnings
}

export function fixSheetsAggregateDuplicates(sheets: Sheet[]): Sheet[] {
  return sheets.map(sheet => {
    const map = new Map<string, number>()
    const units = new Map<string, string | undefined>()
    const cats = new Map<string, string | undefined>()
    const display = new Map<string, string>()
    sheet.items.forEach(i => {
      const key = i.name.trim().toLowerCase()
      const prev = map.get(key) || 0
      const qty = Number(i.quantity) || 0
      map.set(key, prev + qty)
      if (!units.get(key)) units.set(key, i.unit || i.unidade)
      if (!cats.get(key)) cats.set(key, i.category || i.categoria)
      if (!display.get(key)) display.set(key, i.name)
    })
    const items = Array.from(map.entries()).map(([key, qty]) => ({
      id: `${sheet.name}:${key}`,
      name: display.get(key) || key,
      quantity: qty,
      unit: units.get(key) || 'un',
      category: cats.get(key) || sheet.name,
    }))
    return { name: sheet.name, items }
  })
}
