import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PerformanceData {
  score: number;
  ordersCount: number;
  ordersValue: number;
  lowStockItems: number;
  stockTurnover: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, threshold = 40 } = await req.json();

    // Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData?.user?.email) {
      console.error("Error getting user:", userError);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = userData.user.email;

    // Calculate performance metrics
    const now = new Date();
    const periodDays = 7;
    const currentStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    currentStart.setHours(0, 0, 0, 0);
    const previousStart = new Date(now.getTime() - periodDays * 2 * 24 * 60 * 60 * 1000);
    previousStart.setHours(0, 0, 0, 0);
    const previousEnd = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    previousEnd.setHours(0, 0, 0, 0);

    // Fetch inventory
    const { data: inventory } = await supabase
      .from("inventory")
      .select("quantity_kg, min_quantity_kg")
      .eq("user_id", userId);

    // Fetch current period orders
    const { data: currentOrders } = await supabase
      .from("orders")
      .select("quantity_kg, total_price, notes")
      .eq("user_id", userId)
      .gte("order_date", currentStart.toISOString().split("T")[0]);

    // Fetch previous period orders
    const { data: previousOrders } = await supabase
      .from("orders")
      .select("quantity_kg, total_price, notes")
      .eq("user_id", userId)
      .gte("order_date", previousStart.toISOString().split("T")[0])
      .lt("order_date", previousEnd.toISOString().split("T")[0]);

    const totalStock = inventory?.reduce((sum, i) => sum + (i.quantity_kg || 0), 0) || 0;
    const lowStockItems = inventory?.filter(i => i.quantity_kg <= i.min_quantity_kg).length || 0;

    const currentOrdersCount = currentOrders?.length || 0;
    const currentOrdersValue = currentOrders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
    const currentQuantity = currentOrders?.reduce((sum, o) => sum + (o.quantity_kg || 0), 0) || 0;
    const previousOrdersCount = previousOrders?.length || 0;

    const stockTurnover = totalStock > 0 ? (currentQuantity / totalStock) * 100 : 0;

    // Calculate performance score
    let score = 50;
    const ordersChange = previousOrdersCount > 0 
      ? ((currentOrdersCount - previousOrdersCount) / previousOrdersCount) * 100 
      : (currentOrdersCount > 0 ? 100 : 0);
    score += Math.min(ordersChange / 2, 20);
    score -= lowStockItems * 5;
    if (stockTurnover > 20) score += 10;
    score = Math.max(0, Math.min(100, Math.round(score)));

    console.log(`Performance score for user ${userId}: ${score}, threshold: ${threshold}`);

    // Check if score is below threshold
    if (score >= threshold) {
      return new Response(
        JSON.stringify({ 
          message: "Performance is above threshold", 
          score, 
          threshold,
          emailSent: false 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send alert email
    const performanceData: PerformanceData = {
      score,
      ordersCount: currentOrdersCount,
      ordersValue: currentOrdersValue,
      lowStockItems,
      stockTurnover: Math.round(stockTurnover),
    };

    const scoreLabel = score >= 70 ? "ممتاز" : score >= 40 ? "جيد" : "يحتاج تحسين";
    const scoreColor = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #7c2d12, #a16207); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .score-card { text-align: center; padding: 30px; background: #fafafa; border-radius: 12px; margin-bottom: 20px; }
          .score { font-size: 64px; font-weight: bold; color: ${scoreColor}; }
          .score-label { font-size: 18px; color: #666; margin-top: 10px; }
          .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
          .metric { background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center; }
          .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; }
          .metric-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
          .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin-top: 20px; }
          .alert-title { color: #dc2626; font-weight: bold; margin-bottom: 10px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>☕ تنبيه أداء المخزون</h1>
          </div>
          <div class="content">
            <div class="score-card">
              <div class="score">${score}</div>
              <div class="score-label">${scoreLabel}</div>
            </div>
            
            <div class="alert-box">
              <div class="alert-title">⚠️ تنبيه: مؤشر الأداء منخفض</div>
              <p>مؤشر أداء المخزون الخاص بك (${score}) أقل من الحد المطلوب (${threshold}). يرجى مراجعة المخزون واتخاذ الإجراءات اللازمة.</p>
            </div>

            <div class="metrics">
              <div class="metric">
                <div class="metric-value">${currentOrdersCount}</div>
                <div class="metric-label">الطلبات</div>
              </div>
              <div class="metric">
                <div class="metric-value">${currentOrdersValue.toLocaleString()} ر.س</div>
                <div class="metric-label">قيمة الطلبات</div>
              </div>
              <div class="metric">
                <div class="metric-value">${lowStockItems}</div>
                <div class="metric-label">مخزون منخفض</div>
              </div>
              <div class="metric">
                <div class="metric-value">${Math.round(stockTurnover)}%</div>
                <div class="metric-label">معدل الدوران</div>
              </div>
            </div>
          </div>
          <div class="footer">
            <p>تاريخ التقرير: ${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0,5)}</p>
            <p>منصة دال للقهوة المختصة</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "دال <onboarding@resend.dev>",
      to: [userEmail],
      subject: `⚠️ تنبيه: مؤشر أداء المخزون منخفض (${score}/100)`,
      html,
    });

    // Log the alert
    await supabase.from("performance_alert_logs").insert({
      user_id: userId,
      score,
      threshold,
      recipient_email: userEmail,
      status: emailError ? "failed" : "sent",
      error_message: emailError?.message || null,
      alert_data: {
        ordersCount: currentOrdersCount,
        ordersValue: currentOrdersValue,
        lowStockItems,
        stockTurnover: Math.round(stockTurnover),
      },
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ error: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Performance alert email sent to ${userEmail}`);

    return new Response(
      JSON.stringify({ 
        message: "Performance alert sent", 
        score, 
        threshold,
        emailSent: true,
        recipient: userEmail 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in performance-alert function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
