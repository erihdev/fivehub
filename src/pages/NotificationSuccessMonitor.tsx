import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Activity,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Calendar,
  BarChart3,
  Target,
  AlertTriangle,
  Download,
  FileText,
  Printer,
} from "lucide-react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { ar } from "date-fns/locale";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface NotificationLog {
  id: string;
  status: string;
  created_at: string;
  notification_channel: string;
  alert_type: string;
}

const NotificationSuccessMonitor = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [period, setPeriod] = useState<"7" | "14" | "30" | "90">("30");
  const [isExporting, setIsExporting] = useState(false);
  
  const reportRef = useRef<HTMLDivElement>(null);

  const isArabic = language === "ar";

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase.rpc("is_verified_admin", {
        _user_id: user.id,
      });
      setIsAdmin(data === true);
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading]);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
    if (isAdmin === false) {
      navigate("/");
    }
  }, [user, authLoading, isAdmin, navigate]);

  // Fetch logs
  const fetchLogs = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const startDate = subDays(new Date(), parseInt(period));
      
      const { data, error } = await supabase
        .from("commission_notification_logs")
        .select("id, status, created_at, notification_channel, alert_type")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في تحميل البيانات" : "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchLogs();
    }
  }, [user, isAdmin, period]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    if (logs.length === 0) return { total: 0, success: 0, failed: 0, rate: 0 };
    
    const success = logs.filter(l => l.status === "sent").length;
    const failed = logs.filter(l => l.status === "failed").length;
    
    return {
      total: logs.length,
      success,
      failed,
      rate: (success / logs.length) * 100,
    };
  }, [logs]);

  // Daily success rate data for chart
  const dailyData = useMemo(() => {
    const days = parseInt(period);
    const startDate = subDays(new Date(), days);
    const dateRange = eachDayOfInterval({ start: startDate, end: new Date() });
    
    return dateRange.map(date => {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= dayStart && logDate <= dayEnd;
      });
      
      const success = dayLogs.filter(l => l.status === "sent").length;
      const failed = dayLogs.filter(l => l.status === "failed").length;
      const rate = dayLogs.length > 0 ? (success / dayLogs.length) * 100 : null;
      
      return {
        date: format(date, "MM/dd"),
        fullDate: format(date, "yyyy-MM-dd"),
        success,
        failed,
        total: dayLogs.length,
        rate: rate !== null ? Math.round(rate) : null,
      };
    });
  }, [logs, period]);

  // Weekly comparison data
  const weeklyComparison = useMemo(() => {
    const weeks: { week: string; rate: number; total: number }[] = [];
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 0 });
      
      const weekLogs = logs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= weekStart && logDate <= weekEnd;
      });
      
      const success = weekLogs.filter(l => l.status === "sent").length;
      const rate = weekLogs.length > 0 ? (success / weekLogs.length) * 100 : 0;
      
      weeks.push({
        week: format(weekStart, "dd/MM", { locale: isArabic ? ar : undefined }),
        rate: Math.round(rate),
        total: weekLogs.length,
      });
    }
    
    return weeks;
  }, [logs, isArabic]);

  // Channel distribution
  const channelData = useMemo(() => {
    const inApp = logs.filter(l => l.notification_channel === "in_app");
    const email = logs.filter(l => l.notification_channel === "email");
    const both = logs.filter(l => l.notification_channel === "both");
    
    const calcRate = (arr: NotificationLog[]) => 
      arr.length > 0 ? (arr.filter(l => l.status === "sent").length / arr.length) * 100 : 0;
    
    return [
      { 
        name: isArabic ? "داخل التطبيق" : "In-App", 
        total: inApp.length,
        success: inApp.filter(l => l.status === "sent").length,
        rate: Math.round(calcRate(inApp)),
        color: "hsl(var(--primary))" 
      },
      { 
        name: isArabic ? "بريد إلكتروني" : "Email", 
        total: email.length,
        success: email.filter(l => l.status === "sent").length,
        rate: Math.round(calcRate(email)),
        color: "hsl(var(--secondary))" 
      },
      { 
        name: isArabic ? "كلاهما" : "Both", 
        total: both.length,
        success: both.filter(l => l.status === "sent").length,
        rate: Math.round(calcRate(both)),
        color: "hsl(var(--accent))" 
      },
    ].filter(c => c.total > 0);
  }, [logs, isArabic]);

  // Hourly distribution
  const hourlyData = useMemo(() => {
    const hours: { hour: string; success: number; failed: number }[] = [];
    
    for (let h = 0; h < 24; h++) {
      const hourLogs = logs.filter(log => new Date(log.created_at).getHours() === h);
      hours.push({
        hour: `${h}:00`,
        success: hourLogs.filter(l => l.status === "sent").length,
        failed: hourLogs.filter(l => l.status === "failed").length,
      });
    }
    
    return hours;
  }, [logs]);

  // Rate trend (is it improving or declining)
  const rateTrend = useMemo(() => {
    if (dailyData.length < 7) return { trend: "neutral", change: 0 };
    
    const recentDays = dailyData.slice(-7).filter(d => d.rate !== null);
    const olderDays = dailyData.slice(-14, -7).filter(d => d.rate !== null);
    
    if (recentDays.length === 0 || olderDays.length === 0) return { trend: "neutral", change: 0 };
    
    const recentAvg = recentDays.reduce((sum, d) => sum + (d.rate || 0), 0) / recentDays.length;
    const olderAvg = olderDays.reduce((sum, d) => sum + (d.rate || 0), 0) / olderDays.length;
    
    const change = recentAvg - olderAvg;
    
    return {
      trend: change > 5 ? "up" : change < -5 ? "down" : "neutral",
      change: Math.round(change),
    };
  }, [dailyData]);

  const getRateColor = (rate: number) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 70) return "text-amber-600";
    return "text-red-600";
  };

  const getRateBadge = (rate: number) => {
    if (rate >= 90) return <Badge className="bg-green-500">{isArabic ? "ممتاز" : "Excellent"}</Badge>;
    if (rate >= 70) return <Badge className="bg-amber-500">{isArabic ? "جيد" : "Good"}</Badge>;
    return <Badge variant="destructive">{isArabic ? "يحتاج تحسين" : "Needs Improvement"}</Badge>;
  };

  // Export report to PDF
  const exportToPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const reportTitle = isArabic ? "تقرير مراقبة نسبة النجاح" : "Success Rate Monitor Report";
      const dateStr = format(new Date(), "yyyy-MM-dd");
      
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="${isArabic ? "rtl" : "ltr"}">
            <head>
              <title>${reportTitle} - ${dateStr}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: ${isArabic ? "'Cairo', 'Segoe UI'" : "'Segoe UI', Tahoma"}, sans-serif;
                  padding: 20px;
                  background: #fff;
                }
                .header {
                  text-align: center;
                  margin-bottom: 20px;
                  padding-bottom: 15px;
                  border-bottom: 2px solid #333;
                }
                .header h1 {
                  font-size: 24px;
                  margin-bottom: 8px;
                }
                .header p {
                  color: #666;
                  font-size: 14px;
                }
                .stats-summary {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 15px;
                  margin-bottom: 20px;
                }
                .stat-box {
                  padding: 15px;
                  border: 1px solid #ddd;
                  border-radius: 8px;
                  text-align: center;
                }
                .stat-box .value {
                  font-size: 28px;
                  font-weight: bold;
                }
                .stat-box .label {
                  font-size: 12px;
                  color: #666;
                }
                .chart-image {
                  width: 100%;
                  max-width: 100%;
                  margin-top: 20px;
                }
                @media print {
                  body { padding: 10px; }
                  .chart-image { page-break-inside: avoid; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${reportTitle}</h1>
                <p>${isArabic ? "تاريخ التقرير:" : "Report Date:"} ${dateStr}</p>
                <p>${isArabic ? "الفترة:" : "Period:"} ${period} ${isArabic ? "يوم" : "days"}</p>
              </div>
              
              <div class="stats-summary">
                <div class="stat-box">
                  <div class="value" style="color: ${overallStats.rate >= 90 ? '#16a34a' : overallStats.rate >= 70 ? '#d97706' : '#dc2626'}">
                    ${overallStats.rate.toFixed(1)}%
                  </div>
                  <div class="label">${isArabic ? "نسبة النجاح" : "Success Rate"}</div>
                </div>
                <div class="stat-box">
                  <div class="value">${overallStats.total}</div>
                  <div class="label">${isArabic ? "إجمالي الإشعارات" : "Total Notifications"}</div>
                </div>
                <div class="stat-box">
                  <div class="value" style="color: #16a34a">${overallStats.success}</div>
                  <div class="label">${isArabic ? "ناجحة" : "Successful"}</div>
                </div>
                <div class="stat-box">
                  <div class="value" style="color: #dc2626">${overallStats.failed}</div>
                  <div class="label">${isArabic ? "فاشلة" : "Failed"}</div>
                </div>
              </div>
              
              <img src="${imgData}" class="chart-image" alt="Charts" />
              
              <script>
                window.onload = function() {
                  window.print();
                  window.onafterprint = function() {
                    window.close();
                  };
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }

      toast({
        title: isArabic ? "تم فتح نافذة الطباعة" : "Print Dialog Opened",
        description: isArabic ? "احفظ كـ PDF من نافذة الطباعة" : "Save as PDF from print dialog",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في تصدير التقرير" : "Failed to export report",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 shadow-md">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6" />
              <h1 className="text-xl font-bold">
                {isArabic ? "مراقبة نسبة النجاح" : "Success Rate Monitor"}
              </h1>
            </div>
            <nav className="flex items-center gap-4">
              <LanguageSwitcher />
              <Button variant="ghost" className="text-primary-foreground" onClick={() => signOut()}>
                {t("nav.logout")}
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Back button and controls */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/commission-notification-logs")}>
            <ArrowLeft className="w-4 h-4 ml-2" />
            {isArabic ? "العودة لسجل الإشعارات" : "Back to Notification Logs"}
          </Button>

          <div className="flex gap-2 items-center">
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{isArabic ? "7 أيام" : "7 days"}</SelectItem>
                <SelectItem value="14">{isArabic ? "14 يوم" : "14 days"}</SelectItem>
                <SelectItem value="30">{isArabic ? "30 يوم" : "30 days"}</SelectItem>
                <SelectItem value="90">{isArabic ? "90 يوم" : "90 days"}</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="mr-2">{isArabic ? "تحديث" : "Refresh"}</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={exportToPDF} 
              disabled={isExporting || logs.length === 0}
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {isArabic ? "تصدير PDF" : "Export PDF"}
            </Button>
          </div>
        </div>

        {/* Report Content - wrapped in ref for export */}
        <div ref={reportRef}>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-2">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <p className={cn("text-4xl font-bold", getRateColor(overallStats.rate))}>
                {overallStats.rate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isArabic ? "نسبة النجاح الإجمالية" : "Overall Success Rate"}
              </p>
              <div className="mt-2">
                {getRateBadge(overallStats.rate)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {rateTrend.trend === "up" ? (
                  <TrendingUp className="w-6 h-6 text-green-500" />
                ) : rateTrend.trend === "down" ? (
                  <TrendingDown className="w-6 h-6 text-red-500" />
                ) : (
                  <Activity className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <p className={cn(
                "text-3xl font-bold",
                rateTrend.change > 0 ? "text-green-600" : rateTrend.change < 0 ? "text-red-600" : "text-muted-foreground"
              )}>
                {rateTrend.change > 0 ? "+" : ""}{rateTrend.change}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isArabic ? "التغيير (7 أيام)" : "Change (7 days)"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-3xl font-bold text-green-600">{overallStats.success}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isArabic ? "إشعارات ناجحة" : "Successful"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="p-6 text-center">
              <XCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
              <p className="text-3xl font-bold text-red-600">{overallStats.failed}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isArabic ? "إشعارات فاشلة" : "Failed"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Success Rate Over Time */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                <CardTitle>{isArabic ? "نسبة النجاح مع مرور الوقت" : "Success Rate Over Time"}</CardTitle>
              </div>
              <CardDescription>
                {isArabic ? "تتبع نسبة النجاح اليومية" : "Track daily success rate"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value}%`, isArabic ? "نسبة النجاح" : "Success Rate"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#rateGradient)"
                      connectNulls
                    />
                    {/* Reference line at 80% threshold */}
                    <Line
                      type="monotone"
                      dataKey={() => 80}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="5 5"
                      strokeWidth={1}
                      dot={false}
                      name={isArabic ? "الحد الأدنى (80%)" : "Threshold (80%)"}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {isArabic ? "لا توجد بيانات" : "No data available"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Success/Failed Count */}
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? "الإشعارات اليومية" : "Daily Notifications"}</CardTitle>
              <CardDescription>
                {isArabic ? "عدد الإشعارات الناجحة والفاشلة" : "Count of successful and failed notifications"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="success" 
                    name={isArabic ? "ناجحة" : "Successful"} 
                    fill="hsl(142 76% 36%)" 
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                  <Bar 
                    dataKey="failed" 
                    name={isArabic ? "فاشلة" : "Failed"} 
                    fill="hsl(0 84% 60%)" 
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Weekly Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? "مقارنة أسبوعية" : "Weekly Comparison"}</CardTitle>
              <CardDescription>
                {isArabic ? "نسبة النجاح لآخر 4 أسابيع" : "Success rate for last 4 weeks"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyComparison}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value}%`, isArabic ? "نسبة النجاح" : "Success Rate"]}
                  />
                  <Bar 
                    dataKey="rate" 
                    name={isArabic ? "نسبة النجاح" : "Success Rate"} 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channel Performance */}
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? "أداء القنوات" : "Channel Performance"}</CardTitle>
              <CardDescription>
                {isArabic ? "نسبة النجاح حسب قناة الإشعار" : "Success rate by notification channel"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {channelData.length > 0 ? (
                <div className="space-y-4">
                  {channelData.map((channel, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{channel.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {channel.success}/{channel.total}
                          </span>
                          <span className={cn("font-bold", getRateColor(channel.rate))}>
                            {channel.rate}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-500"
                          style={{ 
                            width: `${channel.rate}%`,
                            backgroundColor: channel.rate >= 90 ? "hsl(142 76% 36%)" : channel.rate >= 70 ? "hsl(38 92% 50%)" : "hsl(0 84% 60%)"
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  {isArabic ? "لا توجد بيانات" : "No data available"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hourly Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? "التوزيع بالساعة" : "Hourly Distribution"}</CardTitle>
              <CardDescription>
                {isArabic ? "توزيع الإشعارات على مدار اليوم" : "Notification distribution throughout the day"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" className="text-xs" interval={3} />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="success"
                    name={isArabic ? "ناجحة" : "Successful"}
                    stroke="hsl(142 76% 36%)"
                    fill="hsl(142 76% 36% / 0.3)"
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    name={isArabic ? "فاشلة" : "Failed"}
                    stroke="hsl(0 84% 60%)"
                    fill="hsl(0 84% 60% / 0.3)"
                    stackId="1"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section */}
        {overallStats.rate < 80 && overallStats.total > 0 && (
          <Card className="mt-6 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-amber-800 dark:text-amber-400">
                  {isArabic ? "تحذير: نسبة النجاح منخفضة" : "Warning: Low Success Rate"}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-amber-700 dark:text-amber-300">
                {isArabic 
                  ? `نسبة نجاح الإشعارات الحالية (${overallStats.rate.toFixed(1)}%) أقل من الحد المطلوب (80%). يرجى التحقق من إعدادات البريد الإلكتروني والاتصال بالإنترنت.`
                  : `Current notification success rate (${overallStats.rate.toFixed(1)}%) is below the threshold (80%). Please check email settings and internet connectivity.`
                }
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => navigate("/commission-notification-logs")}>
                  {isArabic ? "عرض السجل التفصيلي" : "View Detailed Log"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
};

export default NotificationSuccessMonitor;
