const getXLSX = async () => {
  const mod = await import('xlsx');
  return (mod as any).default || mod;
};
import { Sheet, InventoryItem, UpdateLog } from '@/types/inventory';

export class XLSXHandler {
  static async parseFile(file: File): Promise<Sheet[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const XLSX = await getXLSX();
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          const sheets: Sheet[] = workbook.SheetNames.map(sheetName => {
            console.log(`[Import] 📑 Processando aba: ${sheetName}`)
            
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // Log de auditoria da importação
            console.log(`[Import Audit] Aba "${sheetName}": ${jsonData.length} linhas cruas encontradas`)

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
            
            // Detectar cabeçalhos reais e colunas de quantidade
            const quantityKeys: string[] = []
            if (jsonData.length > 0) {
              // Analisa as primeiras 5 linhas para encontrar mapeamento de chaves
              for (let i = 0; i < Math.min(jsonData.length, 5); i++) {
                const row: any = jsonData[i]
                Object.keys(row).forEach(key => {
                  const val = String(row[key]).toLowerCase()
                  if (val.includes('armário') || val.includes('armario') || 
                      val.includes('geladeira') || val.includes('freezer') ||
                      val.includes('estoque') || val.includes('stock')) {
                    if (!quantityKeys.includes(key)) quantityKeys.push(key)
                  }
                })
              }
            }

            const items: InventoryItem[] = jsonData.map((row: any, index) => {
              let name = '';
              let quantity = 0;
              let unit = 'un';
              let category = sheetName;

              const keys = Object.keys(row);
              const lower: Record<string, any> = {};
              keys.forEach(k => { lower[k.toLowerCase()] = row[k]; });

              // Se detectamos colunas de quantidade no header scan, usamos elas
              if (quantityKeys.length > 0) {
                quantityKeys.forEach(key => {
                  const val = row[key]
                  if (typeof val === 'number') quantity += val
                  else if (typeof val === 'string') {
                     const match = val.match(/(\d+(?:\.\d+)?)/)
                     if (match) quantity += parseFloat(match[1])
                  }
                })
              }

              if (sheetName.toLowerCase().includes('freezer') || sheetName.toLowerCase().includes('estoque')) {
                name = (row['Estoque Freezer'] || lower['estoque freezer'] || '') as string;
                if (quantity === 0) { // Só busca se não achou via quantityKeys
                  const dataColumns = keys.filter(key => key.includes('Data:') || /\d{2}\/\d{2}\/\d{4}/.test(key));
                  if (dataColumns.length > 0) {
                    const lastColumn = dataColumns[dataColumns.length - 1];
                    const rawQuantity = row[lastColumn];
                    if (typeof rawQuantity === 'number') {
                      quantity = rawQuantity;
                    } else if (typeof rawQuantity === 'string') {
                      const match = rawQuantity.match(/(\d+(?:\.\d+)?)/);
                      quantity = match ? parseFloat(match[1]) : 0;
                      const unitMatch = rawQuantity.match(/[a-zA-Z]+/);
                      if (unitMatch) unit = unitMatch[0];
                    }
                  }
                }
              } else {
                name = (row['__EMPTY'] || lower['__empty'] || '') as string;
                if (!name) {
                  const firstKey = keys[0];
                  if (firstKey && firstKey.includes('Lista de Pedidos')) {
                    name = row[firstKey] || '';
                  }
                }

                if (quantity === 0) {
                  const estoqueColumns = keys.filter(key => key.toLowerCase().includes('estoque') || key.toLowerCase().includes('stock') || row[key] === 'Estoque');
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
              }

              if (!name) {
                const possibleNames = [lower['produto'], lower['nome'], lower['item'], row['Produto'], row['Nome'], row['Item'], row['PRODUTO'], row['NOME'], row['ITEM']];
                name = possibleNames.find(n => n && String(n).trim()) || '';
              }

              if (quantity === 0) {
                const possibleQuantities = [lower['quantidade'], lower['qty'], lower['estoque'], row['Quantidade'], row['Qty'], row['Estoque'], row['QUANTIDADE'], row['QTY'], row['ESTOQUE']];
                const foundQuantity = possibleQuantities.find(q => q !== undefined && q !== null && q !== '');
                if (typeof foundQuantity === 'string') {
                  const match = foundQuantity.match(/(\d+(?:\.\d+)?)/);
                  quantity = match ? parseFloat(match[1]) : 0;
                } else {
                  quantity = foundQuantity ? Number(foundQuantity) || 0 : 0;
                }
              }

              const possibleUnits = [lower['unidade'], lower['unit'], row['Unidade'], row['unit']];
              const foundUnit = possibleUnits.find(u => u && String(u).trim());
              if (foundUnit) unit = String(foundUnit).trim();

              const possibleCategories = [lower['categoria'], row['Categoria']];
              const foundCat = possibleCategories.find(c => c && String(c).trim());
              if (foundCat) category = String(foundCat).trim();

              const item = {
                id: `${sheetName}-${index}`,
                name: String(name).trim(),
                quantity: Number(quantity) || 0,
                unit: String(unit).trim(),
                category: String(category).trim(),
                unidade: String(unit).trim(),
                categoria: String(category).trim(),
                lastUpdated: new Date(),
                updatedBy: 'Sistema'
              };
              return item;
            }).filter(item => {
              const n = (item.name || '').trim();
              const isHeaderRow = n.toLowerCase() === 'produto' || n === 'PRODUTO' || n.includes('Lista de Pedidos') || n.includes('Data:') || n.includes('CONTAGEM') || n.includes('Terça') || n.includes('Quarta') || !n || n.length === 0;
              return !isHeaderRow && n.length > 0;
            });
            
            const validItems = items.length;
            console.log(`[Import Audit] Aba "${sheetName}": ${validItems} itens válidos extraídos.`)
            if (validItems === 0 && jsonData.length > 0) {
               console.warn(`[Import Warning] Aba "${sheetName}" tem dados mas 0 itens válidos. Verifique colunas/cabeçalhos.`)
            }
            
            return {
              name: sheetName,
              items
            };
          });
          
          const totalItems = sheets.reduce((acc, s) => acc + s.items.length, 0);
          console.log(`[Import Audit] Total geral: ${totalItems} itens em ${sheets.length} abas.`)

          resolve(sheets);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  }
  
  static async exportToXLSX(sheets: Sheet[], filename: string = 'inventario_atualizado.xlsx') {
    const XLSX = await getXLSX();
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

  static async exportReports(sheets: Sheet[], updateLogs: UpdateLog[], filename: string = 'relatorios_inventario.xlsx') {
    const XLSX = await getXLSX();
    const workbook = XLSX.utils.book_new()
    const items = sheets.flatMap(s => s.items)

    const estoqueAtual = items.map(i => ({
      Produto: i.name,
      Quantidade: i.quantity,
      Unidade: i.unit || 'un',
      Categoria: i.category || '',
      Minimo: i.minimum ?? 0,
      CustoUnitario: i.unitCost ?? 0
    }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(estoqueAtual), 'Estoque Atual')

    const toDate = (l: UpdateLog) => l.timestamp ? new Date(l.timestamp) : new Date(l.dataHora)
    const diffDays = (d: Date) => (new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    const isSubtract = (l: UpdateLog) => (l.type === 'subtract')

    const daily = updateLogs.filter((l) => {
      const dt = toDate(l)
      const now = new Date()
      return dt.getDate() === now.getDate() && dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear() && isSubtract(l)
    })
    const dailyAgg: Record<string, number> = {}
    daily.forEach((l) => {
      const name = (l.itemName || l.item || '').toLowerCase()
      const qty = Math.abs(Number(l.change ?? l.quantidadeAlterada) || 0)
      dailyAgg[name] = (dailyAgg[name] || 0) + qty
    })
    const dailyRows = Object.entries(dailyAgg).map(([name, qty]) => ({ Item: name, Quantidade: qty }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dailyRows), 'Consumo Diário')

    const weekly = updateLogs.filter((l) => diffDays(toDate(l)) <= 7 && isSubtract(l))
    const weeklyAgg: Record<string, number> = {}
    weekly.forEach((l) => {
      const name = (l.itemName || l.item || '').toLowerCase()
      const qty = Math.abs(Number(l.change ?? l.quantidadeAlterada) || 0)
      weeklyAgg[name] = (weeklyAgg[name] || 0) + qty
    })
    const weeklyRows = Object.entries(weeklyAgg).map(([name, qty]) => ({ Item: name, Quantidade: qty }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(weeklyRows), 'Consumo Semanal')

    const topUsados = Object.entries(weeklyAgg).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, qty]) => ({ Item: name, Quantidade: qty }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(topUsados), 'Top Usados')

    const cmvAgg: Record<string, number> = {}
    Object.entries(weeklyAgg).forEach(([name, qty]) => {
      const item = items.find(i => i.name.toLowerCase() === name)
      const cost = item?.unitCost || 0
      cmvAgg[name] = qty * cost
    })
    const cmvRows = Object.entries(cmvAgg).map(([name, value]) => ({ Item: name, CMV: value }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(cmvRows), 'CMV')

    const projRows = items.map(i => {
      const name = i.name.toLowerCase()
      const usage = weeklyAgg[name] || 0
      const avgDaily = usage / 7
      const daysLeft = avgDaily > 0 ? (i.quantity / avgDaily) : null
      return {
        Item: i.name,
        Quantidade: i.quantity,
        ConsumoDiarioMedio: Number(avgDaily.toFixed(2)),
        DiasRestantes: daysLeft ? Number(daysLeft.toFixed(1)) : 'N/A'
      }
    })
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(projRows), 'Projecoes')

    XLSX.writeFile(workbook, filename)
  }
}
