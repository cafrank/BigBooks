import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import type { InvoiceFormData } from '@/lib/invoice-utils';

interface LineItemProps {
  index: number;
  register: UseFormRegister<InvoiceFormData>;
  errors: FieldErrors<InvoiceFormData>;
  quantity: number;
  unitPrice: number;
  canRemove: boolean;
  onRemove: () => void;
}

export function LineItem({
  index,
  register,
  errors,
  quantity,
  unitPrice,
  canRemove,
  onRemove,
}: LineItemProps) {
  const amount = (quantity || 0) * (unitPrice || 0);

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="space-y-4">
        <Input
          {...register(`lineItems.${index}.description`)}
          label="Description *"
          placeholder="Item description..."
          error={errors.lineItems?.[index]?.description?.message}
        />
        <div className="grid gap-4 md:grid-cols-4">
          <Input
            {...register(`lineItems.${index}.quantity`, {
              valueAsNumber: true,
            })}
            type="number"
            step="0.01"
            label="Quantity *"
            error={errors.lineItems?.[index]?.quantity?.message}
          />
          <Input
            {...register(`lineItems.${index}.unitPrice`, {
              valueAsNumber: true,
            })}
            type="number"
            step="0.01"
            label="Unit Price *"
            error={errors.lineItems?.[index]?.unitPrice?.message}
          />
          <Input
            {...register(`lineItems.${index}.taxRate`, {
              valueAsNumber: true,
            })}
            type="number"
            step="0.01"
            label="Tax Rate (%)"
            placeholder="0"
          />
          <div className="flex items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <div className="flex h-10 items-center rounded-md border border-gray-300 bg-gray-50 px-3 text-sm font-medium">
                {formatCurrency(amount)}
              </div>
            </div>
            {canRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={onRemove}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
