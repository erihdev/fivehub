import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { playGlobalNotificationSound } from "@/hooks/useNotificationSound";

interface ThresholdSettings {
  enabled: boolean;
  threshold: number;
  notifyOnEachCommission: boolean;
  notifyOnTotalReached: boolean;
  emailEnabled: boolean;
  emailAddress: string;
  pushEnabled: boolean;
  // Success rate alert settings
  successRateAlertEnabled: boolean;
  successRateThreshold: number;
  successRateCheckPeriod: "daily" | "weekly";
  // Auto retry settings
  autoRetryEnabled: boolean;
  autoRetryMaxAttempts: number;
  autoRetryDelayMinutes: number;
  // Weekly success rate report settings
  weeklyReportEnabled: boolean;
  weeklyReportDay: number;
  weeklyReportHour: number;
}

const STORAGE_KEY = "commission_threshold_settings";

const getDefaultSettings = (): ThresholdSettings => ({
  enabled: false,
  threshold: 1000,
  notifyOnEachCommission: false,
  notifyOnTotalReached: true,
  emailEnabled: false,
  emailAddress: "",
  pushEnabled: false,
  successRateAlertEnabled: false,
  successRateThreshold: 80,
  successRateCheckPeriod: "daily",
  autoRetryEnabled: false,
  autoRetryMaxAttempts: 3,
  autoRetryDelayMinutes: 5,
  weeklyReportEnabled: false,
  weeklyReportDay: 0,
  weeklyReportHour: 9,
});

