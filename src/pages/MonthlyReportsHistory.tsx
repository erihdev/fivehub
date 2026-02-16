import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, FileText, TrendingUp, TrendingDown, Award, Calendar, CheckCircle, XCircle, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PageLoader from "@/components/PageLoader";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ReportLog {
  id: string;
  report_month: string;
  rank: number;
  total_suppliers: number;
  performance_score: number;
  platform_avg_score: number;
  badges_count: number;
  email_sent_to: string;
  status: string;
  sent_at: string;
}

interface Stats {
  totalReports: number;
  avgRank: number;
  avgScore: number;
  bestRank: number;
  improvementTrend: number;
}

const MonthlyReportsHistory = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalReports: 0,
    avgRank: 0,
    avgScore: 0,
    bestRank: 0,
    improvementTrend: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) return;

      try {
        // Get supplier for this user
        const { data: supplier } = await supabase
          .from("suppliers")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!supplier) {
          setLoading(false);
          return;
        }

        // Get report logs
        const { data: logs, error } = await supabase
          .from("monthly_report_logs")
          .select("*")
          .eq("supplier_id", supplier.id)
          .order("sent_at", { ascending: false });

        if (error) throw error;

        setReports(logs || []);

        // Calculate stats
        if (logs && logs.length > 0) {
          const totalReports = logs.length;
          const avgRank = logs.reduce((sum, r) => sum + r.rank, 0) / totalReports;
          const avgScore = logs.reduce((sum, r) => sum + (r.performance_score || 0), 0) / totalReports;
          const bestRank = Math.min(...logs.map((r) => r.rank));

          // Calculate improvement trend (comparing last 2 reports)
          let improvementTrend = 0;
          if (logs.length >= 2) {
            const latestScore = logs[0].performance_score || 0;
            const previousScore = logs[1].performance_score || 0;
            improvementTrend = latestScore - previousScore;
          }

          setStats({
            totalReports,
            avgRank: Math.round(avgRank * 10) / 10,
            avgScore: Math.round(avgScore * 10) / 10,
            bestRank,
            improvementTrend: Math.round(improvementTrend * 10) / 10,
          });
        }
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user]);

  if (authLoading || loading) {
    return <PageLoader />;
  }

  const chartData = [...reports]
    .reverse()
    .map((r) => ({
      month: format(new Date(r.report_month), "MMM yyyy", { locale: ar }),
      score: r.performance_score || 0,
      rank: r.rank,
      avgPlatform: r.platform_avg_score || 0,
    }));

  const exportToExcel = () => {
    const exportData = reports.map((r) => ({
      "الشهر": format(new Date(r.report_month), "MMMM yyyy", { locale: ar }),
      "الترتيب": `#${r.rank}`,
      "إجمالي الموردين": r.total_suppliers,
      "نقاط الأداء": `${r.performance_score || 0}%`,
      "متوسط المنصة": `${r.platform_avg_score?.toFixed(1) || 0}%`,
      "الفرق": `${((r.performance_score || 0) - (r.platform_avg_score || 0)).toFixed(1)}%`,
      "الشارات": r.badges_count,
      "الحالة": r.status === "sent" ? "تم الإرسال" : "فشل",
      "تاريخ الإرسال": format(new Date(r.sent_at), "dd/MM/yyyy HH:mm"),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التقارير الشهرية");
    XLSX.writeFile(wb, `سجل_التقارير_الشهرية_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("تم تصدير البيانات بنجاح");
  };

  const exportToPDF = () => {
    // Create printable content
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>سجل التقارير الشهرية</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; direction: rtl; }
          h1 { color: #1a365d; text-align: center; margin-bottom: 30px; }
          .stats { display: flex; justify-content: space-around; margin-bottom: 30px; }
          .stat { text-align: center; padding: 15px; background: #f7fafc; border-radius: 8px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #2d3748; }
          .stat-label { font-size: 12px; color: #718096; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: center; }
          th { background: #1a365d; color: white; }
          tr:nth-child(even) { background: #f7fafc; }
          .positive { color: #22543d; }
          .negative { color: #c53030; }
          .footer { text-align: center; margin-top: 30px; color: #718096; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>📊 سجل التقارير الشهرية</h1>
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${stats.totalReports}</div>
            <div class="stat-label">إجمالي التقارير</div>
          </div>
          <div class="stat">
            <div class="stat-value">#${stats.bestRank}</div>
            <div class="stat-label">أفضل ترتيب</div>
          </div>
          <div class="stat">
            <div class="stat-value">${stats.avgScore}%</div>
            <div class="stat-label">متوسط الأداء</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>الشهر</th>
              <th>الترتيب</th>
              <th>الأداء</th>
              <th>متوسط المنصة</th>
              <th>الفرق</th>
              <th>الشارات</th>
              <th>تاريخ الإرسال</th>
            </tr>
          </thead>
          <tbody>
            ${reports.map((r) => {
              const diff = (r.performance_score || 0) - (r.platform_avg_score || 0);
              return `
                <tr>
                  <td>${format(new Date(r.report_month), "MMMM yyyy", { locale: ar })}</td>
                  <td>#${r.rank} / ${r.total_suppliers}</td>
                  <td>${r.performance_score || 0}%</td>
                  <td>${r.platform_avg_score?.toFixed(1) || 0}%</td>
                  <td class="${diff >= 0 ? 'positive' : 'negative'}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%</td>
                  <td>${r.badges_count}</td>
                  <td>${format(new Date(r.sent_at), "dd/MM/yyyy")}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>تم التصدير في: ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
          <p>© ${new Date().getFullYear()} منصة دال للقهوة</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    toast.success("تم فتح نافذة الطباعة");
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/supplier-dashboard")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">سجل التقارير الشهرية</h1>
              <p className="text-sm text-muted-foreground">تتبع تطور أدائك عبر الأشهر</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {reports.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد تقارير بعد</h3>
              <p className="text-muted-foreground">
                ستظهر هنا التقارير الشهرية عند إرسالها في بداية كل شهر
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Export Buttons */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 ml-2" />
                تصدير Excel
              </Button>
              <Button variant="outline" onClick={exportToPDF}>
                <Download className="h-4 w-4 ml-2" />
                تصدير PDF
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">إجمالي التقارير</p>
                      <p className="text-2xl font-bold">{stats.totalReports}</p>
                    </div>
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">أفضل ترتيب</p>
                      <p className="text-2xl font-bold text-amber-500">#{stats.bestRank}</p>
                    </div>
                    <Award className="h-8 w-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">متوسط الأداء</p>
                      <p className="text-2xl font-bold">{stats.avgScore}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">تغير الأداء</p>
                      <p className={`text-2xl font-bold ${stats.improvementTrend >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {stats.improvementTrend >= 0 ? "+" : ""}{stats.improvementTrend}%
                      </p>
                    </div>
                    {stats.improvementTrend >= 0 ? (
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    ) : (
                      <TrendingDown className="h-8 w-8 text-red-500" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            {chartData.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>تطور الأداء عبر الأشهر</CardTitle>
                  <CardDescription>مقارنة أدائك بمتوسط المنصة</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        name="أداؤك"
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgPlatform"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="متوسط المنصة"
                        dot={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Rank Chart */}
            {chartData.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>تطور الترتيب</CardTitle>
                  <CardDescription>ترتيبك بين الموردين عبر الأشهر (الأقل أفضل)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" reversed />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="rank" fill="hsl(var(--primary))" name="الترتيب" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Reports Table */}
            <Card>
              <CardHeader>
                <CardTitle>جميع التقارير</CardTitle>
                <CardDescription>سجل كامل بالتقارير الشهرية المرسلة</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الشهر</TableHead>
                      <TableHead>الترتيب</TableHead>
                      <TableHead>الأداء</TableHead>
                      <TableHead>متوسط المنصة</TableHead>
                      <TableHead>الفرق</TableHead>
                      <TableHead>الشارات</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>تاريخ الإرسال</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => {
                      const diff = (report.performance_score || 0) - (report.platform_avg_score || 0);
                      const isAboveAvg = diff >= 0;

                      return (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(report.report_month), "MMMM yyyy", { locale: ar })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={report.rank <= 3 ? "default" : "secondary"}>
                              #{report.rank} / {report.total_suppliers}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">{report.performance_score || 0}%</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {report.platform_avg_score?.toFixed(1) || 0}%
                          </TableCell>
                          <TableCell>
                            <span className={isAboveAvg ? "text-green-500" : "text-red-500"}>
                              {isAboveAvg ? "+" : ""}{diff.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{report.badges_count} شارات</Badge>
                          </TableCell>
                          <TableCell>
                            {report.status === "sent" ? (
                              <div className="flex items-center gap-1 text-green-500">
                                <CheckCircle className="h-4 w-4" />
                                <span>تم الإرسال</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-500">
                                <XCircle className="h-4 w-4" />
                                <span>فشل</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(report.sent_at), "dd/MM/yyyy HH:mm", { locale: ar })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default MonthlyReportsHistory;
