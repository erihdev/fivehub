import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { TrendingDown, TrendingUp } from "lucide-react";

export function usePerformanceRealtimeAlerts() {
  const { user } = useAuth();
  const lastScoreRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch initial score
    const fetchInitialScore = async () => {
      const { data } = await supabase
        .from("performance_alert_logs")
        .select("score")
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        lastScoreRef.current = data.score;
      }
    };

    fetchInitialScore();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("performance-alerts-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "performance_alert_logs",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newLog = payload.new as { score: number; threshold: number };
          const previousScore = lastScoreRef.current;

          if (previousScore !== null) {
            const scoreDiff = newLog.score - previousScore;
            const significantChange = Math.abs(scoreDiff) >= 10;

            if (significantChange) {
              if (scoreDiff < 0) {
                // Performance dropped
                toast({
                  title: "⚠️ انخفاض في الأداء",
                  description: `انخفض مؤشر الأداء من ${previousScore} إلى ${newLog.score} (${scoreDiff})`,
                  variant: "destructive",
                });
              } else {
                // Performance improved
                toast({
                  title: "📈 تحسن في الأداء",
                  description: `ارتفع مؤشر الأداء من ${previousScore} إلى ${newLog.score} (+${scoreDiff})`,
                });
              }
            }

            // Alert if score dropped below threshold
            if (newLog.score < newLog.threshold && previousScore >= newLog.threshold) {
              toast({
                title: "🔴 تحذير: الأداء تحت الحد الأدنى",
                description: `مؤشر الأداء (${newLog.score}) أقل من الحد الأدنى (${newLog.threshold})`,
                variant: "destructive",
              });
            }
          }

          lastScoreRef.current = newLog.score;
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
}
