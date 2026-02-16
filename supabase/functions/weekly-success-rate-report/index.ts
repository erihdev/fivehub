import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationLog {
  id: string;
  status: string;
  notification_channel: string;
  created_at: string;
  alert_type: string;
  commission_amount: number;
  error_message: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting weekly success rate report...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let testMode = false;
    let targetEmail: string | null = null;
    let targetUserId: string | null = null;
    
    try {
      const body = await req.json();
      testMode = body?.testMode || false;
      targetEmail = body?.email || null;
      targetUserId = body?.userId || null;
      console.log("Request params:", { testMode, targetEmail, targetUserId });
    } catch {
      console.log("No body or invalid JSON, using defaults");
    }

    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(oneWeekAgo);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);

    // Get admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .eq("status", "approved");

    if (adminError) {
      console.error("Error fetching admins:", adminError);
      throw adminError;
    }

    const usersToProcess = targetUserId 
      ? [{ user_id: targetUserId }] 
      : (adminUsers || []);

    if (usersToProcess.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No users to process" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const errorMessages: string[] = [];

    for (const user of usersToProcess) {
      try {
        // Fetch this week's notification logs
        const { data: thisWeekLogs, error: logsError } = await supabase
          .from("commission_notification_logs")
          .select("*")
          .eq("user_id", user.user_id)
          .gte("created_at", oneWeekAgo.toISOString())
          .lte("created_at", now.toISOString());

        if (logsError) {
          console.error("Error fetching logs:", logsError);
          continue;
        }

        // Fetch last week's logs for comparison
        const { data: lastWeekLogs } = await supabase
          .from("commission_notification_logs")
          .select("*")
          .eq("user_id", user.user_id)
          .gte("created_at", twoWeeksAgo.toISOString())
          .lt("created_at", oneWeekAgo.toISOString());

        const logs = thisWeekLogs || [];
        const prevLogs = lastWeekLogs || [];

        // Calculate stats for this week
        const totalNotifications = logs.length;
        const successfulNotifications = logs.filter((l: NotificationLog) => l.status === "sent").length;
        const failedNotifications = logs.filter((l: NotificationLog) => l.status === "failed").length;
        const successRate = totalNotifications > 0 ? (successfulNotifications / totalNotifications) * 100 : 0;

        // Calculate stats for last week
        const prevTotal = prevLogs.length;
        const prevSuccessful = prevLogs.filter((l: NotificationLog) => l.status === "sent").length;
        const prevSuccessRate = prevTotal > 0 ? (prevSuccessful / prevTotal) * 100 : 0;

        // Channel breakdown
        const inAppCount = logs.filter((l: NotificationLog) => l.notification_channel === "in_app").length;
        const emailCount = logs.filter((l: NotificationLog) => l.notification_channel === "email").length;
        const bothCount = logs.filter((l: NotificationLog) => l.notification_channel === "both").length;

        // Daily breakdown
        const dailyStats: Record<string, { total: number; success: number; failed: number }> = {};
        logs.forEach((log: NotificationLog) => {
          const day = new Date(log.created_at).toISOString().split("T")[0];
          if (!dailyStats[day]) {
            dailyStats[day] = { total: 0, success: 0, failed: 0 };
          }
          dailyStats[day].total++;
          if (log.status === "sent") {
            dailyStats[day].success++;
          } else {
            dailyStats[day].failed++;
          }
        });

        // Common errors
        const errorCounts: Record<string, number> = {};
        logs.filter((l: NotificationLog) => l.status === "failed" && l.error_message).forEach((log: NotificationLog) => {
          const error = log.error_message || "Unknown";
          errorCounts[error] = (errorCounts[error] || 0) + 1;
        });
        const topErrors = Object.entries(errorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        // Calculate change
        const rateChange = successRate - prevSuccessRate;
        const countChange = prevTotal > 0 ? ((totalNotifications - prevTotal) / prevTotal) * 100 : 0;

        // Get user email
        let recipientEmail = targetEmail;
        if (!recipientEmail) {
          const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id);
          recipientEmail = authUser?.user?.email || null;
        }

        if (!recipientEmail) {
          console.log("No email found for user:", user.user_id);
          continue;
        }

        const formatDate = (date: Date) => date.toLocaleDateString("ar-SA", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const getStatusColor = (rate: number) => {
          if (rate >= 90) return "#16a34a";
          if (rate >= 70) return "#ca8a04";
          return "#dc2626";
        };

        const getStatusLabel = (rate: number) => {
          if (rate >= 90) return "ممتاز";
          if (rate >= 70) return "جيد";
          return "يحتاج تحسين";
        };

        const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .main-stat { text-align: center; padding: 30px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; margin-bottom: 25px; }
    .main-stat-value { font-size: 48px; font-weight: bold; color: ${getStatusColor(successRate)}; }
    .main-stat-label { font-size: 18px; color: #374151; margin-top: 8px; }
    .main-stat-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; color: white; background: ${getStatusColor(successRate)}; margin-top: 12px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; }
    .stat-card { background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1e293b; }
    .stat-label { font-size: 14px; color: #64748b; margin-top: 5px; }
    .stat-change { font-size: 12px; margin-top: 8px; padding: 4px 8px; border-radius: 20px; display: inline-block; }
    .stat-change.positive { background: #dcfce7; color: #16a34a; }
    .stat-change.negative { background: #fee2e2; color: #dc2626; }
    .section { margin-top: 25px; }
    .section h3 { color: #1e293b; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    .channel-bar { display: flex; gap: 10px; margin-bottom: 15px; }
    .channel-item { flex: 1; text-align: center; padding: 15px; border-radius: 8px; }
    .channel-item.in-app { background: #dbeafe; color: #1d4ed8; }
    .channel-item.email { background: #fef3c7; color: #b45309; }
    .channel-item.both { background: #e0e7ff; color: #4338ca; }
    .channel-value { font-size: 20px; font-weight: bold; }
    .channel-label { font-size: 12px; margin-top: 4px; }
    .error-list { list-style: none; padding: 0; margin: 0; }
    .error-item { display: flex; justify-content: space-between; padding: 12px; background: #fef2f2; border-radius: 8px; margin-bottom: 8px; }
    .error-text { color: #991b1b; font-size: 14px; }
    .error-count { background: #dc2626; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
    .tip { background: #fef3c7; border-radius: 8px; padding: 15px; margin-top: 20px; }
    .tip-title { color: #92400e; font-weight: bold; margin-bottom: 8px; }
    .tip-text { color: #78350f; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📈 تقرير نسبة نجاح الإشعارات الأسبوعي</h1>
      <p>${formatDate(oneWeekAgo)} - ${formatDate(now)}</p>
    </div>
    
    <div class="content">
      <div class="main-stat">
        <div class="main-stat-value">${successRate.toFixed(1)}%</div>
        <div class="main-stat-label">نسبة النجاح هذا الأسبوع</div>
        <div class="main-stat-badge">${getStatusLabel(successRate)}</div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${totalNotifications}</div>
          <div class="stat-label">إجمالي الإشعارات</div>
          <div class="stat-change ${countChange >= 0 ? 'positive' : 'negative'}">
            ${countChange >= 0 ? '↑' : '↓'} ${Math.abs(countChange).toFixed(1)}%
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #16a34a;">${successfulNotifications}</div>
          <div class="stat-label">ناجحة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #dc2626;">${failedNotifications}</div>
          <div class="stat-label">فاشلة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${prevSuccessRate.toFixed(1)}%</div>
          <div class="stat-label">الأسبوع السابق</div>
          <div class="stat-change ${rateChange >= 0 ? 'positive' : 'negative'}">
            ${rateChange >= 0 ? '↑' : '↓'} ${Math.abs(rateChange).toFixed(1)}%
          </div>
        </div>
      </div>

      <div class="section">
        <h3>📊 توزيع القنوات</h3>
        <div class="channel-bar">
          <div class="channel-item in-app">
            <div class="channel-value">${inAppCount}</div>
            <div class="channel-label">داخل التطبيق</div>
          </div>
          <div class="channel-item email">
            <div class="channel-value">${emailCount}</div>
            <div class="channel-label">بريد إلكتروني</div>
          </div>
          <div class="channel-item both">
            <div class="channel-value">${bothCount}</div>
            <div class="channel-label">كلاهما</div>
          </div>
        </div>
      </div>

      ${topErrors.length > 0 ? `
      <div class="section">
        <h3>⚠️ أكثر الأخطاء شيوعاً</h3>
        <ul class="error-list">
          ${topErrors.map(([error, count]) => `
            <li class="error-item">
              <span class="error-text">${error.substring(0, 50)}${error.length > 50 ? '...' : ''}</span>
              <span class="error-count">${count}</span>
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}

      ${successRate < 80 ? `
      <div class="tip">
        <div class="tip-title">💡 نصيحة لتحسين نسبة النجاح</div>
        <div class="tip-text">
          تأكد من صحة عناوين البريد الإلكتروني وتفعيل إشعارات المتصفح. 
          يمكنك أيضاً مراجعة سجلات الأخطاء لمعرفة أسباب الفشل وإعادة المحاولة للإشعارات الفاشلة.
        </div>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p>تم إرسال هذا التقرير تلقائياً من منصة دال ☕</p>
      <p style="margin-top: 10px; font-size: 12px;">
        ${testMode ? '⚠️ هذا تقرير تجريبي' : `التاريخ: ${new Date().toLocaleDateString("ar-SA")}`}
      </p>
    </div>
  </div>
</body>
</html>
        `;

        console.log(`Sending success rate report to: ${recipientEmail}`);
        
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "دال <onboarding@resend.dev>",
            to: [recipientEmail],
            subject: `📈 تقرير نسبة نجاح الإشعارات - ${successRate.toFixed(1)}% - ${formatDate(now)}`,
            html: emailHtml,
          }),
        });

        if (res.ok) {
          console.log("Report sent successfully to:", recipientEmail);
          sentCount++;

          // Log the sent report
          await supabase.from("sent_reports").insert({
            user_id: user.user_id,
            report_type: "weekly_success_rate",
            recipient_email: recipientEmail,
            status: "sent",
            is_test: testMode,
            report_data: {
              success_rate: successRate,
              total_notifications: totalNotifications,
              successful_notifications: successfulNotifications,
              failed_notifications: failedNotifications,
              previous_success_rate: prevSuccessRate,
              rate_change: rateChange,
              date_range: { from: oneWeekAgo.toISOString(), to: now.toISOString() },
            },
          });
        } else {
          const errorData = await res.text();
          console.error(`Failed to send report to ${recipientEmail}:`, errorData);
          errorMessages.push(`${recipientEmail}: ${errorData}`);

          await supabase.from("sent_reports").insert({
            user_id: user.user_id,
            report_type: "weekly_success_rate",
            recipient_email: recipientEmail,
            status: "failed",
            is_test: testMode,
            error_message: errorData,
          });
        }
      } catch (userError: any) {
        console.error(`Error processing user ${user.user_id}:`, userError);
        errorMessages.push(`User ${user.user_id}: ${userError.message}`);
      }
    }

    console.log(`Report completed. Sent: ${sentCount}/${usersToProcess.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: usersToProcess.length,
        errors: errorMessages,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in weekly-success-rate-report:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
