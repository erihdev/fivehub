import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Award, AlertTriangle, CheckCircle, XCircle, Clock, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';

interface SupplierPerformanceBadgeProps {
  supplierId: string;
  showDetails?: boolean;
}

interface PerformanceData {
  totalOrders: number;
  delayedOrders: number;
  delayPercentage: number;
  avgDelayDays: number;
  performanceLevel: 'excellent' | 'good' | 'average' | 'poor';
}

export const SupplierPerformanceBadge = ({ supplierId, showDetails = false }: SupplierPerformanceBadgeProps) => {
  const { language } = useLanguage();
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        // Fetch all orders for this supplier
        const { data: orders, error } = await supabase
          .from('orders')
          .select('id, expected_delivery, actual_delivery, status')
          .eq('supplier_id', supplierId);

        if (error) throw error;

        if (!orders || orders.length === 0) {
          setPerformance(null);
          setIsLoading(false);
          return;
        }

        // Calculate performance metrics
        const deliveredOrders = orders.filter(o => o.status === 'delivered' && o.actual_delivery && o.expected_delivery);
        const delayedOrders = deliveredOrders.filter(o => {
          const expected = new Date(o.expected_delivery!);
          const actual = new Date(o.actual_delivery!);
          return actual > expected;
        });

        const totalDelayDays = delayedOrders.reduce((sum, o) => {
          const expected = new Date(o.expected_delivery!);
          const actual = new Date(o.actual_delivery!);
          const delayDays = Math.ceil((actual.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
          return sum + Math.max(0, delayDays);
        }, 0);

        const delayPercentage = deliveredOrders.length > 0 
          ? (delayedOrders.length / deliveredOrders.length) * 100 
          : 0;
        
        const avgDelayDays = delayedOrders.length > 0 
          ? totalDelayDays / delayedOrders.length 
          : 0;

        // Determine performance level
        let performanceLevel: 'excellent' | 'good' | 'average' | 'poor' = 'excellent';
        if (delayPercentage <= 5 && avgDelayDays <= 1) {
          performanceLevel = 'excellent';
        } else if (delayPercentage <= 15 && avgDelayDays <= 3) {
          performanceLevel = 'good';
        } else if (delayPercentage <= 30 && avgDelayDays <= 5) {
          performanceLevel = 'average';
        } else {
          performanceLevel = 'poor';
        }

        setPerformance({
          totalOrders: deliveredOrders.length,
          delayedOrders: delayedOrders.length,
          delayPercentage,
          avgDelayDays,
          performanceLevel,
        });
      } catch (error) {
        console.error('Error fetching performance:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerformance();
  }, [supplierId]);

  if (isLoading || !performance) return null;

  const getBadgeConfig = () => {
    switch (performance.performanceLevel) {
      case 'excellent':
        return {
          icon: Award,
          label: language === 'ar' ? 'ممتاز' : 'Excellent',
          className: 'bg-green-500/10 text-green-600 border-green-500/20',
          iconColor: 'text-green-500',
        };
      case 'good':
        return {
          icon: CheckCircle,
          label: language === 'ar' ? 'جيد' : 'Good',
          className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          iconColor: 'text-blue-500',
        };
      case 'average':
        return {
          icon: Minus,
          label: language === 'ar' ? 'متوسط' : 'Average',
          className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
          iconColor: 'text-yellow-500',
        };
      case 'poor':
        return {
          icon: AlertTriangle,
          label: language === 'ar' ? 'ضعيف' : 'Poor',
          className: 'bg-red-500/10 text-red-600 border-red-500/20',
          iconColor: 'text-red-500',
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const tooltipContent = (
    <div className="text-sm space-y-1">
      <p className="font-semibold">{language === 'ar' ? 'أداء التوصيل' : 'Delivery Performance'}</p>
      <p>
        {language === 'ar' ? 'إجمالي الطلبات:' : 'Total Orders:'} {performance.totalOrders}
      </p>
      <p>
        {language === 'ar' ? 'الطلبات المتأخرة:' : 'Delayed Orders:'} {performance.delayedOrders}
      </p>
      <p>
        {language === 'ar' ? 'نسبة التأخير:' : 'Delay Rate:'} {performance.delayPercentage.toFixed(1)}%
      </p>
      <p>
        {language === 'ar' ? 'متوسط أيام التأخير:' : 'Avg Delay Days:'} {performance.avgDelayDays.toFixed(1)}
      </p>
    </div>
  );

  if (showDetails) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
          <span className="font-semibold">{config.label}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{language === 'ar' ? 'الطلبات:' : 'Orders:'}</span>
            <span className="font-medium">{performance.totalOrders}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <span>{language === 'ar' ? 'المتأخرة:' : 'Delayed:'}</span>
            <span className="font-medium">{performance.delayedOrders}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-muted-foreground" />
            <span>{language === 'ar' ? 'نسبة التأخير:' : 'Delay Rate:'}</span>
            <span className="font-medium">{performance.delayPercentage.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span>{language === 'ar' ? 'متوسط التأخير:' : 'Avg Delay:'}</span>
            <span className="font-medium">{performance.avgDelayDays.toFixed(1)} {language === 'ar' ? 'يوم' : 'days'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className={`gap-1 ${config.className}`}>
            <Icon className="w-3 h-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
