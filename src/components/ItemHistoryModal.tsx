import React from 'react'
import { UpdateLog } from '@/types/inventory'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ItemHistoryModalProps {
  itemName: string
  logs: UpdateLog[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ItemHistoryModal: React.FC<ItemHistoryModalProps> = ({ itemName, logs, open, onOpenChange }) => {
  const filtered = React.useMemo(() => {
    const list = logs.filter(l => (l.itemName || l.item) === itemName)
    return list.sort((a, b) => {
      const ta = (a.timestamp ? new Date(a.timestamp) : new Date(a.dataHora)).getTime()
      const tb = (b.timestamp ? new Date(b.timestamp) : new Date(b.dataHora)).getTime()
      return tb - ta
    })
  }, [logs, itemName])

  const formatDate = (l: UpdateLog) => {
    const d = l.timestamp ? new Date(l.timestamp) : new Date(l.dataHora)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico — {itemName}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sem movimentações</div>
            ) : (
              filtered.map((l) => (
                <div key={l.id || `${l.item}-${l.dataHora}`} className="flex items-center justify-between border rounded-md p-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={((l.change || l.quantidadeAlterada || 0) >= 0) ? 'secondary' : 'destructive'} className="text-xs">
                      {(l.change || l.quantidadeAlterada || 0) >= 0 ? '+' : ''}{l.change ?? l.quantidadeAlterada}
                    </Badge>
                    {l.type && (
                      <Badge variant="outline" className="text-xs capitalize">{l.type}</Badge>
                    )}
                    {l.reason && (
                      <Badge variant="outline" className="text-xs">{l.reason}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(l)}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

