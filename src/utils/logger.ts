/**
 * Sistema de log para rastrear alterações no inventário
 * Implementa as funcionalidades addLog e getLogs conforme especificação
 */

import { UpdateLog } from '@/types/inventory';

const STORAGE_KEY = 'inventory_logs';
const MAX_LOGS = 500; // Limite máximo de logs armazenados

/**
 * Adiciona uma nova entrada ao log de alterações
 * Cada atualização é registrada em um log local
 */
export function addLog(entry: Omit<UpdateLog, 'dataHora'>): void {
  try {
    const logs = getLogs();
    
    const newLog: UpdateLog = {
      ...entry,
      dataHora: new Date().toISOString(),
      // Manter compatibilidade com formato antigo
      id: Date.now().toString(),
      itemName: entry.item,
      change: entry.quantidadeAlterada,
      timestamp: new Date(),
      updatedBy: entry.usuario || 'Usuário',
      type: entry.quantidadeAlterada > 0 ? 'add' : 'subtract'
    };
    
    // Adicionar no início da lista
    const updatedLogs = [newLog, ...logs];
    
    // Manter apenas os últimos MAX_LOGS
    if (updatedLogs.length > MAX_LOGS) {
      updatedLogs.splice(MAX_LOGS);
    }
    
    // Salvar no localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    
    // Log para debug
    console.log('📝 Log adicionado:', newLog);
    
  } catch (error) {
    console.error('❌ Erro ao adicionar log:', error);
  }
}

/**
 * Recupera todos os logs de alterações
 * Retorna lista ordenada por data (mais recente primeiro)
 */
export function getLogs(): UpdateLog[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (!stored) {
      return [];
    }
    
    const logs = JSON.parse(stored) as UpdateLog[];
    
    // Garantir que todos os logs têm o campo dataHora
    return logs.map(log => ({
      ...log,
      dataHora: log.dataHora || (log.timestamp ? log.timestamp.toString() : new Date().toISOString())
    }));
    
  } catch (error) {
    console.error('❌ Erro ao recuperar logs:', error);
    return [];
  }
}

/**
 * Limpa todos os logs (apenas em casos específicos)
 */
export function clearLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Logs limpos');
  } catch (error) {
    console.error('❌ Erro ao limpar logs:', error);
  }
}

/**
 * Filtra logs por item específico
 */
export function getLogsByItem(itemName: string): UpdateLog[] {
  const logs = getLogs();
  const normalizedName = itemName.toLowerCase();
  
  return logs.filter(log => 
    log.item.toLowerCase().includes(normalizedName) ||
    (log.itemName && log.itemName.toLowerCase().includes(normalizedName))
  );
}

/**
 * Filtra logs por período
 */
export function getLogsByDateRange(startDate: Date, endDate: Date): UpdateLog[] {
  const logs = getLogs();
  
  return logs.filter(log => {
    const logDate = new Date(log.dataHora);
    return logDate >= startDate && logDate <= endDate;
  });
}

/**
 * Filtra logs por usuário
 */
export function getLogsByUser(username: string): UpdateLog[] {
  const logs = getLogs();
  const normalizedUser = username.toLowerCase();
  
  return logs.filter(log => 
    (log.usuario && log.usuario.toLowerCase().includes(normalizedUser)) ||
    (log.updatedBy && log.updatedBy.toLowerCase().includes(normalizedUser))
  );
}

/**
 * Retorna estatísticas dos logs
 */
export function getLogStatistics(): {
  totalLogs: number;
  itemsAffected: number;
  usersActive: number;
  lastUpdate: string | null;
  mostUpdatedItem: string | null;
} {
  const logs = getLogs();
  
  if (logs.length === 0) {
    return {
      totalLogs: 0,
      itemsAffected: 0,
      usersActive: 0,
      lastUpdate: null,
      mostUpdatedItem: null
    };
  }
  
  const items = new Set(logs.map(log => log.item));
  const users = new Set(logs.map(log => log.usuario || log.updatedBy || 'Usuário'));
  
  // Contar atualizações por item
  const itemCounts: Record<string, number> = {};
  logs.forEach(log => {
    itemCounts[log.item] = (itemCounts[log.item] || 0) + 1;
  });
  
  const mostUpdatedItem = Object.entries(itemCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
  
  return {
    totalLogs: logs.length,
    itemsAffected: items.size,
    usersActive: users.size,
    lastUpdate: logs[0]?.dataHora || null,
    mostUpdatedItem
  };
}

/**
 * Exporta logs para formato CSV
 */
export function exportLogsToCSV(): string {
  const logs = getLogs();
  
  const headers = [
    'Data/Hora',
    'Item',
    'Quantidade Alterada',
    'Nova Quantidade',
    'Usuário'
  ];
  
  const csvRows = [
    headers.join(','),
    ...logs.map(log => [
      log.dataHora,
      `"${log.item}"`,
      log.quantidadeAlterada,
      log.novaQuantidade,
      `"${log.usuario || log.updatedBy || 'Usuário'}"`
    ].join(','))
  ];
  
  return csvRows.join('\n');
}

/**
 * Cria um log de backup dos dados
 */
export function createBackupLog(): void {
  const logs = getLogs();
  const backup = {
    timestamp: new Date().toISOString(),
    logs: logs,
    count: logs.length
  };
  
  const backupKey = `${STORAGE_KEY}_backup_${Date.now()}`;
  localStorage.setItem(backupKey, JSON.stringify(backup));
  
  console.log(`💾 Backup criado: ${backupKey}`);
}

/**
 * Restaura logs de um backup
 */
export function restoreFromBackup(backupKey: string): boolean {
  try {
    const backup = localStorage.getItem(backupKey);
    if (!backup) {
      return false;
    }
    
    const parsed = JSON.parse(backup);
    if (parsed.logs && Array.isArray(parsed.logs)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.logs));
      console.log(`🔄 Logs restaurados de: ${backupKey}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Erro ao restaurar backup:', error);
    return false;
  }
}

/**
 * Função utilitária para gerar logs de teste
 */
export function generateTestLogs(): void {
  const testItems = ['Tomate', 'Batata', 'Cebola', 'Arroz', 'Feijão'];
  const testUsers = ['João', 'Maria', 'Pedro', 'Ana'];
  
  for (let i = 0; i < 10; i++) {
    const item = testItems[Math.floor(Math.random() * testItems.length)];
    const user = testUsers[Math.floor(Math.random() * testUsers.length)];
    const quantidade = Math.floor(Math.random() * 20) + 1;
    
    addLog({
      item,
      quantidadeAlterada: quantidade,
      novaQuantidade: quantidade * 2,
      usuario: user
    });
  }
  
  console.log('🧪 Logs de teste gerados');
} 