export const useCommissionThresholdAlert = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAdminRef = useRef<boolean>(false);
  const hasNotifiedRef = useRef<boolean>(false);
  const previousTotalRef = useRef<number>(0);
  const isArabic = language === "ar";

  // Get settings from localStorage
  const getSettings = useCallback((): ThresholdSettings => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...getDefaultSettings(), ...JSON.parse(saved) };
      }
    } catch {
      // ignore parse errors
    }
    return getDefaultSettings();
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((settings: ThresholdSettings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, []);

  // Log notification to database
  const logNotification = useCallback(async (
    alertType: "single" | "total",
    notificationChannel: "in_app" | "email" | "both",
    commissionAmount: number,
    totalAmount: number,
    threshold: number,
    supplierName?: string,
    emailSentTo?: string,
    status: "sent" | "failed" = "sent",
    errorMessage?: string
  ) => {
    if (!user) return;

    try {
      await supabase.from("commission_notification_logs").insert({
        user_id: user.id,
        alert_type: alertType,
        notification_channel: notificationChannel,
        commission_amount: commissionAmount,
        total_amount: totalAmount,
        threshold,
        supplier_name: supplierName,
        email_sent_to: emailSentTo,
        status,
        error_message: errorMessage,
      });
    } catch (error) {
      console.error("Error logging notification:", error);
    }
  }, [user]);

  // Send email notification
  const sendEmailNotification = useCallback(async (
    alertType: "single" | "total",
    commissionAmount: number,
    totalAmount: number,
    threshold: number,
    supplierName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "No user" };
    
    const settings = getSettings();
    if (!settings.emailEnabled) return { success: false, error: "Email not enabled" };

    try {
      const { error } = await supabase.functions.invoke("commission-threshold-alert", {
        body: {
          userId: user.id,
          alertType,
          commissionAmount,
          totalAmount,
          threshold,
          supplierName,
          language: isArabic ? "ar" : "en",
          emailOverride: settings.emailAddress || undefined,
        },
      });

      if (error) {
        console.error("Error sending email notification:", error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {
      console.error("Error calling email function:", error);
      return { success: false, error: error.message };
    }
  }, [user, getSettings, isArabic]);

  // Request push notification permission
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      console.log("Browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }, []);

  // Send push notification
  const sendPushNotification = useCallback(async (
    title: string,
    body: string,
    icon?: string
  ) => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission !== "granted") {
      const granted = await requestPushPermission();
      if (!granted) return;
    }

    try {
      new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        tag: "commission-alert",
        requireInteraction: true,
      });
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }, [requestPushPermission]);

  // Check admin status
  useEffect(() => {
    if (!user) return;

    const checkAdmin = async () => {
      const { data } = await supabase.rpc("is_verified_admin", {
        _user_id: user.id,
      });
      isAdminRef.current = data === true;
    };

    checkAdmin();
  }, [user]);

  // Monitor commissions for threshold
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("commission-threshold-monitor")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "commissions",
        },
        async (payload) => {
          if (!isAdminRef.current) return;

          const settings = getSettings();
          if (!settings.enabled) return;

          const newCommission = payload.new as {
            id: string;
            total_commission: number;
            supplier_id: string;
          };

          // Get supplier name for the notification
          let supplierName: string | undefined;
          const { data: supplier } = await supabase
            .from("suppliers")
            .select("name")
            .eq("id", newCommission.supplier_id)
            .single();
          supplierName = supplier?.name;

          // Get current total
          const { data: totalData } = await supabase
            .from("commissions")
            .select("total_commission");
          const totalAmount = totalData?.reduce((sum, c) => sum + Number(c.total_commission), 0) || 0;

          // Notify on each commission if enabled and exceeds threshold
          if (settings.notifyOnEachCommission && Number(newCommission.total_commission) >= settings.threshold) {
            playGlobalNotificationSound();
            
            const toastTitle = isArabic ? "🎯 عمولة كبيرة!" : "🎯 Large Commission!";
            const toastDesc = isArabic
              ? `عمولة جديدة بقيمة ${Number(newCommission.total_commission).toFixed(2)} ر.س تجاوزت الحد المحدد (${settings.threshold} ر.س)`
              : `New commission of ${Number(newCommission.total_commission).toFixed(2)} SAR exceeded threshold (${settings.threshold} SAR)`;
            
            toast({
              title: toastTitle,
              description: toastDesc,
            });

            // Send push notification if enabled
            if (settings.pushEnabled) {
              await sendPushNotification(toastTitle, toastDesc);
            }

            // Determine notification channel
            let channel: "in_app" | "email" | "both" = "in_app";
            let emailResult: { success: boolean; error?: string } = { success: false };
            
            if (settings.emailEnabled) {
              emailResult = await sendEmailNotification(
                "single",
                Number(newCommission.total_commission),
                totalAmount,
                settings.threshold,
                supplierName
              );
              channel = emailResult.success ? "both" : "in_app";
            }

            // Log the notification
            await logNotification(
              "single",
              channel,
              Number(newCommission.total_commission),
              totalAmount,
              settings.threshold,
              supplierName,
              settings.emailEnabled ? (settings.emailAddress || undefined) : undefined,
              emailResult.success || !settings.emailEnabled ? "sent" : "failed",
              emailResult.error
            );
          }

          // Check total commissions if notifyOnTotalReached is enabled
          if (settings.notifyOnTotalReached && !hasNotifiedRef.current) {
            // Check if we just crossed the threshold
            if (
              totalAmount >= settings.threshold &&
              previousTotalRef.current < settings.threshold
            ) {
              hasNotifiedRef.current = true;
              playGlobalNotificationSound();
              
              const toastTitle = isArabic ? "🏆 تم الوصول للحد!" : "🏆 Threshold Reached!";
              const toastDesc = isArabic
                ? `إجمالي العمولات وصل إلى ${totalAmount.toFixed(2)} ر.س وتجاوز الحد المحدد (${settings.threshold} ر.س)`
                : `Total commissions reached ${totalAmount.toFixed(2)} SAR, exceeding threshold (${settings.threshold} SAR)`;
              
              toast({
                title: toastTitle,
                description: toastDesc,
              });

              // Send push notification if enabled
              if (settings.pushEnabled) {
                await sendPushNotification(toastTitle, toastDesc);
              }

              // Determine notification channel
              let channel: "in_app" | "email" | "both" = "in_app";
              let emailResult: { success: boolean; error?: string } = { success: false };
              
              if (settings.emailEnabled) {
                emailResult = await sendEmailNotification(
                  "total",
                  Number(newCommission.total_commission),
                  totalAmount,
                  settings.threshold,
                  supplierName
                );
                channel = emailResult.success ? "both" : "in_app";
              }

              // Log the notification
              await logNotification(
                "total",
                channel,
                Number(newCommission.total_commission),
                totalAmount,
                settings.threshold,
                supplierName,
                settings.emailEnabled ? (settings.emailAddress || undefined) : undefined,
                emailResult.success || !settings.emailEnabled ? "sent" : "failed",
                emailResult.error
              );
            }

            previousTotalRef.current = totalAmount;
          }
        }
      )
      .subscribe();

    // Initialize previous total
    const initPreviousTotal = async () => {
      const { data } = await supabase
        .from("commissions")
        .select("total_commission");
      
      if (data) {
        previousTotalRef.current = data.reduce(
          (sum, c) => sum + Number(c.total_commission),
          0
        );
      }
    };

    initPreviousTotal();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, isArabic, getSettings, sendEmailNotification, logNotification, sendPushNotification]);

  // Check success rate and send alerts
  const checkSuccessRate = useCallback(async () => {
    if (!user) return null;

    const settings = getSettings();
    if (!settings.successRateAlertEnabled) return null;

    // Determine the date range based on check period
    const now = new Date();
    let startDate: Date;
    
    if (settings.successRateCheckPeriod === "daily") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      // Weekly - last 7 days
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Fetch notification logs for the period
    const { data: logs, error } = await supabase
      .from("commission_notification_logs")
      .select("status")
      .eq("user_id", user.id)
      .gte("created_at", startDate.toISOString());

    if (error || !logs || logs.length === 0) return null;

    const successCount = logs.filter(l => l.status === "sent").length;
    const successRate = (successCount / logs.length) * 100;

    // Check if success rate is below threshold
    if (successRate < settings.successRateThreshold) {
      const title = isArabic 
        ? "⚠️ انخفاض نسبة نجاح الإشعارات!" 
        : "⚠️ Low Notification Success Rate!";
      const description = isArabic
        ? `نسبة النجاح ${successRate.toFixed(1)}% أقل من الحد المطلوب (${settings.successRateThreshold}%)`
        : `Success rate ${successRate.toFixed(1)}% is below threshold (${settings.successRateThreshold}%)`;

      playGlobalNotificationSound();
      
      toast({
        title,
        description,
        variant: "destructive",
      });

      // Send push notification if enabled
      if (settings.pushEnabled) {
        await sendPushNotification(title, description);
      }

      // Log the alert
      await logNotification(
        "total",
        settings.pushEnabled ? "both" : "in_app",
        0,
        0,
        settings.successRateThreshold,
        undefined,
        undefined,
        "sent",
        undefined
      );

      return { successRate, threshold: settings.successRateThreshold, alert: true };
    }

    return { successRate, threshold: settings.successRateThreshold, alert: false };
  }, [user, getSettings, isArabic, toast, sendPushNotification, logNotification]);

  // Auto-check success rate periodically
  useEffect(() => {
    if (!user) return;

    const settings = getSettings();
    if (!settings.successRateAlertEnabled) return;

    // Check immediately on mount
    checkSuccessRate();

    // Set up periodic check (every hour for daily, every 6 hours for weekly)
    const intervalMs = settings.successRateCheckPeriod === "daily" 
      ? 60 * 60 * 1000  // 1 hour
      : 6 * 60 * 60 * 1000; // 6 hours

    const interval = setInterval(checkSuccessRate, intervalMs);

    return () => clearInterval(interval);
  }, [user, getSettings, checkSuccessRate]);

  // Reset notification flag when threshold changes
  const resetNotification = useCallback(() => {
    hasNotifiedRef.current = false;
  }, []);

  // Log retry attempt to database
  const logRetryAttempt = useCallback(async (
    originalNotificationId: string,
    attemptNumber: number,
    status: "pending" | "success" | "failed",
    errorMessage?: string,
    notificationType: string = "commission",
    notificationData?: any
  ) => {
    if (!user) return;

    try {
      const insertData: any = {
        user_id: user.id,
        original_notification_id: originalNotificationId,
        attempt_number: attemptNumber,
        status,
        error_message: errorMessage,
        notification_type: notificationType,
        notification_data: notificationData,
      };

      if (status !== "pending") {
        insertData.completed_at = new Date().toISOString();
      }

      await supabase.from("notification_retry_logs").insert(insertData);
    } catch (error) {
      console.error("Error logging retry attempt:", error);
    }
  }, [user]);

  // Retry a single failed notification
  const retryNotification = useCallback(async (logId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Get the failed log details
      const { data: log, error: fetchError } = await supabase
        .from("commission_notification_logs")
        .select("*")
        .eq("id", logId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError || !log) {
        console.error("Failed to fetch log for retry:", fetchError);
        return false;
      }

      if (log.status !== "failed") return false;

      // Get current retry count
      const retryCountsKey = `notification_retry_counts_${user.id}`;
      const retryCounts: Record<string, number> = JSON.parse(
        localStorage.getItem(retryCountsKey) || "{}"
      );
      const attemptNumber = (retryCounts[logId] || 0) + 1;

      // Log the retry attempt as pending
      await logRetryAttempt(
        logId,
        attemptNumber,
        "pending",
        undefined,
        "commission",
        {
          alert_type: log.alert_type,
          commission_amount: log.commission_amount,
          supplier_name: log.supplier_name,
        }
      );

      const settings = getSettings();
      
      // Retry email notification
      const result = await sendEmailNotification(
        log.alert_type as "single" | "total",
        Number(log.commission_amount),
        Number(log.total_amount),
        Number(log.threshold),
        log.supplier_name || undefined
      );

      if (result.success) {
        // Log success
        await logRetryAttempt(
          logId,
          attemptNumber,
          "success",
          undefined,
          "commission",
          {
            alert_type: log.alert_type,
            commission_amount: log.commission_amount,
            supplier_name: log.supplier_name,
          }
        );

        // Delete the failed log and create a new successful one
        await supabase
          .from("commission_notification_logs")
          .delete()
          .eq("id", logId);

        await logNotification(
          log.alert_type as "single" | "total",
          "email",
          Number(log.commission_amount),
          Number(log.total_amount),
          Number(log.threshold),
          log.supplier_name || undefined,
          settings.emailAddress || undefined,
          "sent"
        );

        // Remove from retry counts
        delete retryCounts[logId];
        localStorage.setItem(retryCountsKey, JSON.stringify(retryCounts));

        toast({
          title: isArabic ? "✅ تمت إعادة المحاولة بنجاح" : "✅ Retry Successful",
          description: isArabic 
            ? "تم إرسال الإشعار بنجاح" 
            : "Notification sent successfully",
        });

        return true;
      } else {
        // Log failure
        await logRetryAttempt(
          logId,
          attemptNumber,
          "failed",
          result.error,
          "commission",
          {
            alert_type: log.alert_type,
            commission_amount: log.commission_amount,
            supplier_name: log.supplier_name,
          }
        );

        // Update retry count
        retryCounts[logId] = attemptNumber;
        localStorage.setItem(retryCountsKey, JSON.stringify(retryCounts));

        toast({
          title: isArabic ? "❌ فشل إعادة المحاولة" : "❌ Retry Failed",
          description: result.error || (isArabic ? "حدث خطأ" : "An error occurred"),
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error retrying notification:", error);
      return false;
    }
  }, [user, getSettings, sendEmailNotification, logNotification, logRetryAttempt, toast, isArabic]);

  // Retry all failed notifications
  const retryAllFailed = useCallback(async (): Promise<{ success: number; failed: number }> => {
    if (!user) return { success: 0, failed: 0 };

    const { data: failedLogs, error } = await supabase
      .from("commission_notification_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "failed");

    if (error || !failedLogs) return { success: 0, failed: 0 };

    let successCount = 0;
    let failedCount = 0;

    for (const log of failedLogs) {
      const result = await retryNotification(log.id);
      if (result) {
        successCount++;
      } else {
        failedCount++;
      }
      // Small delay between retries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { success: successCount, failed: failedCount };
  }, [user, retryNotification]);

  // Auto-retry failed notifications periodically
  useEffect(() => {
    if (!user) return;

    const settings = getSettings();
    if (!settings.autoRetryEnabled) return;

    const checkAndRetryFailed = async () => {
      const { data: failedLogs, error } = await supabase
        .from("commission_notification_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "failed")
        .order("created_at", { ascending: true });

      if (error || !failedLogs || failedLogs.length === 0) return;

      // Get retry count from localStorage
      const retryCountsKey = `notification_retry_counts_${user.id}`;
      const retryCounts: Record<string, number> = JSON.parse(
        localStorage.getItem(retryCountsKey) || "{}"
      );

      for (const log of failedLogs) {
        const currentRetries = retryCounts[log.id] || 0;
        
        if (currentRetries >= settings.autoRetryMaxAttempts) {
          continue; // Skip if max attempts reached
        }

        // Check if enough time has passed since last attempt
        const logTime = new Date(log.created_at).getTime();
        const now = Date.now();
        const delayMs = settings.autoRetryDelayMinutes * 60 * 1000;
        
        if (now - logTime < delayMs * (currentRetries + 1)) {
          continue; // Not enough time passed
        }

        const result = await retryNotification(log.id);
        
        if (!result) {
          // Update retry count
          retryCounts[log.id] = currentRetries + 1;
          localStorage.setItem(retryCountsKey, JSON.stringify(retryCounts));
        } else {
          // Remove from retry counts on success
          delete retryCounts[log.id];
          localStorage.setItem(retryCountsKey, JSON.stringify(retryCounts));
        }

        // Small delay between retries
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    };

    // Check immediately
    checkAndRetryFailed();

    // Check periodically (every minute)
    const interval = setInterval(checkAndRetryFailed, 60 * 1000);

    return () => clearInterval(interval);
  }, [user, getSettings, retryNotification]);

  return {
    getSettings,
    saveSettings,
    resetNotification,
    requestPushPermission,
    checkSuccessRate,
    retryNotification,
    retryAllFailed,
  };
};
