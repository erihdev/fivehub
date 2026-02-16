import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/useLanguage';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { useAuth } from '@/hooks/useAuth';

interface PriceAlertButtonProps {
  coffeeId: string;
  coffeeName: string;
  currentPrice: number | null;
}

export function PriceAlertButton({ coffeeId, coffeeName, currentPrice }: PriceAlertButtonProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { alerts, createAlert, deleteAlert } = usePriceAlerts();
  const [open, setOpen] = useState(false);
  const [alertType, setAlertType] = useState<'below' | 'above' | 'any_change'>('below');
  const [targetPrice, setTargetPrice] = useState(currentPrice?.toString() || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingAlert = alerts.find(a => a.coffee_id === coffeeId && a.is_active);

  const handleSubmit = async () => {
    if (!targetPrice && alertType !== 'any_change') return;
    
    setIsSubmitting(true);
    await createAlert(coffeeId, parseFloat(targetPrice) || 0, alertType);
    setIsSubmitting(false);
    setOpen(false);
  };

  const handleRemoveAlert = async () => {
    if (existingAlert) {
      await deleteAlert(existingAlert.id);
    }
  };

  if (!user) return null;

  if (existingAlert) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleRemoveAlert}
        className="text-warning hover:text-warning/80"
        title={language === 'ar' ? 'إزالة التنبيه' : 'Remove Alert'}
      >
        <Bell className="h-4 w-4 fill-current" />
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-warning"
          title={language === 'ar' ? 'إضافة تنبيه سعر' : 'Add Price Alert'}
        >
          <BellOff className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'إضافة تنبيه سعر' : 'Add Price Alert'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="text-sm text-muted-foreground">
            {coffeeName}
            {currentPrice && (
              <span className="block mt-1">
                {language === 'ar' ? 'السعر الحالي: ' : 'Current price: '}
                ${currentPrice}
              </span>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label>{language === 'ar' ? 'نوع التنبيه' : 'Alert Type'}</Label>
            <Select value={alertType} onValueChange={(v) => setAlertType(v as typeof alertType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="below">
                  {language === 'ar' ? 'عند انخفاض السعر عن' : 'When price goes below'}
                </SelectItem>
                <SelectItem value="above">
                  {language === 'ar' ? 'عند ارتفاع السعر عن' : 'When price goes above'}
                </SelectItem>
                <SelectItem value="any_change">
                  {language === 'ar' ? 'عند أي تغيير في السعر' : 'On any price change'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {alertType !== 'any_change' && (
            <div className="grid gap-2">
              <Label>{language === 'ar' ? 'السعر المستهدف ($)' : 'Target Price ($)'}</Label>
              <Input
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder={currentPrice?.toString() || '0.00'}
              />
            </div>
          )}

          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting 
              ? (language === 'ar' ? 'جاري الإضافة...' : 'Adding...')
              : (language === 'ar' ? 'إضافة التنبيه' : 'Add Alert')
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
