import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Trash2,
  Bell,
  BellRing,
  BellOff,
  BarChart3,
  FileText,
  Timer,
  Power,
  PowerOff,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useScheduledTaskSettings } from "@/hooks/useScheduledTaskSettings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface RetryLog {
  id: string;
  user_id: string;
  original_notification_id: string;
  attempt_number: number;
  status: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  notification_type: string;
  notification_data: any;
}

interface ScheduledTask {
  name: string;
  schedule: string;
  description: string;
  descriptionEn: string;
  type: "report" | "check" | "notification";
}

const SCHEDULED_TASKS: ScheduledTask[] = [
  {
    name: "weekly-success-rate-report",
    schedule: "0 9 * * 0",
    description: "تقرير نسبة نجاح الإشعارات الأسبوعي",
    descriptionEn: "Weekly notification success rate report",
    type: "report",
  },
  {
    name: "weekly-commission-report",
    schedule: "0 9 * * 0",
    description: "تقرير العمولات الأسبوعي",
    descriptionEn: "Weekly commission report",
    type: "report",
  },
  {
    name: "scheduled-commission-report",
    schedule: "0 * * * *",
    description: "فحص تقارير العمولات المجدولة",
    descriptionEn: "Scheduled commission reports check",
    type: "check",
  },
  {
    name: "daily-performance-summary",
    schedule: "0 9 * * *",
    description: "ملخص الأداء اليومي",
    descriptionEn: "Daily performance summary",
    type: "report",
  },
  {
    name: "scheduled-smart-check",
    schedule: "0 * * * *",
    description: "الفحص الذكي المجدول",
    descriptionEn: "Scheduled smart check",
    type: "check",
  },
  {
    name: "weekly-smart-report",
    schedule: "0 9 * * 0",
    description: "تقرير الفحص الذكي الأسبوعي",
    descriptionEn: "Weekly smart report",
    type: "report",
  },
  {
    name: "daily-favorite-offers-summary",
    schedule: "0 9 * * *",
    description: "ملخص العروض المفضلة اليومي",
    descriptionEn: "Daily favorite offers summary",
    type: "notification",
  },
  {
    name: "weekly-favorite-offers-summary",
    schedule: "0 9 * * 0",
    description: "ملخص العروض المفضلة الأسبوعي",
    descriptionEn: "Weekly favorite offers summary",
    type: "notification",
  },
];

