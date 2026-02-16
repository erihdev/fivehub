import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportData {
  email: string;
  userName: string;
  weekStart: string;
  weekEnd: string;
  totalOrders: number;
  ordersValue: number;
  lowStockItems: { name: string; quantity: number }[];
  predictions: { name: string; daysUntilEmpty: number; reorderDate: string }[];
  autoReorders: number;
}

const generateReportHTML = (data: ReportData): string => {
  const lowStockHtml = data.lowStockItems.length > 0 
    ? data.lowStockItems.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #dc2626;">${item.quantity} كجم</td>
        </tr>
      `).join('')
    : '<tr><td colspan="2" style="padding: 10px; text-align: center; color: #666;">لا توجد عناصر منخفضة المخزون</td></tr>';

  const predictionsHtml = data.predictions.length > 0
    ? data.predictions.map(pred => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${pred.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${pred.daysUntilEmpty} يوم</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${pred.reorderDate}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #666;">لا توجد تنبؤات حالية</td></tr>';

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #8B4513, #A0522D); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .stats { display: flex; gap: 15px; margin-bottom: 30px; }
        .stat { flex: 1; background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 28px; font-weight: bold; color: #8B4513; }
        .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
        .section { margin-bottom: 25px; }
        .section h3 { color: #333; border-bottom: 2px solid #8B4513; padding-bottom: 10px; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8f9fa; padding: 12px 10px; text-align: right; font-weight: 600; color: #333; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .cta { display: inline-block; background: #8B4513; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>☕ تقرير المخزون الأسبوعي</h1>
          <p>${data.weekStart} - ${data.weekEnd}</p>
        </div>
        
        <div class="content">
          <p>مرحباً ${data.userName}،</p>
          <p>إليك ملخص نشاط المخزون والطلبات لهذا الأسبوع:</p>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${data.totalOrders}</div>
              <div class="stat-label">إجمالي الطلبات</div>
            </div>
            <div class="stat">
              <div class="stat-value">${data.ordersValue.toLocaleString()}</div>
              <div class="stat-label">قيمة الطلبات (ر.س)</div>
            </div>
            <div class="stat">
              <div class="stat-value">${data.autoReorders}</div>
              <div class="stat-label">إعادة طلب تلقائي</div>
            </div>
          </div>
          
          <div class="section">
            <h3>⚠️ عناصر منخفضة المخزون</h3>
            <table>
              <thead>
                <tr>
                  <th>القهوة</th>
                  <th>الكمية المتبقية</th>
                </tr>
              </thead>
              <tbody>
                ${lowStockHtml}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h3>🔮 التنبؤات الذكية</h3>
            <table>
              <thead>
                <tr>
                  <th>القهوة</th>
                  <th>أيام حتى النفاد</th>
                  <th>تاريخ إعادة الطلب</th>
                </tr>
              </thead>
              <tbody>
                ${predictionsHtml}
              </tbody>
            </table>
          </div>
          
          <div style="text-align: center;">
            <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/inventory-report" class="cta">
              عرض التقرير الكامل
            </a>
          </div>
        </div>
        
        <div class="footer">
          <p>تم إرسال هذا التقرير تلقائياً من منصة دال للقهوة</p>
          <p>© ${new Date().getFullYear()} دال - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============= AUTHENTICATION CHECK =============
    // Check for CRON_SECRET (for scheduled/cron calls)
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedCronSecret = Deno.env.get("CRON_SECRET");
    
    let isAuthorized = false;
    let requestingUserId: string | null = null;
    
    // Option 1: CRON_SECRET for scheduled calls
    if (cronSecret && expectedCronSecret && cronSecret === expectedCronSecret) {
      isAuthorized = true;
      console.log("Authorized via CRON_SECRET");
    } else {
      // Option 2: JWT + Admin role for manual triggers
      const authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.error("Missing or invalid Authorization header");
        return new Response(
          JSON.stringify({ error: "Unauthorized - Missing authentication" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Create a client with the user's JWT to verify their identity
      const userSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: userError } = await userSupabase.auth.getUser();
      
      if (userError || !user) {
        console.error("Failed to get user from JWT:", userError);
        return new Response(
          JSON.stringify({ error: "Unauthorized - Invalid token" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      requestingUserId = user.id;

      // Check if user is admin using service role client
      const { data: isAdmin } = await supabase.rpc("is_verified_admin", { _user_id: user.id });

      if (!isAdmin) {
        console.error("User is not an admin:", user.id);
        return new Response(
          JSON.stringify({ error: "Forbidden - Admin access required" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      isAuthorized = true;
      console.log("Authorized via JWT + Admin role for user:", user.id);
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    // ============= END AUTHENTICATION CHECK =============

    // Check if this is a test mode request
    let testMode = false;
    let targetUserId: string | null = null;
    
    try {
      const body = await req.clone().json();
      testMode = body.testMode === true;
      targetUserId = body.userId || null;
    } catch {
      // No body or invalid JSON, continue with normal mode
    }

    // Get users - either specific user for test or all users
    let usersQuery = supabase.from("profiles").select("user_id, full_name");
    
    if (testMode && targetUserId) {
      usersQuery = usersQuery.eq("user_id", targetUserId);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) throw usersError;

    const weekEnd = new Date();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const results = [];

    for (const user of users || []) {
      // Get user email from auth
      const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id);
      if (!authUser?.user?.email) continue;

      // Get orders for this week
      const { data: orders } = await supabase
        .from("orders")
        .select("total_price, notes")
        .eq("user_id", user.user_id)
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      const totalOrders = orders?.length || 0;
      const ordersValue = orders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
      const autoReorders = orders?.filter(o => o.notes?.includes("إعادة طلب تلقائي")).length || 0;

      // Get low stock items
      const { data: inventory } = await supabase
        .from("inventory")
        .select("quantity_kg, min_quantity_kg, coffee_offerings(name)")
        .eq("user_id", user.user_id)
        .lte("quantity_kg", supabase.rpc("", {}));

      const lowStockItems = (inventory || [])
        .filter((item: any) => item.quantity_kg <= item.min_quantity_kg)
        .map((item: any) => ({
          name: item.coffee_offerings?.name || "غير معروف",
          quantity: item.quantity_kg,
        }));

      // Get recent predictions
      const { data: predictions } = await supabase
        .from("inventory_predictions")
        .select("coffee_name, predicted_days_until_empty, predicted_reorder_date")
        .eq("user_id", user.user_id)
        .is("verified_at", null)
        .order("predicted_reorder_date", { ascending: true })
        .limit(5);

      const reportData: ReportData = {
        email: authUser.user.email,
        userName: user.full_name || "المستخدم",
        weekStart: weekStart.toLocaleDateString("ar-SA"),
        weekEnd: weekEnd.toLocaleDateString("ar-SA"),
        totalOrders,
        ordersValue,
        autoReorders,
        lowStockItems,
        predictions: (predictions || []).map((p: any) => ({
          name: p.coffee_name,
          daysUntilEmpty: p.predicted_days_until_empty,
          reorderDate: new Date(p.predicted_reorder_date).toLocaleDateString("ar-SA"),
        })),
      };

      const html = generateReportHTML(reportData);

      const { error: emailError } = await resend.emails.send({
        from: "دال <onboarding@resend.dev>",
        to: [reportData.email],
        subject: `☕ تقرير المخزون الأسبوعي - ${reportData.weekEnd}`,
        html,
      });

      // Log the sent report
      await supabase.from("sent_reports").insert({
        user_id: user.user_id,
        report_type: "weekly",
        recipient_email: reportData.email,
        status: emailError ? "failed" : "sent",
        error_message: emailError?.message || null,
        is_test: testMode,
        report_data: {
          totalOrders,
          ordersValue,
          autoReorders,
          lowStockCount: lowStockItems.length,
          predictionsCount: predictions?.length || 0,
        },
      });

      if (emailError) {
        console.error(`Failed to send email to ${reportData.email}:`, emailError);
        results.push({ email: reportData.email, success: false, error: emailError.message });
      } else {
        console.log(`Report sent to ${reportData.email}`);
        results.push({ email: reportData.email, success: true });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-weekly-report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
