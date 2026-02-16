import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Brain, Loader2, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target } from "lucide-react";
import { format, addDays } from "date-fns";
import { ar } from "date-fns/locale";

interface Predictions {
  predictedScores: number[];
  averagePrediction: number;
  riskLevel: "low" | "medium" | "high";
  insights: string[];
  recommendations: string[];
}

export function PerformancePredictions() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<Predictions | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPredictions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("predict-performance", {
        body: { userId: user.id },
      });

      if (error) throw error;

      if (data.predictions) {
        setPredictions(data.predictions);
        toast({
          title: "تم إنشاء التوقعات",
          description: "تم تحليل البيانات وإنشاء توقعات الأسبوع القادم",
        });
      }
    } catch (error: any) {
      console.error("Error fetching predictions:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل إنشاء التوقعات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "low":
        return <Badge className="bg-green-600">منخفض</Badge>;
      case "medium":
        return <Badge className="bg-yellow-600">متوسط</Badge>;
      case "high":
        return <Badge className="bg-red-600">عالي</Badge>;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return "bg-green-100 dark:bg-green-900/30";
    if (score >= 40) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            توقعات الأداء للأسبوع القادم
          </div>
          <Button onClick={fetchPredictions} disabled={loading} size="sm">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Brain className="h-4 w-4 ml-2" />
            )}
            {predictions ? "تحديث التوقعات" : "إنشاء التوقعات"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!predictions && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>اضغط على الزر لإنشاء توقعات الأداء باستخدام الذكاء الاصطناعي</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">جاري تحليل البيانات...</p>
          </div>
        )}

        {predictions && !loading && (
          <div className="space-y-6">
            {/* Average & Risk */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">متوسط التوقع</p>
                <p className={`text-3xl font-bold ${getScoreColor(predictions.averagePrediction)}`}>
                  {predictions.averagePrediction}
                </p>
              </div>
              <div className="text-left">
                <p className="text-sm text-muted-foreground mb-1">مستوى المخاطر</p>
                {getRiskBadge(predictions.riskLevel)}
              </div>
            </div>

            {/* Daily Predictions */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                التوقعات اليومية
              </h4>
              <div className="grid grid-cols-7 gap-2">
                {predictions.predictedScores.map((score, index) => {
                  const date = addDays(new Date(), index + 1);
                  return (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg text-center ${getScoreBg(score)}`}
                    >
                      <p className="text-xs text-muted-foreground">
                        {format(date, "EEE", { locale: ar })}
                      </p>
                      <p className={`text-lg font-bold ${getScoreColor(score)}`}>
                        {score}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Insights */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                رؤى مهمة
              </h4>
              <div className="space-y-2">
                {predictions.insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                    <span className="text-primary">•</span>
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                توصيات
              </h4>
              <div className="space-y-2">
                {predictions.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
