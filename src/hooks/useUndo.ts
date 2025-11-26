import { UpdateLog } from '@/types/inventory'

export interface UndoEntry {
  itemName: string
  previousQuantity: number
  newQuantity: number
}

export const createUndoFromLog = (log: UpdateLog): UndoEntry => {
  const newQ = Number(log.novaQuantidade)
  const change = Number(log.change ?? log.quantidadeAlterada)
  const prev = newQ - change
  return { itemName: log.itemName || log.item, previousQuantity: prev, newQuantity: newQ }
}

