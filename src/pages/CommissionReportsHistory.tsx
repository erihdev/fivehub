import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Coffee,
  ArrowLeft,
  Loader2,
  Mail,
  RefreshCw,
  CheckCircle,
  XCircle,
  Calendar,
  FileText,
  Send,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface CommissionReport {
  id: string;
  user_id: string;
  report_type: string;
  recipient_email: string;
  status: string;
  is_test: boolean;
  error_message: string | null;
  report_data: {
    total_commissions?: number;
    commission_count?: number;
    total_order_value?: number;
    supplier_commissions?: number;
    roaster_commissions?: number;
    date_range?: { from: string; to: string };
  } | null;
  sent_at: string;
}

const CommissionReportsHistory = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { language, t, dir } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [reports, setReports] = useState<CommissionReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResending, setIsResending] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const isArabic = language === "ar";

  // Check if user is admin
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
        title: isArabic ? "غير مصرح" : "Unauthorized",
        description: isArabic
          ? "ليس لديك صلاحية الوصول لهذه الصفحة"
          : "You do not have permission to access this page",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [user, authLoading, isAdmin, navigate, isArabic, toast]);

  useEffect(() => {
    if (!user || isAdmin !== true) return;

    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("sent_reports")
          .select("*")
          .eq("report_type", "weekly_commission")
          .order("sent_at", { ascending: false });

        if (error) throw error;

        setReports((data as CommissionReport[]) || []);
      } catch (error) {
        console.error("Error fetching reports:", error);
        toast({
          title: isArabic ? "خطأ" : "Error",
          description: isArabic ? "فشل في تحميل التقارير" : "Failed to load reports",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [user, isAdmin, isArabic, toast]);

  const handleResend = async (reportId: string) => {
    setIsResending(reportId);
    try {
      const { data, error } = await supabase.functions.invoke("weekly-commission-report", {
        body: { testMode: false },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: isArabic ? "تم الإرسال" : "Sent",
          description: isArabic
            ? `تم إعادة إرسال التقرير بنجاح`
            : `Report resent successfully`,
        });
        
        // Refresh reports list
        const { data: newReports } = await supabase
          .from("sent_reports")
          .select("*")
          .eq("report_type", "weekly_commission")
          .order("sent_at", { ascending: false });

        if (newReports) {
          setReports(newReports as CommissionReport[]);
        }
      } else {
        throw new Error(data?.message || "Unknown error");
      }
    } catch (error: any) {
      console.error("Error resending report:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في إعادة إرسال التقرير" : "Failed to resend report",
        variant: "destructive",
      });
    } finally {
      setIsResending(null);
    }
  };

  // Calculate statistics
  const totalReports = reports.length;
  const successfulReports = reports.filter((r) => r.status === "sent").length;
  const failedReports = reports.filter((r) => r.status === "failed").length;
  const testReports = reports.filter((r) => r.is_test).length;

  if (authLoading || isLoading || isAdmin === null) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir={dir}>
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
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/commission-management")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 ml-2" />
          {isArabic ? "العودة لإدارة العمولات" : "Back to Commission Management"}
        </Button>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalReports}</p>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "إجمالي التقارير" : "Total Reports"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-600">{successfulReports}</p>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "ناجحة" : "Successful"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold text-red-600">{failedReports}</p>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "فاشلة" : "Failed"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold text-orange-600">{testReports}</p>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "تجريبية" : "Test"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {isArabic ? "سجل التقارير المرسلة" : "Sent Reports Log"}
            </CardTitle>
            <CardDescription>
              {isArabic
                ? "جميع تقارير العمولات المرسلة مع إمكانية إعادة الإرسال"
                : "All sent commission reports with resend capability"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>{isArabic ? "لا توجد تقارير مرسلة بعد" : "No reports sent yet"}</p>
                <Button
                  className="mt-4"
                  onClick={() => navigate("/commission-management")}
                >
                  {isArabic ? "إرسال تقرير جديد" : "Send New Report"}
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? "التاريخ" : "Date"}</TableHead>
                      <TableHead>{isArabic ? "المستلم" : "Recipient"}</TableHead>
                      <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                      <TableHead>{isArabic ? "النوع" : "Type"}</TableHead>
                      <TableHead>{isArabic ? "إجمالي العمولات" : "Total Commissions"}</TableHead>
                      <TableHead>{isArabic ? "الفترة" : "Period"}</TableHead>
                      <TableHead>{isArabic ? "الإجراءات" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {format(new Date(report.sent_at), "dd/MM/yyyy HH:mm", {
                              locale: isArabic ? ar : undefined,
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {report.recipient_email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={report.status === "sent" ? "default" : "destructive"}
                            className="gap-1"
                          >
                            {report.status === "sent" ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {report.status === "sent"
                              ? isArabic
                                ? "ناجح"
                                : "Sent"
                              : isArabic
                              ? "فشل"
                              : "Failed"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={report.is_test ? "secondary" : "outline"}>
                            {report.is_test
                              ? isArabic
                                ? "تجريبي"
                                : "Test"
                              : isArabic
                              ? "رسمي"
                              : "Official"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {report.report_data?.total_commissions !== undefined ? (
                            <span className="font-bold text-green-600">
                              {Number(report.report_data.total_commissions).toFixed(2)} SAR
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {report.report_data?.date_range ? (
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(report.report_data.date_range.from), "dd/MM")} -{" "}
                              {format(new Date(report.report_data.date_range.to), "dd/MM")}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResend(report.id)}
                            disabled={isResending === report.id}
                            className="gap-1"
                          >
                            {isResending === report.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            {isArabic ? "إعادة" : "Resend"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Error Details for Failed Reports */}
            {reports.some((r) => r.status === "failed" && r.error_message) && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3 text-red-600">
                  {isArabic ? "تفاصيل الأخطاء" : "Error Details"}
                </h4>
                {reports
                  .filter((r) => r.status === "failed" && r.error_message)
                  .map((report) => (
                    <div
                      key={report.id}
                      className="p-3 mb-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm"
                    >
                      <p className="font-medium">
                        {format(new Date(report.sent_at), "dd/MM/yyyy HH:mm")}
                      </p>
                      <p className="text-red-600 dark:text-red-400">{report.error_message}</p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default CommissionReportsHistory;
