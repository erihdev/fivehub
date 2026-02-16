import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PerformanceMetrics {
  totalStock: number;
  lowStockItems: number;
  ordersCount: number;
  ordersValue: number;
  autoReorders: number;
  stockTurnover: number;
  performanceScore: number;
}

const calculatePerformanceScore = (metrics: PerformanceMetrics): number => {
  let score = 50;
  
  // Orders growth factor
  if (metrics.ordersCount > 0) score += 20;
  if (metrics.ordersCount > 5) score += 10;
  
  // Low stock penalty
  if (metrics.lowStockItems > 0) score -= metrics.lowStockItems * 5;
  
  // Stock turnover bonus
  if (metrics.stockTurnover > 0.5) score += 15;
  if (metrics.stockTurnover > 1) score += 5;
  
  return Math.max(0, Math.min(100, score));
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting daily performance summary...");

    // Get all users with performance alerts enabled
    const { data: settings, error: settingsError } = await supabase
      .from("performance_alert_settings")
      .select("user_id, email_alerts")
      .eq("alerts_enabled", true)
      .eq("email_alerts", true);

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      throw settingsError;
    }

    console.log(`Found ${settings?.length || 0} users with alerts enabled`);

    const results = [];

    for (const setting of settings || []) {
      try {
        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(setting.user_id);
        const userEmail = userData?.user?.email;

        if (!userEmail) {
          console.log(`No email for user ${setting.user_id}`);
          continue;
        }

        // Calculate today's metrics
        const today = new Date();
        const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();

        // Get inventory data
        const { data: inventory } = await supabase
          .from("inventory")
          .select("quantity_kg, min_quantity_kg, auto_reorder_enabled, last_auto_reorder_at")
          .eq("user_id", setting.user_id);

        // Get today's orders
        const { data: orders } = await supabase
          .from("orders")
          .select("total_price")
          .eq("user_id", setting.user_id)
          .gte("created_at", todayStart);

        const metrics: PerformanceMetrics = {
          totalStock: inventory?.reduce((sum, i) => sum + Number(i.quantity_kg), 0) || 0,
          lowStockItems: inventory?.filter(i => Number(i.quantity_kg) < Number(i.min_quantity_kg)).length || 0,
          ordersCount: orders?.length || 0,
          ordersValue: orders?.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0) || 0,
          autoReorders: inventory?.filter(i => i.auto_reorder_enabled && i.last_auto_reorder_at).length || 0,
          stockTurnover: 0,
          performanceScore: 0,
        };

        metrics.performanceScore = calculatePerformanceScore(metrics);

        // Get yesterday's score for comparison
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const { data: yesterdayLog } = await supabase
          .from("performance_alert_logs")
          .select("score")
          .eq("user_id", setting.user_id)
          .gte("sent_at", yesterday.toISOString())
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const scoreDiff = yesterdayLog ? metrics.performanceScore - yesterdayLog.score : 0;
        const trendIcon = scoreDiff > 0 ? "📈" : scoreDiff < 0 ? "📉" : "➡️";
        const trendText = scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff.toString();

        // Send email
        const emailHtml = `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; padding: 20px; direction: rtl; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; }
              .content { padding: 30px; }
              .score-box { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 12px; margin-bottom: 20px; }
              .score { font-size: 48px; font-weight: bold; color: ${metrics.performanceScore >= 70 ? '#22c55e' : metrics.performanceScore >= 40 ? '#eab308' : '#ef4444'}; }
              .trend { font-size: 18px; color: #666; margin-top: 10px; }
              .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
              .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
              .metric-value { font-size: 24px; font-weight: bold; color: #333; }
              .metric-label { font-size: 12px; color: #666; margin-top: 5px; }
              .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📊 ملخص الأداء اليومي</h1>
                <p>${new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div class="content">
                <div class="score-box">
                  <div class="score">${metrics.performanceScore}</div>
                  <div class="trend">${trendIcon} ${trendText} مقارنة بالأمس</div>
                </div>
                <div class="metrics">
                  <div class="metric">
                    <div class="metric-value">${metrics.totalStock.toFixed(1)}</div>
                    <div class="metric-label">إجمالي المخزون (كجم)</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${metrics.lowStockItems}</div>
                    <div class="metric-label">عناصر منخفضة المخزون</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${metrics.ordersCount}</div>
                    <div class="metric-label">طلبات اليوم</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${metrics.ordersValue.toFixed(0)} ر.س</div>
                    <div class="metric-label">قيمة الطلبات</div>
                  </div>
                </div>
              </div>
              <div class="footer">
                <p>هذا الملخص يُرسل تلقائياً يومياً. يمكنك تعديل إعدادات التنبيهات من لوحة التحكم.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Dal Coffee <onboarding@resend.dev>",
            to: [userEmail],
            subject: `📊 ملخص الأداء اليومي - مؤشر الأداء: ${metrics.performanceScore}`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const emailError = await emailResponse.text();
          console.error(`Error sending to ${userEmail}:`, emailError);
          results.push({ user_id: setting.user_id, status: "failed", error: emailError });
        } else {
          console.log(`Daily summary sent to ${userEmail}`);
          results.push({ user_id: setting.user_id, status: "sent" });

          // Log the summary
          await supabase.from("performance_alert_logs").insert({
            user_id: setting.user_id,
            score: metrics.performanceScore,
            threshold: 0,
            recipient_email: userEmail,
            status: "sent",
            alert_data: {
              type: "daily_summary",
              ...metrics,
              scoreDiff,
            },
          });
        }
      } catch (userError) {
        console.error(`Error processing user ${setting.user_id}:`, userError);
        results.push({ user_id: setting.user_id, status: "error", error: String(userError) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in daily-performance-summary:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
