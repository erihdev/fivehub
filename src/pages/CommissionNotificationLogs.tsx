import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Mail,
  Smartphone,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  Loader2,
  Filter,
  X,
  BarChart3,
  Download,
  Image,
  FileText,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Clock,
} from "lucide-react";
import * as XLSX from "xlsx";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { ar } from "date-fns/locale";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotificationLog {
  id: string;
  user_id: string;
  alert_type: string;
  notification_channel: string;
  commission_amount: number;
  total_amount: number;
  threshold: number;
  supplier_name: string | null;
  email_sent_to: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

const CommissionNotificationLogs = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Filter states
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // Refs for chart export
  const timelineChartRef = useRef<HTMLDivElement>(null);
  const typeChartRef = useRef<HTMLDivElement>(null);
  const channelChartRef = useRef<HTMLDivElement>(null);
  const allChartsRef = useRef<HTMLDivElement>(null);

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
      const { data, error } = await supabase
        .from("commission_notification_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في تحميل السجلات" : "Failed to load logs",
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
  }, [user, isAdmin]);

  // Clear all logs
  const handleClearLogs = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("commission_notification_logs")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setLogs([]);
      toast({
        title: isArabic ? "تم المسح" : "Cleared",
        description: isArabic ? "تم مسح جميع السجلات" : "All logs cleared",
      });
    } catch (error) {
      console.error("Error clearing logs:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في مسح السجلات" : "Failed to clear logs",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filter by type
      if (filterType !== "all" && log.alert_type !== filterType) return false;
      
      // Filter by status
      if (filterStatus !== "all" && log.status !== filterStatus) return false;
      
      // Filter by channel
      if (filterChannel !== "all" && log.notification_channel !== filterChannel) return false;
      
      // Filter by date range
      const logDate = new Date(log.created_at);
      if (dateFrom && isBefore(logDate, startOfDay(dateFrom))) return false;
      if (dateTo && isAfter(logDate, endOfDay(dateTo))) return false;
      
      return true;
    });
  }, [logs, filterType, filterStatus, filterChannel, dateFrom, dateTo]);

  const hasActiveFilters = filterType !== "all" || filterStatus !== "all" || filterChannel !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setFilterType("all");
    setFilterStatus("all");
    setFilterChannel("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  // Stats - based on filtered logs
  const stats = {
    total: filteredLogs.length,
    successful: filteredLogs.filter((l) => l.status === "sent").length,
    failed: filteredLogs.filter((l) => l.status === "failed").length,
    inApp: filteredLogs.filter((l) => l.notification_channel === "in_app").length,
    email: filteredLogs.filter((l) => l.notification_channel === "email").length,
    both: filteredLogs.filter((l) => l.notification_channel === "both").length,
  };

  // Weekly comparison stats
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 0 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 0 });
    const lastWeekStart = subDays(thisWeekStart, 7);
    const lastWeekEnd = subDays(thisWeekEnd, 7);

    const thisWeekLogs = logs.filter(log => 
      isWithinInterval(new Date(log.created_at), { start: thisWeekStart, end: thisWeekEnd })
    );
    const lastWeekLogs = logs.filter(log => 
      isWithinInterval(new Date(log.created_at), { start: lastWeekStart, end: lastWeekEnd })
    );

    const thisWeekTotal = thisWeekLogs.length;
    const lastWeekTotal = lastWeekLogs.length;
    const thisWeekSuccess = thisWeekLogs.filter(l => l.status === "sent").length;
    const lastWeekSuccess = lastWeekLogs.filter(l => l.status === "sent").length;
    const thisWeekFailed = thisWeekLogs.filter(l => l.status === "failed").length;
    const lastWeekFailed = lastWeekLogs.filter(l => l.status === "failed").length;
    const thisWeekCommission = thisWeekLogs.reduce((sum, l) => sum + Number(l.commission_amount), 0);
    const lastWeekCommission = lastWeekLogs.reduce((sum, l) => sum + Number(l.commission_amount), 0);

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const successRate = (logs: NotificationLog[]) => {
      if (logs.length === 0) return 0;
      return (logs.filter(l => l.status === "sent").length / logs.length) * 100;
    };

    return {
      thisWeek: {
        total: thisWeekTotal,
        success: thisWeekSuccess,
        failed: thisWeekFailed,
        commission: thisWeekCommission,
        successRate: successRate(thisWeekLogs),
        avgCommission: thisWeekTotal > 0 ? thisWeekCommission / thisWeekTotal : 0,
      },
      lastWeek: {
        total: lastWeekTotal,
        success: lastWeekSuccess,
        failed: lastWeekFailed,
        commission: lastWeekCommission,
        successRate: successRate(lastWeekLogs),
        avgCommission: lastWeekTotal > 0 ? lastWeekCommission / lastWeekTotal : 0,
      },
      changes: {
        total: calcChange(thisWeekTotal, lastWeekTotal),
        success: calcChange(thisWeekSuccess, lastWeekSuccess),
        failed: calcChange(thisWeekFailed, lastWeekFailed),
        commission: calcChange(thisWeekCommission, lastWeekCommission),
        successRate: successRate(thisWeekLogs) - successRate(lastWeekLogs),
      }
    };
  }, [logs]);

  // Advanced stats
  const advancedStats = useMemo(() => {
    if (filteredLogs.length === 0) return null;

    const totalCommission = filteredLogs.reduce((sum, l) => sum + Number(l.commission_amount), 0);
    const avgCommission = totalCommission / filteredLogs.length;
    const maxCommission = Math.max(...filteredLogs.map(l => Number(l.commission_amount)));
    const minCommission = Math.min(...filteredLogs.map(l => Number(l.commission_amount)));
    
    const successRate = (stats.successful / filteredLogs.length) * 100;
    
    // Peak hour analysis
    const hourCounts: Record<number, number> = {};
    filteredLogs.forEach(log => {
      const hour = new Date(log.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).reduce(
      (max, [hour, count]) => count > max.count ? { hour: parseInt(hour), count } : max,
      { hour: 0, count: 0 }
    );

    // Day of week analysis
    const dayCounts: Record<number, number> = {};
    filteredLogs.forEach(log => {
      const day = new Date(log.created_at).getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const peakDay = Object.entries(dayCounts).reduce(
      (max, [day, count]) => count > max.count ? { day: parseInt(day), count } : max,
      { day: 0, count: 0 }
    );

    const dayNames = isArabic 
      ? ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
      : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    return {
      totalCommission,
      avgCommission,
      maxCommission,
      minCommission,
      successRate,
      peakHour: peakHour.hour,
      peakDay: dayNames[peakDay.day],
      uniqueSuppliers: new Set(filteredLogs.filter(l => l.supplier_name).map(l => l.supplier_name)).size,
    };
  }, [filteredLogs, stats, isArabic]);

  // Weekly trend data for chart
  const weeklyTrendData = useMemo(() => {
    const weeks: { week: string; thisWeek: number; lastWeek: number }[] = [];
    const dayNames = isArabic 
      ? ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 0; i < 7; i++) {
      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 0 });
      const lastWeekStart = subDays(thisWeekStart, 7);

      const thisDay = new Date(thisWeekStart);
      thisDay.setDate(thisDay.getDate() + i);
      const lastDay = new Date(lastWeekStart);
      lastDay.setDate(lastDay.getDate() + i);

      const thisCount = logs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate.toDateString() === thisDay.toDateString();
      }).length;

      const lastCount = logs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate.toDateString() === lastDay.toDateString();
      }).length;

      weeks.push({
        week: dayNames[i],
        thisWeek: thisCount,
        lastWeek: lastCount,
      });
    }
    return weeks;
  }, [logs, isArabic]);

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  // Chart data - notifications over time
  const timelineData = useMemo(() => {
    const groupedByDate: Record<string, { date: string; sent: number; failed: number; single: number; total: number }> = {};
    
    filteredLogs.forEach((log) => {
      const date = format(new Date(log.created_at), "dd/MM");
      if (!groupedByDate[date]) {
        groupedByDate[date] = { date, sent: 0, failed: 0, single: 0, total: 0 };
      }
      if (log.status === "sent") groupedByDate[date].sent++;
      if (log.status === "failed") groupedByDate[date].failed++;
      if (log.alert_type === "single") groupedByDate[date].single++;
      if (log.alert_type === "total") groupedByDate[date].total++;
    });

    return Object.values(groupedByDate).reverse().slice(-14); // Last 14 days
  }, [filteredLogs]);

  // Pie chart data - by type
  const typeDistribution = useMemo(() => {
    const single = filteredLogs.filter((l) => l.alert_type === "single").length;
    const total = filteredLogs.filter((l) => l.alert_type === "total").length;
    return [
      { name: isArabic ? "عمولة كبيرة" : "Large Commission", value: single, color: "hsl(var(--warning))" },
      { name: isArabic ? "وصول للحد" : "Threshold Reached", value: total, color: "hsl(var(--success))" },
    ].filter(item => item.value > 0);
  }, [filteredLogs, isArabic]);

  // Pie chart data - by channel
  const channelDistribution = useMemo(() => {
    return [
      { name: isArabic ? "داخل التطبيق" : "In-App", value: stats.inApp, color: "hsl(var(--primary))" },
      { name: isArabic ? "بريد إلكتروني" : "Email", value: stats.email, color: "hsl(var(--secondary))" },
      { name: isArabic ? "كلاهما" : "Both", value: stats.both, color: "hsl(var(--accent))" },
    ].filter(item => item.value > 0);
  }, [stats, isArabic]);

  // Export chart as PNG
  const exportChartAsPng = async (chartRef: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!chartRef.current) return;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast({
        title: isArabic ? "تم التصدير" : "Exported",
        description: isArabic ? "تم تصدير الرسم البياني كصورة PNG" : "Chart exported as PNG",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في تصدير الرسم البياني" : "Failed to export chart",
        variant: "destructive",
      });
    }
  };

  // Export chart as PDF
  const exportChartAsPdf = async (chartRef: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!chartRef.current) return;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Create a simple PDF using canvas data
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${filename}</title>
              <style>
                body { margin: 0; padding: 20px; display: flex; justify-content: center; }
                img { max-width: 100%; height: auto; }
                @media print {
                  body { padding: 0; }
                }
              </style>
            </head>
            <body>
              <img src="${imgData}" alt="${filename}" />
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
        title: isArabic ? "تم التصدير" : "Exported",
        description: isArabic ? "تم فتح نافذة الطباعة لحفظ كـ PDF" : "Print dialog opened to save as PDF",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في تصدير الرسم البياني" : "Failed to export chart",
        variant: "destructive",
      });
    }
  };

  // Export all charts - unused but kept for future use
  const getExportFilename = () => `commission-charts-${format(new Date(), "yyyy-MM-dd")}`;

  // Export logs to CSV
  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = isArabic
      ? ["التاريخ", "النوع", "القناة", "قيمة العمولة", "الإجمالي", "الحد", "المورد", "الحالة", "رسالة الخطأ"]
      : ["Date", "Type", "Channel", "Commission", "Total", "Threshold", "Supplier", "Status", "Error Message"];

    const rows = filteredLogs.map((log) => [
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      log.alert_type === "single" 
        ? (isArabic ? "عمولة كبيرة" : "Large Commission")
        : (isArabic ? "وصول للحد" : "Threshold Reached"),
      log.notification_channel === "in_app" 
        ? (isArabic ? "داخل التطبيق" : "In-App")
        : log.notification_channel === "email"
        ? (isArabic ? "بريد إلكتروني" : "Email")
        : (isArabic ? "كلاهما" : "Both"),
      Number(log.commission_amount).toFixed(2),
      Number(log.total_amount).toFixed(2),
      Number(log.threshold).toFixed(2),
      log.supplier_name || "-",
      log.status === "sent" ? (isArabic ? "ناجح" : "Sent") : (isArabic ? "فشل" : "Failed"),
      log.error_message || "",
    ]);

    // Add BOM for Arabic support
    const BOM = "\uFEFF";
    const csvContent = BOM + [headers, ...rows].map((row) => row.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `commission-notifications-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast({
      title: isArabic ? "تم التصدير" : "Exported",
      description: isArabic ? "تم تصدير السجل إلى ملف CSV" : "Log exported to CSV file",
    });
  };

  // Export logs to Excel
  const exportToExcel = () => {
    if (filteredLogs.length === 0) return;

    const headers = isArabic
      ? ["التاريخ", "النوع", "القناة", "قيمة العمولة", "الإجمالي", "الحد", "المورد", "الحالة", "رسالة الخطأ"]
      : ["Date", "Type", "Channel", "Commission", "Total", "Threshold", "Supplier", "Status", "Error Message"];

    const rows = filteredLogs.map((log) => ({
      [headers[0]]: format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      [headers[1]]: log.alert_type === "single" 
        ? (isArabic ? "عمولة كبيرة" : "Large Commission")
        : (isArabic ? "وصول للحد" : "Threshold Reached"),
      [headers[2]]: log.notification_channel === "in_app" 
        ? (isArabic ? "داخل التطبيق" : "In-App")
        : log.notification_channel === "email"
        ? (isArabic ? "بريد إلكتروني" : "Email")
        : (isArabic ? "كلاهما" : "Both"),
      [headers[3]]: Number(log.commission_amount).toFixed(2),
      [headers[4]]: Number(log.total_amount).toFixed(2),
      [headers[5]]: Number(log.threshold).toFixed(2),
      [headers[6]]: log.supplier_name || "-",
      [headers[7]]: log.status === "sent" ? (isArabic ? "ناجح" : "Sent") : (isArabic ? "فشل" : "Failed"),
      [headers[8]]: log.error_message || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isArabic ? "سجل الإشعارات" : "Notification Log");
    XLSX.writeFile(wb, `commission-notifications-${format(new Date(), "yyyy-MM-dd")}.xlsx`);

    toast({
      title: isArabic ? "تم التصدير" : "Exported",
      description: isArabic ? "تم تصدير السجل إلى ملف Excel" : "Log exported to Excel file",
    });
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case "in_app":
        return (
          <Badge variant="outline" className="gap-1">
            <Smartphone className="w-3 h-3" />
            {isArabic ? "داخل التطبيق" : "In-App"}
          </Badge>
        );
      case "email":
        return (
          <Badge variant="secondary" className="gap-1">
            <Mail className="w-3 h-3" />
            {isArabic ? "بريد إلكتروني" : "Email"}
          </Badge>
        );
      case "both":
        return (
          <Badge className="gap-1 bg-primary">
            <Bell className="w-3 h-3" />
            {isArabic ? "كلاهما" : "Both"}
          </Badge>
        );
      default:
        return null;
    }
  };

  const getAlertTypeBadge = (type: string) => {
    if (type === "single") {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
          {isArabic ? "عمولة كبيرة" : "Large Commission"}
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-500">
        {isArabic ? "وصول للحد" : "Threshold Reached"}
      </Badge>
    );
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
              <Bell className="w-6 h-6" />
              <h1 className="text-xl font-bold">
                {isArabic ? "سجل إشعارات العمولات" : "Commission Notification Logs"}
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
        {/* Back button and actions */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/commissions")}>
            <ArrowLeft className="w-4 h-4 ml-2" />
            {isArabic ? "العودة لإدارة العمولات" : "Back to Commission Management"}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/scheduled-tasks")} className="gap-2">
              <Clock className="w-4 h-4" />
              {isArabic ? "المهام المجدولة" : "Scheduled Tasks"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/notification-success-monitor")} className="gap-2">
              <BarChart3 className="w-4 h-4" />
              {isArabic ? "لوحة المراقبة" : "Monitor Dashboard"}
            </Button>
            <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="mr-2">{isArabic ? "تحديث" : "Refresh"}</span>
            </Button>
            {logs.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" />
                <span className="mr-2">{isArabic ? "مسح الكل" : "Clear All"}</span>
              </Button>
            )}
            {filteredLogs.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    {isArabic ? "تصدير السجل" : "Export Log"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportToCSV}>
                    <FileText className="w-4 h-4 ml-2" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToExcel}>
                    <FileSpreadsheet className="w-4 h-4 ml-2" />
                    Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Weekly Comparison Stats */}
        {logs.length > 0 && (
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <CardTitle>{isArabic ? "مقارنة أسبوعية" : "Weekly Comparison"}</CardTitle>
              </div>
              <CardDescription>
                {isArabic ? "مقارنة بين هذا الأسبوع والأسبوع الماضي" : "Comparison between this week and last week"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* Total Notifications */}
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {getTrendIcon(weeklyStats.changes.total)}
                    <span className={cn(
                      "text-sm font-medium",
                      weeklyStats.changes.total > 0 ? "text-green-600" : weeklyStats.changes.total < 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {formatChange(weeklyStats.changes.total)}
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{weeklyStats.thisWeek.total}</p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? "إجمالي الإشعارات" : "Total Notifications"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isArabic ? `الأسبوع الماضي: ${weeklyStats.lastWeek.total}` : `Last week: ${weeklyStats.lastWeek.total}`}
                  </p>
                </div>

                {/* Success Rate */}
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {getTrendIcon(weeklyStats.changes.successRate)}
                    <span className={cn(
                      "text-sm font-medium",
                      weeklyStats.changes.successRate > 0 ? "text-green-600" : weeklyStats.changes.successRate < 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {weeklyStats.changes.successRate > 0 ? "+" : ""}{weeklyStats.changes.successRate.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{weeklyStats.thisWeek.successRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? "نسبة النجاح" : "Success Rate"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isArabic ? `الأسبوع الماضي: ${weeklyStats.lastWeek.successRate.toFixed(1)}%` : `Last week: ${weeklyStats.lastWeek.successRate.toFixed(1)}%`}
                  </p>
                </div>

                {/* Commission Amount */}
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {getTrendIcon(weeklyStats.changes.commission)}
                    <span className={cn(
                      "text-sm font-medium",
                      weeklyStats.changes.commission > 0 ? "text-green-600" : weeklyStats.changes.commission < 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {formatChange(weeklyStats.changes.commission)}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">{weeklyStats.thisWeek.commission.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? "إجمالي العمولات" : "Total Commission"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isArabic ? `الأسبوع الماضي: ${weeklyStats.lastWeek.commission.toFixed(0)}` : `Last week: ${weeklyStats.lastWeek.commission.toFixed(0)}`}
                  </p>
                </div>

                {/* Success Count */}
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {getTrendIcon(weeklyStats.changes.success)}
                    <span className={cn(
                      "text-sm font-medium",
                      weeklyStats.changes.success > 0 ? "text-green-600" : weeklyStats.changes.success < 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {formatChange(weeklyStats.changes.success)}
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{weeklyStats.thisWeek.success}</p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? "ناجحة" : "Successful"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isArabic ? `الأسبوع الماضي: ${weeklyStats.lastWeek.success}` : `Last week: ${weeklyStats.lastWeek.success}`}
                  </p>
                </div>

                {/* Failed Count */}
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {getTrendIcon(-weeklyStats.changes.failed)}
                    <span className={cn(
                      "text-sm font-medium",
                      weeklyStats.changes.failed < 0 ? "text-green-600" : weeklyStats.changes.failed > 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {formatChange(weeklyStats.changes.failed)}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{weeklyStats.thisWeek.failed}</p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? "فاشلة" : "Failed"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isArabic ? `الأسبوع الماضي: ${weeklyStats.lastWeek.failed}` : `Last week: ${weeklyStats.lastWeek.failed}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advanced Stats */}
        {advancedStats && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <CardTitle>{isArabic ? "إحصائيات متقدمة" : "Advanced Statistics"}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-bold">{advancedStats.totalCommission.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي العمولات" : "Total Commission"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-bold">{advancedStats.avgCommission.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "متوسط العمولة" : "Avg Commission"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-bold">{advancedStats.maxCommission.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "أعلى عمولة" : "Max Commission"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-bold">{advancedStats.minCommission.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "أدنى عمولة" : "Min Commission"}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
                  <p className="text-lg font-bold text-green-600">{advancedStats.successRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "نسبة النجاح" : "Success Rate"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-bold">{advancedStats.peakHour}:00</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "ساعة الذروة" : "Peak Hour"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-bold">{advancedStats.peakDay}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "يوم الذروة" : "Peak Day"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-bold">{advancedStats.uniqueSuppliers}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "الموردين" : "Suppliers"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Basic Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "إجمالي الإشعارات" : "Total"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "ناجحة" : "Successful"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "فاشلة" : "Failed"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Smartphone className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xl font-bold">{stats.inApp}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "داخل التطبيق" : "In-App"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Mail className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xl font-bold">{stats.email}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "بريد إلكتروني" : "Email"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Bell className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xl font-bold">{stats.both}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "كلاهما" : "Both"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        {filteredLogs.length > 0 && (
          <div ref={allChartsRef} className="space-y-6 mb-8">
            {/* Export All Charts Button */}
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    {isArabic ? "تصدير جميع الرسوم" : "Export All Charts"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportChartAsPng(allChartsRef, `commission-charts-${format(new Date(), "yyyy-MM-dd")}`)}>
                    <Image className="w-4 h-4 ml-2" />
                    {isArabic ? "تصدير كـ PNG" : "Export as PNG"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportChartAsPdf(allChartsRef, `commission-charts-${format(new Date(), "yyyy-MM-dd")}`)}>
                    <FileText className="w-4 h-4 ml-2" />
                    {isArabic ? "تصدير كـ PDF" : "Export as PDF"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            </div>

            {/* Weekly Trend Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  <CardTitle className="text-lg">
                    {isArabic ? "مقارنة الأيام (هذا الأسبوع vs الأسبوع الماضي)" : "Daily Comparison (This Week vs Last Week)"}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={weeklyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="week" className="text-xs" />
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
                      dataKey="thisWeek" 
                      name={isArabic ? "هذا الأسبوع" : "This Week"} 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="lastWeek" 
                      name={isArabic ? "الأسبوع الماضي" : "Last Week"} 
                      fill="hsl(var(--muted-foreground))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Timeline Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      <CardTitle className="text-lg">
                        {isArabic ? "الإشعارات مع مرور الوقت" : "Notifications Over Time"}
                      </CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Download className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => exportChartAsPng(timelineChartRef, "timeline-chart")}>
                          <Image className="w-4 h-4 ml-2" />
                          PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportChartAsPdf(timelineChartRef, "timeline-chart")}>
                          <FileText className="w-4 h-4 ml-2" />
                          PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>
                    {isArabic ? "توزيع الإشعارات حسب الحالة والنوع" : "Distribution by status and type"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div ref={timelineChartRef} className="bg-background p-2 rounded-lg">
                    {timelineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={timelineData}>
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
                            dataKey="sent" 
                            name={isArabic ? "ناجحة" : "Successful"} 
                            fill="hsl(142 76% 36%)" 
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar 
                            dataKey="failed" 
                            name={isArabic ? "فاشلة" : "Failed"} 
                            fill="hsl(0 84% 60%)" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        {isArabic ? "لا توجد بيانات كافية" : "Not enough data"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Type Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {isArabic ? "توزيع حسب النوع" : "Distribution by Type"}
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Download className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => exportChartAsPng(typeChartRef, "type-distribution")}>
                          <Image className="w-4 h-4 ml-2" />
                          PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportChartAsPdf(typeChartRef, "type-distribution")}>
                          <FileText className="w-4 h-4 ml-2" />
                          PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div ref={typeChartRef} className="bg-background p-2 rounded-lg">
                    {typeDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={typeDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          >
                            {typeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        {isArabic ? "لا توجد بيانات" : "No data"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Channel Distribution Chart */}
        {filteredLogs.length > 0 && channelDistribution.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {isArabic ? "توزيع حسب قناة الإرسال" : "Distribution by Channel"}
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Download className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportChartAsPng(channelChartRef, "channel-distribution")}>
                      <Image className="w-4 h-4 ml-2" />
                      PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportChartAsPdf(channelChartRef, "channel-distribution")}>
                      <FileText className="w-4 h-4 ml-2" />
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={channelChartRef} className="bg-background p-4 rounded-lg flex flex-wrap gap-8 items-center justify-center">
                <ResponsiveContainer width={300} height={200}>
                  <PieChart>
                    <Pie
                      data={channelDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {channelDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {channelDistribution.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span className="font-medium">{item.name}:</span>
                      <span className="text-muted-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                <CardTitle className="text-lg">{isArabic ? "فلاتر البحث" : "Filters"}</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="w-4 h-4" />
                  {isArabic ? "مسح الفلاتر" : "Clear Filters"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Date From */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{isArabic ? "من تاريخ" : "From Date"}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-right font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="ml-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy") : (isArabic ? "اختر تاريخ" : "Pick a date")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{isArabic ? "إلى تاريخ" : "To Date"}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-right font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="ml-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy") : (isArabic ? "اختر تاريخ" : "Pick a date")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Alert Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{isArabic ? "نوع التنبيه" : "Alert Type"}</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isArabic ? "الكل" : "All"}</SelectItem>
                    <SelectItem value="single">{isArabic ? "عمولة كبيرة" : "Large Commission"}</SelectItem>
                    <SelectItem value="total">{isArabic ? "وصول للحد" : "Threshold Reached"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{isArabic ? "الحالة" : "Status"}</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isArabic ? "الكل" : "All"}</SelectItem>
                    <SelectItem value="sent">{isArabic ? "ناجحة" : "Successful"}</SelectItem>
                    <SelectItem value="failed">{isArabic ? "فاشلة" : "Failed"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Channel Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{isArabic ? "القناة" : "Channel"}</label>
                <Select value={filterChannel} onValueChange={setFilterChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isArabic ? "الكل" : "All"}</SelectItem>
                    <SelectItem value="in_app">{isArabic ? "داخل التطبيق" : "In-App"}</SelectItem>
                    <SelectItem value="email">{isArabic ? "بريد إلكتروني" : "Email"}</SelectItem>
                    <SelectItem value="both">{isArabic ? "كلاهما" : "Both"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {isArabic 
                    ? `عرض ${filteredLogs.length} من ${logs.length} إشعار`
                    : `Showing ${filteredLogs.length} of ${logs.length} notifications`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>{isArabic ? "سجل الإشعارات" : "Notification Log"}</CardTitle>
            <CardDescription>
              {isArabic
                ? "جميع إشعارات العمولات المرسلة"
                : "All sent commission notifications"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{hasActiveFilters 
                  ? (isArabic ? "لا توجد نتائج تطابق الفلاتر" : "No results match filters")
                  : (isArabic ? "لا توجد إشعارات مسجلة" : "No notifications logged")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? "التاريخ" : "Date"}</TableHead>
                      <TableHead>{isArabic ? "النوع" : "Type"}</TableHead>
                      <TableHead>{isArabic ? "القناة" : "Channel"}</TableHead>
                      <TableHead>{isArabic ? "قيمة العمولة" : "Commission"}</TableHead>
                      <TableHead>{isArabic ? "الإجمالي" : "Total"}</TableHead>
                      <TableHead>{isArabic ? "الحد" : "Threshold"}</TableHead>
                      <TableHead>{isArabic ? "المورد" : "Supplier"}</TableHead>
                      <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {format(
                              new Date(log.created_at),
                              "dd/MM/yyyy HH:mm",
                              { locale: isArabic ? ar : undefined }
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getAlertTypeBadge(log.alert_type)}</TableCell>
                        <TableCell>{getChannelBadge(log.notification_channel)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            {Number(log.commission_amount).toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>{Number(log.total_amount).toFixed(2)}</TableCell>
                        <TableCell>{Number(log.threshold).toFixed(2)}</TableCell>
                        <TableCell>{log.supplier_name || "-"}</TableCell>
                        <TableCell>
                          {log.status === "sent" ? (
                            <Badge className="bg-green-500 gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {isArabic ? "تم الإرسال" : "Sent"}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="w-3 h-3" />
                              {isArabic ? "فشل" : "Failed"}
                            </Badge>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArabic ? "مسح جميع السجلات؟" : "Clear all logs?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic
                ? "سيتم حذف جميع سجلات الإشعارات. هذا الإجراء لا يمكن التراجع عنه."
                : "All notification logs will be deleted. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearLogs}
              className="bg-destructive text-destructive-foreground"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isArabic ? "مسح الكل" : "Clear All"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CommissionNotificationLogs;
