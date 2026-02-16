import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface CommissionReportSettings {
  id: string;
  user_id: string;
  enabled: boolean;
  report_day: number;
  report_hour: number;
  timezone: string;
  email_override: string | null;
}

interface Commission {
  id: string;
  order_total: number;
  supplier_commission: number;
  roaster_commission: number;
  total_commission: number;
  status: string;
  created_at: string;
  supplier?: { name: string };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Scheduled commission report function started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a manual test or scheduled run
    const body = await req.json().catch(() => ({}));
    const isTest = body.testMode === true;
    const specificUserId = body.userId;

    // Verify authentication - either cron secret or JWT
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');
    let authenticatedUserId: string | null = null;
    
    // Check JWT auth for manual triggers
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const userSupabase = createClient(supabaseUrl, supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userSupabase.auth.getUser();
      if (user) {
        authenticatedUserId = user.id;
      }
    }
    
    // For scheduled runs, verify cron secret
    // For manual test mode, verify user is requesting their own report or is admin
    const isCronAuth = cronSecret && expectedSecret && cronSecret === expectedSecret;
    
    if (!isCronAuth && !authenticatedUserId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If user is triggering for a specific user, verify permissions
    if (isTest && specificUserId && authenticatedUserId) {
      if (specificUserId !== authenticatedUserId) {
        const { data: isAdmin } = await supabase.rpc('is_verified_admin', { _user_id: authenticatedUserId });
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: 'Forbidden - Cannot request reports for other users' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Get all enabled commission report settings
    let query = supabase
      .from("commission_report_settings")
      .select("*")
      .eq("enabled", true);

    if (specificUserId) {
      query = query.eq("user_id", specificUserId);
    }

    const { data: settings, error: settingsError } = await query;

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      throw settingsError;
    }

    if (!settings || settings.length === 0) {
      console.log("No enabled commission report settings found");
      return new Response(
        JSON.stringify({ success: true, message: "No reports to send", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${settings.length} enabled settings`);

    const now = new Date();
    let sentCount = 0;
    const errors: string[] = [];

    for (const setting of settings as CommissionReportSettings[]) {
      try {
        // Check if it's the right day and hour (skip for test mode)
        if (!isTest) {
          const userNow = new Date(now.toLocaleString("en-US", { timeZone: setting.timezone }));
          const currentDay = userNow.getDay();
          const currentHour = userNow.getHours();

          if (currentDay !== setting.report_day || currentHour !== setting.report_hour) {
            console.log(`Skipping user ${setting.user_id}: not scheduled time`);
            continue;
          }
        }

        // Get user email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(setting.user_id);
        
        if (userError || !userData?.user?.email) {
          console.error(`Error getting user email for ${setting.user_id}:`, userError);
          continue;
        }

        const recipientEmail = setting.email_override || userData.user.email;

        // Get commissions for the past week
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { data: commissions, error: commissionsError } = await supabase
          .from("commissions")
          .select(`
            *,
            supplier:suppliers(name)
          `)
          .gte("created_at", weekAgo.toISOString())
          .order("created_at", { ascending: false });

        if (commissionsError) {
          console.error(`Error fetching commissions:`, commissionsError);
          continue;
        }

        // Calculate totals
        const totalCommission = (commissions || []).reduce((sum: number, c: Commission) => sum + Number(c.total_commission), 0);
        const totalSupplier = (commissions || []).reduce((sum: number, c: Commission) => sum + Number(c.supplier_commission), 0);
        const totalRoaster = (commissions || []).reduce((sum: number, c: Commission) => sum + Number(c.roaster_commission), 0);
        const totalOrderValue = (commissions || []).reduce((sum: number, c: Commission) => sum + Number(c.order_total), 0);
        const count = (commissions || []).length;

        // Group by supplier
        const supplierTotals: { [key: string]: { name: string; total: number; count: number } } = {};
        (commissions || []).forEach((c: Commission) => {
          const supplierId = c.supplier?.name || "Unknown";
          if (!supplierTotals[supplierId]) {
            supplierTotals[supplierId] = { name: supplierId, total: 0, count: 0 };
          }
          supplierTotals[supplierId].total += Number(c.total_commission);
          supplierTotals[supplierId].count += 1;
        });

        const topSuppliers = Object.values(supplierTotals)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        // Format date range
        const formatDate = (date: Date) => date.toLocaleDateString("ar-SA", { 
          year: "numeric", 
          month: "long", 
          day: "numeric" 
        });

        // Create email HTML
        const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; 
      background: #f8fafc; 
      padding: 40px; 
      direction: rtl;
      color: #1e293b;
    }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 32px; text-align: center; }
    .header h1 { font-size: 24px; margin-bottom: 8px; font-weight: 700; }
    .header p { opacity: 0.9; font-size: 14px; }
    .content { padding: 32px; }
    .highlight-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; }
    .highlight-label { font-size: 14px; color: #92400e; margin-bottom: 8px; }
    .highlight-value { font-size: 32px; font-weight: 700; color: #b45309; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat-card { background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center; }
    .stat-value { font-size: 20px; font-weight: 700; color: #1e293b; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    .supplier-list { list-style: none; }
    .supplier-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .supplier-item:last-child { border-bottom: none; }
    .supplier-name { font-weight: 500; }
    .supplier-value { color: #4F46E5; font-weight: 700; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>☕ تقرير العمولات الأسبوعي</h1>
      <p>من ${formatDate(weekAgo)} إلى ${formatDate(now)}</p>
    </div>
    
    <div class="content">
      <div class="highlight-box">
        <div class="highlight-label">إجمالي العمولات</div>
        <div class="highlight-value">${totalCommission.toFixed(2)} ر.س</div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value" style="color: #ea580c;">${totalSupplier.toFixed(2)}</div>
          <div class="stat-label">من الموردين</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #7c3aed;">${totalRoaster.toFixed(2)}</div>
          <div class="stat-label">من المحامص</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #2563eb;">${totalOrderValue.toFixed(0)}</div>
          <div class="stat-label">قيمة الطلبات</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #16a34a;">${count}</div>
          <div class="stat-label">عدد العمولات</div>
        </div>
      </div>

      ${topSuppliers.length > 0 ? `
      <div class="section">
        <div class="section-title">أعلى الموردين من حيث العمولات</div>
        <ul class="supplier-list">
          ${topSuppliers.map((s, i) => `
            <li class="supplier-item">
              <span class="supplier-name">${i + 1}. ${s.name}</span>
              <span class="supplier-value">${s.total.toFixed(2)} ر.س (${s.count} عمولة)</span>
            </li>
          `).join("")}
        </ul>
      </div>
      ` : ""}
    </div>
    
    <div class="footer">
      <p>تم إرسال هذا التقرير تلقائياً من منصة دال للقهوة المختصة</p>
      <p>يمكنك إدارة إعدادات التقارير من لوحة التحكم</p>
    </div>
  </div>
</body>
</html>
        `;

        // Send email
        const { error: emailError } = await resend.emails.send({
          from: "Dal Coffee <onboarding@resend.dev>",
          to: [recipientEmail],
          subject: `تقرير العمولات الأسبوعي - ${formatDate(now)}`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`Error sending email to ${recipientEmail}:`, emailError);
          errors.push(`Failed to send to ${recipientEmail}: ${emailError.message}`);
          continue;
        }

        // Update last_sent_at
        await supabase
          .from("commission_report_settings")
          .update({ last_sent_at: now.toISOString() })
          .eq("id", setting.id);

        console.log(`Commission report sent to ${recipientEmail}`);
        sentCount++;

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error processing setting ${setting.id}:`, error);
        errors.push(`Error for user ${setting.user_id}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        errors: errors.length > 0 ? errors : undefined 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in scheduled-commission-report:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);
