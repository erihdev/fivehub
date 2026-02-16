import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { usePredictionAlerts } from "@/hooks/usePredictionAlerts";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, Brain, AlertTriangle, TrendingDown, Loader2, Zap, ShieldCheck, ShieldAlert, Smartphone, Clock, Calendar, Save, Globe, FlaskConical, CheckCircle2, XCircle, MessageSquare, ChevronDown, Mail, FileText, Send, BarChart3, Eye, Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface AlertHistory {
  id: string;
  type: "high_risk" | "medium_risk" | "low_score_day" | "low_average";
  message: string;
  timestamp: Date;
  predictions: any;
}

interface ScheduleSettings {
  smart_check_enabled: boolean;
  smart_check_hour: number;
  smart_check_days: number[];
  push_alerts_enabled: boolean;
  last_smart_check_at: string | null;
  timezone: string;
  weekly_report_enabled: boolean;
  weekly_report_day: number;
  weekly_report_hour: number;
}

interface CustomMessages {
  custom_high_risk_title: string;
  custom_high_risk_body: string;
  custom_medium_risk_title: string;
  custom_medium_risk_body: string;
  custom_low_avg_title: string;
  custom_low_avg_body: string;
}

const defaultCustomMessages: CustomMessages = {
  custom_high_risk_title: "تنبيه: مخاطر عالية متوقعة",
  custom_high_risk_body: "التوقعات تشير إلى مخاطر عالية للأسبوع القادم",
  custom_medium_risk_title: "تنبيه: مخاطر متوسطة متوقعة",
  custom_medium_risk_body: "يُتوقع بعض التحديات الأسبوع القادم",
  custom_low_avg_title: "متوسط أداء منخفض متوقع",
  custom_low_avg_body: "متوسط التوقع أقل من المستوى المطلوب",
};

const DAYS_OF_WEEK = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الاثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
];

const TIMEZONES = [
  { value: "Asia/Riyadh", label: "السعودية (الرياض)", offset: "+03:00" },
  { value: "Asia/Dubai", label: "الإمارات (دبي)", offset: "+04:00" },
  { value: "Asia/Kuwait", label: "الكويت", offset: "+03:00" },
  { value: "Asia/Qatar", label: "قطر (الدوحة)", offset: "+03:00" },
  { value: "Asia/Bahrain", label: "البحرين", offset: "+03:00" },
  { value: "Asia/Muscat", label: "عُمان (مسقط)", offset: "+04:00" },
  { value: "Africa/Cairo", label: "مصر (القاهرة)", offset: "+02:00" },
  { value: "Asia/Amman", label: "الأردن (عمّان)", offset: "+03:00" },
  { value: "Asia/Beirut", label: "لبنان (بيروت)", offset: "+02:00" },
  { value: "Asia/Baghdad", label: "العراق (بغداد)", offset: "+03:00" },
  { value: "Europe/London", label: "بريطانيا (لندن)", offset: "+00:00" },
  { value: "Europe/Paris", label: "فرنسا (باريس)", offset: "+01:00" },
  { value: "America/New_York", label: "نيويورك", offset: "-05:00" },
  { value: "America/Los_Angeles", label: "لوس أنجلوس", offset: "-08:00" },
];

const defaultSchedule: ScheduleSettings = {
  smart_check_enabled: false,
  smart_check_hour: 8,
  smart_check_days: [0, 1, 2, 3, 4, 5, 6],
  push_alerts_enabled: false,
  last_smart_check_at: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Riyadh",
  weekly_report_enabled: false,
  weekly_report_day: 0,
  weekly_report_hour: 9,
};

