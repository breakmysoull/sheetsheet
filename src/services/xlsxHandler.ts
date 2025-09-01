import * as XLSX from 'xlsx';
import { Sheet, InventoryItem } from '@/types/inventory';

export class XLSXHandler {
  static async parseFile(file: File): Promise<Sheet[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          const sheets: Sheet[] = workbook.SheetNames.map(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            const items: InventoryItem[] = jsonData.map((row: any, index) => ({
              id: `${sheetName}-${index}`,
              name: row['Produto'] || row['Nome'] || row['Item'] || '',
              quantity: parseInt(row['Quantidade'] || row['Qty'] || row['Estoque'] || 0),
              unit: row['Unidade'] || row['Unit'] || 'un',
              category: row['Categoria'] || row['Category'] || sheetName,
              lastUpdated: new Date(),
              updatedBy: 'Sistema'
            })).filter(item => item.name);
            
            return {
              name: sheetName,
              items
            };
          });
          
          resolve(sheets);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  }
  
  static exportToXLSX(sheets: Sheet[], filename: string = 'inventario_atualizado.xlsx') {
    const workbook = XLSX.utils.book_new();
    
    sheets.forEach(sheet => {
      const data = sheet.items.map(item => ({
        'Produto': item.name,
        'Quantidade': item.quantity,
        'Unidade': item.unit || 'un',
        'Categoria': item.category || '',
        'Última Atualização': item.lastUpdated ? new Date(item.lastUpdated).toLocaleString('pt-BR') : '',
        'Atualizado Por': item.updatedBy || ''
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });
    
    XLSX.writeFile(workbook, filename);
  }
}