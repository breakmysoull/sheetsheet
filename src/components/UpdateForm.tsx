import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Package } from 'lucide-react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

// Schema de validação conforme especificação
const updateFormSchema = z.object({
  name: z.string()
    .min(1, 'Nome do item é obrigatório')
    .max(100, 'Nome muito longo'),
  quantity: z.number()
    .min(0, 'Quantidade deve ser positiva')
    .max(999999, 'Quantidade muito alta'),
  unit: z.string()
    .min(1, 'Unidade é obrigatória')
    .max(20, 'Unidade muito longa'),
  category: z.string()
    .min(1, 'Categoria é obrigatória')
    .max(50, 'Categoria muito longa'),
  adjustmentType: z.enum(['entrada', 'saida', 'correcao']),
  reason: z.string().min(1, 'Motivo é obrigatório').max(200)
  ,minimum: z.number().min(0, 'Mínimo deve ser positivo').default(0),
  unitCost: z.number().min(0, 'Custo deve ser positivo').default(0)
});

type UpdateFormData = z.infer<typeof updateFormSchema>;

interface UpdateFormProps {
  onSubmit: (data: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
    adjustmentType: 'entrada' | 'saida' | 'correcao';
    reason: string;
    minimum: number;
    unitCost: number;
  }) => void;
  existingCategories?: string[];
  isLoading?: boolean;
}

const commonUnits = [
  'un', 'kg', 'g', 'L', 'mL', 'caixa', 'pacote', 
  'lata', 'garrafa', 'saco', 'dúzia', 'metro'
];

const commonCategories = [
  'Legumes', 'Carnes', 'Laticínios', 'Grãos', 'Bebidas',
  'Condimentos', 'Frutas', 'Verduras', 'Conservas', 'Doces'
];

export const UpdateForm: React.FC<UpdateFormProps> = ({
  onSubmit,
  existingCategories = [],
  isLoading = false
}) => {
  const { role } = useAuth();
  const isAdmin = role === 'super_admin';
  const [quickMode, setQuickMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      name: '',
      quantity: 0,
      unit: 'un',
      category: '',
      adjustmentType: 'entrada',
      reason: '',
      minimum: 0,
      unitCost: 0
    }
  });

  const handleFormSubmit = (data: UpdateFormData) => {
    try {
      onSubmit({
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        category: data.category,
        adjustmentType: data.adjustmentType,
        reason: data.reason,
        minimum: data.minimum,
        unitCost: data.unitCost
      });
      reset();
      toast({
        title: "Item adicionado",
        description: `${data.name}: ${data.quantity} ${data.unit}`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao adicionar item",
        variant: "destructive",
      });
    }
  };

  const handleBulkSubmit = () => {
    if (!bulkInput.trim()) return;

    // Usar o parser de mensagens para processar entrada em lote
    const lines = bulkInput.split('\n').filter(line => line.trim());
    const category = watch('category') || 'Geral';
    const unit = watch('unit') || 'un';

    lines.forEach(line => {
      const match = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)(?:\s+(.+))?$/);
      if (match) {
        const [, name, quantity, itemUnit] = match;
        onSubmit({
          name: name.trim(),
          quantity: parseFloat(quantity),
          unit: itemUnit?.trim() || unit,
          category
        });
      }
    });

    setBulkInput('');
    toast({
      title: "Itens adicionados",
      description: `${lines.length} itens processados em lote`,
    });
  };

  const allCategories = [...new Set([...commonCategories, ...existingCategories])];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Adicionar Item Manual
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant={!quickMode ? "default" : "outline"}
            size="sm"
            onClick={() => setQuickMode(false)}
          >
            Formulário
          </Button>
          <Button
            variant={quickMode ? "default" : "outline"}
            size="sm"
            onClick={() => setQuickMode(true)}
            disabled={!isAdmin}
          >
            Modo Rápido
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!quickMode ? (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit(handleFormSubmit)}
            className="space-y-4"
          >
            {/* Nome do Item */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Item *</Label>
              <Input
                id="name"
                placeholder="Ex: Tomate, Batata, Arroz..."
                {...register('name')}
                className={errors.name ? 'border-red-500' : ''}
                disabled={!isAdmin}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quantidade */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  {...register('quantity', { valueAsNumber: true })}
                  className={errors.quantity ? 'border-red-500' : ''}
                />
                {errors.quantity && (
                  <p className="text-sm text-red-500">{errors.quantity.message}</p>
                )}
              </div>

              {/* Unidade */}
              <div className="space-y-2">
                <Label htmlFor="unit">Unidade *</Label>
              <Select onValueChange={(value) => setValue('unit', value)}>
                  <SelectTrigger className={errors.unit ? 'border-red-500' : ''} disabled={!isAdmin}>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonUnits.map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unit && (
                  <p className="text-sm text-red-500">{errors.unit.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimum">Mínimo *</Label>
              <Input
                id="minimum"
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                {...register('minimum', { valueAsNumber: true })}
                className={errors.minimum ? 'border-red-500' : ''}
                disabled={!isAdmin}
              />
                {errors.minimum && (
                  <p className="text-sm text-red-500">{errors.minimum.message as string}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitCost">Custo Unitário (R$)</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('unitCost', { valueAsNumber: true })}
                className={errors.unitCost ? 'border-red-500' : ''}
                disabled={!isAdmin}
              />
                {errors.unitCost && (
                  <p className="text-sm text-red-500">{errors.unitCost.message as string}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adjustmentType">Tipo de ajuste *</Label>
              <Select onValueChange={(value) => setValue('adjustmentType', value as any)}>
                  <SelectTrigger className={errors.adjustmentType ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="correcao">Correção</SelectItem>
                  </SelectContent>
                </Select>
                {errors.adjustmentType && (
                  <p className="text-sm text-red-500">{errors.adjustmentType.message as string}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo *</Label>
              <Input
                id="reason"
                placeholder="Ex: compra, consumo, ajuste mensal"
                {...register('reason')}
                className={errors.reason ? 'border-red-500' : ''}
              />
                {errors.reason && (
                  <p className="text-sm text-red-500">{errors.reason.message}</p>
                )}
              </div>
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select onValueChange={(value) => setValue('category', value)}>
                <SelectTrigger className={errors.category ? 'border-red-500' : ''} disabled={!isAdmin}>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-500">{errors.category.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading || !isAdmin}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isLoading ? 'Adicionando...' : 'Adicionar Item'}
            </Button>
          </motion.form>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria Padrão</Label>
                <Select onValueChange={(value) => setValue('category', value)}>
                  <SelectTrigger disabled={!isAdmin}>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unidade Padrão</Label>
                <Select onValueChange={(value) => setValue('unit', value)}>
                  <SelectTrigger disabled={!isAdmin}>
                    <SelectValue placeholder="Unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonUnits.map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk">Entrada em Lote</Label>
              <Textarea
                id="bulk"
                placeholder={`Digite um item por linha:
Tomate 5
Batata 3 kg
Cebola 2
Arroz 10 kg`}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                rows={6}
                className="font-mono text-sm"
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Formato: "Nome Quantidade [Unidade]" - um item por linha
              </p>
            </div>

            <Button 
              onClick={handleBulkSubmit}
              className="w-full"
              disabled={!bulkInput.trim() || isLoading || !isAdmin}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isLoading ? 'Processando...' : 'Adicionar Itens em Lote'}
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}; 