export function SmartPredictionAlerts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { checkPredictionsAndAlert } = usePredictionAlerts();
  const { permission, isSupported, isGranted, requestPermission, showNotification } = usePushNotifications();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTestReport, setSendingTestReport] = useState(false);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSettings>(defaultSchedule);
  const [customMessages, setCustomMessages] = useState<CustomMessages>(defaultCustomMessages);
  const [showCustomMessages, setShowCustomMessages] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [reportStats, setReportStats] = useState<{
    total: number;
    successful: number;
    failed: number;
    testReports: number;
    lastSent: Date | null;
    failedReports: Array<{ id: string; sent_at: string; error_message: string | null }>;
  }>({ total: 0, successful: 0, failed: 0, testReports: 0, lastSent: null, failedReports: [] });
  const [resendingReportId, setResendingReportId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    totalChecks: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    averageScore: number;
    weekStart: string;
    weekEnd: string;
  } | null>(null);
  const [testResult, setTestResult] = useState<{
    show: boolean;
    riskLevel: string;
    averagePrediction: number;
    predictedScores: number[];
    alerts: { type: string; message: string }[];
  } | null>(null);

  // Fetch schedule settings
  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("performance_alert_settings")
        .select("smart_check_enabled, smart_check_hour, smart_check_days, push_alerts_enabled, last_smart_check_at, timezone, custom_high_risk_title, custom_high_risk_body, custom_medium_risk_title, custom_medium_risk_body, custom_low_avg_title, custom_low_avg_body, weekly_report_enabled, weekly_report_day, weekly_report_hour")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setSchedule({
          smart_check_enabled: data.smart_check_enabled ?? false,
          smart_check_hour: data.smart_check_hour ?? 8,
          smart_check_days: data.smart_check_days ?? [0, 1, 2, 3, 4, 5, 6],
          push_alerts_enabled: data.push_alerts_enabled ?? false,
          last_smart_check_at: data.last_smart_check_at,
          timezone: data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "Asia/Riyadh",
          weekly_report_enabled: data.weekly_report_enabled ?? false,
          weekly_report_day: data.weekly_report_day ?? 0,
          weekly_report_hour: data.weekly_report_hour ?? 9,
        });
        setCustomMessages({
          custom_high_risk_title: data.custom_high_risk_title ?? defaultCustomMessages.custom_high_risk_title,
          custom_high_risk_body: data.custom_high_risk_body ?? defaultCustomMessages.custom_high_risk_body,
          custom_medium_risk_title: data.custom_medium_risk_title ?? defaultCustomMessages.custom_medium_risk_title,
          custom_medium_risk_body: data.custom_medium_risk_body ?? defaultCustomMessages.custom_medium_risk_body,
          custom_low_avg_title: data.custom_low_avg_title ?? defaultCustomMessages.custom_low_avg_title,
          custom_low_avg_body: data.custom_low_avg_body ?? defaultCustomMessages.custom_low_avg_body,
        });
        if (data.last_smart_check_at) {
          setLastCheck(new Date(data.last_smart_check_at));
        }
      }
    };

    const fetchReportStats = async () => {
      const { data: reports } = await supabase
        .from("sent_reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("report_type", "weekly_smart_check")
        .order("sent_at", { ascending: false });

      if (reports && reports.length > 0) {
        const successful = reports.filter(r => r.status === "sent").length;
        const failed = reports.filter(r => r.status === "failed").length;
        const testReports = reports.filter(r => r.is_test).length;
        const failedReports = reports
          .filter(r => r.status === "failed")
          .map(r => ({ id: r.id, sent_at: r.sent_at, error_message: r.error_message }));
        setReportStats({
          total: reports.length,
          successful,
          failed,
          testReports,
          lastSent: new Date(reports[0].sent_at),
          failedReports,
        });
      }
    };

    fetchSettings();
    fetchReportStats();
  }, [user]);

  // Subscribe to realtime notifications for sent reports
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('weekly-reports-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sent_reports',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newReport = payload.new as any;
          if (newReport.report_type === 'weekly_smart_check' && newReport.status === 'sent') {
            // Show toast notification
            toast({
              title: "📊 تم إرسال التقرير الأسبوعي",
              description: newReport.is_test 
                ? "تم إرسال التقرير الاختباري بنجاح إلى بريدك الإلكتروني"
                : "تم إرسال التقرير الأسبوعي للفحوصات الذكية",
            });

            // Show push notification if enabled
            if (schedule.push_alerts_enabled && isGranted) {
              showNotification("📊 تم إرسال التقرير الأسبوعي", {
                body: newReport.is_test 
                  ? "تم إرسال التقرير الاختباري بنجاح"
                  : "تم إرسال تقرير الفحوصات الذكية الأسبوعي إلى بريدك",
                tag: "weekly_report_sent",
                url: "/performance-alerts",
              });
            }

            // Refresh report stats
            const fetchReportStats = async () => {
              const { data: reports } = await supabase
                .from("sent_reports")
                .select("*")
                .eq("user_id", user.id)
                .eq("report_type", "weekly_smart_check")
                .order("sent_at", { ascending: false });

              if (reports && reports.length > 0) {
                const successful = reports.filter(r => r.status === "sent").length;
                const failed = reports.filter(r => r.status === "failed").length;
                const testReports = reports.filter(r => r.is_test).length;
                const failedReports = reports
                  .filter(r => r.status === "failed")
                  .map(r => ({ id: r.id, sent_at: r.sent_at, error_message: r.error_message }));
                setReportStats({
                  total: reports.length,
                  successful,
                  failed,
                  testReports,
                  lastSent: new Date(reports[0].sent_at),
                  failedReports,
                });
              }
            };
            fetchReportStats();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, schedule.push_alerts_enabled, isGranted, showNotification]);

  const saveSchedule = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("performance_alert_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("performance_alert_settings")
          .update({
            smart_check_enabled: schedule.smart_check_enabled,
            smart_check_hour: schedule.smart_check_hour,
            smart_check_days: schedule.smart_check_days,
            push_alerts_enabled: schedule.push_alerts_enabled,
            timezone: schedule.timezone,
            weekly_report_enabled: schedule.weekly_report_enabled,
            weekly_report_day: schedule.weekly_report_day,
            weekly_report_hour: schedule.weekly_report_hour,
            ...customMessages,
          })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("performance_alert_settings")
          .insert({
            user_id: user.id,
            smart_check_enabled: schedule.smart_check_enabled,
            smart_check_hour: schedule.smart_check_hour,
            smart_check_days: schedule.smart_check_days,
            push_alerts_enabled: schedule.push_alerts_enabled,
            timezone: schedule.timezone,
            weekly_report_enabled: schedule.weekly_report_enabled,
            weekly_report_day: schedule.weekly_report_day,
            weekly_report_hour: schedule.weekly_report_hour,
            ...customMessages,
          });
      }

      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات الجدولة بنجاح",
      });
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      toast({
        title: "خطأ",
        description: "فشل حفظ الإعدادات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    setSchedule(prev => ({
      ...prev,
      smart_check_days: prev.smart_check_days.includes(day)
        ? prev.smart_check_days.filter(d => d !== day)
        : [...prev.smart_check_days, day].sort((a, b) => a - b),
    }));
  };

  // Test smart check without saving or sending notifications
  const testSmartCheck = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("predict-performance", {
        body: { userId: user?.id },
      });

      if (error) throw error;

      if (data?.predictions) {
        const predictions = data.predictions;
        const alerts: { type: string; message: string }[] = [];

        // Generate test alerts based on predictions
        if (predictions.riskLevel === "high") {
          alerts.push({
            type: "high_risk",
            message: `مستوى مخاطر عالي متوقع - متوسط التوقع: ${predictions.averagePrediction}`,
          });
        } else if (predictions.riskLevel === "medium") {
          alerts.push({
            type: "medium_risk",
            message: `مستوى مخاطر متوسط - متوسط التوقع: ${predictions.averagePrediction}`,
          });
        }

        // Check for low score days
        const lowScoreDays = predictions.predictedScores?.filter((score: number) => score < 40) || [];
        if (lowScoreDays.length >= 2) {
          alerts.push({
            type: "low_score_day",
            message: `${lowScoreDays.length} أيام بأداء منخفض متوقعة`,
          });
        }

        // Check average
        if (predictions.averagePrediction < 50) {
          alerts.push({
            type: "low_average",
            message: `متوسط أداء منخفض متوقع: ${predictions.averagePrediction}`,
          });
        }

        setTestResult({
          show: true,
          riskLevel: predictions.riskLevel || "low",
          averagePrediction: predictions.averagePrediction || 0,
          predictedScores: predictions.predictedScores || [],
          alerts,
        });

        toast({
          title: "اكتمل الاختبار",
          description: `تم تحليل البيانات - مستوى المخاطر: ${predictions.riskLevel === "high" ? "عالي" : predictions.riskLevel === "medium" ? "متوسط" : "منخفض"}`,
        });
      }
    } catch (error: any) {
      console.error("Error in test smart check:", error);
      toast({
        title: "خطأ في الاختبار",
        description: error.message || "فشل اختبار الفحص الذكي",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const sendTestReport = async () => {
    if (!user) return;
    
    setSendingTestReport(true);
    try {
      const { data, error } = await supabase.functions.invoke("weekly-smart-report", {
        body: { 
          testMode: true,
          userId: user.id 
        },
      });

      if (error) throw error;

      toast({
        title: "تم إرسال التقرير الاختباري",
        description: "تحقق من بريدك الإلكتروني",
      });
    } catch (error: any) {
      console.error("Error sending test report:", error);
      toast({
        title: "فشل إرسال التقرير",
        description: error.message || "حدث خطأ أثناء إرسال التقرير الاختباري",
        variant: "destructive",
      });
    } finally {
      setSendingTestReport(false);
    }
  };

  const resendFailedReport = async (reportId: string) => {
    if (!user) return;
    
    setResendingReportId(reportId);
    try {
      const { data, error } = await supabase.functions.invoke("weekly-smart-report", {
        body: { 
          testMode: true,
          userId: user.id 
        },
      });

      if (error) throw error;

      toast({
        title: "تم إعادة إرسال التقرير",
        description: "تحقق من بريدك الإلكتروني",
      });
    } catch (error: any) {
      console.error("Error resending report:", error);
      toast({
        title: "فشل إعادة الإرسال",
        description: error.message || "حدث خطأ أثناء إعادة إرسال التقرير",
        variant: "destructive",
      });
    } finally {
      setResendingReportId(null);
    }
  };

  const fetchPreviewData = async () => {
    if (!user) return;
    
    setPreviewLoading(true);
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { data: logs } = await supabase
        .from("performance_alert_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("sent_at", oneWeekAgo.toISOString())
        .order("sent_at", { ascending: false });

      const smartCheckLogs = (logs || []).filter((log: any) => 
        log.alert_data?.type === "smart_check"
      );

      const totalChecks = smartCheckLogs.length;
      const highRiskCount = smartCheckLogs.filter((log: any) => 
        log.alert_data?.risk_level === "high"
      ).length;
      const mediumRiskCount = smartCheckLogs.filter((log: any) => 
        log.alert_data?.risk_level === "medium"
      ).length;
      const lowRiskCount = totalChecks - highRiskCount - mediumRiskCount;
      
      const averageScore = totalChecks > 0
        ? Math.round(smartCheckLogs.reduce((sum: number, log: any) => 
            sum + (log.alert_data?.predictions?.averagePrediction || log.score || 0), 0) / totalChecks)
        : 0;

      setPreviewData({
        totalChecks,
        highRiskCount,
        mediumRiskCount,
        lowRiskCount,
        averageScore,
        weekStart: format(oneWeekAgo, "dd MMM yyyy", { locale: ar }),
        weekEnd: format(now, "dd MMM yyyy", { locale: ar }),
      });
      setShowPreview(true);
    } catch (error) {
      console.error("Error fetching preview data:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل بيانات المعاينة",
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const exportReportsToCSV = async () => {
    if (!user) return;
    
    try {
      const { data: reports } = await supabase
        .from("sent_reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("report_type", "weekly_smart_check")
        .order("sent_at", { ascending: false });

      if (!reports || reports.length === 0) {
        toast({
          title: "لا توجد بيانات",
          description: "لا توجد تقارير للتصدير",
          variant: "destructive",
        });
        return;
      }

      // Create CSV content with BOM for Arabic support
      const BOM = "\uFEFF";
      const headers = ["تاريخ الإرسال", "البريد الإلكتروني", "الحالة", "نوع التقرير", "اختباري", "إجمالي الفحوصات", "مخاطر عالية", "مخاطر متوسطة", "متوسط النقاط"];
      
      const rows = reports.map(report => {
        const reportData = report.report_data as any;
        return [
          format(new Date(report.sent_at), "yyyy-MM-dd HH:mm", { locale: ar }),
          report.recipient_email,
          report.status === "sent" ? "تم الإرسال" : "فشل",
          "تقرير الفحص الذكي",
          report.is_test ? "نعم" : "لا",
          reportData?.total_checks || 0,
          reportData?.high_risk || 0,
          reportData?.medium_risk || 0,
          reportData?.average_score || 0,
        ].join(",");
      });

      const csvContent = BOM + headers.join(",") + "\n" + rows.join("\n");
      
      // Download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `smart-check-reports-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "تم التصدير",
        description: `تم تصدير ${reports.length} تقرير بنجاح`,
      });
    } catch (error) {
      console.error("Error exporting reports:", error);
      toast({
        title: "خطأ",
        description: "فشل تصدير التقارير",
        variant: "destructive",
      });
    }
  };

  const runSmartCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("predict-performance", {
        body: { userId: user?.id },
      });

      if (error) throw error;

      if (data?.predictions) {
        const predictions = data.predictions;
        const newAlerts: AlertHistory[] = [];
        const now = new Date();

        // Update last check time in database
        if (user) {
          await supabase
            .from("performance_alert_settings")
            .update({ last_smart_check_at: now.toISOString() })
            .eq("user_id", user.id);
        }

        // Generate alerts based on predictions
        if (predictions.riskLevel === "high") {
          newAlerts.push({
            id: `high_risk_${now.getTime()}`,
            type: "high_risk",
            message: `مستوى مخاطر عالي متوقع - متوسط التوقع: ${predictions.averagePrediction}`,
            timestamp: now,
            predictions,
          });
          toast({
            title: "🔴 تنبيه ذكي: مخاطر عالية",
            description: "التوقعات تشير إلى مخاطر عالية الأسبوع القادم",
            variant: "destructive",
            duration: 10000,
          });
          // Send push notification
          if (schedule.push_alerts_enabled && isGranted) {
            showNotification("🔴 تنبيه ذكي: مخاطر عالية", {
              body: `التوقعات تشير إلى مخاطر عالية الأسبوع القادم. متوسط التوقع: ${predictions.averagePrediction}`,
              tag: "high_risk_alert",
              url: "/performance-alerts",
            });
          }
        } else if (predictions.riskLevel === "medium") {
          newAlerts.push({
            id: `medium_risk_${now.getTime()}`,
            type: "medium_risk",
            message: `مستوى مخاطر متوسط - متوسط التوقع: ${predictions.averagePrediction}`,
            timestamp: now,
            predictions,
          });
          toast({
            title: "⚠️ تنبيه ذكي: مخاطر متوسطة",
            description: "يُتوقع بعض التحديات الأسبوع القادم",
            duration: 8000,
          });
          // Send push notification
          if (schedule.push_alerts_enabled && isGranted) {
            showNotification("⚠️ تنبيه ذكي: مخاطر متوسطة", {
              body: `يُتوقع بعض التحديات الأسبوع القادم. متوسط التوقع: ${predictions.averagePrediction}`,
              tag: "medium_risk_alert",
              url: "/performance-alerts",
            });
          }
        }

        // Check for low score days
        const lowScoreDays = predictions.predictedScores.filter((score: number) => score < 40);
        if (lowScoreDays.length >= 2) {
          newAlerts.push({
            id: `low_days_${now.getTime()}`,
            type: "low_score_day",
            message: `${lowScoreDays.length} أيام بأداء منخفض متوقعة`,
            timestamp: now,
            predictions,
          });
        }

        // Check average
        if (predictions.averagePrediction < 50) {
          newAlerts.push({
            id: `low_avg_${now.getTime()}`,
            type: "low_average",
            message: `متوسط أداء منخفض متوقع: ${predictions.averagePrediction}`,
            timestamp: now,
            predictions,
          });
          // Send push notification for low average
          if (schedule.push_alerts_enabled && isGranted) {
            showNotification("📉 متوسط أداء منخفض متوقع", {
              body: `متوسط التوقع (${predictions.averagePrediction}) أقل من المستوى المطلوب`,
              tag: "low_avg_alert",
              url: "/performance-alerts",
            });
          }
        }

        setAlertHistory(prev => [...newAlerts, ...prev].slice(0, 10));
        setLastCheck(now);

        if (newAlerts.length === 0) {
          toast({
            title: "✅ لا توجد مخاطر",
            description: "التوقعات إيجابية للأسبوع القادم",
          });
        }
      }
    } catch (error: any) {
      console.error("Error in smart check:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل فحص التنبيهات الذكية",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: AlertHistory["type"]) => {
    switch (type) {
      case "high_risk":
        return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case "medium_risk":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "low_score_day":
        return <TrendingDown className="h-4 w-4 text-orange-600" />;
      case "low_average":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertBadge = (type: AlertHistory["type"]) => {
    switch (type) {
      case "high_risk":
        return <Badge variant="destructive">عالي</Badge>;
      case "medium_risk":
        return <Badge className="bg-yellow-600">متوسط</Badge>;
      case "low_score_day":
        return <Badge className="bg-orange-600">أيام منخفضة</Badge>;
      case "low_average":
        return <Badge className="bg-red-600">متوسط منخفض</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            التنبيهات الذكية
          </div>
          <Button onClick={runSmartCheck} disabled={loading} size="sm">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Brain className="h-4 w-4 ml-2" />
            )}
            فحص الآن
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Schedule Settings */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="auto-check">الفحص التلقائي المجدول</Label>
            </div>
            <Switch
              id="auto-check"
              checked={schedule.smart_check_enabled}
              onCheckedChange={(checked) => setSchedule(prev => ({ ...prev, smart_check_enabled: checked }))}
            />
          </div>

          {schedule.smart_check_enabled && (
            <>
              {/* Timezone Selection */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">المنطقة الزمنية:</Label>
                </div>
                <Select 
                  value={schedule.timezone} 
                  onValueChange={(value) => setSchedule(prev => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="اختر المنطقة الزمنية" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        <div className="flex items-center gap-2">
                          <span>{tz.label}</span>
                          <span className="text-xs text-muted-foreground">({tz.offset})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Selection */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">وقت الفحص:</Label>
                </div>
                <Select 
                  value={schedule.smart_check_hour.toString()} 
                  onValueChange={(value) => setSchedule(prev => ({ ...prev, smart_check_hour: parseInt(value) }))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Days Selection */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  أيام الفحص:
                </Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day.value}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                        schedule.smart_check_days.includes(day.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                      onClick={() => toggleDay(day.value)}
                    >
                      <Checkbox
                        checked={schedule.smart_check_days.includes(day.value)}
                        className="pointer-events-none"
                      />
                      <span className="text-xs font-medium">{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule Summary */}
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm">
                  <span className="font-medium">الجدول:</span> سيتم الفحص يومياً الساعة{" "}
                  <span className="font-bold">{schedule.smart_check_hour.toString().padStart(2, "0")}:00</span>
                  {" "}بتوقيت <span className="font-bold">{TIMEZONES.find(tz => tz.value === schedule.timezone)?.label || schedule.timezone}</span>
                  {" "}في الأيام المحددة ({schedule.smart_check_days.length} أيام)
                </p>
              </div>

              {/* Test Button */}
              <div className="pt-2 border-t border-border/50">
                <Button 
                  variant="outline" 
                  onClick={testSmartCheck} 
                  disabled={testing} 
                  className="w-full"
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <FlaskConical className="h-4 w-4 ml-2" />
                  )}
                  اختبار الفحص الذكي
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  اختبر الفحص لمعرفة التنبيهات المتوقعة بدون إرسال إشعارات
                </p>
              </div>

              {/* Test Results */}
              {testResult?.show && (
                <div className="p-4 rounded-lg border-2 border-dashed space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-primary" />
                      نتيجة الاختبار
                    </h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setTestResult(null)}
                      className="h-6 w-6 p-0"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Risk Level */}
                  <div className={`p-3 rounded-lg ${
                    testResult.riskLevel === "high" 
                      ? "bg-destructive/10 border border-destructive/30" 
                      : testResult.riskLevel === "medium"
                      ? "bg-yellow-500/10 border border-yellow-500/30"
                      : "bg-green-500/10 border border-green-500/30"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {testResult.riskLevel === "high" ? (
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                      ) : testResult.riskLevel === "medium" ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      <span className="font-medium">
                        مستوى المخاطر: {testResult.riskLevel === "high" ? "عالي" : testResult.riskLevel === "medium" ? "متوسط" : "منخفض"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      متوسط التوقع: <span className="font-bold">{testResult.averagePrediction}</span>
                    </p>
                  </div>

                  {/* Predicted Scores */}
                  {testResult.predictedScores.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">النقاط المتوقعة للأيام القادمة:</p>
                      <div className="flex flex-wrap gap-2">
                        {testResult.predictedScores.map((score, i) => (
                          <Badge 
                            key={i} 
                            variant={score < 40 ? "destructive" : score < 60 ? "secondary" : "default"}
                            className="text-xs"
                          >
                            يوم {i + 1}: {score}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alerts Preview */}
                  {testResult.alerts.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-destructive">التنبيهات التي ستُرسل:</p>
                      <div className="space-y-1">
                        {testResult.alerts.map((alert, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                            {alert.type === "high_risk" ? (
                              <ShieldAlert className="h-4 w-4 text-destructive" />
                            ) : alert.type === "medium_risk" ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-orange-600" />
                            )}
                            <span>{alert.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-700 dark:text-green-400">
                        لا توجد تنبيهات - الأداء المتوقع جيد
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Push Notifications for High Risk */}
          <div className="pt-2 border-t border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="push-alerts">إشعارات Push للمخاطر العالية</Label>
                  <p className="text-xs text-muted-foreground">
                    {!isSupported 
                      ? "غير مدعوم في هذا المتصفح"
                      : permission === "denied"
                      ? "تم رفض الإذن - قم بتغييره من إعدادات المتصفح"
                      : "استلام إشعارات فورية عند وجود مخاطر عالية أو متوسطة"
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isGranted && isSupported && permission !== "denied" && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      const granted = await requestPermission();
                      if (granted) {
                        setSchedule(prev => ({ ...prev, push_alerts_enabled: true }));
                      }
                    }}
                  >
                    تفعيل
                  </Button>
                )}
                <Switch
                  id="push-alerts"
                  checked={schedule.push_alerts_enabled}
                  onCheckedChange={async (checked) => {
                    if (checked && !isGranted) {
                      const granted = await requestPermission();
                      setSchedule(prev => ({ ...prev, push_alerts_enabled: granted }));
                    } else {
                      setSchedule(prev => ({ ...prev, push_alerts_enabled: checked }));
                    }
                  }}
                  disabled={!isSupported || permission === "denied"}
                />
              </div>
            </div>

            {isGranted && schedule.push_alerts_enabled && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-700 dark:text-green-400">
                    إشعارات Push مفعلة - ستصلك تنبيهات فورية عند المخاطر
                  </span>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-xs font-medium">ستصلك إشعارات Push عند:</p>
                  <div className="grid grid-cols-1 gap-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                      <span>اكتشاف مخاطر عالية (أولوية قصوى)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
                      <span>اكتشاف مخاطر متوسطة</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-3.5 w-3.5 text-orange-600" />
                      <span>متوسط أداء منخفض متوقع</span>
                    </div>
                  </div>
                </div>

                {/* Test Push Notification */}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    showNotification("🔔 اختبار إشعارات Push", {
                      body: "هذا اختبار لإشعارات Push من نظام الفحص الذكي",
                      tag: "test_push",
                      url: "/performance-alert-settings",
                    });
                    toast({
                      title: "تم إرسال إشعار اختباري",
                      description: "تحقق من الإشعارات في متصفحك",
                    });
                  }}
                >
                  <Bell className="h-4 w-4 ml-2" />
                  إرسال إشعار اختباري
                </Button>
              </div>
            )}
          </div>

          {/* Custom Messages Section */}
          <Collapsible open={showCustomMessages} onOpenChange={setShowCustomMessages} className="pt-2 border-t border-border/50">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span>تخصيص نص الرسائل</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${showCustomMessages ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* High Risk Messages */}
              <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <Label className="text-sm font-medium">رسالة المخاطر العالية</Label>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">العنوان</Label>
                    <Input
                      value={customMessages.custom_high_risk_title}
                      onChange={(e) => setCustomMessages(prev => ({ ...prev, custom_high_risk_title: e.target.value }))}
                      placeholder="عنوان التنبيه"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">نص الرسالة</Label>
                    <Textarea
                      value={customMessages.custom_high_risk_body}
                      onChange={(e) => setCustomMessages(prev => ({ ...prev, custom_high_risk_body: e.target.value }))}
                      placeholder="نص التنبيه"
                      className="mt-1 min-h-[60px]"
                    />
                  </div>
                </div>
              </div>

              {/* Medium Risk Messages */}
              <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <Label className="text-sm font-medium">رسالة المخاطر المتوسطة</Label>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">العنوان</Label>
                    <Input
                      value={customMessages.custom_medium_risk_title}
                      onChange={(e) => setCustomMessages(prev => ({ ...prev, custom_medium_risk_title: e.target.value }))}
                      placeholder="عنوان التنبيه"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">نص الرسالة</Label>
                    <Textarea
                      value={customMessages.custom_medium_risk_body}
                      onChange={(e) => setCustomMessages(prev => ({ ...prev, custom_medium_risk_body: e.target.value }))}
                      placeholder="نص التنبيه"
                      className="mt-1 min-h-[60px]"
                    />
                  </div>
                </div>
              </div>

              {/* Low Average Messages */}
              <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                  <Label className="text-sm font-medium">رسالة المتوسط المنخفض</Label>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">العنوان</Label>
                    <Input
                      value={customMessages.custom_low_avg_title}
                      onChange={(e) => setCustomMessages(prev => ({ ...prev, custom_low_avg_title: e.target.value }))}
                      placeholder="عنوان التنبيه"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">نص الرسالة</Label>
                    <Textarea
                      value={customMessages.custom_low_avg_body}
                      onChange={(e) => setCustomMessages(prev => ({ ...prev, custom_low_avg_body: e.target.value }))}
                      placeholder="نص التنبيه"
                      className="mt-1 min-h-[60px]"
                    />
                  </div>
                </div>
              </div>

              {/* Available Variables Info */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-xs font-medium mb-2 flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  المتغيرات المتاحة (يمكن استخدامها في النصوص):
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 p-1.5 bg-background rounded">
                    <code className="text-primary font-mono">{"{score}"}</code>
                    <span className="text-muted-foreground">- متوسط التوقع</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 bg-background rounded">
                    <code className="text-primary font-mono">{"{date}"}</code>
                    <span className="text-muted-foreground">- تاريخ الفحص</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 bg-background rounded">
                    <code className="text-primary font-mono">{"{time}"}</code>
                    <span className="text-muted-foreground">- وقت الفحص</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 bg-background rounded">
                    <code className="text-primary font-mono">{"{risk}"}</code>
                    <span className="text-muted-foreground">- مستوى المخاطر</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 bg-background rounded">
                    <code className="text-primary font-mono">{"{days}"}</code>
                    <span className="text-muted-foreground">- عدد الأيام المنخفضة</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 bg-background rounded">
                    <code className="text-primary font-mono">{"{threshold}"}</code>
                    <span className="text-muted-foreground">- الحد الأدنى</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  مثال: "متوسط التوقع {"{score}"} أقل من الحد المطلوب {"{threshold}"}"
                </p>
              </div>

              {/* Reset to defaults */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-muted-foreground"
                onClick={() => setCustomMessages(defaultCustomMessages)}
              >
                استعادة النص الافتراضي
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Weekly Report Section */}
          <div className="pt-4 border-t border-border/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="weekly-report">التقرير الأسبوعي</Label>
                  <p className="text-xs text-muted-foreground">
                    استلام تقرير أسبوعي بملخص الفحوصات الذكية
                  </p>
                </div>
              </div>
              <Switch
                id="weekly-report"
                checked={schedule.weekly_report_enabled}
                onCheckedChange={(checked) => setSchedule(prev => ({ ...prev, weekly_report_enabled: checked }))}
              />
            </div>

            {schedule.weekly_report_enabled && (
              <div className="p-3 bg-muted/30 rounded-lg space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">يوم الإرسال:</Label>
                  </div>
                  <Select 
                    value={schedule.weekly_report_day.toString()} 
                    onValueChange={(value) => setSchedule(prev => ({ ...prev, weekly_report_day: parseInt(value) }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">ساعة الإرسال:</Label>
                  </div>
                  <Select 
                    value={schedule.weekly_report_hour.toString()} 
                    onValueChange={(value) => setSchedule(prev => ({ ...prev, weekly_report_hour: parseInt(value) }))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, "0")}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-2 bg-primary/5 rounded border border-primary/20">
                  <p className="text-xs flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span>
                      سيصلك تقرير كل{" "}
                      <span className="font-bold">{DAYS_OF_WEEK.find(d => d.value === schedule.weekly_report_day)?.label}</span>
                      {" "}الساعة{" "}
                      <span className="font-bold">{schedule.weekly_report_hour.toString().padStart(2, "0")}:00</span>
                      {" "}بتوقيت{" "}
                      <span className="font-bold">{TIMEZONES.find(tz => tz.value === schedule.timezone)?.label || schedule.timezone}</span>
                    </span>
                  </p>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">يتضمن التقرير:</p>
                  <ul className="list-disc list-inside space-y-0.5 mr-2">
                    <li>ملخص الفحوصات الأسبوعية</li>
                    <li>توزيع مستويات المخاطر</li>
                    <li>متوسط النقاط للأسبوع</li>
                    <li>تحذيرات المخاطر العالية</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Dialog open={showPreview} onOpenChange={setShowPreview}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1" 
                        onClick={fetchPreviewData}
                        disabled={previewLoading}
                      >
                        {previewLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        ) : (
                          <Eye className="h-4 w-4 ml-2" />
                        )}
                        معاينة
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md" dir="rtl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          معاينة التقرير الأسبوعي
                        </DialogTitle>
                      </DialogHeader>
                      {previewData && (
                        <div className="space-y-4">
                          <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                            <h3 className="font-bold text-lg mb-1">📊 التقرير الأسبوعي للفحوصات الذكية</h3>
                            <p className="text-sm text-muted-foreground">
                              الفترة: {previewData.weekStart} - {previewData.weekEnd}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-muted/50 rounded-lg text-center">
                              <div className="text-2xl font-bold text-primary">{previewData.totalChecks}</div>
                              <div className="text-xs text-muted-foreground">إجمالي الفحوصات</div>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg text-center">
                              <div className="text-2xl font-bold text-primary">{previewData.averageScore}</div>
                              <div className="text-xs text-muted-foreground">متوسط النقاط</div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">توزيع مستويات المخاطر</h4>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm flex items-center gap-1">
                                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                                  مخاطر عالية
                                </span>
                                <span className="font-bold">{previewData.highRiskCount}</span>
                              </div>
                              <div className="h-2 bg-red-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-red-500 rounded-full transition-all" 
                                  style={{ width: `${previewData.totalChecks > 0 ? (previewData.highRiskCount / previewData.totalChecks * 100) : 0}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-sm flex items-center gap-1">
                                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                                  مخاطر متوسطة
                                </span>
                                <span className="font-bold">{previewData.mediumRiskCount}</span>
                              </div>
                              <div className="h-2 bg-yellow-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-yellow-500 rounded-full transition-all" 
                                  style={{ width: `${previewData.totalChecks > 0 ? (previewData.mediumRiskCount / previewData.totalChecks * 100) : 0}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-sm flex items-center gap-1">
                                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                  آمن
                                </span>
                                <span className="font-bold">{previewData.lowRiskCount}</span>
                              </div>
                              <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500 rounded-full transition-all" 
                                  style={{ width: `${previewData.totalChecks > 0 ? (previewData.lowRiskCount / previewData.totalChecks * 100) : 0}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {previewData.highRiskCount > 0 ? (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                              <p className="text-sm text-red-700 dark:text-red-300">
                                ⚠️ تم رصد {previewData.highRiskCount} حالة مخاطر عالية هذا الأسبوع.
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                              <p className="text-sm text-green-700 dark:text-green-300">
                                ✅ أسبوع ممتاز! لم يتم رصد أي مخاطر عالية.
                              </p>
                            </div>
                          )}

                          <Button 
                            className="w-full" 
                            onClick={() => {
                              setShowPreview(false);
                              sendTestReport();
                            }}
                            disabled={sendingTestReport}
                          >
                            {sendingTestReport ? (
                              <Loader2 className="h-4 w-4 animate-spin ml-2" />
                            ) : (
                              <Send className="h-4 w-4 ml-2" />
                            )}
                            إرسال هذا التقرير
                          </Button>
                        </div>
                      )}
                      {!previewData && !previewLoading && (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>لا توجد بيانات للمعاينة</p>
                          <p className="text-xs">قم بتفعيل الفحص الذكي للحصول على بيانات</p>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1" 
                    onClick={sendTestReport}
                    disabled={sendingTestReport}
                  >
                    {sendingTestReport ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <Send className="h-4 w-4 ml-2" />
                    )}
                    إرسال فوري
                  </Button>
                </div>

                {/* Report Statistics */}
                {reportStats.total > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">إحصائيات التقارير المرسلة</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-background rounded border">
                        <div className="text-lg font-bold text-primary">{reportStats.total}</div>
                        <div className="text-muted-foreground">إجمالي التقارير</div>
                      </div>
                      <div className="p-2 bg-background rounded border">
                        <div className="text-lg font-bold text-green-600">{reportStats.successful}</div>
                        <div className="text-muted-foreground">تم الإرسال</div>
                      </div>
                      <div className="p-2 bg-background rounded border">
                        <div className="text-lg font-bold text-red-600">{reportStats.failed}</div>
                        <div className="text-muted-foreground">فشل الإرسال</div>
                      </div>
                      <div className="p-2 bg-background rounded border">
                        <div className="text-lg font-bold text-blue-600">{reportStats.testReports}</div>
                        <div className="text-muted-foreground">تقارير اختبارية</div>
                      </div>
                    </div>
                    {reportStats.lastSent && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        آخر تقرير: {format(reportStats.lastSent, "dd MMM yyyy HH:mm", { locale: ar })}
                      </p>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs" 
                      onClick={exportReportsToCSV}
                    >
                      <Download className="h-3.5 w-3.5 ml-1" />
                      تصدير السجل إلى CSV
                    </Button>

                    {/* Failed Reports List */}
                    {reportStats.failedReports.length > 0 && (
                      <div className="pt-2 border-t border-border/50 space-y-2">
                        <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5" />
                          التقارير الفاشلة ({reportStats.failedReports.length})
                        </p>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {reportStats.failedReports.map((report) => (
                            <div 
                              key={report.id} 
                              className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
                            >
                              <div className="text-xs">
                                <p className="font-medium">
                                  {format(new Date(report.sent_at), "dd/MM HH:mm", { locale: ar })}
                                </p>
                                {report.error_message && (
                                  <p className="text-muted-foreground truncate max-w-[120px]" title={report.error_message}>
                                    {report.error_message}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => resendFailedReport(report.id)}
                                disabled={resendingReportId === report.id}
                              >
                                {resendingReportId === report.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* View All Reports Link */}
                <Button 
                  variant="link" 
                  size="sm" 
                  className="w-full text-xs p-0 h-auto"
                  onClick={() => navigate("/sent-reports")}
                >
                  <Eye className="h-3.5 w-3.5 ml-1" />
                  عرض جميع التقارير
                </Button>
              </div>
            )}
          </div>

          {/* Save Button */}
          <Button onClick={saveSchedule} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Save className="h-4 w-4 ml-2" />
            )}
            حفظ الإعدادات
          </Button>

          {lastCheck && (
            <p className="text-xs text-muted-foreground text-center">
              آخر فحص: {format(lastCheck, "dd MMM yyyy HH:mm", { locale: ar })}
            </p>
          )}
        </div>

        {/* Alert Types Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">مخاطر عالية</span>
            </div>
            <p className="text-xs text-muted-foreground">عند توقع أداء ضعيف جداً</p>
          </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">مخاطر متوسطة</span>
            </div>
            <p className="text-xs text-muted-foreground">عند توقع تحديات محتملة</p>
          </div>
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">أيام منخفضة</span>
            </div>
            <p className="text-xs text-muted-foreground">أيام متوقعة بأداء أقل من 40</p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">وضع آمن</span>
            </div>
            <p className="text-xs text-muted-foreground">لا توجد مخاطر متوقعة</p>
          </div>
        </div>

        {/* Alert History */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            سجل التنبيهات
          </h4>
          {alertHistory.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">لا توجد تنبيهات بعد</p>
              <p className="text-xs">اضغط على "فحص الآن" للبدء</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alertHistory.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getAlertBadge(alert.type)}
                      <span className="text-xs text-muted-foreground">
                        {format(alert.timestamp, "dd/MM HH:mm", { locale: ar })}
                      </span>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
