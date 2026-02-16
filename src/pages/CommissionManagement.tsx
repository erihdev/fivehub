import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Coffee,
  Shield,
  Percent,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  ArrowLeft,
  Save,
  RefreshCw,
  Download,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Mail,
  Send,
  FileText,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  Bell,
  CheckCircle2,
  CheckSquare,
  Square,
  ClockIcon,
  Printer,
  Bookmark,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useCommissionNotifications } from "@/hooks/useCommissionNotifications";
import { useCommissionThresholdAlert } from "@/hooks/useCommissionThresholdAlert";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isAfter, isBefore, isEqual, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } from "recharts";

interface Commission {
  id: string;
  order_id: string;
  supplier_id: string;
  roaster_id: string;
  order_total: number;
  supplier_commission: number;
  roaster_commission: number;
  total_commission: number;
  supplier_rate: number;
  roaster_rate: number;
  status: string;
  created_at: string;
  supplier?: { name: string };
}

interface CommissionSettings {
  id: string;
  supplier_rate: number;
  roaster_rate: number;
}

const CommissionManagement = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { language, t, dir } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Enable commission notifications
  useCommissionNotifications();
  const { getSettings: getThresholdSettings, saveSettings: saveThresholdSettings, resetNotification, requestPushPermission, retryAllFailed } = useCommissionThresholdAlert();
  
  // Threshold alert states
  const [thresholdEnabled, setThresholdEnabled] = useState(false);
  const [thresholdValue, setThresholdValue] = useState("1000");
  const [notifyOnEachCommission, setNotifyOnEachCommission] = useState(false);
  const [notifyOnTotalReached, setNotifyOnTotalReached] = useState(true);
  const [emailAlertEnabled, setEmailAlertEnabled] = useState(false);
  const [emailAlertAddress, setEmailAlertAddress] = useState("");
  const [pushAlertEnabled, setPushAlertEnabled] = useState(false);
  
  // Success rate alert states
  const [successRateAlertEnabled, setSuccessRateAlertEnabled] = useState(false);
  const [successRateThreshold, setSuccessRateThreshold] = useState("80");
  const [successRateCheckPeriod, setSuccessRateCheckPeriod] = useState<"daily" | "weekly">("daily");
  
  // Auto retry states
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(false);
  const [autoRetryMaxAttempts, setAutoRetryMaxAttempts] = useState("3");
  const [autoRetryDelayMinutes, setAutoRetryDelayMinutes] = useState("5");
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Weekly report states
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(false);
  const [weeklyReportDay, setWeeklyReportDay] = useState(0);
  const [weeklyReportHour, setWeeklyReportHour] = useState(9);
  const [isSendingWeeklyReport, setIsSendingWeeklyReport] = useState(false);
  
  // Load threshold settings on mount
  useEffect(() => {
    const settings = getThresholdSettings();
    setThresholdEnabled(settings.enabled);
    setThresholdValue(settings.threshold.toString());
    setNotifyOnEachCommission(settings.notifyOnEachCommission);
    setNotifyOnTotalReached(settings.notifyOnTotalReached);
    setEmailAlertEnabled(settings.emailEnabled);
    setEmailAlertAddress(settings.emailAddress);
    setPushAlertEnabled(settings.pushEnabled);
    setSuccessRateAlertEnabled(settings.successRateAlertEnabled);
    setSuccessRateThreshold(settings.successRateThreshold.toString());
    setSuccessRateCheckPeriod(settings.successRateCheckPeriod);
    setAutoRetryEnabled(settings.autoRetryEnabled);
    setAutoRetryMaxAttempts(settings.autoRetryMaxAttempts.toString());
    setAutoRetryDelayMinutes(settings.autoRetryDelayMinutes.toString());
    setWeeklyReportEnabled(settings.weeklyReportEnabled);
    setWeeklyReportDay(settings.weeklyReportDay);
    setWeeklyReportHour(settings.weeklyReportHour);
  }, [getThresholdSettings]);
  
  // Save threshold settings
  const handleSaveThresholdSettings = () => {
    const threshold = parseFloat(thresholdValue);
    if (isNaN(threshold) || threshold <= 0) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "الرجاء إدخال حد صحيح" : "Please enter a valid threshold",
        variant: "destructive",
      });
      return;
    }
    
    saveThresholdSettings({
      enabled: thresholdEnabled,
      threshold,
      notifyOnEachCommission,
      notifyOnTotalReached,
      emailEnabled: emailAlertEnabled,
      emailAddress: emailAlertAddress,
      pushEnabled: pushAlertEnabled,
      successRateAlertEnabled,
      successRateThreshold: parseFloat(successRateThreshold) || 80,
      successRateCheckPeriod,
      autoRetryEnabled,
      autoRetryMaxAttempts: parseInt(autoRetryMaxAttempts) || 3,
      autoRetryDelayMinutes: parseInt(autoRetryDelayMinutes) || 5,
      weeklyReportEnabled,
      weeklyReportDay,
      weeklyReportHour,
    });
    resetNotification();
    
    toast({
      title: isArabic ? "تم الحفظ" : "Saved",
      description: isArabic ? "تم حفظ إعدادات الإشعار التلقائي" : "Threshold alert settings saved",
    });
  };
  
  // Send test weekly success rate report
  const handleSendTestWeeklyReport = async () => {
    if (!user) return;
    
    setIsSendingWeeklyReport(true);
    try {
      const { data, error } = await supabase.functions.invoke("weekly-success-rate-report", {
        body: {
          testMode: true,
          userId: user.id,
        },
      });

      if (error) throw error;

      toast({
        title: isArabic ? "✅ تم الإرسال" : "✅ Report Sent",
        description: isArabic 
          ? "تم إرسال تقرير نسبة النجاح التجريبي" 
          : "Test success rate report sent successfully",
      });
    } catch (error: any) {
      console.error("Error sending test report:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message || (isArabic ? "فشل إرسال التقرير" : "Failed to send report"),
        variant: "destructive",
      });
    } finally {
      setIsSendingWeeklyReport(false);
    }
  };
  
  // Handle manual retry all failed
  const handleRetryAllFailed = async () => {
    setIsRetrying(true);
    try {
      const result = await retryAllFailed();
      toast({
        title: isArabic ? "اكتملت إعادة المحاولة" : "Retry Complete",
        description: isArabic 
          ? `نجح: ${result.success}، فشل: ${result.failed}`
          : `Success: ${result.success}, Failed: ${result.failed}`,
      });
    } catch (error) {
      console.error("Error retrying:", error);
    } finally {
      setIsRetrying(false);
    }
  };

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [settings, setSettings] = useState<CommissionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ id: string; newStatus: string; commission: Commission | null } | null>(null);
  
  // Bulk selection states
  const [selectedCommissions, setSelectedCommissions] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkConfirmDialogOpen, setBulkConfirmDialogOpen] = useState(false);
  const [pendingBulkStatus, setPendingBulkStatus] = useState<string | null>(null);
  const [supplierRate, setSupplierRate] = useState("");
  const [roasterRate, setRoasterRate] = useState("");
  
  // Report scheduling states
  const [reportEnabled, setReportEnabled] = useState(false);
  const [reportDay, setReportDay] = useState(0);
  const [reportHour, setReportHour] = useState(9);
  const [reportTimezone, setReportTimezone] = useState("Asia/Riyadh");
  const [reportEmail, setReportEmail] = useState("");
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [isTestingReport, setIsTestingReport] = useState(false);
  const [reportSettingsId, setReportSettingsId] = useState<string | null>(null);
  
  // Filter states
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [quickDateRange, setQuickDateRange] = useState<string>("all");
  const [filterAmountFrom, setFilterAmountFrom] = useState("");
  const [filterAmountTo, setFilterAmountTo] = useState("");
  
  // Filter templates
  interface FilterTemplate {
    id: string;
    name: string;
    filters: {
      dateFrom: string;
      dateTo: string;
      supplier: string;
      status: string;
      quickDateRange: string;
      amountFrom: string;
      amountTo: string;
    };
  }
  const [savedFilterTemplates, setSavedFilterTemplates] = useState<FilterTemplate[]>(() => {
    const saved = localStorage.getItem("commission_filter_templates");
    return saved ? JSON.parse(saved) : [];
  });
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Sorting states
  type SortColumn = "date" | "supplier" | "orderValue" | "supplierCommission" | "roasterCommission" | "total" | "status";
  type SortDirection = "asc" | "desc";
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const isArabic = language === "ar";

  // Get unique suppliers for filter dropdown
  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Map<string, string>();
    commissions.forEach((c) => {
      if (c.supplier_id && c.supplier?.name) {
        suppliers.set(c.supplier_id, c.supplier.name);
      }
    });
    return Array.from(suppliers.entries()).map(([id, name]) => ({ id, name }));
  }, [commissions]);

  // Filtered commissions
  const filteredCommissions = useMemo(() => {
    return commissions.filter((commission) => {
      // Date from filter
      if (filterDateFrom) {
        const fromDate = parseISO(filterDateFrom);
        const commissionDate = new Date(commission.created_at);
        if (isBefore(commissionDate, fromDate)) return false;
      }
      
      // Date to filter
      if (filterDateTo) {
        const toDate = parseISO(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        const commissionDate = new Date(commission.created_at);
        if (isAfter(commissionDate, toDate)) return false;
      }
      
      // Supplier filter
      if (filterSupplier !== "all" && commission.supplier_id !== filterSupplier) {
        return false;
      }
      
      // Status filter
      if (filterStatus !== "all" && commission.status !== filterStatus) {
        return false;
      }
      
      // Amount from filter
      if (filterAmountFrom) {
        const minAmount = parseFloat(filterAmountFrom);
        if (!isNaN(minAmount) && Number(commission.total_commission) < minAmount) {
          return false;
        }
      }
      
      // Amount to filter
      if (filterAmountTo) {
        const maxAmount = parseFloat(filterAmountTo);
        if (!isNaN(maxAmount) && Number(commission.total_commission) > maxAmount) {
          return false;
        }
      }
      
      return true;
    });
  }, [commissions, filterDateFrom, filterDateTo, filterSupplier, filterStatus, filterAmountFrom, filterAmountTo]);

  // Sorted commissions
  const sortedCommissions = useMemo(() => {
    return [...filteredCommissions].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "supplier":
          comparison = (a.supplier?.name || "").localeCompare(b.supplier?.name || "");
          break;
        case "orderValue":
          comparison = Number(a.order_total) - Number(b.order_total);
          break;
        case "supplierCommission":
          comparison = Number(a.supplier_commission) - Number(b.supplier_commission);
          break;
        case "roasterCommission":
          comparison = Number(a.roaster_commission) - Number(b.roaster_commission);
          break;
        case "total":
          comparison = Number(a.total_commission) - Number(b.total_commission);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredCommissions, sortColumn, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedCommissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCommissions = sortedCommissions.slice(startIndex, endIndex);

  // Handle sort column click
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  // Get sort icon for column
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="w-3 h-3" /> 
      : <ArrowDown className="w-3 h-3" />;
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDateFrom, filterDateTo, filterSupplier, filterStatus, filterAmountFrom, filterAmountTo, itemsPerPage]);

  // Check if any filters are active
  const hasActiveFilters = filterDateFrom || filterDateTo || filterSupplier !== "all" || filterStatus !== "all" || quickDateRange !== "all" || filterAmountFrom || filterAmountTo;

  // Handle quick date range selection
  const handleQuickDateRange = (range: string) => {
    setQuickDateRange(range);
    const now = new Date();
    
    switch (range) {
      case "today":
        const today = format(now, "yyyy-MM-dd");
        setFilterDateFrom(today);
        setFilterDateTo(today);
        break;
      case "thisWeek":
        const weekStart = startOfWeek(now, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
        setFilterDateFrom(format(weekStart, "yyyy-MM-dd"));
        setFilterDateTo(format(weekEnd, "yyyy-MM-dd"));
        break;
      case "thisMonth":
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        setFilterDateFrom(format(monthStart, "yyyy-MM-dd"));
        setFilterDateTo(format(monthEnd, "yyyy-MM-dd"));
        break;
      case "lastMonth":
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));
        setFilterDateFrom(format(lastMonthStart, "yyyy-MM-dd"));
        setFilterDateTo(format(lastMonthEnd, "yyyy-MM-dd"));
        break;
      case "all":
      default:
        setFilterDateFrom("");
        setFilterDateTo("");
        break;
    }
    setCurrentPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterSupplier("all");
    setFilterStatus("all");
    setQuickDateRange("all");
    setFilterAmountFrom("");
    setFilterAmountTo("");
    setCurrentPage(1);
  };

  // Save current filters as template
  const handleSaveFilterTemplate = () => {
    if (!newTemplateName.trim()) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "الرجاء إدخال اسم للقالب" : "Please enter a template name",
        variant: "destructive",
      });
      return;
    }

    const newTemplate: FilterTemplate = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      filters: {
        dateFrom: filterDateFrom,
        dateTo: filterDateTo,
        supplier: filterSupplier,
        status: filterStatus,
        quickDateRange: quickDateRange,
        amountFrom: filterAmountFrom,
        amountTo: filterAmountTo,
      },
    };

    const updatedTemplates = [...savedFilterTemplates, newTemplate];
    setSavedFilterTemplates(updatedTemplates);
    localStorage.setItem("commission_filter_templates", JSON.stringify(updatedTemplates));
    setNewTemplateName("");
    setShowSaveTemplateDialog(false);

    toast({
      title: isArabic ? "تم الحفظ" : "Saved",
      description: isArabic ? "تم حفظ قالب الفلتر بنجاح" : "Filter template saved successfully",
    });
  };

  // Load filter template
  const handleLoadFilterTemplate = (template: FilterTemplate) => {
    setFilterDateFrom(template.filters.dateFrom);
    setFilterDateTo(template.filters.dateTo);
    setFilterSupplier(template.filters.supplier);
    setFilterStatus(template.filters.status);
    setQuickDateRange(template.filters.quickDateRange);
    setFilterAmountFrom(template.filters.amountFrom);
    setFilterAmountTo(template.filters.amountTo);
    setCurrentPage(1);

    toast({
      title: isArabic ? "تم التحميل" : "Loaded",
      description: isArabic ? `تم تحميل قالب "${template.name}"` : `Loaded template "${template.name}"`,
    });
  };

  // Delete filter template
  const handleDeleteFilterTemplate = (templateId: string) => {
    const updatedTemplates = savedFilterTemplates.filter((t) => t.id !== templateId);
    setSavedFilterTemplates(updatedTemplates);
    localStorage.setItem("commission_filter_templates", JSON.stringify(updatedTemplates));

    toast({
      title: isArabic ? "تم الحذف" : "Deleted",
      description: isArabic ? "تم حذف قالب الفلتر" : "Filter template deleted",
    });
  };

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

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch commission settings
        const { data: settingsData, error: settingsError } = await supabase
          .from("commission_settings")
          .select("*")
          .limit(1)
          .single();

        if (settingsError && settingsError.code !== "PGRST116") {
          throw settingsError;
        }

        if (settingsData) {
          setSettings(settingsData);
          setSupplierRate(settingsData.supplier_rate.toString());
          setRoasterRate(settingsData.roaster_rate.toString());
        }

        // Fetch commissions with supplier info
        const { data: commissionsData, error: commissionsError } = await supabase
          .from("commissions")
          .select(`
            *,
            supplier:suppliers(name)
          `)
          .order("created_at", { ascending: false });

        if (commissionsError) throw commissionsError;

        setCommissions(commissionsData || []);

        // Fetch report scheduling settings
        const { data: reportData } = await supabase
          .from("commission_report_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (reportData) {
          setReportSettingsId(reportData.id);
          setReportEnabled(reportData.enabled);
          setReportDay(reportData.report_day);
          setReportHour(reportData.report_hour);
          setReportTimezone(reportData.timezone);
          setReportEmail(reportData.email_override || "");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: isArabic ? "خطأ" : "Error",
          description: isArabic ? "فشل في تحميل البيانات" : "Failed to load data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, isAdmin, isArabic, toast]);

  const handleSaveSettings = async () => {
    if (!settings) return;

    const newSupplierRate = parseFloat(supplierRate);
    const newRoasterRate = parseFloat(roasterRate);

    if (isNaN(newSupplierRate) || isNaN(newRoasterRate)) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "الرجاء إدخال قيم صحيحة" : "Please enter valid values",
        variant: "destructive",
      });
      return;
    }

    if (newSupplierRate < 0 || newSupplierRate > 100 || newRoasterRate < 0 || newRoasterRate > 100) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "النسبة يجب أن تكون بين 0 و 100" : "Rate must be between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("commission_settings")
        .update({
          supplier_rate: newSupplierRate,
          roaster_rate: newRoasterRate,
        })
        .eq("id", settings.id);

      if (error) throw error;

      setSettings({
        ...settings,
        supplier_rate: newSupplierRate,
        roaster_rate: newRoasterRate,
      });

      toast({
        title: isArabic ? "تم الحفظ" : "Saved",
        description: isArabic ? "تم تحديث نسب العمولة بنجاح" : "Commission rates updated successfully",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في حفظ الإعدادات" : "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle status change request (with confirmation for completing)
  const handleStatusChangeRequest = (commissionId: string, newStatus: string) => {
    const commission = commissions.find((c) => c.id === commissionId);
    
    // If changing from pending to completed, show confirmation dialog
    if (commission?.status === "pending" && newStatus === "completed") {
      setPendingStatusChange({ id: commissionId, newStatus, commission });
      setConfirmDialogOpen(true);
    } else {
      // For other changes, proceed directly
      handleUpdateStatus(commissionId, newStatus);
    }
  };

  // Confirm and execute status change
  const handleConfirmStatusChange = () => {
    if (pendingStatusChange) {
      handleUpdateStatus(pendingStatusChange.id, pendingStatusChange.newStatus);
    }
    setConfirmDialogOpen(false);
    setPendingStatusChange(null);
  };

  // Update commission status
  const handleUpdateStatus = async (commissionId: string, newStatus: string) => {
    setUpdatingStatusId(commissionId);
    try {
      const { error } = await supabase
        .from("commissions")
        .update({ status: newStatus })
        .eq("id", commissionId);

      if (error) throw error;

      // Update local state
      setCommissions((prev) =>
        prev.map((c) =>
          c.id === commissionId ? { ...c, status: newStatus } : c
        )
      );

      toast({
        title: isArabic ? "تم التحديث" : "Updated",
        description: isArabic
          ? `تم تغيير حالة العمولة إلى ${newStatus === "completed" ? "مكتمل" : "معلق"}`
          : `Commission status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في تحديث الحالة" : "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Bulk selection handlers
  // Select all on current page
  const handleSelectAll = () => {
    if (selectedCommissions.size === paginatedCommissions.length) {
      setSelectedCommissions(new Set());
    } else {
      setSelectedCommissions(new Set(paginatedCommissions.map((c) => c.id)));
    }
  };

  // Select all filtered commissions (across all pages)
  const handleSelectAllFiltered = () => {
    if (selectedCommissions.size === sortedCommissions.length) {
      setSelectedCommissions(new Set());
    } else {
      setSelectedCommissions(new Set(sortedCommissions.map((c) => c.id)));
    }
  };

  const handleSelectCommission = (commissionId: string) => {
    const newSelected = new Set(selectedCommissions);
    if (newSelected.has(commissionId)) {
      newSelected.delete(commissionId);
    } else {
      newSelected.add(commissionId);
    }
    setSelectedCommissions(newSelected);
  };

  // Bulk status change request
  const handleBulkStatusChangeRequest = (newStatus: string) => {
    if (selectedCommissions.size === 0) return;
    
    // If changing to completed, show confirmation
    const hasUncompletedItems = Array.from(selectedCommissions).some((id) => {
      const commission = commissions.find((c) => c.id === id);
      return commission?.status === "pending" && newStatus === "completed";
    });

    if (hasUncompletedItems) {
      setPendingBulkStatus(newStatus);
      setBulkConfirmDialogOpen(true);
    } else {
      handleBulkUpdateStatus(newStatus);
    }
  };

  // Execute bulk status update
  const handleBulkUpdateStatus = async (newStatus: string) => {
    if (selectedCommissions.size === 0) return;

    setIsBulkUpdating(true);
    try {
      const ids = Array.from(selectedCommissions);
      const { error } = await supabase
        .from("commissions")
        .update({ status: newStatus })
        .in("id", ids);

      if (error) throw error;

      // Update local state
      setCommissions((prev) =>
        prev.map((c) =>
          selectedCommissions.has(c.id) ? { ...c, status: newStatus } : c
        )
      );

      toast({
        title: isArabic ? "تم التحديث" : "Updated",
        description: isArabic
          ? `تم تغيير حالة ${ids.length} عمولة إلى ${newStatus === "completed" ? "مكتمل" : "معلق"}`
          : `Changed status of ${ids.length} commissions to ${newStatus}`,
      });

      setSelectedCommissions(new Set());
    } catch (error) {
      console.error("Error bulk updating status:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في تحديث الحالات" : "Failed to update statuses",
        variant: "destructive",
      });
    } finally {
      setIsBulkUpdating(false);
      setBulkConfirmDialogOpen(false);
      setPendingBulkStatus(null);
    }
  };

  // Clear selection when filters or page changes
  useEffect(() => {
    setSelectedCommissions(new Set());
  }, [filterDateFrom, filterDateTo, filterSupplier, filterStatus, currentPage, itemsPerPage]);

  // Save report scheduling settings
  const handleSaveReportSettings = async () => {
    if (!user) return;
    
    setIsSavingReport(true);
    try {
      const settingsData = {
        user_id: user.id,
        enabled: reportEnabled,
        report_day: reportDay,
        report_hour: reportHour,
        timezone: reportTimezone,
        email_override: reportEmail || null,
      };

      if (reportSettingsId) {
        const { error } = await supabase
          .from("commission_report_settings")
          .update(settingsData)
          .eq("id", reportSettingsId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("commission_report_settings")
          .insert(settingsData)
          .select()
          .single();
        if (error) throw error;
        if (data) setReportSettingsId(data.id);
      }

      toast({
        title: isArabic ? "تم الحفظ" : "Saved",
        description: isArabic ? "تم حفظ إعدادات الجدولة بنجاح" : "Schedule settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving report settings:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في حفظ إعدادات الجدولة" : "Failed to save schedule settings",
        variant: "destructive",
      });
    } finally {
      setIsSavingReport(false);
    }
  };

  // Test scheduled report
  const handleTestScheduledReport = async () => {
    if (!user) return;
    
    setIsTestingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke("scheduled-commission-report", {
        body: { testMode: true, userId: user.id },
      });

      if (error) throw error;

      if (data?.success && data?.sent > 0) {
        toast({
          title: isArabic ? "تم الإرسال" : "Sent",
          description: isArabic
            ? "تم إرسال تقرير تجريبي بنجاح"
            : "Test report sent successfully",
        });
      } else {
        throw new Error(data?.message || "No report sent");
      }
    } catch (error: any) {
      console.error("Error testing report:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في إرسال التقرير التجريبي" : "Failed to send test report",
        variant: "destructive",
      });
    } finally {
      setIsTestingReport(false);
    }
  };

  // Send weekly report
  const handleSendWeeklyReport = async (testMode = false) => {
    setIsSendingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke("weekly-commission-report", {
        body: { testMode, email: user?.email },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: isArabic ? "تم الإرسال" : "Sent",
          description: isArabic
            ? `تم إرسال التقرير بنجاح إلى ${data.sent} مستلم`
            : `Report sent successfully to ${data.sent} recipient(s)`,
        });
      } else {
        throw new Error(data?.message || "Unknown error");
      }
    } catch (error: any) {
      console.error("Error sending report:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في إرسال التقرير" : "Failed to send report",
        variant: "destructive",
      });
    } finally {
      setIsSendingReport(false);
    }
  };

  // Calculate totals
  const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.total_commission), 0);
  const totalSupplierCommissions = commissions.reduce((sum, c) => sum + Number(c.supplier_commission), 0);
  const totalRoasterCommissions = commissions.reduce((sum, c) => sum + Number(c.roaster_commission), 0);
  const totalOrderValue = commissions.reduce((sum, c) => sum + Number(c.order_total), 0);

  // Detailed statistics with monthly comparison
  const detailedStats = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));

    // Current month commissions
    const currentMonthCommissions = commissions.filter((c) => {
      const date = new Date(c.created_at);
      return date >= currentMonthStart && date <= currentMonthEnd;
    });

    // Previous month commissions
    const prevMonthCommissions = commissions.filter((c) => {
      const date = new Date(c.created_at);
      return date >= prevMonthStart && date <= prevMonthEnd;
    });

    // Current month totals
    const currentTotal = currentMonthCommissions.reduce((sum, c) => sum + Number(c.total_commission), 0);
    const currentSupplier = currentMonthCommissions.reduce((sum, c) => sum + Number(c.supplier_commission), 0);
    const currentRoaster = currentMonthCommissions.reduce((sum, c) => sum + Number(c.roaster_commission), 0);
    const currentOrderValue = currentMonthCommissions.reduce((sum, c) => sum + Number(c.order_total), 0);
    const currentCount = currentMonthCommissions.length;

    // Previous month totals
    const prevTotal = prevMonthCommissions.reduce((sum, c) => sum + Number(c.total_commission), 0);
    const prevSupplier = prevMonthCommissions.reduce((sum, c) => sum + Number(c.supplier_commission), 0);
    const prevRoaster = prevMonthCommissions.reduce((sum, c) => sum + Number(c.roaster_commission), 0);
    const prevOrderValue = prevMonthCommissions.reduce((sum, c) => sum + Number(c.order_total), 0);
    const prevCount = prevMonthCommissions.length;

    // Calculate percentage changes
    const calcChange = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return ((current - prev) / prev) * 100;
    };

    // Average and max commissions
    const avgCommission = commissions.length > 0 ? totalCommissions / commissions.length : 0;
    const maxCommission = commissions.length > 0 ? Math.max(...commissions.map((c) => Number(c.total_commission))) : 0;
    const minCommission = commissions.length > 0 ? Math.min(...commissions.map((c) => Number(c.total_commission))) : 0;

    // Commission rate (total commission / total order value)
    const commissionRate = totalOrderValue > 0 ? (totalCommissions / totalOrderValue) * 100 : 0;

    return {
      current: {
        total: currentTotal,
        supplier: currentSupplier,
        roaster: currentRoaster,
        orderValue: currentOrderValue,
        count: currentCount,
      },
      previous: {
        total: prevTotal,
        supplier: prevSupplier,
        roaster: prevRoaster,
        orderValue: prevOrderValue,
        count: prevCount,
      },
      changes: {
        total: calcChange(currentTotal, prevTotal),
        supplier: calcChange(currentSupplier, prevSupplier),
        roaster: calcChange(currentRoaster, prevRoaster),
        orderValue: calcChange(currentOrderValue, prevOrderValue),
        count: calcChange(currentCount, prevCount),
      },
      overall: {
        avgCommission,
        maxCommission,
        minCommission,
        commissionRate,
      },
    };
  }, [commissions, totalCommissions, totalOrderValue]);

  // Status-based statistics
  const statusStats = useMemo(() => {
    const completed = commissions.filter((c) => c.status === "completed");
    const pending = commissions.filter((c) => c.status === "pending");

    return {
      completed: {
        count: completed.length,
        total: completed.reduce((sum, c) => sum + Number(c.total_commission), 0),
        supplier: completed.reduce((sum, c) => sum + Number(c.supplier_commission), 0),
        roaster: completed.reduce((sum, c) => sum + Number(c.roaster_commission), 0),
        orderValue: completed.reduce((sum, c) => sum + Number(c.order_total), 0),
      },
      pending: {
        count: pending.length,
        total: pending.reduce((sum, c) => sum + Number(c.total_commission), 0),
        supplier: pending.reduce((sum, c) => sum + Number(c.supplier_commission), 0),
        roaster: pending.reduce((sum, c) => sum + Number(c.roaster_commission), 0),
        orderValue: pending.reduce((sum, c) => sum + Number(c.order_total), 0),
      },
    };
  }, [commissions]);

  // Monthly chart data
  const monthlyChartData = useMemo(() => {
    const monthlyData: Record<string, { month: string; monthKey: string; supplier: number; roaster: number; total: number; count: number; orderValue: number }> = {};
    
    commissions.forEach((commission) => {
      const date = new Date(commission.created_at);
      const monthKey = format(date, "yyyy-MM");
      const monthLabel = format(date, "MMM yyyy", { locale: isArabic ? ar : undefined });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthLabel, monthKey, supplier: 0, roaster: 0, total: 0, count: 0, orderValue: 0 };
      }
      
      monthlyData[monthKey].supplier += Number(commission.supplier_commission);
      monthlyData[monthKey].roaster += Number(commission.roaster_commission);
      monthlyData[monthKey].total += Number(commission.total_commission);
      monthlyData[monthKey].count += 1;
      monthlyData[monthKey].orderValue += Number(commission.order_total);
    });
    
    return Object.values(monthlyData).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [commissions, isArabic]);

  // Daily chart data for current month
  const dailyChartData = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const daysInMonth = currentMonthEnd.getDate();
    
    // Initialize all days of the month
    const dailyData: Record<number, { day: number; dayLabel: string; supplier: number; roaster: number; total: number; count: number; orderValue: number }> = {};
    
    for (let i = 1; i <= daysInMonth; i++) {
      dailyData[i] = { 
        day: i, 
        dayLabel: `${i}`, 
        supplier: 0, 
        roaster: 0, 
        total: 0, 
        count: 0, 
        orderValue: 0 
      };
    }
    
    // Fill in actual commission data
    commissions.forEach((commission) => {
      const date = new Date(commission.created_at);
      if (date >= currentMonthStart && date <= currentMonthEnd) {
        const day = date.getDate();
        dailyData[day].supplier += Number(commission.supplier_commission);
        dailyData[day].roaster += Number(commission.roaster_commission);
        dailyData[day].total += Number(commission.total_commission);
        dailyData[day].count += 1;
        dailyData[day].orderValue += Number(commission.order_total);
      }
    });
    
    return Object.values(dailyData).sort((a, b) => a.day - b.day);
  }, [commissions]);

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = hasActiveFilters ? sortedCommissions : commissions;
    
    if (dataToExport.length === 0) {
      toast({
        title: isArabic ? "لا توجد بيانات" : "No data",
        description: isArabic ? "لا توجد عمولات للتصدير" : "No commissions to export",
        variant: "destructive",
      });
      return;
    }

    // Calculate totals for exported data
    const exportTotalCommissions = dataToExport.reduce((sum, c) => sum + Number(c.total_commission), 0);
    const exportTotalSupplier = dataToExport.reduce((sum, c) => sum + Number(c.supplier_commission), 0);
    const exportTotalRoaster = dataToExport.reduce((sum, c) => sum + Number(c.roaster_commission), 0);
    const exportTotalOrderValue = dataToExport.reduce((sum, c) => sum + Number(c.order_total), 0);

    const exportData = dataToExport.map((commission) => ({
      [isArabic ? "التاريخ" : "Date"]: format(new Date(commission.created_at), "yyyy-MM-dd"),
      [isArabic ? "المورد" : "Supplier"]: commission.supplier?.name || "-",
      [isArabic ? "قيمة الطلب (ر.س)" : "Order Value (SAR)"]: Number(commission.order_total).toFixed(2),
      [isArabic ? "نسبة عمولة المورد (%)" : "Supplier Rate (%)"]: commission.supplier_rate,
      [isArabic ? "عمولة المورد (ر.س)" : "Supplier Commission (SAR)"]: Number(commission.supplier_commission).toFixed(2),
      [isArabic ? "نسبة عمولة المحمصة (%)" : "Roaster Rate (%)"]: commission.roaster_rate,
      [isArabic ? "عمولة المحمصة (ر.س)" : "Roaster Commission (SAR)"]: Number(commission.roaster_commission).toFixed(2),
      [isArabic ? "إجمالي العمولة (ر.س)" : "Total Commission (SAR)"]: Number(commission.total_commission).toFixed(2),
      [isArabic ? "الحالة" : "Status"]: commission.status === "pending" 
        ? (isArabic ? "معلق" : "Pending") 
        : (isArabic ? "مكتمل" : "Completed"),
    }));

    // Add summary row
    exportData.push({
      [isArabic ? "التاريخ" : "Date"]: isArabic ? "الإجمالي" : "TOTAL",
      [isArabic ? "المورد" : "Supplier"]: "",
      [isArabic ? "قيمة الطلب (ر.س)" : "Order Value (SAR)"]: exportTotalOrderValue.toFixed(2),
      [isArabic ? "نسبة عمولة المورد (%)" : "Supplier Rate (%)"]: "",
      [isArabic ? "عمولة المورد (ر.س)" : "Supplier Commission (SAR)"]: exportTotalSupplier.toFixed(2),
      [isArabic ? "نسبة عمولة المحمصة (%)" : "Roaster Rate (%)"]: "",
      [isArabic ? "عمولة المحمصة (ر.س)" : "Roaster Commission (SAR)"]: exportTotalRoaster.toFixed(2),
      [isArabic ? "إجمالي العمولة (ر.س)" : "Total Commission (SAR)"]: exportTotalCommissions.toFixed(2),
      [isArabic ? "الحالة" : "Status"]: "",
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isArabic ? "العمولات" : "Commissions");

    // Auto-size columns
    const colWidths = Object.keys(exportData[0]).map((key) => ({
      wch: Math.max(key.length, 15),
    }));
    worksheet["!cols"] = colWidths;

    const fileName = `commissions_report${hasActiveFilters ? "_filtered" : ""}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: isArabic ? "تم التصدير" : "Exported",
      description: hasActiveFilters 
        ? (isArabic ? `تم تصدير ${dataToExport.length} عمولة مفلترة` : `Exported ${dataToExport.length} filtered commissions`)
        : (isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully"),
    });
  };

  // Export selected commissions to Excel
  const handleExportSelectedExcel = () => {
    if (selectedCommissions.size === 0) {
      toast({
        title: isArabic ? "لا توجد بيانات" : "No data",
        description: isArabic ? "الرجاء تحديد عمولات للتصدير" : "Please select commissions to export",
        variant: "destructive",
      });
      return;
    }

    const selectedData = commissions.filter((c) => selectedCommissions.has(c.id));

    // Calculate totals for selected data
    const exportTotalCommissions = selectedData.reduce((sum, c) => sum + Number(c.total_commission), 0);
    const exportTotalSupplier = selectedData.reduce((sum, c) => sum + Number(c.supplier_commission), 0);
    const exportTotalRoaster = selectedData.reduce((sum, c) => sum + Number(c.roaster_commission), 0);
    const exportTotalOrderValue = selectedData.reduce((sum, c) => sum + Number(c.order_total), 0);

    const exportData = selectedData.map((commission) => ({
      [isArabic ? "التاريخ" : "Date"]: format(new Date(commission.created_at), "yyyy-MM-dd"),
      [isArabic ? "المورد" : "Supplier"]: commission.supplier?.name || "-",
      [isArabic ? "قيمة الطلب (ر.س)" : "Order Value (SAR)"]: Number(commission.order_total).toFixed(2),
      [isArabic ? "نسبة عمولة المورد (%)" : "Supplier Rate (%)"]: commission.supplier_rate,
      [isArabic ? "عمولة المورد (ر.س)" : "Supplier Commission (SAR)"]: Number(commission.supplier_commission).toFixed(2),
      [isArabic ? "نسبة عمولة المحمصة (%)" : "Roaster Rate (%)"]: commission.roaster_rate,
      [isArabic ? "عمولة المحمصة (ر.س)" : "Roaster Commission (SAR)"]: Number(commission.roaster_commission).toFixed(2),
      [isArabic ? "إجمالي العمولة (ر.س)" : "Total Commission (SAR)"]: Number(commission.total_commission).toFixed(2),
      [isArabic ? "الحالة" : "Status"]: commission.status === "pending" 
        ? (isArabic ? "معلق" : "Pending") 
        : (isArabic ? "مكتمل" : "Completed"),
    }));

    // Add summary row
    exportData.push({
      [isArabic ? "التاريخ" : "Date"]: isArabic ? "الإجمالي" : "TOTAL",
      [isArabic ? "المورد" : "Supplier"]: "",
      [isArabic ? "قيمة الطلب (ر.س)" : "Order Value (SAR)"]: exportTotalOrderValue.toFixed(2),
      [isArabic ? "نسبة عمولة المورد (%)" : "Supplier Rate (%)"]: "",
      [isArabic ? "عمولة المورد (ر.س)" : "Supplier Commission (SAR)"]: exportTotalSupplier.toFixed(2),
      [isArabic ? "نسبة عمولة المحمصة (%)" : "Roaster Rate (%)"]: "",
      [isArabic ? "عمولة المحمصة (ر.س)" : "Roaster Commission (SAR)"]: exportTotalRoaster.toFixed(2),
      [isArabic ? "إجمالي العمولة (ر.س)" : "Total Commission (SAR)"]: exportTotalCommissions.toFixed(2),
      [isArabic ? "الحالة" : "Status"]: "",
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isArabic ? "العمولات المحددة" : "Selected Commissions");

    // Auto-size columns
    const colWidths = Object.keys(exportData[0]).map((key) => ({
      wch: Math.max(key.length, 15),
    }));
    worksheet["!cols"] = colWidths;

    const fileName = `commissions_selected_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: isArabic ? "تم التصدير" : "Exported",
      description: isArabic 
        ? `تم تصدير ${selectedData.length} عمولة محددة`
        : `Exported ${selectedData.length} selected commissions`,
    });
  };

  // Print selected commissions as PDF
  const handlePrintSelectedPDF = () => {
    if (selectedCommissions.size === 0) {
      toast({
        title: isArabic ? "لا توجد بيانات" : "No data",
        description: isArabic ? "الرجاء تحديد عمولات للطباعة" : "Please select commissions to print",
        variant: "destructive",
      });
      return;
    }

    const selectedData = commissions.filter((c) => selectedCommissions.has(c.id));
    const selectedTotal = selectedData.reduce((sum, c) => sum + Number(c.total_commission), 0);
    const selectedOrderTotal = selectedData.reduce((sum, c) => sum + Number(c.order_total), 0);
    const selectedSupplierTotal = selectedData.reduce((sum, c) => sum + Number(c.supplier_commission), 0);
    const selectedRoasterTotal = selectedData.reduce((sum, c) => sum + Number(c.roaster_commission), 0);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "تعذر فتح نافذة الطباعة" : "Could not open print window",
        variant: "destructive",
      });
      return;
    }

    const reportDate = format(new Date(), "yyyy-MM-dd HH:mm");
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isArabic ? "rtl" : "ltr"}" lang="${isArabic ? "ar" : "en"}">
      <head>
        <meta charset="UTF-8">
        <title>${isArabic ? "تقرير العمولات المحددة" : "Selected Commissions Report"}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            direction: ${isArabic ? "rtl" : "ltr"};
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #8B4513;
          }
          .header h1 {
            color: #8B4513;
            font-size: 24px;
            margin-bottom: 10px;
          }
          .header .date {
            color: #666;
            font-size: 14px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .summary-card {
            background: #f8f5f0;
            border: 1px solid #e0d6c8;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
          }
          .summary-card .label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
          }
          .summary-card .value {
            font-size: 18px;
            font-weight: bold;
            color: #8B4513;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px 8px;
            text-align: ${isArabic ? "right" : "left"};
            font-size: 12px;
          }
          th {
            background: #8B4513;
            color: white;
            font-weight: 600;
          }
          tr:nth-child(even) { background: #f9f9f9; }
          tr:hover { background: #f0f0f0; }
          .status-pending {
            background: #fef3c7;
            color: #92400e;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
          }
          .status-completed {
            background: #d1fae5;
            color: #065f46;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body { padding: 10px; }
            .summary { grid-template-columns: repeat(4, 1fr); }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${isArabic ? "تقرير العمولات المحددة" : "Selected Commissions Report"}</h1>
          <div class="date">${isArabic ? "تاريخ التقرير:" : "Report Date:"} ${reportDate}</div>
        </div>
        
        <div class="summary">
          <div class="summary-card">
            <div class="label">${isArabic ? "عدد العمولات" : "Commissions Count"}</div>
            <div class="value">${selectedData.length}</div>
          </div>
          <div class="summary-card">
            <div class="label">${isArabic ? "إجمالي قيمة الطلبات" : "Total Orders Value"}</div>
            <div class="value">${selectedOrderTotal.toFixed(2)} ${isArabic ? "ر.س" : "SAR"}</div>
          </div>
          <div class="summary-card">
            <div class="label">${isArabic ? "عمولة الموردين" : "Supplier Commission"}</div>
            <div class="value">${selectedSupplierTotal.toFixed(2)} ${isArabic ? "ر.س" : "SAR"}</div>
          </div>
          <div class="summary-card">
            <div class="label">${isArabic ? "إجمالي العمولات" : "Total Commissions"}</div>
            <div class="value">${selectedTotal.toFixed(2)} ${isArabic ? "ر.س" : "SAR"}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${isArabic ? "التاريخ" : "Date"}</th>
              <th>${isArabic ? "المورد" : "Supplier"}</th>
              <th>${isArabic ? "قيمة الطلب" : "Order Value"}</th>
              <th>${isArabic ? "عمولة المورد" : "Supplier Comm."}</th>
              <th>${isArabic ? "عمولة المحمصة" : "Roaster Comm."}</th>
              <th>${isArabic ? "الإجمالي" : "Total"}</th>
              <th>${isArabic ? "الحالة" : "Status"}</th>
            </tr>
          </thead>
          <tbody>
            ${selectedData.map((c, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${format(new Date(c.created_at), "yyyy-MM-dd")}</td>
                <td>${c.supplier?.name || "-"}</td>
                <td>${Number(c.order_total).toFixed(2)}</td>
                <td>${Number(c.supplier_commission).toFixed(2)}</td>
                <td>${Number(c.roaster_commission).toFixed(2)}</td>
                <td>${Number(c.total_commission).toFixed(2)}</td>
                <td><span class="${c.status === "pending" ? "status-pending" : "status-completed"}">${c.status === "pending" ? (isArabic ? "معلق" : "Pending") : (isArabic ? "مكتمل" : "Completed")}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="footer">
          ${isArabic ? "تم إنشاء هذا التقرير بواسطة نظام إدارة العمولات" : "This report was generated by the Commission Management System"}
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);

    toast({
      title: isArabic ? "جاري الطباعة" : "Printing",
      description: isArabic ? "تم فتح نافذة الطباعة" : "Print window opened",
    });
  };

  // Export completed commissions only to Excel
  const handleExportCompletedExcel = () => {
    const completedCommissions = commissions.filter((c) => c.status === "completed");
    
    if (completedCommissions.length === 0) {
      toast({
        title: isArabic ? "لا توجد بيانات" : "No data",
        description: isArabic ? "لا توجد عمولات مكتملة للتصدير" : "No completed commissions to export",
        variant: "destructive",
      });
      return;
    }

    // Calculate totals for completed commissions
    const exportTotalCommissions = completedCommissions.reduce((sum, c) => sum + Number(c.total_commission), 0);
    const exportTotalSupplier = completedCommissions.reduce((sum, c) => sum + Number(c.supplier_commission), 0);
    const exportTotalRoaster = completedCommissions.reduce((sum, c) => sum + Number(c.roaster_commission), 0);
    const exportTotalOrderValue = completedCommissions.reduce((sum, c) => sum + Number(c.order_total), 0);

    const exportData = completedCommissions.map((commission) => ({
      [isArabic ? "التاريخ" : "Date"]: format(new Date(commission.created_at), "yyyy-MM-dd"),
      [isArabic ? "المورد" : "Supplier"]: commission.supplier?.name || "-",
      [isArabic ? "قيمة الطلب (ر.س)" : "Order Value (SAR)"]: Number(commission.order_total).toFixed(2),
      [isArabic ? "نسبة عمولة المورد (%)" : "Supplier Rate (%)"]: commission.supplier_rate,
      [isArabic ? "عمولة المورد (ر.س)" : "Supplier Commission (SAR)"]: Number(commission.supplier_commission).toFixed(2),
      [isArabic ? "نسبة عمولة المحمصة (%)" : "Roaster Rate (%)"]: commission.roaster_rate,
      [isArabic ? "عمولة المحمصة (ر.س)" : "Roaster Commission (SAR)"]: Number(commission.roaster_commission).toFixed(2),
      [isArabic ? "إجمالي العمولة (ر.س)" : "Total Commission (SAR)"]: Number(commission.total_commission).toFixed(2),
    }));

    // Add summary row
    exportData.push({
      [isArabic ? "التاريخ" : "Date"]: isArabic ? "الإجمالي" : "TOTAL",
      [isArabic ? "المورد" : "Supplier"]: "",
      [isArabic ? "قيمة الطلب (ر.س)" : "Order Value (SAR)"]: exportTotalOrderValue.toFixed(2),
      [isArabic ? "نسبة عمولة المورد (%)" : "Supplier Rate (%)"]: "",
      [isArabic ? "عمولة المورد (ر.س)" : "Supplier Commission (SAR)"]: exportTotalSupplier.toFixed(2),
      [isArabic ? "نسبة عمولة المحمصة (%)" : "Roaster Rate (%)"]: "",
      [isArabic ? "عمولة المحمصة (ر.س)" : "Roaster Commission (SAR)"]: exportTotalRoaster.toFixed(2),
      [isArabic ? "إجمالي العمولة (ر.س)" : "Total Commission (SAR)"]: exportTotalCommissions.toFixed(2),
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isArabic ? "العمولات المكتملة" : "Completed Commissions");

    // Auto-size columns
    const colWidths = Object.keys(exportData[0]).map((key) => ({
      wch: Math.max(key.length, 15),
    }));
    worksheet["!cols"] = colWidths;

    const fileName = `completed_commissions_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: isArabic ? "تم التصدير" : "Exported",
      description: isArabic 
        ? `تم تصدير ${completedCommissions.length} عمولة مكتملة`
        : `Exported ${completedCommissions.length} completed commissions`,
    });
  };

  // Export to PDF
  const handleExportPDF = () => {
    const dataToExport = hasActiveFilters ? sortedCommissions : commissions;
    
    if (dataToExport.length === 0) {
      toast({
        title: isArabic ? "لا توجد بيانات" : "No data",
        description: isArabic ? "لا توجد عمولات للتصدير" : "No commissions to export",
        variant: "destructive",
      });
      return;
    }

    // Calculate totals for exported data
    const exportTotalCommissions = dataToExport.reduce((sum, c) => sum + Number(c.total_commission), 0);
    const exportTotalSupplier = dataToExport.reduce((sum, c) => sum + Number(c.supplier_commission), 0);
    const exportTotalRoaster = dataToExport.reduce((sum, c) => sum + Number(c.roaster_commission), 0);
    const exportTotalOrderValue = dataToExport.reduce((sum, c) => sum + Number(c.order_total), 0);

    // Generate supplier breakdown
    const supplierBreakdown: Record<string, { name: string; total: number; count: number }> = {};
    dataToExport.forEach((c) => {
      const supplierId = c.supplier_id;
      const supplierName = c.supplier?.name || (isArabic ? "غير معروف" : "Unknown");
      if (!supplierBreakdown[supplierId]) {
        supplierBreakdown[supplierId] = { name: supplierName, total: 0, count: 0 };
      }
      supplierBreakdown[supplierId].total += Number(c.total_commission);
      supplierBreakdown[supplierId].count += 1;
    });

    const topSuppliers = Object.values(supplierBreakdown)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const formatDate = (date: Date) => format(date, "dd/MM/yyyy", { locale: isArabic ? ar : undefined });
    const now = new Date();

    // Create PDF HTML content
    const pdfContent = `
<!DOCTYPE html>
<html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${isArabic ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; 
      background: #f8fafc; 
      padding: 40px; 
      direction: ${isArabic ? 'rtl' : 'ltr'};
      color: #1e293b;
    }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 40px; text-align: center; }
    .header h1 { font-size: 28px; margin-bottom: 8px; font-weight: 700; }
    .header p { opacity: 0.9; font-size: 16px; }
    .logo { font-size: 32px; margin-bottom: 16px; }
    .content { padding: 40px; }
    .highlight-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px; }
    .highlight-label { font-size: 14px; color: #92400e; margin-bottom: 8px; }
    .highlight-value { font-size: 36px; font-weight: 700; color: #b45309; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .stat-card { background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; color: #1e293b; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
    .stat-card.supplier .stat-value { color: #ea580c; }
    .stat-card.roaster .stat-value { color: #7c3aed; }
    .stat-card.orders .stat-value { color: #2563eb; }
    .stat-card.count .stat-value { color: #16a34a; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    .comparison-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .comparison-card { background: #f8fafc; border-radius: 12px; padding: 20px; }
    .comparison-label { font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .comparison-value { font-size: 20px; font-weight: 700; }
    .comparison-change { font-size: 12px; padding: 4px 8px; border-radius: 20px; display: inline-block; margin-top: 8px; }
    .comparison-change.positive { background: #dcfce7; color: #16a34a; }
    .comparison-change.negative { background: #fee2e2; color: #dc2626; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f1f5f9; padding: 12px 8px; text-align: ${isArabic ? 'right' : 'left'}; font-weight: 600; color: #475569; }
    td { padding: 12px 8px; border-bottom: 1px solid #e2e8f0; }
    tr:last-child td { border-bottom: none; }
    .supplier-list { list-style: none; }
    .supplier-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
    .supplier-item:last-child { border-bottom: none; }
    .supplier-name { font-weight: 500; }
    .supplier-value { color: #4F46E5; font-weight: 700; }
    .footer { background: #f8fafc; padding: 24px; text-align: center; color: #64748b; font-size: 12px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
    .badge-success { background: #dcfce7; color: #16a34a; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    @media print { body { padding: 0; background: white; } .container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">☕</div>
      <h1>${isArabic ? 'تقرير العمولات' : 'Commission Report'}${hasActiveFilters ? (isArabic ? ' (مفلتر)' : ' (Filtered)') : ''}</h1>
      <p>${isArabic ? 'تاريخ التقرير:' : 'Report Date:'} ${formatDate(now)}</p>
    </div>
    
    <div class="content">
      <div class="highlight-box">
        <div class="highlight-label">${isArabic ? 'إجمالي العمولات' : 'Total Commissions'}</div>
        <div class="highlight-value">${exportTotalCommissions.toFixed(2)} ${isArabic ? 'ر.س' : 'SAR'}</div>
      </div>

      <div class="stats-grid">
        <div class="stat-card supplier">
          <div class="stat-value">${exportTotalSupplier.toFixed(2)}</div>
          <div class="stat-label">${isArabic ? 'من الموردين' : 'From Suppliers'}</div>
        </div>
        <div class="stat-card roaster">
          <div class="stat-value">${exportTotalRoaster.toFixed(2)}</div>
          <div class="stat-label">${isArabic ? 'من المحامص' : 'From Roasters'}</div>
        </div>
        <div class="stat-card orders">
          <div class="stat-value">${exportTotalOrderValue.toFixed(0)}</div>
          <div class="stat-label">${isArabic ? 'قيمة الطلبات' : 'Order Value'}</div>
        </div>
        <div class="stat-card count">
          <div class="stat-value">${dataToExport.length}</div>
          <div class="stat-label">${isArabic ? 'عدد العمولات' : 'Commission Count'}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">${isArabic ? 'مقارنة الشهر الحالي بالسابق' : 'Monthly Comparison'}</div>
        <div class="comparison-grid">
          <div class="comparison-card">
            <div class="comparison-label">${isArabic ? 'الشهر الحالي' : 'Current Month'}</div>
            <div class="comparison-value">${detailedStats.current.total.toFixed(2)} ${isArabic ? 'ر.س' : 'SAR'}</div>
            <div class="comparison-change ${detailedStats.changes.total >= 0 ? 'positive' : 'negative'}">
              ${detailedStats.changes.total >= 0 ? '↑' : '↓'} ${Math.abs(detailedStats.changes.total).toFixed(1)}%
            </div>
          </div>
          <div class="comparison-card">
            <div class="comparison-label">${isArabic ? 'الشهر السابق' : 'Previous Month'}</div>
            <div class="comparison-value">${detailedStats.previous.total.toFixed(2)} ${isArabic ? 'ر.س' : 'SAR'}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">${isArabic ? 'إحصائيات تفصيلية' : 'Detailed Statistics'}</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${detailedStats.overall.avgCommission.toFixed(2)}</div>
            <div class="stat-label">${isArabic ? 'متوسط العمولة' : 'Avg Commission'}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: #16a34a;">${detailedStats.overall.maxCommission.toFixed(2)}</div>
            <div class="stat-label">${isArabic ? 'أعلى عمولة' : 'Max Commission'}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: #dc2626;">${detailedStats.overall.minCommission.toFixed(2)}</div>
            <div class="stat-label">${isArabic ? 'أقل عمولة' : 'Min Commission'}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: #7c3aed;">${detailedStats.overall.commissionRate.toFixed(2)}%</div>
            <div class="stat-label">${isArabic ? 'نسبة العمولة' : 'Commission Rate'}</div>
          </div>
        </div>
      </div>

      ${topSuppliers.length > 0 ? `
      <div class="section">
        <div class="section-title">${isArabic ? 'أعلى الموردين من حيث العمولات' : 'Top Suppliers by Commission'}</div>
        <ul class="supplier-list">
          ${topSuppliers.map((s, i) => `
            <li class="supplier-item">
              <span class="supplier-name">${i + 1}. ${s.name} (${s.count} ${isArabic ? 'عمولة' : 'comm.'})</span>
              <span class="supplier-value">${s.total.toFixed(2)} ${isArabic ? 'ر.س' : 'SAR'}</span>
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">${isArabic ? 'سجل العمولات' : 'Commission Log'} (${dataToExport.length})</div>
        <table>
          <thead>
            <tr>
              <th>${isArabic ? 'التاريخ' : 'Date'}</th>
              <th>${isArabic ? 'المورد' : 'Supplier'}</th>
              <th>${isArabic ? 'قيمة الطلب' : 'Order Value'}</th>
              <th>${isArabic ? 'العمولة' : 'Commission'}</th>
              <th>${isArabic ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            ${dataToExport.slice(0, 50).map((c) => `
              <tr>
                <td>${formatDate(new Date(c.created_at))}</td>
                <td>${c.supplier?.name || '-'}</td>
                <td>${Number(c.order_total).toFixed(2)}</td>
                <td style="font-weight: 600; color: #16a34a;">${Number(c.total_commission).toFixed(2)}</td>
                <td>
                  <span class="badge ${c.status === 'pending' ? 'badge-pending' : 'badge-success'}">
                    ${c.status === 'pending' ? (isArabic ? 'معلق' : 'Pending') : (isArabic ? 'مكتمل' : 'Completed')}
                  </span>
                </td>
              </tr>
            `).join('')}
            ${dataToExport.length > 50 ? `
              <tr>
                <td colspan="5" style="text-align: center; color: #64748b; padding: 16px;">
                  ${isArabic ? `... و ${dataToExport.length - 50} عمولة أخرى` : `... and ${dataToExport.length - 50} more commissions`}
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer">
      <p>${isArabic ? 'تم إنشاء هذا التقرير تلقائياً من منصة دال' : 'This report was automatically generated by Dal Platform'} ☕</p>
      <p style="margin-top: 8px;">${formatDate(now)} - ${format(now, 'HH:mm')}</p>
    </div>
  </div>
</body>
</html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }

    toast({
      title: isArabic ? "تم فتح التقرير" : "Report Opened",
      description: hasActiveFilters 
        ? (isArabic ? `تقرير ${dataToExport.length} عمولة مفلترة` : `Report with ${dataToExport.length} filtered commissions`)
        : (isArabic ? "يمكنك طباعة التقرير أو حفظه كـ PDF" : "You can print or save as PDF"),
    });
  };

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
        {/* Back Button and Actions */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            {isArabic ? "العودة للوحة الإدارة" : "Back to Admin Panel"}
          </Button>

          {/* Weekly Report Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => navigate("/commission-notification-logs")}
              className="gap-2"
            >
              <Bell className="w-4 h-4" />
              {isArabic ? "سجل الإشعارات" : "Notification Logs"}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/commission-reports")}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              {isArabic ? "سجل التقارير" : "Reports History"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSendWeeklyReport(true)}
              disabled={isSendingReport}
              className="gap-2"
            >
              {isSendingReport ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isArabic ? "إرسال تقرير تجريبي" : "Send Test Report"}
            </Button>
            <Button
              onClick={() => handleSendWeeklyReport(false)}
              disabled={isSendingReport}
              className="gap-2"
            >
              {isSendingReport ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {isArabic ? "إرسال التقرير الأسبوعي" : "Send Weekly Report"}
            </Button>
          </div>
        </div>

        {/* Status-Based Statistics Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Completed Commissions Card */}
          <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                {isArabic ? "العمولات المكتملة" : "Completed Commissions"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-green-100/50 dark:bg-green-900/30">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {statusStats.completed.count}
                  </p>
                  <p className="text-xs text-green-600/70 dark:text-green-400/70">
                    {isArabic ? "عدد العمولات" : "Count"}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-100/50 dark:bg-green-900/30">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {statusStats.completed.total.toFixed(2)}
                  </p>
                  <p className="text-xs text-green-600/70 dark:text-green-400/70">
                    {isArabic ? "إجمالي العمولة (ر.س)" : "Total (SAR)"}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-100/50 dark:bg-green-900/30">
                  <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                    {statusStats.completed.supplier.toFixed(2)}
                  </p>
                  <p className="text-xs text-green-600/70 dark:text-green-400/70">
                    {isArabic ? "عمولة الموردين" : "Supplier Comm."}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-100/50 dark:bg-green-900/30">
                  <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                    {statusStats.completed.roaster.toFixed(2)}
                  </p>
                  <p className="text-xs text-green-600/70 dark:text-green-400/70">
                    {isArabic ? "عمولة المحامص" : "Roaster Comm."}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600/70 dark:text-green-400/70">
                    {isArabic ? "قيمة الطلبات" : "Order Value"}
                  </span>
                  <span className="font-bold text-green-700 dark:text-green-400">
                    {statusStats.completed.orderValue.toFixed(2)} SAR
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Commissions Card */}
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <ClockIcon className="w-5 h-5" />
                {isArabic ? "العمولات المعلقة" : "Pending Commissions"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-amber-100/50 dark:bg-amber-900/30">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {statusStats.pending.count}
                  </p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                    {isArabic ? "عدد العمولات" : "Count"}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-100/50 dark:bg-amber-900/30">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {statusStats.pending.total.toFixed(2)}
                  </p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                    {isArabic ? "إجمالي العمولة (ر.س)" : "Total (SAR)"}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-100/50 dark:bg-amber-900/30">
                  <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                    {statusStats.pending.supplier.toFixed(2)}
                  </p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                    {isArabic ? "عمولة الموردين" : "Supplier Comm."}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-100/50 dark:bg-amber-900/30">
                  <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                    {statusStats.pending.roaster.toFixed(2)}
                  </p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                    {isArabic ? "عمولة المحامص" : "Roaster Comm."}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-amber-600/70 dark:text-amber-400/70">
                    {isArabic ? "قيمة الطلبات" : "Order Value"}
                  </span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    {statusStats.pending.orderValue.toFixed(2)} SAR
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Distribution Pie Chart */}
        {commissions.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {isArabic ? "توزيع حالة العمولات" : "Commission Status Distribution"}
              </CardTitle>
              <CardDescription>
                {isArabic
                  ? "نسبة العمولات المكتملة مقابل المعلقة"
                  : "Ratio of completed vs pending commissions"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Pie Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { 
                            name: isArabic ? "مكتملة" : "Completed", 
                            value: statusStats.completed.count,
                            total: statusStats.completed.total
                          },
                          { 
                            name: isArabic ? "معلقة" : "Pending", 
                            value: statusStats.pending.count,
                            total: statusStats.pending.total
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        <Cell fill="hsl(142, 76%, 36%)" />
                        <Cell fill="hsl(38, 92%, 50%)" />
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string, props: any) => [
                          `${value} ${isArabic ? "عمولة" : "commissions"} (${props.payload.total.toFixed(2)} SAR)`,
                          name
                        ]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend and Summary */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                    <div className="w-4 h-4 rounded-full bg-green-500" />
                    <div className="flex-1">
                      <p className="font-medium text-green-700 dark:text-green-400">
                        {isArabic ? "مكتملة" : "Completed"}
                      </p>
                      <p className="text-sm text-green-600/70 dark:text-green-400/70">
                        {statusStats.completed.count} {isArabic ? "عمولة" : "commissions"} • {statusStats.completed.total.toFixed(2)} SAR
                      </p>
                    </div>
                    <span className="text-lg font-bold text-green-700 dark:text-green-400">
                      {commissions.length > 0 
                        ? ((statusStats.completed.count / commissions.length) * 100).toFixed(1) 
                        : 0}%
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                    <div className="w-4 h-4 rounded-full bg-amber-500" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        {isArabic ? "معلقة" : "Pending"}
                      </p>
                      <p className="text-sm text-amber-600/70 dark:text-amber-400/70">
                        {statusStats.pending.count} {isArabic ? "عمولة" : "commissions"} • {statusStats.pending.total.toFixed(2)} SAR
                      </p>
                    </div>
                    <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                      {commissions.length > 0 
                        ? ((statusStats.pending.count / commissions.length) * 100).toFixed(1) 
                        : 0}%
                    </span>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        {isArabic ? "إجمالي العمولات" : "Total Commissions"}
                      </span>
                      <span className="font-bold">
                        {commissions.length} ({(statusStats.completed.total + statusStats.pending.total).toFixed(2)} SAR)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" />
              {isArabic ? "إعدادات نسب العمولة" : "Commission Rate Settings"}
            </CardTitle>
            <CardDescription>
              {isArabic
                ? "حدد نسبة العمولة التي تأخذها من كل طرف عند إتمام الطلبات"
                : "Set the commission percentage you take from each party when orders are completed"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="supplierRate">
                  {isArabic ? "عمولة المورد (%)" : "Supplier Commission (%)"}
                </Label>
                <Input
                  id="supplierRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={supplierRate}
                  onChange={(e) => setSupplierRate(e.target.value)}
                  placeholder="5.00"
                />
                <p className="text-sm text-muted-foreground">
                  {isArabic
                    ? "النسبة المخصومة من المورد عند تسليم الطلب"
                    : "Percentage deducted from supplier on order delivery"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="roasterRate">
                  {isArabic ? "عمولة المحمصة (%)" : "Roaster Commission (%)"}
                </Label>
                <Input
                  id="roasterRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={roasterRate}
                  onChange={(e) => setRoasterRate(e.target.value)}
                  placeholder="5.00"
                />
                <p className="text-sm text-muted-foreground">
                  {isArabic
                    ? "النسبة المخصومة من المحمصة عند تسليم الطلب"
                    : "Percentage deducted from roaster on order delivery"}
                </p>
              </div>
            </div>
            <Button onClick={handleSaveSettings} disabled={isSaving} className="mt-6">
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Save className="w-4 h-4 ml-2" />
              )}
              {isArabic ? "حفظ الإعدادات" : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* Report Scheduling Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {isArabic ? "جدولة التقارير التلقائية" : "Automatic Report Scheduling"}
            </CardTitle>
            <CardDescription>
              {isArabic
                ? "إعداد إرسال تقارير العمولات الأسبوعية تلقائياً عبر البريد الإلكتروني"
                : "Set up automatic weekly commission report emails"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Enable toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {isArabic ? "تفعيل التقارير الأسبوعية" : "Enable Weekly Reports"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isArabic
                        ? "إرسال تقرير العمولات تلقائياً كل أسبوع"
                        : "Automatically send commission report every week"}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={reportEnabled}
                  onChange={(e) => setReportEnabled(e.target.checked)}
                  className="w-5 h-5 accent-primary"
                />
              </div>

              {reportEnabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Day selection */}
                    <div className="space-y-2">
                      <Label htmlFor="reportDay">
                        {isArabic ? "يوم الإرسال" : "Send Day"}
                      </Label>
                      <Select value={String(reportDay)} onValueChange={(v) => setReportDay(Number(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">{isArabic ? "الأحد" : "Sunday"}</SelectItem>
                          <SelectItem value="1">{isArabic ? "الإثنين" : "Monday"}</SelectItem>
                          <SelectItem value="2">{isArabic ? "الثلاثاء" : "Tuesday"}</SelectItem>
                          <SelectItem value="3">{isArabic ? "الأربعاء" : "Wednesday"}</SelectItem>
                          <SelectItem value="4">{isArabic ? "الخميس" : "Thursday"}</SelectItem>
                          <SelectItem value="5">{isArabic ? "الجمعة" : "Friday"}</SelectItem>
                          <SelectItem value="6">{isArabic ? "السبت" : "Saturday"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Hour selection */}
                    <div className="space-y-2">
                      <Label htmlFor="reportHour">
                        {isArabic ? "ساعة الإرسال" : "Send Hour"}
                      </Label>
                      <Select value={String(reportHour)} onValueChange={(v) => setReportHour(Number(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {i.toString().padStart(2, "0")}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Timezone selection */}
                    <div className="space-y-2">
                      <Label htmlFor="reportTimezone">
                        {isArabic ? "المنطقة الزمنية" : "Timezone"}
                      </Label>
                      <Select value={reportTimezone} onValueChange={setReportTimezone}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Riyadh">{isArabic ? "الرياض" : "Riyadh"}</SelectItem>
                          <SelectItem value="Asia/Dubai">{isArabic ? "دبي" : "Dubai"}</SelectItem>
                          <SelectItem value="Asia/Kuwait">{isArabic ? "الكويت" : "Kuwait"}</SelectItem>
                          <SelectItem value="Asia/Qatar">{isArabic ? "قطر" : "Qatar"}</SelectItem>
                          <SelectItem value="Africa/Cairo">{isArabic ? "القاهرة" : "Cairo"}</SelectItem>
                          <SelectItem value="Europe/London">{isArabic ? "لندن" : "London"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Email override */}
                  <div className="space-y-2">
                    <Label htmlFor="reportEmail">
                      {isArabic ? "بريد إلكتروني بديل (اختياري)" : "Override Email (Optional)"}
                    </Label>
                    <Input
                      id="reportEmail"
                      type="email"
                      value={reportEmail}
                      onChange={(e) => setReportEmail(e.target.value)}
                      placeholder={isArabic ? "اتركه فارغاً لاستخدام بريدك الأساسي" : "Leave empty to use your primary email"}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveReportSettings} disabled={isSavingReport}>
                  {isSavingReport ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Save className="w-4 h-4 ml-2" />
                  )}
                  {isArabic ? "حفظ الإعدادات" : "Save Settings"}
                </Button>
                {reportEnabled && (
                  <Button variant="outline" onClick={handleTestScheduledReport} disabled={isTestingReport}>
                    {isTestingReport ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    ) : (
                      <Send className="w-4 h-4 ml-2" />
                    )}
                    {isArabic ? "إرسال تجريبي" : "Send Test"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commission Threshold Alert Card */}
        <Card className="mb-8 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Bell className="w-5 h-5" />
              {isArabic ? "إشعار تلقائي عند وصول العمولات لحد معين" : "Commission Threshold Alert"}
            </CardTitle>
            <CardDescription>
              {isArabic
                ? "احصل على إشعار عندما تتجاوز العمولات حداً معيناً"
                : "Get notified when commissions exceed a certain threshold"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Enable toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-medium">
                      {isArabic ? "تفعيل إشعارات الحد" : "Enable Threshold Alerts"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isArabic
                        ? "إرسال إشعار عند تجاوز العمولات للحد المحدد"
                        : "Send notification when commissions exceed the threshold"}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={thresholdEnabled}
                  onChange={(e) => setThresholdEnabled(e.target.checked)}
                  className="w-5 h-5 accent-amber-600"
                />
              </div>

              {thresholdEnabled && (
                <>
                  {/* Threshold value */}
                  <div className="space-y-2">
                    <Label htmlFor="thresholdValue">
                      {isArabic ? "الحد الأدنى للإشعار (ر.س)" : "Threshold Value (SAR)"}
                    </Label>
                    <Input
                      id="thresholdValue"
                      type="number"
                      min="0"
                      step="100"
                      value={thresholdValue}
                      onChange={(e) => setThresholdValue(e.target.value)}
                      placeholder="1000"
                      className="max-w-xs"
                    />
                    <p className="text-sm text-muted-foreground">
                      {isArabic
                        ? "سيتم إرسال إشعار عند تجاوز هذا المبلغ"
                        : "You will be notified when this amount is exceeded"}
                    </p>
                  </div>

                  {/* Notification options */}
                  <div className="space-y-3">
                    <Label>{isArabic ? "نوع الإشعار" : "Notification Type"}</Label>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <input
                        type="checkbox"
                        id="notifyOnEach"
                        checked={notifyOnEachCommission}
                        onChange={(e) => setNotifyOnEachCommission(e.target.checked)}
                        className="w-4 h-4 accent-amber-600"
                      />
                      <div>
                        <label htmlFor="notifyOnEach" className="font-medium cursor-pointer">
                          {isArabic ? "إشعار عند كل عمولة كبيرة" : "Notify on each large commission"}
                        </label>
                        <p className="text-sm text-muted-foreground">
                          {isArabic
                            ? "إشعار عندما تتجاوز عمولة واحدة الحد المحدد"
                            : "Get notified when a single commission exceeds the threshold"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <input
                        type="checkbox"
                        id="notifyOnTotal"
                        checked={notifyOnTotalReached}
                        onChange={(e) => setNotifyOnTotalReached(e.target.checked)}
                        className="w-4 h-4 accent-amber-600"
                      />
                      <div>
                        <label htmlFor="notifyOnTotal" className="font-medium cursor-pointer">
                          {isArabic ? "إشعار عند وصول الإجمالي للحد" : "Notify when total reaches threshold"}
                        </label>
                        <p className="text-sm text-muted-foreground">
                          {isArabic
                            ? "إشعار مرة واحدة عندما يتجاوز إجمالي العمولات الحد المحدد"
                            : "Get notified once when total commissions exceed the threshold"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Email notification option */}
                  <div className="space-y-3 p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="emailAlertEnabled"
                        checked={emailAlertEnabled}
                        onChange={(e) => setEmailAlertEnabled(e.target.checked)}
                        className="w-4 h-4 accent-amber-600"
                      />
                      <div>
                        <label htmlFor="emailAlertEnabled" className="font-medium cursor-pointer flex items-center gap-2">
                          <Mail className="w-4 h-4 text-amber-600" />
                          {isArabic ? "إرسال إشعار عبر البريد الإلكتروني" : "Send email notification"}
                        </label>
                        <p className="text-sm text-muted-foreground">
                          {isArabic
                            ? "إرسال بريد إلكتروني بالإضافة للإشعار داخل التطبيق"
                            : "Send an email in addition to in-app notification"}
                        </p>
                      </div>
                    </div>
                    
                    {emailAlertEnabled && (
                      <div className="space-y-2 mt-3">
                        <Label htmlFor="emailAlertAddress">
                          {isArabic ? "عنوان البريد الإلكتروني (اختياري)" : "Email Address (optional)"}
                        </Label>
                        <Input
                          id="emailAlertAddress"
                          type="email"
                          value={emailAlertAddress}
                          onChange={(e) => setEmailAlertAddress(e.target.value)}
                          placeholder={isArabic ? "اتركه فارغاً لاستخدام بريدك الأساسي" : "Leave empty to use your primary email"}
                          className="max-w-md"
                        />
                      </div>
                    )}
                  </div>

                  {/* Push notification option */}
                  <div className="space-y-3 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="pushAlertEnabled"
                        checked={pushAlertEnabled}
                        onChange={async (e) => {
                          if (e.target.checked) {
                            const granted = await requestPushPermission();
                            if (!granted) {
                              toast({
                                title: isArabic ? "تحذير" : "Warning",
                                description: isArabic 
                                  ? "لم يتم منح إذن الإشعارات. يرجى السماح بالإشعارات في إعدادات المتصفح"
                                  : "Notification permission not granted. Please allow notifications in browser settings",
                                variant: "destructive",
                              });
                              return;
                            }
                          }
                          setPushAlertEnabled(e.target.checked);
                        }}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <div>
                        <label htmlFor="pushAlertEnabled" className="font-medium cursor-pointer flex items-center gap-2">
                          <Bell className="w-4 h-4 text-blue-600" />
                          {isArabic ? "إشعارات Push للمتصفح" : "Browser Push Notifications"}
                        </label>
                        <p className="text-sm text-muted-foreground">
                          {isArabic
                            ? "إرسال إشعار Push حتى لو كان التطبيق مغلقاً"
                            : "Send push notification even if the app is closed"}
                        </p>
                      </div>
                    </div>
                    
                    {!("Notification" in window) && (
                      <p className="text-sm text-amber-600">
                        {isArabic 
                          ? "المتصفح لا يدعم إشعارات Push"
                          : "Your browser does not support Push notifications"}
                      </p>
                    )}
                    
                    {("Notification" in window) && Notification.permission === "denied" && (
                      <p className="text-sm text-red-600">
                        {isArabic 
                          ? "تم حظر الإشعارات. يرجى تفعيلها من إعدادات المتصفح"
                          : "Notifications are blocked. Please enable them in browser settings"}
                      </p>
                    )}
                  </div>

                  {/* Current progress indicator */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">
                        {isArabic ? "التقدم نحو الحد" : "Progress to Threshold"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {totalCommissions.toFixed(2)} / {thresholdValue} SAR
                      </span>
                    </div>
                    <div className="h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-600 transition-all duration-500"
                        style={{ width: `${Math.min((totalCommissions / parseFloat(thresholdValue || "1")) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalCommissions >= parseFloat(thresholdValue || "0")
                        ? (isArabic ? "✅ تم الوصول للحد!" : "✅ Threshold reached!")
                        : (isArabic 
                            ? `${((totalCommissions / parseFloat(thresholdValue || "1")) * 100).toFixed(1)}% من الحد المحدد`
                            : `${((totalCommissions / parseFloat(thresholdValue || "1")) * 100).toFixed(1)}% of threshold`)}
                    </p>
                  </div>

                  {/* Success Rate Alert Section */}
                  <div className="space-y-4 p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="successRateAlertEnabled"
                        checked={successRateAlertEnabled}
                        onChange={(e) => setSuccessRateAlertEnabled(e.target.checked)}
                        className="w-4 h-4 accent-amber-600"
                      />
                      <div>
                        <label htmlFor="successRateAlertEnabled" className="font-medium cursor-pointer flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-amber-600" />
                          {isArabic ? "تنبيه انخفاض نسبة النجاح" : "Low Success Rate Alert"}
                        </label>
                        <p className="text-sm text-muted-foreground">
                          {isArabic
                            ? "تنبيه تلقائي عند انخفاض نسبة نجاح الإشعارات"
                            : "Alert when notification success rate drops below threshold"}
                        </p>
                      </div>
                    </div>
                    
                    {successRateAlertEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div className="space-y-2">
                          <Label htmlFor="successRateThreshold">
                            {isArabic ? "حد نسبة النجاح (%)" : "Success Rate Threshold (%)"}
                          </Label>
                          <Input
                            id="successRateThreshold"
                            type="number"
                            min="1"
                            max="100"
                            value={successRateThreshold}
                            onChange={(e) => setSuccessRateThreshold(e.target.value)}
                            placeholder="80"
                            className="bg-background"
                          />
                          <p className="text-xs text-muted-foreground">
                            {isArabic 
                              ? "سيتم إرسال تنبيه إذا انخفضت النسبة عن هذا الحد" 
                              : "Alert will be sent if rate falls below this threshold"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="successRateCheckPeriod">
                            {isArabic ? "فترة الفحص" : "Check Period"}
                          </Label>
                          <Select
                            value={successRateCheckPeriod}
                            onValueChange={(v) => setSuccessRateCheckPeriod(v as "daily" | "weekly")}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">
                                {isArabic ? "يومي" : "Daily"}
                              </SelectItem>
                              <SelectItem value="weekly">
                                {isArabic ? "أسبوعي" : "Weekly"}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {isArabic 
                              ? "الفترة الزمنية لحساب نسبة النجاح" 
                              : "Time period for calculating success rate"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Auto Retry Section */}
                  <div className="space-y-4 p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="autoRetryEnabled"
                        checked={autoRetryEnabled}
                        onChange={(e) => setAutoRetryEnabled(e.target.checked)}
                        className="w-4 h-4 accent-green-600"
                      />
                      <div>
                        <label htmlFor="autoRetryEnabled" className="font-medium cursor-pointer flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-green-600" />
                          {isArabic ? "إعادة المحاولة التلقائية" : "Auto Retry Failed Notifications"}
                        </label>
                        <p className="text-sm text-muted-foreground">
                          {isArabic
                            ? "إعادة محاولة إرسال الإشعارات الفاشلة تلقائياً"
                            : "Automatically retry sending failed notifications"}
                        </p>
                      </div>
                    </div>
                    
                    {autoRetryEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div className="space-y-2">
                          <Label htmlFor="autoRetryMaxAttempts">
                            {isArabic ? "الحد الأقصى للمحاولات" : "Max Retry Attempts"}
                          </Label>
                          <Input
                            id="autoRetryMaxAttempts"
                            type="number"
                            min="1"
                            max="10"
                            value={autoRetryMaxAttempts}
                            onChange={(e) => setAutoRetryMaxAttempts(e.target.value)}
                            placeholder="3"
                            className="bg-background"
                          />
                          <p className="text-xs text-muted-foreground">
                            {isArabic 
                              ? "عدد مرات إعادة المحاولة قبل التوقف" 
                              : "Number of retry attempts before giving up"}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="autoRetryDelayMinutes">
                            {isArabic ? "التأخير بين المحاولات (دقائق)" : "Delay Between Retries (minutes)"}
                          </Label>
                          <Input
                            id="autoRetryDelayMinutes"
                            type="number"
                            min="1"
                            max="60"
                            value={autoRetryDelayMinutes}
                            onChange={(e) => setAutoRetryDelayMinutes(e.target.value)}
                            placeholder="5"
                            className="bg-background"
                          />
                          <p className="text-xs text-muted-foreground">
                            {isArabic 
                              ? "الوقت بين كل محاولة وأخرى" 
                              : "Time between each retry attempt"}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRetryAllFailed}
                      disabled={isRetrying}
                      className="gap-2 mt-2"
                    >
                      {isRetrying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      {isArabic ? "إعادة محاولة جميع الفاشلة الآن" : "Retry All Failed Now"}
                    </Button>
                  </div>
                  
                  {/* Weekly Success Rate Report Section */}
                  <div className="space-y-4 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="weeklyReportEnabled"
                        checked={weeklyReportEnabled}
                        onChange={(e) => setWeeklyReportEnabled(e.target.checked)}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <div>
                        <label htmlFor="weeklyReportEnabled" className="font-medium cursor-pointer flex items-center gap-2">
                          <Mail className="w-4 h-4 text-blue-600" />
                          {isArabic ? "تقرير نسبة النجاح الأسبوعي" : "Weekly Success Rate Report"}
                        </label>
                        <p className="text-sm text-muted-foreground">
                          {isArabic
                            ? "إرسال تقرير أسبوعي بنسبة نجاح الإشعارات عبر البريد الإلكتروني"
                            : "Send weekly email report with notification success rate"}
                        </p>
                      </div>
                    </div>
                    
                    {weeklyReportEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div className="space-y-2">
                          <Label htmlFor="weeklyReportDay">
                            {isArabic ? "يوم الإرسال" : "Report Day"}
                          </Label>
                          <Select
                            value={weeklyReportDay.toString()}
                            onValueChange={(v) => setWeeklyReportDay(parseInt(v))}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">{isArabic ? "الأحد" : "Sunday"}</SelectItem>
                              <SelectItem value="1">{isArabic ? "الاثنين" : "Monday"}</SelectItem>
                              <SelectItem value="2">{isArabic ? "الثلاثاء" : "Tuesday"}</SelectItem>
                              <SelectItem value="3">{isArabic ? "الأربعاء" : "Wednesday"}</SelectItem>
                              <SelectItem value="4">{isArabic ? "الخميس" : "Thursday"}</SelectItem>
                              <SelectItem value="5">{isArabic ? "الجمعة" : "Friday"}</SelectItem>
                              <SelectItem value="6">{isArabic ? "السبت" : "Saturday"}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="weeklyReportHour">
                            {isArabic ? "ساعة الإرسال" : "Report Hour"}
                          </Label>
                          <Select
                            value={weeklyReportHour.toString()}
                            onValueChange={(v) => setWeeklyReportHour(parseInt(v))}
                          >
                            <SelectTrigger className="bg-background">
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
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSendTestWeeklyReport}
                      disabled={isSendingWeeklyReport}
                      className="gap-2 mt-2"
                    >
                      {isSendingWeeklyReport ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      {isArabic ? "إرسال تقرير تجريبي الآن" : "Send Test Report Now"}
                    </Button>
                  </div>
                </>
              )}

              <Button onClick={handleSaveThresholdSettings} className="gap-2">
                <Save className="w-4 h-4" />
                {isArabic ? "حفظ إعدادات الإشعار" : "Save Alert Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{totalCommissions.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "إجمالي العمولات" : "Total Commissions"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{totalOrderValue.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "قيمة الطلبات" : "Order Value"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">{totalSupplierCommissions.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "من الموردين" : "From Suppliers"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{totalRoasterCommissions.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "من المحامص" : "From Roasters"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Comparison Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {isArabic ? "مقارنة الشهر الحالي بالسابق" : "Current vs Previous Month"}
            </CardTitle>
            <CardDescription>
              {isArabic
                ? `مقارنة أداء ${format(new Date(), "MMMM yyyy", { locale: ar })} مع ${format(subMonths(new Date(), 1), "MMMM yyyy", { locale: ar })}`
                : `Comparing ${format(new Date(), "MMMM yyyy")} with ${format(subMonths(new Date(), 1), "MMMM yyyy")}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Current Month Total */}
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {isArabic ? "إجمالي العمولات" : "Total Commission"}
                  </span>
                  {detailedStats.changes.total !== 0 && (
                    <Badge variant={detailedStats.changes.total > 0 ? "default" : "destructive"} className="text-xs">
                      {detailedStats.changes.total > 0 ? <ArrowUpRight className="w-3 h-3 ml-1" /> : <ArrowDownRight className="w-3 h-3 ml-1" />}
                      {Math.abs(detailedStats.changes.total).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-xl font-bold">{detailedStats.current.total.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">SAR</span></p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isArabic ? "الشهر السابق:" : "Previous:"} {detailedStats.previous.total.toFixed(2)}
                </p>
              </div>

              {/* Current Month Supplier */}
              <div className="p-4 rounded-lg bg-orange-500/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {isArabic ? "من الموردين" : "From Suppliers"}
                  </span>
                  {detailedStats.changes.supplier !== 0 && (
                    <Badge variant={detailedStats.changes.supplier > 0 ? "default" : "destructive"} className="text-xs">
                      {detailedStats.changes.supplier > 0 ? <ArrowUpRight className="w-3 h-3 ml-1" /> : <ArrowDownRight className="w-3 h-3 ml-1" />}
                      {Math.abs(detailedStats.changes.supplier).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-xl font-bold text-orange-600">{detailedStats.current.supplier.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">SAR</span></p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isArabic ? "الشهر السابق:" : "Previous:"} {detailedStats.previous.supplier.toFixed(2)}
                </p>
              </div>

              {/* Current Month Roaster */}
              <div className="p-4 rounded-lg bg-purple-500/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {isArabic ? "من المحامص" : "From Roasters"}
                  </span>
                  {detailedStats.changes.roaster !== 0 && (
                    <Badge variant={detailedStats.changes.roaster > 0 ? "default" : "destructive"} className="text-xs">
                      {detailedStats.changes.roaster > 0 ? <ArrowUpRight className="w-3 h-3 ml-1" /> : <ArrowDownRight className="w-3 h-3 ml-1" />}
                      {Math.abs(detailedStats.changes.roaster).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-xl font-bold text-purple-600">{detailedStats.current.roaster.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">SAR</span></p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isArabic ? "الشهر السابق:" : "Previous:"} {detailedStats.previous.roaster.toFixed(2)}
                </p>
              </div>

              {/* Order Value */}
              <div className="p-4 rounded-lg bg-blue-500/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {isArabic ? "قيمة الطلبات" : "Order Value"}
                  </span>
                  {detailedStats.changes.orderValue !== 0 && (
                    <Badge variant={detailedStats.changes.orderValue > 0 ? "default" : "destructive"} className="text-xs">
                      {detailedStats.changes.orderValue > 0 ? <ArrowUpRight className="w-3 h-3 ml-1" /> : <ArrowDownRight className="w-3 h-3 ml-1" />}
                      {Math.abs(detailedStats.changes.orderValue).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-xl font-bold text-blue-600">{detailedStats.current.orderValue.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">SAR</span></p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isArabic ? "الشهر السابق:" : "Previous:"} {detailedStats.previous.orderValue.toFixed(2)}
                </p>
              </div>

              {/* Commission Count */}
              <div className="p-4 rounded-lg bg-green-500/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {isArabic ? "عدد العمولات" : "Commission Count"}
                  </span>
                  {detailedStats.changes.count !== 0 && (
                    <Badge variant={detailedStats.changes.count > 0 ? "default" : "destructive"} className="text-xs">
                      {detailedStats.changes.count > 0 ? <ArrowUpRight className="w-3 h-3 ml-1" /> : <ArrowDownRight className="w-3 h-3 ml-1" />}
                      {Math.abs(detailedStats.changes.count).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-xl font-bold text-green-600">{detailedStats.current.count}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isArabic ? "الشهر السابق:" : "Previous:"} {detailedStats.previous.count}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Statistics */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "متوسط العمولة" : "Avg Commission"}
                  </p>
                  <p className="text-lg font-bold">{detailedStats.overall.avgCommission.toFixed(2)} SAR</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "أعلى عمولة" : "Max Commission"}
                  </p>
                  <p className="text-lg font-bold text-green-600">{detailedStats.overall.maxCommission.toFixed(2)} SAR</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "أقل عمولة" : "Min Commission"}
                  </p>
                  <p className="text-lg font-bold text-red-600">{detailedStats.overall.minCommission.toFixed(2)} SAR</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Percent className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "نسبة العمولة الفعلية" : "Effective Rate"}
                  </p>
                  <p className="text-lg font-bold text-purple-600">{detailedStats.overall.commissionRate.toFixed(2)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Supplier Commission Pie Chart */}
        {commissions.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {isArabic ? "توزيع العمولات حسب المورد" : "Commission Distribution by Supplier"}
              </CardTitle>
              <CardDescription>
                {isArabic
                  ? "رسم دائري يوضح نسبة كل مورد من إجمالي العمولات"
                  : "Pie chart showing each supplier's share of total commissions"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(() => {
                        const supplierTotals: { [key: string]: { name: string; value: number } } = {};
                        commissions.forEach((c) => {
                          const supplierId = c.supplier_id;
                          const supplierName = c.supplier?.name || (isArabic ? "غير معروف" : "Unknown");
                          if (!supplierTotals[supplierId]) {
                            supplierTotals[supplierId] = { name: supplierName, value: 0 };
                          }
                          supplierTotals[supplierId].value += Number(c.total_commission);
                        });
                        return Object.values(supplierTotals)
                          .sort((a, b) => b.value - a.value)
                          .slice(0, 8);
                      })()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(() => {
                        const COLORS = [
                          "hsl(25, 95%, 53%)",
                          "hsl(271, 91%, 65%)",
                          "hsl(142, 76%, 36%)",
                          "hsl(221, 83%, 53%)",
                          "hsl(0, 84%, 60%)",
                          "hsl(45, 93%, 47%)",
                          "hsl(180, 70%, 45%)",
                          "hsl(300, 70%, 50%)",
                        ];
                        const supplierTotals: { [key: string]: number } = {};
                        commissions.forEach((c) => {
                          if (!supplierTotals[c.supplier_id]) {
                            supplierTotals[c.supplier_id] = 0;
                          }
                          supplierTotals[c.supplier_id] += Number(c.total_commission);
                        });
                        const sortedSuppliers = Object.entries(supplierTotals)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 8);
                        return sortedSuppliers.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ));
                      })()}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(2)} SAR`, isArabic ? "العمولة" : "Commission"]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Commission Line Chart - Current Month */}
        {commissions.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {isArabic ? "تطور العمولات اليومية - الشهر الحالي" : "Daily Commission Trend - Current Month"}
              </CardTitle>
              <CardDescription>
                {isArabic
                  ? `رسم خطي يوضح العمولات المحصلة يومياً خلال ${format(new Date(), "MMMM yyyy", { locale: ar })}`
                  : `Line chart showing daily commissions during ${format(new Date(), "MMMM yyyy")}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={(() => {
                      const now = new Date();
                      const monthStart = startOfMonth(now);
                      const monthEnd = endOfMonth(now);
                      const currentMonthCommissions = commissions.filter((c) => {
                        const date = new Date(c.created_at);
                        return date >= monthStart && date <= monthEnd;
                      });
                      
                      // Group by day
                      const dailyData: { [key: number]: { supplier: number; roaster: number; total: number } } = {};
                      const daysInMonth = monthEnd.getDate();
                      
                      // Initialize all days
                      for (let i = 1; i <= daysInMonth; i++) {
                        dailyData[i] = { supplier: 0, roaster: 0, total: 0 };
                      }
                      
                      // Fill with data
                      currentMonthCommissions.forEach((c) => {
                        const day = new Date(c.created_at).getDate();
                        dailyData[day].supplier += Number(c.supplier_commission);
                        dailyData[day].roaster += Number(c.roaster_commission);
                        dailyData[day].total += Number(c.total_commission);
                      });
                      
                      return Object.entries(dailyData).map(([day, data]) => ({
                        day: Number(day),
                        ...data,
                      }));
                    })()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="day" 
                      className="text-sm"
                      tickFormatter={(value) => `${value}`}
                    />
                    <YAxis className="text-sm" />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(2)} SAR`,
                        name === "total" 
                          ? (isArabic ? "الإجمالي" : "Total")
                          : name === "supplier"
                          ? (isArabic ? "الموردين" : "Suppliers")
                          : (isArabic ? "المحامص" : "Roasters")
                      ]}
                      labelFormatter={(label) => `${isArabic ? "يوم" : "Day"} ${label}`}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Legend 
                      formatter={(value) => 
                        value === "total" 
                          ? (isArabic ? "إجمالي العمولة" : "Total Commission")
                          : value === "supplier"
                          ? (isArabic ? "عمولة الموردين" : "Supplier Commission")
                          : (isArabic ? "عمولة المحامص" : "Roaster Commission")
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="total"
                      stroke="hsl(142, 76%, 36%)"
                      strokeWidth={2}
                      dot={{ fill: "hsl(142, 76%, 36%)", strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="supplier"
                      name="supplier"
                      stroke="hsl(25, 95%, 53%)"
                      strokeWidth={2}
                      dot={{ fill: "hsl(25, 95%, 53%)", strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="roaster"
                      name="roaster"
                      stroke="hsl(271, 91%, 65%)"
                      strokeWidth={2}
                      dot={{ fill: "hsl(271, 91%, 65%)", strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {monthlyChartData.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {isArabic ? "توزيع العمولات الشهرية" : "Monthly Commission Distribution"}
              </CardTitle>
              <CardDescription>
                {isArabic
                  ? "رسم بياني يوضح العمولات المحصلة شهرياً"
                  : "Chart showing commissions collected monthly"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-sm" />
                    <YAxis className="text-sm" />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(2)} SAR`, ""]}
                      labelFormatter={(label) => label}
                      contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                    <Bar
                      dataKey="supplier"
                      name={isArabic ? "عمولة الموردين" : "Supplier Commission"}
                      fill="hsl(25, 95%, 53%)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="roaster"
                      name={isArabic ? "عمولة المحامص" : "Roaster Commission"}
                      fill="hsl(271, 91%, 65%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Commission Chart for Current Month */}
        {dailyChartData.some(d => d.total > 0) && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {isArabic ? "العمولات اليومية" : "Daily Commissions"} - {format(new Date(), "MMMM yyyy", { locale: isArabic ? ar : undefined })}
              </CardTitle>
              <CardDescription>
                {isArabic
                  ? "رسم بياني يوضح العمولات المحصلة يومياً خلال الشهر الحالي"
                  : "Chart showing commissions collected daily during current month"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorSupplier" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorRoaster" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="dayLabel" 
                      className="text-sm"
                      tick={{ fontSize: 11 }}
                      interval={1}
                    />
                    <YAxis className="text-sm" />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(2)} SAR`,
                        name === "total" 
                          ? (isArabic ? "الإجمالي" : "Total")
                          : name === "supplier"
                          ? (isArabic ? "الموردين" : "Suppliers")
                          : (isArabic ? "المحامص" : "Roasters")
                      ]}
                      labelFormatter={(label) => `${isArabic ? "يوم" : "Day"} ${label}`}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Legend 
                      formatter={(value) => 
                        value === "total" 
                          ? (isArabic ? "إجمالي العمولة" : "Total Commission")
                          : value === "supplier"
                          ? (isArabic ? "عمولة الموردين" : "Supplier Commission")
                          : (isArabic ? "عمولة المحامص" : "Roaster Commission")
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="supplier"
                      name="supplier"
                      stroke="hsl(25, 95%, 53%)"
                      fillOpacity={1}
                      fill="url(#colorSupplier)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="roaster"
                      name="roaster"
                      stroke="hsl(271, 91%, 65%)"
                      fillOpacity={1}
                      fill="url(#colorRoaster)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="total"
                      stroke="hsl(142, 76%, 36%)"
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commissions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  {isArabic ? "سجل العمولات" : "Commission Log"}
                </CardTitle>
                <CardDescription>
                  {hasActiveFilters 
                    ? (isArabic
                        ? `${filteredCommissions.length} من ${commissions.length} عمولة`
                        : `${filteredCommissions.length} of ${commissions.length} commissions`)
                    : (isArabic
                        ? `${commissions.length} عمولة مسجلة`
                        : `${commissions.length} commissions recorded`)}
                </CardDescription>
              </div>
              {commissions.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={handleExportPDF} variant="outline" className="gap-2">
                    <FileText className="w-4 h-4" />
                    {isArabic ? "تصدير PDF" : "Export PDF"}
                  </Button>
                  <Button onClick={handleExportExcel} variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    {isArabic ? "تصدير Excel" : "Export Excel"}
                  </Button>
                  <Button 
                    onClick={handleExportCompletedExcel} 
                    variant="outline" 
                    className="gap-2"
                    disabled={commissions.filter(c => c.status === "completed").length === 0}
                  >
                    <Download className="w-4 h-4" />
                    {isArabic ? "تصدير المكتملة" : "Export Completed"}
                  </Button>
                </div>
              )}
            </div>
            
            {/* Filters Section */}
            {commissions.length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {isArabic ? "فلترة العمولات" : "Filter Commissions"}
                    </span>
                    {hasActiveFilters && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="gap-1 text-xs h-6 px-2"
                        >
                          <X className="w-3 h-3" />
                          {isArabic ? "مسح الفلاتر" : "Clear Filters"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSaveTemplateDialog(true)}
                          className="gap-1 text-xs h-6 px-2 text-primary"
                        >
                          <Bookmark className="w-3 h-3" />
                          {isArabic ? "حفظ كقالب" : "Save as Template"}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  {/* Saved Templates Dropdown */}
                  {savedFilterTemplates.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Select
                        value=""
                        onValueChange={(value) => {
                          const template = savedFilterTemplates.find((t) => t.id === value);
                          if (template) handleLoadFilterTemplate(template);
                        }}
                      >
                        <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs">
                          <Bookmark className="w-3 h-3 mr-1" />
                          <SelectValue placeholder={isArabic ? "القوالب المحفوظة" : "Saved Templates"} />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          {savedFilterTemplates.map((template) => (
                            <div key={template.id} className="flex items-center justify-between px-2 py-1 hover:bg-muted group">
                              <SelectItem value={template.id} className="flex-1 p-0">
                                {template.name}
                              </SelectItem>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFilterTemplate(template.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                {/* Save Template Dialog */}
                {showSaveTemplateDialog && (
                  <div className="mb-3 p-3 rounded-lg bg-background border border-primary/30">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={isArabic ? "اسم القالب..." : "Template name..."}
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        className="h-8 text-sm flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveFilterTemplate();
                          if (e.key === "Escape") setShowSaveTemplateDialog(false);
                        }}
                      />
                      <Button size="sm" className="h-8" onClick={handleSaveFilterTemplate}>
                        <Save className="w-3 h-3 mr-1" />
                        {isArabic ? "حفظ" : "Save"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          setShowSaveTemplateDialog(false);
                          setNewTemplateName("");
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {/* Quick Date Range */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {isArabic ? "نطاق سريع" : "Quick Range"}
                    </Label>
                    <Select value={quickDateRange} onValueChange={handleQuickDateRange}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={isArabic ? "اختر النطاق" : "Select Range"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{isArabic ? "الكل" : "All Time"}</SelectItem>
                        <SelectItem value="today">{isArabic ? "اليوم" : "Today"}</SelectItem>
                        <SelectItem value="thisWeek">{isArabic ? "هذا الأسبوع" : "This Week"}</SelectItem>
                        <SelectItem value="thisMonth">{isArabic ? "هذا الشهر" : "This Month"}</SelectItem>
                        <SelectItem value="lastMonth">{isArabic ? "الشهر الماضي" : "Last Month"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Date From */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {isArabic ? "من تاريخ" : "From Date"}
                    </Label>
                    <Input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => {
                        setFilterDateFrom(e.target.value);
                        setQuickDateRange("all");
                      }}
                      className="h-9"
                    />
                  </div>
                  
                  {/* Date To */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {isArabic ? "إلى تاريخ" : "To Date"}
                    </Label>
                    <Input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => {
                        setFilterDateTo(e.target.value);
                        setQuickDateRange("all");
                      }}
                      className="h-9"
                    />
                  </div>
                  
                  {/* Supplier Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {isArabic ? "المورد" : "Supplier"}
                    </Label>
                    <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={isArabic ? "جميع الموردين" : "All Suppliers"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="all">
                          {isArabic ? "جميع الموردين" : "All Suppliers"}
                        </SelectItem>
                        {uniqueSuppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Status Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {isArabic ? "الحالة" : "Status"}
                    </Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={isArabic ? "جميع الحالات" : "All Status"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="all">
                          {isArabic ? "جميع الحالات" : "All Status"}
                        </SelectItem>
                        <SelectItem value="pending">
                          {isArabic ? "معلق" : "Pending"}
                        </SelectItem>
                        <SelectItem value="completed">
                          {isArabic ? "مكتمل" : "Completed"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Amount From */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {isArabic ? "المبلغ من" : "Amount From"}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={filterAmountFrom}
                      onChange={(e) => setFilterAmountFrom(e.target.value)}
                      placeholder={isArabic ? "0.00" : "0.00"}
                      className="h-9"
                    />
                  </div>
                  
                  {/* Amount To */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {isArabic ? "المبلغ إلى" : "Amount To"}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={filterAmountTo}
                      onChange={(e) => setFilterAmountTo(e.target.value)}
                      placeholder={isArabic ? "∞" : "∞"}
                      className="h-9"
                    />
                  </div>
                </div>
                
                {/* Filtered Stats */}
                {hasActiveFilters && filteredCommissions.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-green-500/10 text-center">
                        <p className="text-lg font-bold text-green-600">
                          {filteredCommissions.reduce((sum, c) => sum + Number(c.total_commission), 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isArabic ? "إجمالي العمولات" : "Total Commissions"}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                        <p className="text-lg font-bold text-blue-600">
                          {(filteredCommissions.reduce((sum, c) => sum + Number(c.total_commission), 0) / filteredCommissions.length).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isArabic ? "متوسط العمولة" : "Avg Commission"}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-orange-500/10 text-center">
                        <p className="text-lg font-bold text-orange-600">
                          {filteredCommissions.reduce((sum, c) => sum + Number(c.order_total), 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isArabic ? "قيمة الطلبات" : "Order Value"}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-500/10 text-center">
                        <p className="text-lg font-bold text-purple-600">
                          {filteredCommissions.length}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isArabic ? "عدد العمولات" : "Commission Count"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>{isArabic ? "لا توجد عمولات مسجلة بعد" : "No commissions recorded yet"}</p>
                <p className="text-sm mt-2">
                  {isArabic
                    ? "ستظهر العمولات هنا عند تسليم الطلبات"
                    : "Commissions will appear here when orders are delivered"}
                </p>
              </div>
            ) : filteredCommissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Filter className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>{isArabic ? "لا توجد نتائج تطابق الفلاتر" : "No results match the filters"}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-3"
                >
                  {isArabic ? "مسح الفلاتر" : "Clear Filters"}
                </Button>
              </div>
            ) : (
              <>
                {/* Bulk Actions Bar */}
                {selectedCommissions.size > 0 && (() => {
                  const selectedData = commissions.filter((c) => selectedCommissions.has(c.id));
                  const selectedTotal = selectedData.reduce((sum, c) => sum + Number(c.total_commission), 0);
                  const selectedOrderTotal = selectedData.reduce((sum, c) => sum + Number(c.order_total), 0);
                  
                  // Group by supplier for chart
                  const supplierDistribution = selectedData.reduce((acc, c) => {
                    const supplierName = c.supplier?.name || (isArabic ? "غير محدد" : "Unknown");
                    if (!acc[supplierName]) {
                      acc[supplierName] = { name: supplierName, value: 0, count: 0 };
                    }
                    acc[supplierName].value += Number(c.total_commission);
                    acc[supplierName].count += 1;
                    return acc;
                  }, {} as Record<string, { name: string; value: number; count: number }>);
                  
                  const chartData = Object.values(supplierDistribution).sort((a, b) => b.value - a.value);
                  const CHART_COLORS = ["#8B4513", "#D4A574", "#6B8E23", "#CD853F", "#A0522D", "#DEB887", "#8FBC8F", "#F4A460"];
                  
                  return (
                  <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CheckSquare className="w-5 h-5 text-primary" />
                        <span className="font-medium">
                          {isArabic 
                            ? `تم تحديد ${selectedCommissions.size} عمولة`
                            : `${selectedCommissions.size} commission(s) selected`}
                        </span>
                        {selectedCommissions.size < sortedCommissions.length && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-primary underline"
                            onClick={handleSelectAllFiltered}
                          >
                            {isArabic 
                              ? `تحديد الكل (${sortedCommissions.length})`
                              : `Select all (${sortedCommissions.length})`}
                          </Button>
                        )}
                        {selectedCommissions.size === sortedCommissions.length && sortedCommissions.length > paginatedCommissions.length && (
                          <Badge variant="secondary" className="text-xs">
                            {isArabic ? "تم تحديد الكل" : "All selected"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-background/50">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{isArabic ? "قيمة الطلبات:" : "Orders:"}</span>
                          <span className="font-semibold">{selectedOrderTotal.toFixed(2)} {isArabic ? "ر.س" : "SAR"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-muted-foreground">{isArabic ? "إجمالي العمولات:" : "Commissions:"}</span>
                          <span className="font-semibold text-green-600">{selectedTotal.toFixed(2)} {isArabic ? "ر.س" : "SAR"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportSelectedExcel}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {isArabic ? "تصدير Excel" : "Export Excel"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrintSelectedPDF}
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        {isArabic ? "طباعة PDF" : "Print PDF"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkStatusChangeRequest("pending")}
                        disabled={isBulkUpdating}
                      >
                        {isBulkUpdating ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Clock className="w-4 h-4 mr-2" />
                        )}
                        {isArabic ? "تعليق الكل" : "Set Pending"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleBulkStatusChangeRequest("completed")}
                        disabled={isBulkUpdating}
                      >
                        {isBulkUpdating ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        {isArabic ? "إكمال الكل" : "Set Completed"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCommissions(new Set())}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Chart for selected commissions by supplier */}
                    {chartData.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-primary/20">
                        <p className="text-xs text-muted-foreground mb-2">
                          {isArabic ? "توزيع العمولات حسب المورد" : "Commission Distribution by Supplier"}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="w-32 h-32">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={chartData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={25}
                                  outerRadius={45}
                                  paddingAngle={2}
                                  dataKey="value"
                                >
                                  {chartData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value: number) => [`${value.toFixed(2)} ${isArabic ? "ر.س" : "SAR"}`, isArabic ? "العمولة" : "Commission"]}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {chartData.slice(0, 8).map((item, index) => (
                              <div key={item.name} className="flex items-center gap-2 text-xs">
                                <div 
                                  className="w-3 h-3 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                />
                                <span className="truncate" title={item.name}>{item.name}</span>
                                <span className="text-muted-foreground">({item.count})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })()}

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <button
                            onClick={handleSelectAll}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {selectedCommissions.size === paginatedCommissions.length && paginatedCommissions.length > 0 ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none"
                          onClick={() => handleSort("date")}
                        >
                          <div className="flex items-center gap-1">
                            {isArabic ? "التاريخ" : "Date"}
                            {getSortIcon("date")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none"
                          onClick={() => handleSort("supplier")}
                        >
                          <div className="flex items-center gap-1">
                            {isArabic ? "المورد" : "Supplier"}
                            {getSortIcon("supplier")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none"
                          onClick={() => handleSort("orderValue")}
                        >
                          <div className="flex items-center gap-1">
                            {isArabic ? "قيمة الطلب" : "Order Value"}
                            {getSortIcon("orderValue")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none"
                          onClick={() => handleSort("supplierCommission")}
                        >
                          <div className="flex items-center gap-1">
                            {isArabic ? "عمولة المورد" : "Supplier Comm."}
                            {getSortIcon("supplierCommission")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none"
                          onClick={() => handleSort("roasterCommission")}
                        >
                          <div className="flex items-center gap-1">
                            {isArabic ? "عمولة المحمصة" : "Roaster Comm."}
                            {getSortIcon("roasterCommission")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none"
                          onClick={() => handleSort("total")}
                        >
                          <div className="flex items-center gap-1">
                            {isArabic ? "الإجمالي" : "Total"}
                            {getSortIcon("total")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none"
                          onClick={() => handleSort("status")}
                        >
                          <div className="flex items-center gap-1">
                            {isArabic ? "الحالة" : "Status"}
                            {getSortIcon("status")}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCommissions.map((commission) => (
                        <TableRow 
                          key={commission.id}
                          className={selectedCommissions.has(commission.id) ? "bg-primary/5" : ""}
                        >
                          <TableCell className="w-12">
                            <button
                              onClick={() => handleSelectCommission(commission.id)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {selectedCommissions.has(commission.id) ? (
                                <CheckSquare className="w-4 h-4 text-primary" />
                              ) : (
                                <Square className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            {format(new Date(commission.created_at), "dd/MM/yyyy", {
                              locale: isArabic ? ar : undefined,
                            })}
                          </TableCell>
                          <TableCell>{commission.supplier?.name || "-"}</TableCell>
                          <TableCell>{Number(commission.order_total).toFixed(2)} SAR</TableCell>
                          <TableCell className="text-orange-600">
                            {Number(commission.supplier_commission).toFixed(2)} ({commission.supplier_rate}%)
                          </TableCell>
                          <TableCell className="text-purple-600">
                            {Number(commission.roaster_commission).toFixed(2)} ({commission.roaster_rate}%)
                          </TableCell>
                          <TableCell className="font-bold text-green-600">
                            {Number(commission.total_commission).toFixed(2)} SAR
                          </TableCell>
                          <TableCell>
                            <Select
                              value={commission.status}
                              onValueChange={(value) => handleStatusChangeRequest(commission.id, value)}
                              disabled={updatingStatusId === commission.id}
                            >
                              <SelectTrigger className="w-28 h-8">
                                {updatingStatusId === commission.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Badge
                                    variant={commission.status === "pending" ? "secondary" : "default"}
                                    className="pointer-events-none"
                                  >
                                    {commission.status === "pending"
                                      ? isArabic
                                        ? "معلق"
                                        : "Pending"
                                      : isArabic
                                      ? "مكتمل"
                                      : "Completed"}
                                  </Badge>
                                )}
                              </SelectTrigger>
                              <SelectContent className="bg-background border shadow-lg z-50">
                                <SelectItem value="pending">
                                  <Badge variant="secondary">
                                    {isArabic ? "معلق" : "Pending"}
                                  </Badge>
                                </SelectItem>
                                <SelectItem value="completed">
                                  <Badge variant="default">
                                    {isArabic ? "مكتمل" : "Completed"}
                                  </Badge>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {isArabic ? "عرض" : "Show"}
                      </span>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => setItemsPerPage(Number(value))}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">
                        {isArabic ? "لكل صفحة" : "per page"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground mx-2">
                        {isArabic 
                          ? `${startIndex + 1}-${Math.min(endIndex, sortedCommissions.length)} من ${sortedCommissions.length}`
                          : `${startIndex + 1}-${Math.min(endIndex, sortedCommissions.length)} of ${sortedCommissions.length}`}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        {isArabic ? "»" : "«"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        {isArabic ? "›" : "‹"}
                      </Button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="h-8 w-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        {isArabic ? "‹" : "›"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        {isArabic ? "«" : "»"}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Confirmation Dialog for Status Change */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArabic ? "تأكيد اكتمال العمولة" : "Confirm Commission Completion"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {isArabic
                  ? "هل أنت متأكد من تغيير حالة العمولة إلى مكتمل؟"
                  : "Are you sure you want to mark this commission as completed?"}
              </p>
              {pendingStatusChange?.commission && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
                  <p><strong>{isArabic ? "المورد:" : "Supplier:"}</strong> {pendingStatusChange.commission.supplier?.name || "-"}</p>
                  <p><strong>{isArabic ? "قيمة العمولة:" : "Commission:"}</strong> {Number(pendingStatusChange.commission.total_commission).toFixed(2)} SAR</p>
                  <p><strong>{isArabic ? "قيمة الطلب:" : "Order Value:"}</strong> {Number(pendingStatusChange.commission.order_total).toFixed(2)} SAR</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setPendingStatusChange(null)}>
              {isArabic ? "إلغاء" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStatusChange}>
              {isArabic ? "تأكيد الاكتمال" : "Confirm Completion"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Confirmation Dialog */}
      <AlertDialog open={bulkConfirmDialogOpen} onOpenChange={setBulkConfirmDialogOpen}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArabic ? "تأكيد تغيير الحالة الجماعي" : "Confirm Bulk Status Change"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p>
                {isArabic
                  ? `هل أنت متأكد من تغيير حالة ${selectedCommissions.size} عمولة إلى مكتمل؟`
                  : `Are you sure you want to mark ${selectedCommissions.size} commission(s) as completed?`}
              </p>
              <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
                <p><strong>{isArabic ? "عدد العمولات:" : "Commissions:"}</strong> {selectedCommissions.size}</p>
                <p><strong>{isArabic ? "إجمالي العمولات:" : "Total Commission:"}</strong> {
                  Array.from(selectedCommissions).reduce((sum, id) => {
                    const commission = commissions.find((c) => c.id === id);
                    return sum + (commission ? Number(commission.total_commission) : 0);
                  }, 0).toFixed(2)
                } SAR</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => {
              setBulkConfirmDialogOpen(false);
              setPendingBulkStatus(null);
            }}>
              {isArabic ? "إلغاء" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => pendingBulkStatus && handleBulkUpdateStatus(pendingBulkStatus)}
              disabled={isBulkUpdating}
            >
              {isBulkUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isArabic ? "تأكيد التغيير" : "Confirm Change"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default CommissionManagement;
