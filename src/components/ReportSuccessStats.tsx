import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, XCircle, Send, Loader2, TrendingUp, Calendar } from "lucide-react";

interface ReportStats {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  thisWeek: number;
  thisMonth: number;
}

export function ReportSuccessStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const { data: reports, error } = await supabase
        .from("sent_reports")
        .select("status, sent_at, is_test")
        .eq("user_id", user?.id)
        .eq("is_test", false);

      if (error) throw error;

      if (reports) {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const total = reports.length;
        const successful = reports.filter(r => r.status === "sent").length;
        const failed = reports.filter(r => r.status === "failed").length;
        const thisWeek = reports.filter(r => new Date(r.sent_at) >= weekAgo).length;
        const thisMonth = reports.filter(r => new Date(r.sent_at) >= monthAgo).length;

        setStats({
          total,
          successful,
          failed,
          successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
          thisWeek,
          thisMonth,
        });
      }
    } catch (error) {
      console.error("Error fetching report stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            إحصائيات التقارير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            لا توجد تقارير مرسلة بعد
          </p>
        </CardContent>
      </Card>
    );
  }

  const getSuccessColor = (rate: number) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 90) return "bg-green-600";
    if (rate >= 70) return "bg-yellow-600";
    return "bg-destructive";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          إحصائيات التقارير
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Rate */}
        <div className="text-center space-y-2">
          <div className="text-sm text-muted-foreground">نسبة النجاح</div>
          <div className={`text-4xl font-bold ${getSuccessColor(stats.successRate)}`}>
            {stats.successRate}%
          </div>
        <div className="relative">
          <Progress 
            value={stats.successRate} 
            className="h-2"
          />
          <div 
            className={`absolute top-0 left-0 h-full rounded-full transition-all ${getProgressColor(stats.successRate)}`}
            style={{ width: `${stats.successRate}%` }}
          />
        </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <Send className="h-5 w-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">إجمالي التقارير</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
            <div className="text-xs text-muted-foreground">ناجحة</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <XCircle className="h-5 w-5 mx-auto mb-2 text-destructive" />
            <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">فاشلة</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <Calendar className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.thisWeek}</div>
            <div className="text-xs text-muted-foreground">هذا الأسبوع</div>
          </div>
        </div>

        {/* Monthly count */}
        <div className="text-center text-sm text-muted-foreground">
          <span className="font-medium">{stats.thisMonth}</span> تقرير في آخر 30 يوم
        </div>
      </CardContent>
    </Card>
  );
}
