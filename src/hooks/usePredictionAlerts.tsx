import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, TrendingDown, Brain, ShieldAlert } from "lucide-react";

interface Predictions {
  predictedScores: number[];
  averagePrediction: number;
  riskLevel: "low" | "medium" | "high";
  insights: string[];
  recommendations: string[];
}

export function usePredictionAlerts() {
  const { user } = useAuth();

  const checkPredictionsAndAlert = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch predictions
      const { data, error } = await supabase.functions.invoke("predict-performance", {
        body: { userId: user.id },
      });

      if (error || !data?.predictions) return;

      const predictions: Predictions = data.predictions;

      // Alert based on risk level
      if (predictions.riskLevel === "high") {
        toast({
          title: "🔴 تحذير: مستوى مخاطر عالي متوقع",
          description: `التوقعات تشير إلى مخاطر عالية الأسبوع القادم. متوسط التوقع: ${predictions.averagePrediction}`,
          variant: "destructive",
          duration: 10000,
        });
      } else if (predictions.riskLevel === "medium") {
        toast({
          title: "⚠️ تنبيه: مستوى مخاطر متوسط",
          description: `يُتوقع بعض التحديات الأسبوع القادم. متوسط التوقع: ${predictions.averagePrediction}`,
          duration: 8000,
        });
      }

      // Alert for specific low-score days
      const lowScoreDays = predictions.predictedScores.filter(score => score < 40);
      if (lowScoreDays.length > 0) {
        toast({
          title: "📉 أيام منخفضة الأداء متوقعة",
          description: `يُتوقع ${lowScoreDays.length} أيام بأداء منخفض الأسبوع القادم`,
          duration: 7000,
        });
      }

      // Alert if average is below threshold
      if (predictions.averagePrediction < 50) {
        toast({
          title: "⚡ تحذير: متوسط أداء منخفض متوقع",
          description: `متوسط التوقع (${predictions.averagePrediction}) أقل من المستوى المطلوب`,
          variant: "destructive",
          duration: 8000,
        });
      }

    } catch (error) {
      console.error("Error checking predictions:", error);
    }
  }, [user]);

  return { checkPredictionsAndAlert };
}
