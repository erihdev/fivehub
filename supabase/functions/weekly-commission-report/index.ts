import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Commission {
  id: string;
  order_id: string;
  supplier_id: string;
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting weekly commission report...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let testMode = false;
    let targetEmail: string | null = null;
    
    try {
      const body = await req.json();
      testMode = body?.testMode || false;
      targetEmail = body?.email || null;
      console.log("Request params:", { testMode, targetEmail });
    } catch {
      console.log("No body or invalid JSON, using defaults");
    }

    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    console.log(`Fetching commissions from ${oneWeekAgo.toISOString()} to ${now.toISOString()}`);

    const { data: commissions, error: commissionsError } = await supabase
      .from("commissions")
      .select(`*, supplier:suppliers(name)`)
      .gte("created_at", oneWeekAgo.toISOString())
      .lte("created_at", now.toISOString())
      .order("created_at", { ascending: false });

    if (commissionsError) {
      console.error("Error fetching commissions:", commissionsError);
      throw commissionsError;
    }

    console.log(`Found ${commissions?.length || 0} commissions this week`);

    const { data: adminUsers, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .eq("status", "approved");

    if (adminError) {
      console.error("Error fetching admins:", adminError);
      throw adminError;
    }

    console.log(`Found ${adminUsers?.length || 0} admin users`);

    if (!adminUsers || adminUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No admin users found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminEmails: string[] = [];
    for (const admin of adminUsers) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(admin.user_id);
      if (!authError && authUser?.user?.email) {
        adminEmails.push(authUser.user.email);
      }
    }

    const recipientEmails = testMode && targetEmail ? [targetEmail] : adminEmails;

    if (recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No recipient emails found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalCommissions = commissions?.reduce((sum, c) => sum + Number(c.total_commission), 0) || 0;
    const totalSupplierCommissions = commissions?.reduce((sum, c) => sum + Number(c.supplier_commission), 0) || 0;
    const totalRoasterCommissions = commissions?.reduce((sum, c) => sum + Number(c.roaster_commission), 0) || 0;
    const totalOrderValue = commissions?.reduce((sum, c) => sum + Number(c.order_total), 0) || 0;
    const commissionCount = commissions?.length || 0;
    const avgCommission = commissionCount > 0 ? totalCommissions / commissionCount : 0;

    const twoWeeksAgo = new Date(oneWeekAgo);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);

    const { data: prevWeekCommissions } = await supabase
      .from("commissions")
      .select("total_commission, order_total")
      .gte("created_at", twoWeeksAgo.toISOString())
      .lt("created_at", oneWeekAgo.toISOString());

    const prevTotalCommissions = prevWeekCommissions?.reduce((sum, c) => sum + Number(c.total_commission), 0) || 0;
    const prevCount = prevWeekCommissions?.length || 0;

    const calcChange = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return ((current - prev) / prev) * 100;
    };

    const totalChange = calcChange(totalCommissions, prevTotalCommissions);
    const countChange = calcChange(commissionCount, prevCount);

    const formatDate = (date: Date) => date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const supplierBreakdown: Record<string, { name: string; total: number; count: number }> = {};
    commissions?.forEach((c: Commission) => {
      const supplierId = c.supplier_id;
      const supplierName = c.supplier?.name || "غير معروف";
      if (!supplierBreakdown[supplierId]) {
        supplierBreakdown[supplierId] = { name: supplierName, total: 0, count: 0 };
      }
      supplierBreakdown[supplierId].total += Number(c.total_commission);
      supplierBreakdown[supplierId].count += 1;
    });

    const topSuppliers = Object.values(supplierBreakdown)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; }
    .stat-card { background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; color: #1e293b; }
    .stat-label { font-size: 14px; color: #64748b; margin-top: 5px; }
    .stat-change { font-size: 12px; margin-top: 8px; padding: 4px 8px; border-radius: 20px; display: inline-block; }
    .stat-change.positive { background: #dcfce7; color: #16a34a; }
    .stat-change.negative { background: #fee2e2; color: #dc2626; }
    .section { margin-top: 25px; }
    .section h3 { color: #1e293b; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    .supplier-list { list-style: none; padding: 0; margin: 0; }
    .supplier-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
    .supplier-item:last-child { border-bottom: none; }
    .supplier-name { color: #1e293b; font-weight: 500; }
    .supplier-value { color: #4F46E5; font-weight: bold; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
    .highlight { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 20px; margin: 20px 0; }
    .highlight-title { font-size: 16px; color: #92400e; margin-bottom: 8px; }
    .highlight-value { font-size: 32px; font-weight: bold; color: #b45309; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 تقرير العمولات الأسبوعي</h1>
      <p>${formatDate(oneWeekAgo)} - ${formatDate(now)}</p>
    </div>
    
    <div class="content">
      <div class="highlight">
        <div class="highlight-title">إجمالي العمولات هذا الأسبوع</div>
        <div class="highlight-value">${totalCommissions.toFixed(2)} ر.س</div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${commissionCount}</div>
          <div class="stat-label">عدد العمولات</div>
          <div class="stat-change ${countChange >= 0 ? 'positive' : 'negative'}">
            ${countChange >= 0 ? '↑' : '↓'} ${Math.abs(countChange).toFixed(1)}%
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalOrderValue.toFixed(0)}</div>
          <div class="stat-label">قيمة الطلبات (ر.س)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalSupplierCommissions.toFixed(2)}</div>
          <div class="stat-label">من الموردين (ر.س)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalRoasterCommissions.toFixed(2)}</div>
          <div class="stat-label">من المحامص (ر.س)</div>
        </div>
      </div>

      <div class="stat-card" style="margin-bottom: 25px;">
        <div class="stat-label">متوسط العمولة</div>
        <div class="stat-value" style="color: #4F46E5;">${avgCommission.toFixed(2)} ر.س</div>
        <div class="stat-change ${totalChange >= 0 ? 'positive' : 'negative'}">
          مقارنة بالأسبوع السابق: ${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(1)}%
        </div>
      </div>

      ${topSuppliers.length > 0 ? `
      <div class="section">
        <h3>🏆 أعلى الموردين من حيث العمولات</h3>
        <ul class="supplier-list">
          ${topSuppliers.map((s, i) => `
            <li class="supplier-item">
              <span class="supplier-name">${i + 1}. ${s.name} (${s.count} عمولة)</span>
              <span class="supplier-value">${s.total.toFixed(2)} ر.س</span>
            </li>
          `).join('')}
        </ul>
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

    let sentCount = 0;
    const errorMessages: string[] = [];

    for (const email of recipientEmails) {
      try {
        console.log(`Sending report to: ${email}`);
        
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "دال <onboarding@resend.dev>",
            to: [email],
            subject: `📊 تقرير العمولات الأسبوعي - ${formatDate(now)}`,
            html: emailHtml,
          }),
        });

        if (res.ok) {
          console.log("Email sent successfully to:", email);
          sentCount++;
        } else {
          const errorData = await res.text();
          console.error(`Failed to send email to ${email}:`, errorData);
          errorMessages.push(`${email}: ${errorData}`);
        }
      } catch (emailError: any) {
        console.error(`Failed to send email to ${email}:`, emailError);
        errorMessages.push(`${email}: ${emailError.message}`);
      }
    }

    await supabase.from("sent_reports").insert({
      user_id: adminUsers[0].user_id,
      report_type: "weekly_commission",
      recipient_email: recipientEmails.join(", "),
      status: sentCount > 0 ? "sent" : "failed",
      is_test: testMode,
      error_message: errorMessages.length > 0 ? errorMessages.join("; ") : null,
      report_data: {
        total_commissions: totalCommissions,
        commission_count: commissionCount,
        total_order_value: totalOrderValue,
        supplier_commissions: totalSupplierCommissions,
        roaster_commissions: totalRoasterCommissions,
        date_range: { from: oneWeekAgo.toISOString(), to: now.toISOString() },
      },
    });

    console.log(`Report completed. Sent: ${sentCount}/${recipientEmails.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: recipientEmails.length,
        errors: errorMessages,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in weekly-commission-report:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