const ScheduledTasksMonitor = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isGranted: pushGranted, requestPermission } = usePushNotifications();
  const {
    taskSettings,
    isLoading: settingsLoading,
    toggleTaskEnabled,
    togglePushOnFailure,
    getTaskSetting,
  } = useScheduledTaskSettings();

  const [retryLogs, setRetryLogs] = useState<RetryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

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

  // Fetch retry logs
  const fetchRetryLogs = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notification_retry_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setRetryLogs(data || []);
    } catch (error) {
      console.error("Error fetching retry logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchRetryLogs();
    }
  }, [user, isAdmin]);

  // Clear retry logs
  const handleClearLogs = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("notification_retry_logs")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setRetryLogs([]);
      toast({
        title: isArabic ? "تم المسح" : "Cleared",
        description: isArabic ? "تم مسح سجل إعادة المحاولات" : "Retry logs cleared",
      });
    } catch (error) {
      console.error("Error clearing logs:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في مسح السجلات" : "Failed to clear logs",
        variant: "destructive",
      });
    }
  };

  // Stats
  const retryStats = {
    total: retryLogs.length,
    successful: retryLogs.filter((l) => l.status === "success").length,
    failed: retryLogs.filter((l) => l.status === "failed").length,
    pending: retryLogs.filter((l) => l.status === "pending").length,
  };

  const activeTasksCount = SCHEDULED_TASKS.filter(t => {
    const setting = getTaskSetting(t.name);
    return setting?.is_enabled !== false;
  }).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">{isArabic ? "نجح" : "Success"}</Badge>;
      case "failed":
        return <Badge variant="destructive">{isArabic ? "فشل" : "Failed"}</Badge>;
      case "pending":
        return <Badge variant="secondary">{isArabic ? "قيد الانتظار" : "Pending"}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "report":
        return <FileText className="w-4 h-4 text-blue-500" />;
      case "check":
        return <BarChart3 className="w-4 h-4 text-purple-500" />;
      case "notification":
        return <Bell className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const parseCronSchedule = (cron: string): string => {
    const parts = cron.split(" ");
    if (parts.length !== 5) return cron;

    const [minute, hour, , , dayOfWeek] = parts;

    if (dayOfWeek === "0" && hour !== "*") {
      return isArabic ? `كل أحد الساعة ${hour}:${minute.padStart(2, "0")}` : `Every Sunday at ${hour}:${minute.padStart(2, "0")}`;
    }
    if (hour !== "*" && dayOfWeek === "*") {
      return isArabic ? `يومياً الساعة ${hour}:${minute.padStart(2, "0")}` : `Daily at ${hour}:${minute.padStart(2, "0")}`;
    }
    if (minute === "0" && hour === "*") {
      return isArabic ? "كل ساعة" : "Every hour";
    }

    return cron;
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? "rtl" : "ltr"}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Timer className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              {isArabic ? "مراقب المهام المجدولة" : "Scheduled Tasks Monitor"}
            </h1>
          </div>
          {!pushGranted && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={requestPermission}>
                  <BellOff className="w-4 h-4 ml-2" />
                  {isArabic ? "تفعيل الإشعارات" : "Enable Notifications"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isArabic ? "فعّل إشعارات المتصفح لتلقي تنبيهات فشل المهام" : "Enable browser notifications for task failure alerts"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="tasks" className="gap-2">
              <Clock className="w-4 h-4" />
              {isArabic ? "المهام المجدولة" : "Scheduled Tasks"}
            </TabsTrigger>
            <TabsTrigger value="retries" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {isArabic ? "سجل إعادة المحاولات" : "Retry Logs"}
            </TabsTrigger>
          </TabsList>

          {/* Scheduled Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{SCHEDULED_TASKS.length}</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "إجمالي المهام" : "Total Tasks"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Power className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{activeTasksCount}</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "نشطة" : "Active"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <PowerOff className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                  <p className="text-2xl font-bold">{SCHEDULED_TASKS.length - activeTasksCount}</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "متوقفة" : "Paused"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <BellRing className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-2xl font-bold">
                    {pushGranted ? (isArabic ? "مفعّل" : "On") : (isArabic ? "معطّل" : "Off")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "إشعارات Push" : "Push Notifications"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tasks Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {isArabic ? "جدول المهام" : "Task Schedule"}
                </CardTitle>
                <CardDescription>
                  {isArabic ? "تحكم في المهام المجدولة وإشعارات الفشل" : "Control scheduled tasks and failure notifications"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? "النوع" : "Type"}</TableHead>
                      <TableHead>{isArabic ? "اسم المهمة" : "Task Name"}</TableHead>
                      <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                      <TableHead>{isArabic ? "الجدولة" : "Schedule"}</TableHead>
                      <TableHead className="text-center">{isArabic ? "التفعيل" : "Enabled"}</TableHead>
                      <TableHead className="text-center">{isArabic ? "إشعار الفشل" : "Failure Alert"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SCHEDULED_TASKS.map((task) => {
                      const setting = getTaskSetting(task.name);
                      const isEnabled = setting?.is_enabled !== false;
                      const pushOnFailure = setting?.push_on_failure !== false;

                      return (
                        <TableRow key={task.name} className={!isEnabled ? "opacity-50" : ""}>
                          <TableCell>{getTaskIcon(task.type)}</TableCell>
                          <TableCell className="font-mono text-sm">{task.name}</TableCell>
                          <TableCell>{isArabic ? task.description : task.descriptionEn}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-mono text-xs text-muted-foreground">{task.schedule}</span>
                              <span className="text-sm">{parseCronSchedule(task.schedule)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex justify-center">
                                  <Switch
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => toggleTaskEnabled(task.name, checked)}
                                    disabled={settingsLoading}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isEnabled
                                  ? (isArabic ? "إيقاف المهمة" : "Disable task")
                                  : (isArabic ? "تفعيل المهمة" : "Enable task")}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex justify-center">
                                  <Button
                                    variant={pushOnFailure ? "default" : "outline"}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => togglePushOnFailure(task.name, !pushOnFailure)}
                                    disabled={settingsLoading || !pushGranted}
                                  >
                                    {pushOnFailure ? (
                                      <BellRing className="w-4 h-4" />
                                    ) : (
                                      <BellOff className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {!pushGranted
                                  ? (isArabic ? "فعّل إشعارات المتصفح أولاً" : "Enable browser notifications first")
                                  : pushOnFailure
                                    ? (isArabic ? "إيقاف إشعارات الفشل" : "Disable failure notifications")
                                    : (isArabic ? "تفعيل إشعارات الفشل" : "Enable failure notifications")}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Retry Logs Tab */}
          <TabsContent value="retries" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{retryStats.total}</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "إجمالي المحاولات" : "Total Retries"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{retryStats.successful}</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "ناجحة" : "Successful"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                  <p className="text-2xl font-bold">{retryStats.failed}</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "فاشلة" : "Failed"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-2xl font-bold">{retryStats.pending}</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "قيد الانتظار" : "Pending"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Retry Logs Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    {isArabic ? "سجل محاولات إعادة الإرسال" : "Retry Attempts Log"}
                  </CardTitle>
                  <CardDescription>
                    {isArabic ? "تفاصيل جميع محاولات إعادة إرسال الإشعارات" : "Details of all notification retry attempts"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchRetryLogs} disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                  {retryLogs.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleClearLogs}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : retryLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>{isArabic ? "لا توجد محاولات إعادة إرسال" : "No retry attempts yet"}</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{isArabic ? "التاريخ" : "Date"}</TableHead>
                          <TableHead>{isArabic ? "النوع" : "Type"}</TableHead>
                          <TableHead>{isArabic ? "رقم المحاولة" : "Attempt #"}</TableHead>
                          <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                          <TableHead>{isArabic ? "الخطأ" : "Error"}</TableHead>
                          <TableHead>{isArabic ? "المدة" : "Duration"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {retryLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm">
                                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: isArabic ? ar : undefined })}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: isArabic ? ar : undefined })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.notification_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono">{log.attempt_number}</span>
                            </TableCell>
                            <TableCell>{getStatusBadge(log.status)}</TableCell>
                            <TableCell>
                              {log.error_message ? (
                                <span className="text-sm text-red-600 dark:text-red-400 truncate max-w-[200px] block">
                                  {log.error_message}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.completed_at ? (
                                <span className="text-sm">
                                  {Math.round((new Date(log.completed_at).getTime() - new Date(log.created_at).getTime()) / 1000)}s
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ScheduledTasksMonitor;
