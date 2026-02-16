import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface TrendData {
  date: string;
  score: number;
  threshold: number;
}

const chartConfig = {
  score: {
    label: "مؤشر الأداء",
    color: "hsl(var(--primary))",
  },
  threshold: {
    label: "الحد الأدنى",
    color: "hsl(var(--destructive))",
  },
};

export function PerformanceTrendChart() {
  const { user } = useAuth();
  const [data, setData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgThreshold, setAvgThreshold] = useState(40);

  useEffect(() => {
    if (user) {
      fetchTrendData();
    }
  }, [user]);

  const fetchTrendData = async () => {
    try {
      const { data: logs, error } = await supabase
        .from("performance_alert_logs")
        .select("score, threshold, sent_at")
        .eq("user_id", user?.id)
        .order("sent_at", { ascending: true })
        .limit(30);

      if (error) throw error;

      if (logs && logs.length > 0) {
        const formattedData = logs.map((log) => ({
          date: format(new Date(log.sent_at), "dd MMM", { locale: ar }),
          score: log.score,
          threshold: log.threshold,
        }));
        setData(formattedData);
        
        // Calculate average threshold
        const avgThresh = logs.reduce((sum, log) => sum + log.threshold, 0) / logs.length;
        setAvgThreshold(avgThresh);
      }
    } catch (error) {
      console.error("Error fetching trend data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            تطور مؤشر الأداء
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            لا توجد بيانات كافية لعرض الرسم البياني
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          تطور مؤشر الأداء
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine 
                y={avgThreshold} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="5 5"
                label={{ 
                  value: `الحد الأدنى (${avgThreshold})`, 
                  position: "insideTopRight",
                  className: "text-xs fill-destructive"
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>مؤشر الأداء</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-destructive" style={{ borderStyle: 'dashed' }} />
            <span>الحد الأدنى للتنبيه</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
