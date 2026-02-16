import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowRight, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Loader2, 
  Search, 
  Download,
  Calendar,
  Mail,
  FlaskConical,
  Eye,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface SentReport {
  id: string;
  sent_at: string;
  recipient_email: string;
  report_type: string;
  status: string;
  is_test: boolean;
  error_message: string | null;
  report_data: {
    total_checks?: number;
    high_risk?: number;
    medium_risk?: number;
    low_risk?: number;
    average_score?: number;
    period_start?: string;
    period_end?: string;
  } | null;
}

export default function SentReportsHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<SentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<SentReport | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchReports();
  }, [user, navigate]);

  const fetchReports = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sent_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      
      const mappedReports: SentReport[] = (data || []).map(r => ({
        id: r.id,
        sent_at: r.sent_at,
        recipient_email: r.recipient_email,
        report_type: r.report_type,
        status: r.status,
        is_test: r.is_test,
        error_message: r.error_message,
        report_data: r.report_data as SentReport['report_data'],
      }));
      
      setReports(mappedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل سجل التقارير",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resendReport = async (reportId: string) => {
    if (!user) return;

    setResendingId(reportId);
    try {
      const { error } = await supabase.functions.invoke("weekly-smart-report", {
        body: { testMode: true, userId: user.id },
      });

      if (error) throw error;

      toast({
        title: "تم إعادة الإرسال",
        description: "تحقق من بريدك الإلكتروني",
      });

      fetchReports();
    } catch (error: any) {
      toast({
        title: "فشل إعادة الإرسال",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResendingId(null);
    }
  };

  const exportToCSV = () => {
    if (filteredReports.length === 0) {
      toast({
        title: "لا توجد بيانات",
        description: "لا توجد تقارير للتصدير",
        variant: "destructive",
      });
      return;
    }

    const BOM = "\uFEFF";
    const headers = ["تاريخ الإرسال", "البريد الإلكتروني", "النوع", "الحالة", "اختباري", "إجمالي الفحوصات", "مخاطر عالية", "متوسط النقاط"];
    
    const rows = filteredReports.map(report => [
      format(new Date(report.sent_at), "yyyy-MM-dd HH:mm"),
      report.recipient_email,
      report.report_type === "weekly_smart_check" ? "فحص ذكي أسبوعي" : report.report_type,
      report.status === "sent" ? "تم الإرسال" : "فشل",
      report.is_test ? "نعم" : "لا",
      report.report_data?.total_checks || 0,
      report.report_data?.high_risk || 0,
      report.report_data?.average_score || 0,
    ].join(","));

    const csvContent = BOM + headers.join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sent-reports-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "تم التصدير",
      description: `تم تصدير ${filteredReports.length} تقرير`,
    });
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.recipient_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const matchesType = typeFilter === "all" || 
      (typeFilter === "test" && report.is_test) || 
      (typeFilter === "scheduled" && !report.is_test);
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: reports.length,
    sent: reports.filter(r => r.status === "sent").length,
    failed: reports.filter(r => r.status === "failed").length,
    test: reports.filter(r => r.is_test).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">سجل التقارير المرسلة</h1>
                <p className="text-sm text-muted-foreground">عرض جميع التقارير الأسبوعية المرسلة</p>
              </div>
            </div>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 ml-2" />
              تصدير CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">إجمالي التقارير</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
                  <p className="text-xs text-muted-foreground">تم الإرسال</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                  <p className="text-xs text-muted-foreground">فشل الإرسال</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FlaskConical className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.test}</p>
                  <p className="text-xs text-muted-foreground">تقارير اختبارية</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالبريد الإلكتروني..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="sent">تم الإرسال</SelectItem>
                  <SelectItem value="failed">فشل</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="scheduled">مجدول</SelectItem>
                  <SelectItem value="test">اختباري</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              التقارير ({filteredReports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد تقارير</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        report.status === "sent" 
                          ? "bg-green-100 dark:bg-green-900/30" 
                          : "bg-red-100 dark:bg-red-900/30"
                      }`}>
                        {report.status === "sent" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {format(new Date(report.sent_at), "dd MMMM yyyy - HH:mm", { locale: ar })}
                          </span>
                          {report.is_test && (
                            <Badge variant="secondary" className="text-xs">
                              <FlaskConical className="h-3 w-3 ml-1" />
                              اختباري
                            </Badge>
                          )}
                          <Badge variant={report.status === "sent" ? "default" : "destructive"} className="text-xs">
                            {report.status === "sent" ? "تم الإرسال" : "فشل"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {report.recipient_email}
                          </span>
                          {report.report_data?.total_checks !== undefined && (
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-3.5 w-3.5" />
                              {report.report_data.total_checks} فحص
                            </span>
                          )}
                        </div>
                        {report.error_message && (
                          <p className="text-xs text-red-600 mt-1">{report.error_message}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedReport(report)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {report.status === "failed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resendReport(report.id)}
                          disabled={resendingId === report.id}
                        >
                          {resendingId === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Report Details Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تفاصيل التقرير
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">تاريخ الإرسال</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedReport.sent_at), "dd/MM/yyyy HH:mm", { locale: ar })}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">الحالة</p>
                  <Badge variant={selectedReport.status === "sent" ? "default" : "destructive"}>
                    {selectedReport.status === "sent" ? "تم الإرسال" : "فشل"}
                  </Badge>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">البريد الإلكتروني</p>
                <p className="font-medium flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {selectedReport.recipient_email}
                </p>
              </div>

              {selectedReport.report_data && (
                <div className="space-y-3">
                  <p className="font-medium">بيانات التقرير</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-primary/5 rounded-lg text-center">
                      <p className="text-2xl font-bold text-primary">
                        {selectedReport.report_data.total_checks || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">إجمالي الفحوصات</p>
                    </div>
                    <div className="p-3 bg-primary/5 rounded-lg text-center">
                      <p className="text-2xl font-bold text-primary">
                        {selectedReport.report_data.average_score || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">متوسط النقاط</p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {selectedReport.report_data.high_risk || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">مخاطر عالية</p>
                    </div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {selectedReport.report_data.medium_risk || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">مخاطر متوسطة</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedReport.error_message && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-xs text-muted-foreground mb-1">رسالة الخطأ</p>
                  <p className="text-sm text-red-600">{selectedReport.error_message}</p>
                </div>
              )}

              {selectedReport.status === "failed" && (
                <Button
                  className="w-full"
                  onClick={() => {
                    setSelectedReport(null);
                    resendReport(selectedReport.id);
                  }}
                  disabled={resendingId === selectedReport.id}
                >
                  {resendingId === selectedReport.id ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 ml-2" />
                  )}
                  إعادة الإرسال
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
