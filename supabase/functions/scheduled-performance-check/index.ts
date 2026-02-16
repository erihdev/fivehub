import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { threshold = 40 } = await req.json().catch(() => ({}));

    console.log("Starting scheduled performance check for all users...");

    // Get all users with report preferences enabled
    const { data: users, error: usersError } = await supabase
      .from("report_preferences")
      .select("user_id")
      .eq("weekly_report_enabled", true);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { userId: string; score: number; emailSent: boolean; error?: string }[] = [];

    for (const userRecord of users || []) {
      const userId = userRecord.user_id;

      try {
        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        if (!userData?.user?.email) continue;

        const userEmail = userData.user.email;

        // Calculate performance metrics
        const now = new Date();
        const periodDays = 7;
        const currentStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
        currentStart.setHours(0, 0, 0, 0);
        const previousStart = new Date(now.getTime() - periodDays * 2 * 24 * 60 * 60 * 1000);
        previousStart.setHours(0, 0, 0, 0);

        // Fetch inventory
        const { data: inventory } = await supabase
          .from("inventory")
          .select("quantity_kg, min_quantity_kg")
          .eq("user_id", userId);

        // Fetch current period orders
        const { data: currentOrders } = await supabase
          .from("orders")
          .select("quantity_kg, total_price")
          .eq("user_id", userId)
          .gte("order_date", currentStart.toISOString().split("T")[0]);

        // Fetch previous period orders
        const { data: previousOrders } = await supabase
          .from("orders")
          .select("quantity_kg, total_price")
          .eq("user_id", userId)
          .gte("order_date", previousStart.toISOString().split("T")[0])
          .lt("order_date", currentStart.toISOString().split("T")[0]);

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

        console.log(`User ${userId}: score=${score}, threshold=${threshold}`);

        if (score >= threshold) {
          results.push({ userId, score, emailSent: false });
          continue;
        }

        // Send alert email
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
              .content { padding: 30px; }
              .score-card { text-align: center; padding: 30px; background: #fafafa; border-radius: 12px; margin-bottom: 20px; }
              .score { font-size: 64px; font-weight: bold; color: ${scoreColor}; }
              .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>☕ تنبيه أداء المخزون اليومي</h1>
              </div>
              <div class="content">
                <div class="score-card">
                  <div class="score">${score}</div>
                  <p>${scoreLabel}</p>
                </div>
                <div class="alert-box">
                  <p><strong>⚠️ تنبيه:</strong> مؤشر أداء المخزون (${score}) أقل من الحد المطلوب (${threshold}).</p>
                  <p>الطلبات: ${currentOrdersCount} | القيمة: ${currentOrdersValue.toLocaleString()} ر.س | مخزون منخفض: ${lowStockItems}</p>
                </div>
              </div>
              <div class="footer">
                <p>تنبيه تلقائي من منصة دال</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const { error: emailError } = await resend.emails.send({
          from: "دال <onboarding@resend.dev>",
          to: [userEmail],
          subject: `⚠️ تنبيه يومي: مؤشر أداء المخزون منخفض (${score}/100)`,
          html,
        });

        if (emailError) {
          console.error(`Email error for ${userId}:`, emailError);
          results.push({ userId, score, emailSent: false, error: emailError.message });
        } else {
          console.log(`Alert sent to ${userEmail}`);
          results.push({ userId, score, emailSent: true });
        }

      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError);
        results.push({ userId, score: 0, emailSent: false, error: String(userError) });
      }
    }

    const alertsSent = results.filter(r => r.emailSent).length;
    console.log(`Scheduled check complete. Alerts sent: ${alertsSent}/${results.length}`);

    return new Response(
      JSON.stringify({ 
        message: "Scheduled performance check complete",
        totalUsers: results.length,
        alertsSent,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in scheduled-performance-check:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
