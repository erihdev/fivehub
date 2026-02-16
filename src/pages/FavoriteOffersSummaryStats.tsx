import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Coffee, 
  ArrowRight,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Heart,
  Loader2,
  BarChart3,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, subDays, startOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid } from "recharts";

interface SentSummary {
  id: string;
  sent_at: string;
  status: string;
  recipient_email: string;
  report_data: any;
  error_message: string | null;
  is_test: boolean;
}

const FavoriteOffersSummaryStats = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [summaries, setSummaries] = useState<SentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchSummaries = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("sent_reports")
          .select("*")
          .eq("user_id", user.id)
          .eq("report_type", "favorite_offers_summary")
          .order("sent_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Error fetching summaries:", error);
          return;
        }

        setSummaries(data || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaries();
  }, [user]);

  const totalSent = summaries.length;
  const successfulSent = summaries.filter(s => s.status === 'sent').length;
  const failedSent = summaries.filter(s => s.status === 'failed').length;
  const testSent = summaries.filter(s => s.is_test).length;
  const lastSent = summaries.length > 0 ? summaries[0] : null;

  // Prepare chart data - last 14 days
  const chartData = useMemo(() => {
    const days = 14;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const dateStr = format(date, "yyyy-MM-dd");
      const dayLabel = format(date, "dd/MM");
      
      const daySummaries = summaries.filter(s => {
        const summaryDate = format(new Date(s.sent_at), "yyyy-MM-dd");
        return summaryDate === dateStr;
      });
      
      data.push({
        date: dayLabel,
        successful: daySummaries.filter(s => s.status === 'sent').length,
        failed: daySummaries.filter(s => s.status === 'failed').length,
        total: daySummaries.length,
      });
    }
    
    return data;
  }, [summaries]);

  const chartConfig = {
    successful: {
      label: "ناجح",
      color: "hsl(var(--success))",
    },
    failed: {
      label: "فاشل",
      color: "hsl(var(--destructive))",
    },
    total: {
      label: "الإجمالي",
      color: "hsl(var(--coffee-gold))",
    },
  };

  const exportToCSV = () => {
    if (summaries.length === 0) {
      toast({
        title: "لا توجد بيانات",
        description: "لا توجد ملخصات للتصدير",
        variant: "destructive",
      });
      return;
    }

    // CSV Header with BOM for Arabic support
    const BOM = '\uFEFF';
    const headers = ['التاريخ', 'الوقت', 'البريد الإلكتروني', 'الحالة', 'تجريبي', 'عدد العروض', 'رسالة الخطأ'];
    
    const rows = summaries.map(summary => {
      const date = format(new Date(summary.sent_at), "yyyy-MM-dd");
      const time = format(new Date(summary.sent_at), "HH:mm:ss");
      const status = summary.status === 'sent' ? 'ناجح' : 'فاشل';
      const isTest = summary.is_test ? 'نعم' : 'لا';
      const offersCount = summary.report_data?.offersCount || 0;
      const errorMsg = summary.error_message || '-';
      
      return [date, time, summary.recipient_email, status, isTest, offersCount, errorMsg];
    });

    const csvContent = BOM + [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `favorite-offers-summaries-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "تم التصدير",
      description: `تم تصدير ${summaries.length} سجل بنجاح`,
    });
  };

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir="rtl">
        <Loader2 className="w-10 h-10 text-coffee-gold animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir="rtl">
      <div className="container mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">
            الرئيسية
          </Link>
          <ArrowRight className="w-4 h-4 rotate-180" />
          <Link to="/profile" className="hover:text-foreground">
            الملف الشخصي
          </Link>
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span className="text-foreground">إحصائيات الملخصات</span>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Title */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-coffee-gold/10">
                <BarChart3 className="w-8 h-8 text-coffee-gold" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold">إحصائيات الملخصات</h1>
                <p className="text-muted-foreground">متابعة ملخصات العروض المفضلة المرسلة</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={exportToCSV}
              disabled={summaries.length === 0}
            >
              <Download className="w-4 h-4 ml-2" />
              تصدير CSV
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي المرسل</p>
                    <p className="text-3xl font-bold">{totalSent}</p>
                  </div>
                  <Mail className="w-8 h-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ناجح</p>
                    <p className="text-3xl font-bold text-green-600">{successfulSent}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">فاشل</p>
                    <p className="text-3xl font-bold text-red-600">{failedSent}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">تجريبي</p>
                    <p className="text-3xl font-bold text-indigo-600">{testSent}</p>
                  </div>
                  <Heart className="w-8 h-8 text-indigo-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {summaries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-coffee-gold" />
                  إحصائيات آخر 14 يوم
                </CardTitle>
                <CardDescription>عرض عدد الملخصات المرسلة يومياً</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend 
                      formatter={(value) => {
                        if (value === 'successful') return 'ناجح';
                        if (value === 'failed') return 'فاشل';
                        return value;
                      }}
                    />
                    <Bar 
                      dataKey="successful" 
                      fill="hsl(142, 76%, 36%)" 
                      radius={[4, 4, 0, 0]}
                      name="successful"
                    />
                    <Bar 
                      dataKey="failed" 
                      fill="hsl(var(--destructive))" 
                      radius={[4, 4, 0, 0]}
                      name="failed"
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Last Sent Info */}
          {lastSent && (
            <Card className="border-coffee-gold/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-coffee-gold" />
                  آخر ملخص مرسل
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{lastSent.recipient_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(lastSent.sent_at), "dd MMMM yyyy - HH:mm", { locale: ar })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={lastSent.status === 'sent' ? 'default' : 'destructive'}>
                      {lastSent.status === 'sent' ? 'تم الإرسال' : 'فشل'}
                    </Badge>
                    {lastSent.is_test && (
                      <Badge variant="secondary">تجريبي</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  {formatDistanceToNow(new Date(lastSent.sent_at), { addSuffix: true, locale: ar })}
                </p>
              </CardContent>
            </Card>
          )}

          {/* History Table */}
          <Card>
            <CardHeader>
              <CardTitle>سجل الملخصات</CardTitle>
              <CardDescription>آخر 50 ملخص مرسل</CardDescription>
            </CardHeader>
            <CardContent>
              {summaries.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">لم يتم إرسال أي ملخصات بعد</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    يمكنك اختبار الملخص من صفحة الملف الشخصي
                  </p>
                  <Link to="/profile">
                    <Button variant="outline" className="mt-4">
                      الذهاب للملف الشخصي
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {summaries.map((summary) => (
                    <div 
                      key={summary.id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {summary.status === 'sent' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {format(new Date(summary.sent_at), "dd MMMM yyyy", { locale: ar })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(summary.sent_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {summary.is_test && (
                          <Badge variant="outline" className="text-xs">تجريبي</Badge>
                        )}
                        <Badge variant={summary.status === 'sent' ? 'default' : 'destructive'} className="text-xs">
                          {summary.status === 'sent' ? 'ناجح' : 'فاشل'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default FavoriteOffersSummaryStats;
