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
            
            // Debug logs (remover em produção)
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔍 Debug - Planilha: ${sheetName}`);
              console.log(`📊 Dados brutos:`, jsonData);
              console.log(`📈 Total de linhas:`, jsonData.length);
              
              if (jsonData.length > 0) {
                console.log(`🔑 Chaves disponíveis:`, Object.keys(jsonData[0] as object));
                console.log(`📝 Primeira linha COMPLETA:`, JSON.stringify(jsonData[0], null, 2));
                
                // Debug de algumas linhas para entender o padrão
                if (jsonData.length > 5) {
                  console.log(`📝 Linha 2:`, JSON.stringify(jsonData[1], null, 2));
                  console.log(`📝 Linha 3:`, JSON.stringify(jsonData[2], null, 2));
                }
              }
            }
            
            const items: InventoryItem[] = jsonData.map((row: any, index) => {
              // Estratégia específica para cada tipo de planilha
              let name = '';
              let quantity = 0;
              let unit = 'un';
              let category = sheetName;
              
              // Estratégia 1: Planilha "Estoque Freezer" - formato especial
              if (sheetName.toLowerCase().includes('freezer') || sheetName.toLowerCase().includes('estoque')) {
                name = row['Estoque Freezer'] || '';
                // Buscar quantidade na última coluna com data mais recente
                const dataColumns = Object.keys(row).filter(key => 
                  key.includes('Data:') || key.match(/\d{2}\/\d{2}\/\d{4}/)
                );
                if (dataColumns.length > 0) {
                  const lastColumn = dataColumns[dataColumns.length - 1];
                  const rawQuantity = row[lastColumn];
                  if (typeof rawQuantity === 'number') {
                    quantity = rawQuantity;
                  } else if (typeof rawQuantity === 'string') {
                    // Extrair número de strings como "2341g", "1kg"
                    const match = rawQuantity.match(/(\d+(?:\.\d+)?)/);
                    quantity = match ? parseFloat(match[1]) : 0;
                    // Extrair unidade
                    const unitMatch = rawQuantity.match(/[a-zA-Z]+/);
                    if (unitMatch) unit = unitMatch[0];
                  }
                }
              }
              // Estratégia 2: Planilhas com formato "__EMPTY": "PRODUTO"
              else {
                // Buscar nome do produto na coluna __EMPTY (primeira coluna após cabeçalhos)
                name = row['__EMPTY'] || '';
                
                // Se não encontrou na __EMPTY, buscar na primeira coluna longa (título da planilha)
                if (!name) {
                  const firstKey = Object.keys(row)[0];
                  if (firstKey && firstKey.includes('Lista de Pedidos')) {
                    name = row[firstKey] || '';
                  }
                }
                
                // Buscar quantidade em colunas que contenham "Estoque"
                const estoqueColumns = Object.keys(row).filter(key => 
                  key.toLowerCase().includes('estoque') || 
                  key.toLowerCase().includes('stock') ||
                  row[key] === 'Estoque'
                );
                
                if (estoqueColumns.length > 0) {
                  for (const col of estoqueColumns) {
                    const rawQuantity = row[col];
                    if (typeof rawQuantity === 'number' && rawQuantity > 0) {
                      quantity = rawQuantity;
                      break;
                    } else if (typeof rawQuantity === 'string') {
                      const match = rawQuantity.match(/(\d+(?:\.\d+)?)/);
                      if (match) {
                        quantity = parseFloat(match[1]);
                        const unitMatch = rawQuantity.match(/[a-zA-Z]+/);
                        if (unitMatch) unit = unitMatch[0];
                        break;
                      }
                    }
                  }
                }
              }
              
                             // Fallback: tentar busca genérica se não encontrou nada
               if (!name) {
                 const possibleNames = [
                   row['Produto'], row['Nome'], row['Item'], row['produto'], 
                   row['nome'], row['item'], row['PRODUTO'], row['NOME'], row['ITEM']
                 ];
                 name = possibleNames.find(n => n && String(n).trim()) || '';
               }
               
               if (quantity === 0) {
                 const possibleQuantities = [
                   row['Quantidade'], row['Qty'], row['Estoque'], row['quantidade'], 
                   row['qty'], row['estoque'], row['QUANTIDADE'], row['QTY'], row['ESTOQUE']
                 ];
                 const foundQuantity = possibleQuantities.find(q => q !== undefined && q !== null && q !== '');
                 quantity = foundQuantity ? Number(foundQuantity) || 0 : 0;
               }
               
              const item = {
                id: `${sheetName}-${index}`,
                name: String(name).trim(),
                quantity: Number(quantity) || 0,
                unit: String(unit).trim(),
                category: String(category).trim(),
                // Manter compatibilidade com campos antigos
                unidade: String(unit).trim(),
                categoria: String(category).trim(),
                lastUpdated: new Date(),
                updatedBy: 'Sistema'
              };
              
              if (process.env.NODE_ENV === 'development' && index < 3) {
                console.log(`🔍 DEBUG Item ${index}:`);
                console.log(`  - Linha original:`, JSON.stringify(row, null, 2));
                console.log(`  - Nome encontrado:`, name);
                console.log(`  - Quantidade encontrada:`, quantity);
                console.log(`  - Unidade encontrada:`, unit);
                console.log(`  - Item final:`, item);
              }
              return item;
            }).filter(item => {
              const isHeaderRow = item.name === 'PRODUTO' || 
                                 item.name.includes('Lista de Pedidos') || 
                                 item.name.includes('Data:') || 
                                 item.name.includes('CONTAGEM') ||
                                 item.name.includes('Terça') ||
                                 item.name.includes('Quarta') ||
                                 !item.name || 
                                 item.name.trim().length === 0;
              return !isHeaderRow && item.name && item.name.length > 0;
            });
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ Itens processados para ${sheetName}:`, items.length);
              console.log(`📋 Itens finais:`, items);
            }
            
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