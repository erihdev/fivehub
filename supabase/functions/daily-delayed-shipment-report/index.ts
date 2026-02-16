import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DelayedOrder {
  id: string;
  expected_delivery: string;
  quantity_kg: number;
  days_delayed: number;
  supplier_name: string;
  coffee_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log("Starting daily delayed shipment check...");

    // Get all users with delayed shipment preferences enabled
    const { data: preferences, error: prefError } = await supabase
      .from('delayed_shipment_alert_preferences')
      .select('user_id, email_enabled')
      .eq('enabled', true)
      .eq('email_enabled', true);

    if (prefError) {
      console.error("Error fetching preferences:", prefError);
      throw prefError;
    }

    console.log(`Found ${preferences?.length || 0} users with enabled preferences`);

    const today = new Date().toISOString().split('T')[0];
    const results: { userId: string; success: boolean; error?: string }[] = [];

    for (const pref of preferences || []) {
      try {
        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(pref.user_id);
        const userEmail = userData?.user?.email;

        if (!userEmail) {
          console.log(`No email found for user ${pref.user_id}`);
          continue;
        }

        // Get delayed orders for this user
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            expected_delivery,
            quantity_kg,
            supplier:suppliers(name),
            coffee:coffee_offerings(name)
          `)
          .eq('user_id', pref.user_id)
          .neq('status', 'delivered')
          .neq('status', 'cancelled')
          .lt('expected_delivery', today);

        if (ordersError) {
          console.error(`Error fetching orders for user ${pref.user_id}:`, ordersError);
          continue;
        }

        if (!orders || orders.length === 0) {
          console.log(`No delayed orders for user ${pref.user_id}`);
          continue;
        }

        // Calculate delays
        const todayDate = new Date();
        const delayedOrders: DelayedOrder[] = orders.map(order => {
          const expectedDate = new Date(order.expected_delivery);
          const daysDelayed = Math.floor((todayDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
          const supplier = Array.isArray(order.supplier) ? order.supplier[0] : order.supplier;
          const coffee = Array.isArray(order.coffee) ? order.coffee[0] : order.coffee;
          
          return {
            id: order.id,
            expected_delivery: order.expected_delivery,
            quantity_kg: order.quantity_kg,
            days_delayed: daysDelayed,
            supplier_name: supplier?.name || 'غير معروف',
            coffee_name: coffee?.name || 'غير محدد',
          };
        });

        // Generate email content
        const totalDelayed = delayedOrders.length;
        const avgDelay = Math.round(delayedOrders.reduce((sum, o) => sum + o.days_delayed, 0) / totalDelayed);
        const criticalCount = delayedOrders.filter(o => o.days_delayed > 7).length;

        const ordersHtml = delayedOrders.map(order => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${order.coffee_name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${order.supplier_name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${order.quantity_kg} كغ</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
              <span style="background: ${order.days_delayed > 7 ? '#dc2626' : order.days_delayed > 3 ? '#f97316' : '#f59e0b'}; color: white; padding: 4px 8px; border-radius: 4px;">
                ${order.days_delayed} يوم
              </span>
            </td>
          </tr>
        `).join('');

        const emailHtml = `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
              .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; }
              .content { padding: 30px; }
              .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
              .stat-card { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; }
              .stat-value { font-size: 28px; font-weight: bold; color: #1e293b; }
              .stat-label { font-size: 12px; color: #64748b; margin-top: 5px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background: #f1f5f9; padding: 12px; text-align: right; font-weight: 600; color: #475569; }
              .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📦 تقرير الشحنات المتأخرة اليومي</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div class="content">
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-value" style="color: #dc2626;">${totalDelayed}</div>
                    <div class="stat-label">شحنات متأخرة</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">${avgDelay}</div>
                    <div class="stat-label">متوسط أيام التأخير</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value" style="color: #f97316;">${criticalCount}</div>
                    <div class="stat-label">تأخيرات حرجة (+7 أيام)</div>
                  </div>
                </div>
                
                <h3 style="color: #1e293b; margin-bottom: 15px;">تفاصيل الشحنات المتأخرة</h3>
                <table>
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th>المورد</th>
                      <th>الكمية</th>
                      <th>أيام التأخير</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${ordersHtml}
                  </tbody>
                </table>
                
                <p style="margin-top: 25px; color: #64748b; font-size: 14px;">
                  ننصحك بالتواصل مع الموردين المتأخرين للاستفسار عن حالة الشحنات.
                </p>
              </div>
              <div class="footer">
                <p>منصة دال للقهوة المختصة</p>
                <p>هذا التقرير اليومي تم إرساله تلقائياً</p>
              </div>
            </div>
          </body>
          </html>
        `;

        // Send email
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "دال للقهوة <onboarding@resend.dev>",
            to: [userEmail],
            subject: `📦 تقرير الشحنات المتأخرة - ${totalDelayed} شحنة متأخرة`,
            html: emailHtml,
          }),
        });

        const emailResult = await emailResponse.json();
        console.log(`Email sent to ${userEmail}:`, emailResult);

        // Log the report
        await supabase.from('sent_reports').insert({
          user_id: pref.user_id,
          report_type: 'delayed_shipments_daily',
          recipient_email: userEmail,
          status: 'sent',
          report_data: {
            total_delayed: totalDelayed,
            avg_delay: avgDelay,
            critical_count: criticalCount,
            orders: delayedOrders,
          },
        });

        results.push({ userId: pref.user_id, success: true });
      } catch (userError: any) {
        console.error(`Error processing user ${pref.user_id}:`, userError);
        results.push({ userId: pref.user_id, success: false, error: userError.message });
      }
    }

    console.log("Daily delayed shipment check completed:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in daily delayed shipment check:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
