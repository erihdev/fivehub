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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify cron secret for scheduled calls
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');
    let isAuthorized = false;
    
    // Check cron secret
    if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
      isAuthorized = true;
    }
    
    // Allow admin users to trigger manually
    if (!isAuthorized && authHeader && authHeader.startsWith('Bearer ')) {
      const userSupabase = createClient(supabaseUrl, supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userSupabase.auth.getUser();
      if (user) {
        const { data: isAdmin } = await supabase.rpc('is_verified_admin', { _user_id: user.id });
        isAuthorized = !!isAdmin;
      }
    }
    
    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Starting monthly supplier performance report...");

    // Get all suppliers with their performance data
    const { data: suppliers, error: suppliersError } = await supabase
      .from("suppliers")
      .select(`
        id,
        name,
        user_id,
        performance_score,
        performance_level,
        total_orders,
        delayed_orders,
        avg_delay_days
      `)
      .not("user_id", "is", null)
      .order("performance_score", { ascending: false });

    if (suppliersError) {
      throw suppliersError;
    }

    if (!suppliers || suppliers.length === 0) {
      console.log("No suppliers found");
      return new Response(JSON.stringify({ message: "No suppliers found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate platform average
    const totalScore = suppliers.reduce((sum, s) => sum + (s.performance_score || 0), 0);
    const platformAvgScore = suppliers.length > 0 ? totalScore / suppliers.length : 0;

    // Get badges count for each supplier
    const { data: badgesCounts } = await supabase
      .from("supplier_badges")
      .select("supplier_id")
      .eq("is_active", true);

    const badgesMap = new Map<string, number>();
    badgesCounts?.forEach((b) => {
      const count = badgesMap.get(b.supplier_id) || 0;
      badgesMap.set(b.supplier_id, count + 1);
    });

    // Get notification preferences for all suppliers
    const { data: allPreferences } = await supabase
      .from("supplier_notification_preferences")
      .select("supplier_id, monthly_report_enabled");

    const preferencesMap = new Map<string, boolean>();
    allPreferences?.forEach((p) => {
      preferencesMap.set(p.supplier_id, p.monthly_report_enabled);
    });

    // Process each supplier
    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < suppliers.length; i++) {
      const supplier = suppliers[i];
      
      // Check notification preferences - default to true if not set
      const monthlyReportEnabled = preferencesMap.get(supplier.id) ?? true;
      
      if (!monthlyReportEnabled) {
        console.log(`Monthly report disabled for supplier: ${supplier.name}`);
        skippedCount++;
        continue;
      }

      // Get supplier's user email
      const { data: userData } = await supabase.auth.admin.getUserById(supplier.user_id);
      
      if (!userData?.user?.email) {
        console.log(`No email found for supplier: ${supplier.name}`);
        continue;
      }

      const email = userData.user.email;
      const rank = i + 1;
      const badgesCount = badgesMap.get(supplier.id) || 0;
      const scoreDiff = (supplier.performance_score || 0) - platformAvgScore;
      const isAboveAverage = scoreDiff >= 0;

      const currentMonth = new Date().toLocaleDateString("ar-SA", { month: "long", year: "numeric" });

      // Generate performance tips based on score
      const tips = generateTips(supplier.performance_score || 0, supplier.delayed_orders || 0);

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 10px 0 0; opacity: 0.9; }
            .content { padding: 30px; }
            .rank-card { background: linear-gradient(135deg, #f6e05e 0%, #ecc94b 100%); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px; }
            .rank-number { font-size: 48px; font-weight: bold; color: #744210; }
            .rank-label { color: #744210; font-size: 14px; }
            .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
            .stat-card { background: #f7fafc; border-radius: 10px; padding: 15px; text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; color: #2d3748; }
            .stat-label { font-size: 12px; color: #718096; margin-top: 5px; }
            .comparison { background: ${isAboveAverage ? '#c6f6d5' : '#fed7d7'}; border-radius: 10px; padding: 15px; margin: 20px 0; }
            .comparison-title { font-weight: bold; color: ${isAboveAverage ? '#22543d' : '#742a2a'}; }
            .comparison-value { font-size: 20px; color: ${isAboveAverage ? '#22543d' : '#742a2a'}; }
            .tips { background: #ebf8ff; border-radius: 10px; padding: 15px; margin: 20px 0; }
            .tips-title { font-weight: bold; color: #2c5282; margin-bottom: 10px; }
            .tip { padding: 8px 0; border-bottom: 1px solid #bee3f8; color: #2a4365; }
            .tip:last-child { border-bottom: none; }
            .badges { display: flex; justify-content: center; gap: 10px; margin: 15px 0; }
            .badge { background: #805ad5; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; }
            .footer { background: #f7fafc; padding: 20px; text-align: center; color: #718096; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 تقرير الأداء الشهري</h1>
              <p>${currentMonth}</p>
            </div>
            <div class="content">
              <p style="font-size: 18px; color: #2d3748;">مرحباً <strong>${supplier.name}</strong>،</p>
              <p style="color: #4a5568;">إليك ملخص أدائك لهذا الشهر مقارنة بباقي الموردين على المنصة:</p>
              
              <div class="rank-card">
                <div class="rank-number">#${rank}</div>
                <div class="rank-label">ترتيبك من أصل ${suppliers.length} مورد</div>
              </div>
              
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-value">${supplier.performance_score || 0}%</div>
                  <div class="stat-label">نقاط الأداء</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${supplier.total_orders || 0}</div>
                  <div class="stat-label">إجمالي الطلبات</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${supplier.delayed_orders || 0}</div>
                  <div class="stat-label">الطلبات المتأخرة</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${badgesCount}</div>
                  <div class="stat-label">الشارات المكتسبة</div>
                </div>
              </div>
              
              <div class="comparison">
                <div class="comparison-title">
                  ${isAboveAverage ? '🎉 أداؤك أعلى من المتوسط!' : '📈 لديك فرصة للتحسين'}
                </div>
                <div class="comparison-value">
                  متوسط المنصة: ${platformAvgScore.toFixed(1)}% | أداؤك: ${supplier.performance_score || 0}%
                  <br>
                  <span style="font-size: 14px;">(${isAboveAverage ? '+' : ''}${scoreDiff.toFixed(1)} نقطة)</span>
                </div>
              </div>
              
              ${tips.length > 0 ? `
              <div class="tips">
                <div class="tips-title">💡 نصائح لتحسين أدائك:</div>
                ${tips.map(tip => `<div class="tip">• ${tip}</div>`).join('')}
              </div>
              ` : ''}
              
              <p style="text-align: center; color: #718096; margin-top: 20px;">
                استمر في العمل الجيد وحافظ على مستوى أدائك! 💪
              </p>
            </div>
            <div class="footer">
              <p>هذا التقرير يُرسل تلقائياً في بداية كل شهر</p>
              <p>يمكنك تعطيل هذه الإشعارات من إعدادات حسابك</p>
              <p>© ${new Date().getFullYear()} منصة دال للقهوة</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await resend.emails.send({
          from: "Dal Coffee <onboarding@resend.dev>",
          to: [email],
          subject: `📊 تقرير أدائك الشهري - ترتيبك #${rank} من ${suppliers.length}`,
          html: htmlContent,
        });

        // Log the sent report
        await supabase.from("monthly_report_logs").insert({
          supplier_id: supplier.id,
          report_month: new Date().toISOString().slice(0, 10),
          rank: rank,
          total_suppliers: suppliers.length,
          performance_score: supplier.performance_score || 0,
          platform_avg_score: platformAvgScore,
          badges_count: badgesCount,
          email_sent_to: email,
          status: "sent",
        });

        // Send push notification to supplier
        try {
          const pushTitle = "📊 تقرير الأداء الشهري";
          const pushBody = `ترتيبك #${rank} من أصل ${suppliers.length} مورد. نقاط الأداء: ${supplier.performance_score || 0}%`;
          
          // Store push notification in a notifications table or trigger via realtime
          await supabase.from("supplier_push_notifications").insert({
            supplier_id: supplier.id,
            title: pushTitle,
            body: pushBody,
            notification_type: "monthly_report",
            data: {
              rank,
              total_suppliers: suppliers.length,
              performance_score: supplier.performance_score || 0,
              platform_avg_score: platformAvgScore,
            },
          });
          console.log(`Push notification queued for ${supplier.name}`);
        } catch (pushError) {
          console.log(`Push notification failed for ${supplier.name}:`, pushError);
          // Don't fail the whole process if push fails
        }

        console.log(`Report sent to ${supplier.name} (${email})`);
        sentCount++;
      } catch (emailError: unknown) {
        const errorMessage = emailError instanceof Error ? emailError.message : "Unknown error";
        console.error(`Failed to send report to ${supplier.name}:`, emailError);
        
        // Log the failed report
        await supabase.from("monthly_report_logs").insert({
          supplier_id: supplier.id,
          report_month: new Date().toISOString().slice(0, 10),
          rank: rank,
          total_suppliers: suppliers.length,
          performance_score: supplier.performance_score || 0,
          platform_avg_score: platformAvgScore,
          badges_count: badgesCount,
          email_sent_to: email,
          status: "failed",
          error_message: errorMessage,
        });
        
        errorCount++;
      }
    }

    console.log(`Monthly reports completed. Sent: ${sentCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        skipped: skippedCount,
        errors: errorCount,
        total: suppliers.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in monthly supplier performance report:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateTips(score: number, delayedOrders: number): string[] {
  const tips: string[] = [];
  
  if (score < 50) {
    tips.push("ركز على تسليم الطلبات في الوقت المحدد لتحسين نقاطك");
    tips.push("تواصل مع العملاء مبكراً في حال وجود أي تأخير");
  } else if (score < 70) {
    tips.push("أنت على الطريق الصحيح! حاول تقليل التأخيرات أكثر");
    tips.push("أضف عروض جديدة لجذب المزيد من المحامص");
  } else if (score < 90) {
    tips.push("أداء ممتاز! حافظ على هذا المستوى للحصول على شارات إضافية");
    tips.push("فكر في توسيع تشكيلة منتجاتك");
  } else {
    tips.push("أداء استثنائي! أنت من أفضل الموردين على المنصة");
  }
  
  if (delayedOrders > 3) {
    tips.push("لديك عدد كبير من الطلبات المتأخرة - راجع عمليات الشحن");
  }
  
  return tips;
}
