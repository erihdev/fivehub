import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Coffee,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar as CalendarIcon,
  CalendarDays,
  Download,
  Filter,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface NotificationLog {
  id: string;
  offer_id: string;
  offer_title: string;
  supplier_name: string | null;
  days_remaining: number;
  notification_type: string;
  sent_at: string;
}

const OfferNotificationLogs = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "expired" | "tomorrow" | "soon" | "normal">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const isRtl = dir === "rtl";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("offer_expiry_notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("sent_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setLogs(data || []);
      } catch (error) {
        console.error("Error fetching notification logs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [user]);

  const exportToCSV = () => {
    if (logs.length === 0) return;

    const BOM = "\uFEFF";
    const headers = [
      language === "ar" ? "العرض" : "Offer",
      language === "ar" ? "المورد" : "Supplier",
      language === "ar" ? "الأيام المتبقية" : "Days Remaining",
      language === "ar" ? "الحالة" : "Status",
      language === "ar" ? "تاريخ الإرسال" : "Sent Date",
      language === "ar" ? "وقت الإرسال" : "Sent Time",
    ];

    const getStatus = (days: number) => {
      if (days <= 0) return language === "ar" ? "منتهي" : "Expired";
      if (days === 1) return language === "ar" ? "ينتهي غداً" : "Tomorrow";
      if (days <= 3) return language === "ar" ? "قريباً" : "Soon";
      return language === "ar" ? "عادي" : "Normal";
    };

    const rows = logs.map((log) => [
      log.offer_title,
      log.supplier_name || (language === "ar" ? "مورد" : "Supplier"),
      log.days_remaining.toString(),
      getStatus(log.days_remaining),
      format(new Date(log.sent_at), "yyyy-MM-dd"),
      format(new Date(log.sent_at), "HH:mm"),
    ]);

    const csvContent = BOM + [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `notification-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: language === "ar" ? "تم التصدير" : "Exported",
      description: language === "ar" ? "تم تصدير السجل بنجاح" : "Log exported successfully",
    });
  };

  const clearAllLogs = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("offer_expiry_notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setLogs([]);
      toast({
        title: language === "ar" ? "تم المسح" : "Cleared",
        description: language === "ar" ? "تم مسح جميع السجلات" : "All logs cleared",
      });
    } catch (error) {
      console.error("Error clearing logs:", error);
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "حدث خطأ أثناء المسح" : "Error clearing logs",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (daysRemaining: number) => {
    if (daysRemaining <= 0) return <XCircle className="w-5 h-5 text-red-500" />;
    if (daysRemaining === 1) return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    if (daysRemaining <= 3) return <Clock className="w-5 h-5 text-yellow-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getNotificationBadge = (daysRemaining: number) => {
    if (daysRemaining <= 0) {
      return (
        <Badge variant="destructive">
          {language === "ar" ? "منتهي" : "Expired"}
        </Badge>
      );
    }
    if (daysRemaining === 1) {
      return (
        <Badge className="bg-orange-500">
          {language === "ar" ? "ينتهي غداً" : "Tomorrow"}
        </Badge>
      );
    }
    if (daysRemaining <= 3) {
      return (
        <Badge className="bg-yellow-500 text-black">
          {language === "ar" ? `${daysRemaining} أيام` : `${daysRemaining} days`}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        {language === "ar" ? `${daysRemaining} أيام` : `${daysRemaining} days`}
      </Badge>
    );
  };

  // Filter logs by status, search query, and date range
  const filteredLogs = logs.filter((log) => {
    const logDate = new Date(log.sent_at);

    // Date range filter
    if (startDate && isBefore(logDate, startOfDay(startDate))) return false;
    if (endDate && isAfter(logDate, endOfDay(endDate))) return false;

    // Search filter
    const matchesSearch = searchQuery === "" || 
      log.offer_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.supplier_name && log.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter === "all") return true;
    if (statusFilter === "expired") return log.days_remaining <= 0;
    if (statusFilter === "tomorrow") return log.days_remaining === 1;
    if (statusFilter === "soon") return log.days_remaining > 1 && log.days_remaining <= 3;
    if (statusFilter === "normal") return log.days_remaining > 3;
    return true;
  });

  const clearDateFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // Group logs by date
  const groupedLogs = filteredLogs.reduce((acc, log) => {
    const date = format(new Date(log.sent_at), "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, NotificationLog[]>);

  if (authLoading || isLoading) {
    return (
      <main
        className="min-h-screen bg-background font-arabic flex items-center justify-center"
        dir={dir}
      >
        <Loader2 className="w-10 h-10 text-coffee-gold animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir={dir}>
      <div className="container mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
              <Bell className="w-8 h-8 text-coffee-gold" />
              {language === "ar" ? "سجل إشعارات العروض" : "Offer Notification Logs"}
            </h1>
            <p className="text-muted-foreground">
              {language === "ar"
                ? `لديك ${logs.length} إشعار مسجل`
                : `You have ${logs.length} logged notifications`}
            </p>
          </div>
        {logs.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 ml-2" />
                {language === "ar" ? "تصدير CSV" : "Export CSV"}
              </Button>
              <Button variant="destructive" size="sm" onClick={clearAllLogs}>
                <Trash2 className="w-4 h-4 ml-2" />
                {language === "ar" ? "مسح الكل" : "Clear All"}
              </Button>
            </div>
          )}
        </div>

        {/* Search and Date Filter */}
        {logs.length > 0 && (
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={language === "ar" ? "البحث حسب اسم العرض أو المورد..." : "Search by offer or supplier name..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {language === "ar" ? "فلترة حسب التاريخ:" : "Filter by date:"}
                </span>
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-right font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="w-4 h-4 ml-2" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : (language === "ar" ? "من تاريخ" : "From")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={language === "ar" ? ar : undefined}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-right font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="w-4 h-4 ml-2" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : (language === "ar" ? "إلى تاريخ" : "To")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={language === "ar" ? ar : undefined}
                  />
                </PopoverContent>
              </Popover>

              {(startDate || endDate) && (
                <Button variant="ghost" size="sm" onClick={clearDateFilter}>
                  <XCircle className="w-4 h-4 ml-1" />
                  {language === "ar" ? "مسح" : "Clear"}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Filter Buttons */}
        {logs.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {language === "ar" ? "فلترة حسب الحالة:" : "Filter by status:"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                {language === "ar" ? "الكل" : "All"} ({logs.length})
              </Button>
              <Button
                variant={statusFilter === "expired" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("expired")}
                className={statusFilter === "expired" ? "bg-red-500 hover:bg-red-600" : ""}
              >
                <XCircle className="w-4 h-4 ml-1" />
                {language === "ar" ? "منتهية" : "Expired"} ({logs.filter((l) => l.days_remaining <= 0).length})
              </Button>
              <Button
                variant={statusFilter === "tomorrow" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("tomorrow")}
                className={statusFilter === "tomorrow" ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <AlertTriangle className="w-4 h-4 ml-1" />
                {language === "ar" ? "غداً" : "Tomorrow"} ({logs.filter((l) => l.days_remaining === 1).length})
              </Button>
              <Button
                variant={statusFilter === "soon" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("soon")}
                className={statusFilter === "soon" ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""}
              >
                <Clock className="w-4 h-4 ml-1" />
                {language === "ar" ? "قريباً" : "Soon"} ({logs.filter((l) => l.days_remaining > 1 && l.days_remaining <= 3).length})
              </Button>
              <Button
                variant={statusFilter === "normal" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("normal")}
                className={statusFilter === "normal" ? "bg-green-500 hover:bg-green-600" : ""}
              >
                <CheckCircle className="w-4 h-4 ml-1" />
                {language === "ar" ? "عادية" : "Normal"} ({logs.filter((l) => l.days_remaining > 3).length})
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        {logs.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card 
              className={`bg-red-500/10 border-0 cursor-pointer transition-all ${statusFilter === "expired" ? "ring-2 ring-red-500" : ""}`}
              onClick={() => setStatusFilter("expired")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {logs.filter((l) => l.days_remaining <= 0).length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "منتهية" : "Expired"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`bg-orange-500/10 border-0 cursor-pointer transition-all ${statusFilter === "tomorrow" ? "ring-2 ring-orange-500" : ""}`}
              onClick={() => setStatusFilter("tomorrow")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {logs.filter((l) => l.days_remaining === 1).length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "غداً" : "Tomorrow"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`bg-yellow-500/10 border-0 cursor-pointer transition-all ${statusFilter === "soon" ? "ring-2 ring-yellow-500" : ""}`}
              onClick={() => setStatusFilter("soon")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {logs.filter((l) => l.days_remaining > 1 && l.days_remaining <= 3).length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "قريباً" : "Soon"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`bg-green-500/10 border-0 cursor-pointer transition-all ${statusFilter === "normal" ? "ring-2 ring-green-500" : ""}`}
              onClick={() => setStatusFilter("normal")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {logs.filter((l) => l.days_remaining > 3).length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "عادية" : "Normal"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Logs */}
        {filteredLogs.length === 0 && logs.length > 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Filter className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">
                {language === "ar"
                  ? "لا توجد إشعارات بهذه الحالة"
                  : "No notifications with this status"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {language === "ar"
                  ? "جرب فلتر آخر"
                  : "Try a different filter"}
              </p>
              <Button variant="outline" onClick={() => setStatusFilter("all")}>
                {language === "ar" ? "عرض الكل" : "Show All"}
              </Button>
            </CardContent>
          </Card>
        ) : logs.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Bell className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">
                {language === "ar"
                  ? "لا توجد إشعارات مسجلة"
                  : "No Notification Logs"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {language === "ar"
                  ? "ستظهر هنا إشعارات انتهاء العروض المفضلة"
                  : "Favorite offer expiry notifications will appear here"}
              </p>
              <Link to="/favorite-offers">
                <Button variant="coffee">
                  {language === "ar" ? "عرض العروض المفضلة" : "View Favorite Offers"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedLogs).map(([date, dayLogs]) => (
              <Card key={date}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-coffee-gold" />
                    {format(new Date(date), "EEEE، d MMMM yyyy", {
                      locale: language === "ar" ? ar : undefined,
                    })}
                  </CardTitle>
                  <CardDescription>
                    {dayLogs.length}{" "}
                    {language === "ar" ? "إشعار" : "notification(s)"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dayLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getNotificationIcon(log.days_remaining)}
                        <div>
                          <p className="font-medium">{log.offer_title}</p>
                          <p className="text-sm text-muted-foreground">
                            {log.supplier_name || (language === "ar" ? "مورد" : "Supplier")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getNotificationBadge(log.days_remaining)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.sent_at), "HH:mm")}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default OfferNotificationLogs;