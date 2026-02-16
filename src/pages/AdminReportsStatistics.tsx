import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Coffee,
  Shield,
  ArrowRight,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  Calendar,
  Loader2,
  BarChart3,
  RefreshCw,
  RotateCcw,
  Filter,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as XLSX from "xlsx";

interface ReportLog {
  id: string;
  supplier_id: string;
  report_month: string;
  rank: number;
  total_suppliers: number;
  performance_score: number | null;
  platform_avg_score: number | null;
  badges_count: number | null;
  email_sent_to: string | null;
  status: string;
  error_message: string | null;
  sent_at: string;
  supplier?: {
    name: string;
  };
}

const COLORS = ["hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--warning))"];

const AdminReportsStatistics = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { language, t, dir } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [reports, setReports] = useState<ReportLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc("is_verified_admin", {
          _user_id: user.id,
        });

        if (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(data === true);
      } catch (error) {
        console.error("Error checking admin:", error);
        setIsAdmin(false);
      }
    };

    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
    if (isAdmin === false) {
      toast({
        title: language === "ar" ? "غير مصرح" : "Unauthorized",
        description:
          language === "ar"
            ? "ليس لديك صلاحية الوصول لهذه الصفحة"
            : "You do not have permission to access this page",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [user, authLoading, isAdmin, navigate, language, toast]);

  useEffect(() => {
    if (!user || isAdmin !== true) return;

    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("monthly_report_logs")
          .select(
            `
            *,
            supplier:suppliers(name)
          `
          )
          .order("sent_at", { ascending: false });

        if (error) throw error;
        setReports(data || []);
      } catch (error) {
        console.error("Error fetching reports:", error);
        toast({
          title: language === "ar" ? "خطأ" : "Error",
          description:
            language === "ar" ? "فشل في جلب التقارير" : "Failed to fetch reports",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [user, isAdmin, language, toast]);

  const handleTriggerReports = async () => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "monthly-supplier-performance-report"
      );

      if (error) throw error;

      toast({
        title: language === "ar" ? "تم الإرسال" : "Reports Sent",
        description:
          language === "ar"
            ? `تم إرسال ${data?.sent || 0} تقرير بنجاح`
            : `Successfully sent ${data?.sent || 0} reports`,
      });

      // Refresh the list
      const { data: refreshedData } = await supabase
        .from("monthly_report_logs")
        .select(
          `
          *,
          supplier:suppliers(name)
        `
        )
        .order("sent_at", { ascending: false });

      setReports(refreshedData || []);
    } catch (error) {
      console.error("Error triggering reports:", error);
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description:
          language === "ar" ? "فشل في إرسال التقارير" : "Failed to send reports",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleResendReport = async (report: ReportLog) => {
    setResendingId(report.id);
    try {
      // Call the edge function with specific supplier
      const { data, error } = await supabase.functions.invoke(
        "monthly-supplier-performance-report",
        {
          body: { supplier_id: report.supplier_id },
        }
      );

      if (error) throw error;

      toast({
        title: language === "ar" ? "تم الإرسال" : "Report Sent",
        description:
          language === "ar"
            ? `تم إعادة إرسال التقرير بنجاح`
            : `Report resent successfully`,
      });

      // Refresh the list
      const { data: refreshedData } = await supabase
        .from("monthly_report_logs")
        .select(
          `
          *,
          supplier:suppliers(name)
        `
        )
        .order("sent_at", { ascending: false });

      setReports(refreshedData || []);
    } catch (error) {
      console.error("Error resending report:", error);
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description:
          language === "ar" ? "فشل في إعادة إرسال التقرير" : "Failed to resend report",
        variant: "destructive",
      });
    } finally {
      setResendingId(null);
    }
  };

  // Filter reports by month
  const filteredReports = selectedMonth
    ? reports.filter((r) => format(new Date(r.sent_at), "yyyy-MM") === selectedMonth)
    : reports;

  // Calculate statistics
  const totalReports = filteredReports.length;
  const sentReports = filteredReports.filter((r) => r.status === "sent").length;
  const failedReports = filteredReports.filter((r) => r.status === "failed").length;
  const uniqueSuppliers = new Set(filteredReports.map((r) => r.supplier_id)).size;
  const avgPerformance =
    filteredReports.length > 0
      ? filteredReports.reduce((sum, r) => sum + (r.performance_score || 0), 0) / filteredReports.length
      : 0;

  // Group reports by month for chart
  const reportsByMonth = reports.reduce((acc, report) => {
    const month = format(new Date(report.sent_at), "yyyy-MM");
    if (!acc[month]) {
      acc[month] = { month, sent: 0, failed: 0, avgScore: 0, count: 0, totalScore: 0 };
    }
    if (report.status === "sent") {
      acc[month].sent++;
    } else {
      acc[month].failed++;
    }
    acc[month].totalScore += report.performance_score || 0;
    acc[month].count++;
    acc[month].avgScore = acc[month].totalScore / acc[month].count;
    return acc;
  }, {} as Record<string, { month: string; sent: number; failed: number; avgScore: number; count: number; totalScore: number }>);

  const chartData = Object.values(reportsByMonth).slice(0, 6).reverse();
  const availableMonths = Object.keys(reportsByMonth).sort().reverse();

  // Performance comparison data (month over month)
  const performanceComparisonData = chartData.map((item, index) => {
    const prevMonth = chartData[index - 1];
    return {
      month: item.month,
      avgScore: parseFloat(item.avgScore.toFixed(1)),
      change: prevMonth ? parseFloat((item.avgScore - prevMonth.avgScore).toFixed(1)) : 0,
    };
  });

  const pieData = [
    { name: language === "ar" ? "ناجح" : "Sent", value: sentReports },
    { name: language === "ar" ? "فاشل" : "Failed", value: failedReports },
  ];

  if (authLoading || isLoading || isAdmin === null) {
    return (
      <main
        className="min-h-screen bg-background font-arabic flex items-center justify-center"
        dir={dir}
      >
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir={dir}>
      <div className="container mx-auto px-6 py-8">
        {/* Back link */}
        <Link
          to="/admin-landing"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          {language === "ar" ? "العودة للوحة الرئيسية" : "Back to Main Panel"}
        </Link>

        {/* Page Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              {language === "ar"
                ? "إحصائيات التقارير الشهرية"
                : "Monthly Reports Statistics"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {language === "ar"
                ? "عرض جميع التقارير المرسلة للموردين مع الإحصائيات"
                : "View all reports sent to suppliers with statistics"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const exportData = filteredReports.map((r) => ({
                  [language === "ar" ? "المورد" : "Supplier"]: r.supplier?.name || "-",
                  [language === "ar" ? "التاريخ" : "Date"]: format(new Date(r.sent_at), "dd MMM yyyy HH:mm"),
                  [language === "ar" ? "الترتيب" : "Rank"]: `${r.rank}/${r.total_suppliers}`,
                  [language === "ar" ? "الأداء" : "Performance"]: `${r.performance_score?.toFixed(1) || 0}%`,
                  [language === "ar" ? "متوسط المنصة" : "Platform Avg"]: `${r.platform_avg_score?.toFixed(1) || 0}%`,
                  [language === "ar" ? "الحالة" : "Status"]: r.status === "sent" ? (language === "ar" ? "مرسل" : "Sent") : (language === "ar" ? "فشل" : "Failed"),
                }));
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, language === "ar" ? "التقارير" : "Reports");
                XLSX.writeFile(wb, `reports_statistics_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
                toast({
                  title: language === "ar" ? "تم التصدير" : "Exported",
                  description: language === "ar" ? "تم تصدير الإحصائيات بنجاح" : "Statistics exported successfully",
                });
              }}
            >
              <Download className="w-4 h-4 ml-2" />
              {language === "ar" ? "تصدير Excel" : "Export Excel"}
            </Button>
            <Button onClick={handleTriggerReports} disabled={isSending}>
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Send className="w-4 h-4 ml-2" />
              )}
              {language === "ar" ? "إرسال التقارير الآن" : "Send Reports Now"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{totalReports}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "إجمالي التقارير" : "Total Reports"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
              <p className="text-3xl font-bold">{sentReports}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "مرسلة بنجاح" : "Successfully Sent"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
              <p className="text-3xl font-bold">{failedReports}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "فاشلة" : "Failed"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-info" />
              <p className="text-3xl font-bold">{uniqueSuppliers}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "موردين فريدين" : "Unique Suppliers"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-warning" />
              <p className="text-3xl font-bold">{avgPerformance.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "متوسط الأداء" : "Avg Performance"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {language === "ar" ? "التقارير حسب الشهر" : "Reports by Month"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="sent"
                      fill="hsl(var(--success))"
                      name={language === "ar" ? "ناجح" : "Sent"}
                    />
                    <Bar
                      dataKey="failed"
                      fill="hsl(var(--destructive))"
                      name={language === "ar" ? "فاشل" : "Failed"}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {language === "ar" ? "لا توجد بيانات" : "No data available"}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                {language === "ar" ? "نسبة النجاح" : "Success Rate"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalReports > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {language === "ar" ? "لا توجد بيانات" : "No data available"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Comparison Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {language === "ar" ? "مقارنة الأداء شهر بشهر" : "Month-over-Month Performance"}
            </CardTitle>
            <CardDescription>
              {language === "ar"
                ? "تتبع متوسط أداء الموردين عبر الأشهر"
                : "Track average supplier performance across months"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {performanceComparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value}%`,
                      name === "avgScore" 
                        ? (language === "ar" ? "متوسط الأداء" : "Avg Performance")
                        : (language === "ar" ? "التغيير" : "Change")
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgScore"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 6 }}
                    name={language === "ar" ? "متوسط الأداء" : "Avg Performance"}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {language === "ar" ? "لا توجد بيانات" : "No data available"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {language === "ar" ? "سجل التقارير" : "Reports Log"}
                </CardTitle>
                <CardDescription>
                  {language === "ar"
                    ? "جميع التقارير الشهرية المرسلة للموردين"
                    : "All monthly reports sent to suppliers"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={selectedMonth || "all"} onValueChange={(val) => setSelectedMonth(val === "all" ? "" : val)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={language === "ar" ? "جميع الأشهر" : "All Months"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {language === "ar" ? "جميع الأشهر" : "All Months"}
                    </SelectItem>
                    {availableMonths.map((month) => (
                      <SelectItem key={month} value={month}>
                        {format(new Date(month + "-01"), "MMMM yyyy", {
                          locale: language === "ar" ? ar : undefined,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>{language === "ar" ? "لا توجد تقارير بعد" : "No reports yet"}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === "ar" ? "المورد" : "Supplier"}</TableHead>
                      <TableHead>{language === "ar" ? "التاريخ" : "Date"}</TableHead>
                      <TableHead>{language === "ar" ? "الترتيب" : "Rank"}</TableHead>
                      <TableHead>{language === "ar" ? "الأداء" : "Performance"}</TableHead>
                      <TableHead>
                        {language === "ar" ? "متوسط المنصة" : "Platform Avg"}
                      </TableHead>
                      <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                      <TableHead>
                        {language === "ar" ? "الإجراء" : "Action"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {report.supplier?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(report.sent_at), "dd MMM yyyy HH:mm", {
                            locale: language === "ar" ? ar : undefined,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            #{report.rank} / {report.total_suppliers}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-bold ${
                              (report.performance_score || 0) >= 70
                                ? "text-success"
                                : (report.performance_score || 0) >= 50
                                ? "text-warning"
                                : "text-destructive"
                            }`}
                          >
                            {report.performance_score?.toFixed(1) || 0}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {report.platform_avg_score?.toFixed(1) || 0}%
                        </TableCell>
                        <TableCell>
                          {report.status === "sent" ? (
                            <Badge className="bg-success">
                              <CheckCircle className="w-3 h-3 ml-1" />
                              {language === "ar" ? "مرسل" : "Sent"}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="w-3 h-3 ml-1" />
                              {language === "ar" ? "فشل" : "Failed"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {report.status === "failed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendReport(report)}
                              disabled={resendingId === report.id}
                            >
                              {resendingId === report.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <RotateCcw className="w-3 h-3 ml-1" />
                                  {language === "ar" ? "إعادة" : "Resend"}
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default AdminReportsStatistics;
