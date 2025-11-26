import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface KitchenCodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentCode: string
  onSave: (code: string) => void
}

export const KitchenCodeModal: React.FC<KitchenCodeModalProps> = ({ open, onOpenChange, currentCode, onSave }) => {
  const [code, setCode] = React.useState(currentCode || '')
  React.useEffect(() => { setCode(currentCode || '') }, [currentCode])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Código de acesso da cozinha</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Ex: COZINHA-01"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => { onSave(code.trim()); onOpenChange(false) }}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

