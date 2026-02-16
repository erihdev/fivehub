import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const usePredictionVerification = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { showNotification, isGranted } = usePushNotifications();
  const isArabic = language === 'ar';

  const getAccuracyMessage = (accuracy: number, coffeeName: string) => {
    if (accuracy >= 90) {
      return {
        title: isArabic ? '🎯 تنبؤ دقيق جداً!' : '🎯 Excellent Prediction!',
        description: isArabic 
          ? `${coffeeName}: دقة ${accuracy}% - تنبؤ ممتاز!`
          : `${coffeeName}: ${accuracy}% accuracy - Excellent!`,
        variant: 'default' as const,
        level: 'excellent',
      };
    } else if (accuracy >= 70) {
      return {
        title: isArabic ? '✓ تنبؤ جيد' : '✓ Good Prediction',
        description: isArabic 
          ? `${coffeeName}: دقة ${accuracy}%`
          : `${coffeeName}: ${accuracy}% accuracy`,
        variant: 'default' as const,
        level: 'good',
      };
    } else if (accuracy >= 50) {
      return {
        title: isArabic ? '⚠️ انحراف متوسط' : '⚠️ Moderate Deviation',
        description: isArabic 
          ? `${coffeeName}: دقة ${accuracy}% - يحتاج مراجعة`
          : `${coffeeName}: ${accuracy}% accuracy - Needs review`,
        variant: 'destructive' as const,
        level: 'moderate',
      };
    } else {
      return {
        title: isArabic ? '🚨 انحراف كبير!' : '🚨 Significant Deviation!',
        description: isArabic 
          ? `${coffeeName}: دقة ${accuracy}% فقط - راجع أنماط الاستهلاك`
          : `${coffeeName}: Only ${accuracy}% accuracy - Review consumption patterns`,
        variant: 'destructive' as const,
        level: 'poor',
      };
    }
  };

  const verifyPredictions = useCallback(async (coffeeId: string, currentStock: number) => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: predictions, error } = await supabase
        .from('inventory_predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('coffee_id', coffeeId)
        .is('verified_at', null)
        .lte('predicted_reorder_date', today);

      if (error) {
        console.error('Error fetching predictions:', error);
        return;
      }

      if (!predictions || predictions.length === 0) return;

      for (const prediction of predictions) {
        const daysSincePrediction = Math.ceil(
          (new Date().getTime() - new Date(prediction.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        const predictedStock = Math.max(0, 
          prediction.actual_stock_at_prediction - (prediction.predicted_daily_consumption * daysSincePrediction)
        );

        const actualDifference = Math.abs(currentStock - predictedStock);
        const maxDifference = Math.max(prediction.actual_stock_at_prediction, 1);
        const percentageAccuracy = Math.max(0, Math.min(100, 100 - (actualDifference / maxDifference * 100)));
        const roundedAccuracy = Math.round(percentageAccuracy);
        const wasAccurate = roundedAccuracy >= 70;

        const { error: updateError } = await supabase
          .from('inventory_predictions')
          .update({
            actual_stock_at_reorder_date: currentStock,
            prediction_accuracy: roundedAccuracy,
            was_accurate: wasAccurate,
            verified_at: new Date().toISOString(),
          })
          .eq('id', prediction.id);

        if (updateError) {
          console.error('Error updating prediction:', updateError);
          continue;
        }

        const message = getAccuracyMessage(roundedAccuracy, prediction.coffee_name);
        
        // Show toast notification
        toast({
          title: message.title,
          description: message.description,
          variant: message.variant,
        });

        // Show push notification for significant events
        if (isGranted && (message.level === 'excellent' || message.level === 'poor')) {
          showNotification(message.title, {
            body: message.description,
            url: '/inventory-report',
            tag: `prediction-${prediction.id}`,
          });
        }
      }
    } catch (err) {
      console.error('Error in verifyPredictions:', err);
    }
  }, [user, isArabic, isGranted, showNotification]);

  return { verifyPredictions };
};
