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

    console.log("Starting goal deadline reminder check...");

    // Get current date
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Find goals that:
    // 1. Are not completed
    // 2. Haven't been reminded yet
    // We'll filter by days_before preference per supplier
    const { data: goals, error: goalsError } = await supabase
      .from("supplier_goals")
      .select(`
        id,
        goal_name,
        goal_type,
        target_value,
        current_value,
        start_date,
        end_date,
        supplier_id,
        reminder_sent,
        suppliers (
          id,
          name,
          user_id
        )
      `)
      .eq("is_completed", false)
      .eq("reminder_sent", false)
      .gte("end_date", todayStr);

    if (goalsError) {
      throw goalsError;
    }

    if (!goals || goals.length === 0) {
      console.log("No goals found that need reminders");
      return new Response(
        JSON.stringify({ message: "No reminders needed", sent: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get notification preferences for all suppliers
    const supplierIds = [...new Set(goals.map(g => g.supplier_id))];
    const { data: allPreferences } = await supabase
      .from("supplier_notification_preferences")
      .select("supplier_id, goal_reminders_enabled, reminder_days_before")
      .in("supplier_id", supplierIds);

    const preferencesMap = new Map<string, { enabled: boolean; daysBefore: number }>();
    allPreferences?.forEach((p) => {
      preferencesMap.set(p.supplier_id, {
        enabled: p.goal_reminders_enabled,
        daysBefore: p.reminder_days_before,
      });
    });

    console.log(`Found ${goals.length} potential goals to check`);

    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const goal of goals) {
      const supplier = goal.suppliers as any;
      
      if (!supplier?.user_id) {
        console.log(`No user_id for supplier: ${supplier?.name}`);
        continue;
      }

      // Get preferences for this supplier (default: enabled, 3 days)
      const prefs = preferencesMap.get(goal.supplier_id) || { enabled: true, daysBefore: 3 };
      
      // Check if reminders are enabled
      if (!prefs.enabled) {
        console.log(`Goal reminders disabled for supplier: ${supplier.name}`);
        skippedCount++;
        continue;
      }

      // Calculate days until goal ends
      const daysRemaining = Math.ceil((new Date(goal.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if it's time to send reminder based on preference
      if (daysRemaining > prefs.daysBefore) {
        console.log(`Goal "${goal.goal_name}" has ${daysRemaining} days left, reminder set for ${prefs.daysBefore} days before`);
        continue;
      }

      // Get supplier's user email
      const { data: userData } = await supabase.auth.admin.getUserById(supplier.user_id);
      
      if (!userData?.user?.email) {
        console.log(`No email found for supplier: ${supplier.name}`);
        continue;
      }

      const email = userData.user.email;
      const progress = goal.target_value > 0 
        ? Math.min(100, Math.round(((goal.current_value || 0) / goal.target_value) * 100))
        : 0;
      
      const remaining = goal.target_value - (goal.current_value || 0);
      
      const goalTypeLabels: Record<string, string> = {
        orders: "طلبات",
        revenue: "ريال",
        on_time_delivery: "% تسليم في الوقت",
        rating: "نجوم",
      };

      const unit = goalTypeLabels[goal.goal_type] || "";

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%); color: white; padding: 25px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; }
            .content { padding: 25px; }
            .alert-box { background: #fffaf0; border: 2px solid #ed8936; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px; }
            .days-remaining { font-size: 48px; font-weight: bold; color: #c05621; }
            .days-label { color: #c05621; font-size: 16px; }
            .goal-info { background: #f7fafc; border-radius: 10px; padding: 15px; margin: 15px 0; }
            .goal-name { font-size: 18px; font-weight: bold; color: #2d3748; margin-bottom: 10px; }
            .progress-bar { background: #e2e8f0; border-radius: 10px; height: 20px; overflow: hidden; margin: 10px 0; }
            .progress-fill { background: linear-gradient(90deg, #48bb78, #38a169); height: 100%; border-radius: 10px; transition: width 0.3s; }
            .progress-text { display: flex; justify-content: space-between; font-size: 14px; color: #4a5568; }
            .remaining { background: #fed7d7; color: #c53030; padding: 10px 15px; border-radius: 8px; text-align: center; margin-top: 15px; }
            .tips { background: #e6fffa; border-radius: 10px; padding: 15px; margin: 20px 0; }
            .tips-title { font-weight: bold; color: #234e52; margin-bottom: 8px; }
            .tip { color: #285e61; padding: 5px 0; }
            .cta { text-align: center; margin-top: 20px; }
            .cta a { background: #ed8936; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; }
            .footer { background: #f7fafc; padding: 15px; text-align: center; color: #718096; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ تذكير: هدفك يقترب من الموعد النهائي!</h1>
            </div>
            <div class="content">
              <p style="color: #4a5568;">مرحباً <strong>${supplier.name}</strong>،</p>
              
              <div class="alert-box">
                <div class="days-remaining">${daysRemaining}</div>
                <div class="days-label">أيام متبقية</div>
              </div>
              
              <div class="goal-info">
                <div class="goal-name">🎯 ${goal.goal_name}</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="progress-text">
                  <span>التقدم: ${progress}%</span>
                  <span>${goal.current_value || 0} / ${goal.target_value} ${unit}</span>
                </div>
                ${remaining > 0 ? `
                <div class="remaining">
                  متبقي: <strong>${remaining} ${unit}</strong> للوصول للهدف
                </div>
                ` : `
                <div style="background: #c6f6d5; color: #22543d; padding: 10px 15px; border-radius: 8px; text-align: center; margin-top: 15px;">
                  🎉 أنت قريب جداً من تحقيق هدفك!
                </div>
                `}
              </div>
              
              <div class="tips">
                <div class="tips-title">💡 نصائح سريعة:</div>
                <div class="tip">• راجع عروضك الحالية وأضف عروض جديدة</div>
                <div class="tip">• تواصل مع المحامص المهتمة بمنتجاتك</div>
                <div class="tip">• تأكد من تسليم جميع الطلبات المعلقة في الوقت</div>
              </div>
              
              <p style="text-align: center; color: #718096; font-size: 14px;">
                لديك ${daysRemaining} أيام لتحقيق هدفك - يمكنك فعلها! 💪
              </p>
            </div>
            <div class="footer">
              <p>هذا التذكير يُرسل تلقائياً قبل ${prefs.daysBefore} أيام من انتهاء الهدف</p>
              <p>يمكنك تعديل إعدادات التذكيرات من حسابك</p>
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
          subject: `⏰ تذكير: ${daysRemaining} أيام متبقية لتحقيق هدف "${goal.goal_name}"`,
          html: htmlContent,
        });

        // Mark reminder as sent
        await supabase
          .from("supplier_goals")
          .update({ reminder_sent: true })
          .eq("id", goal.id);

        console.log(`Reminder sent for goal: ${goal.goal_name} to ${supplier.name}`);
        sentCount++;
      } catch (emailError) {
        console.error(`Failed to send reminder for goal ${goal.id}:`, emailError);
        errorCount++;
      }
    }

    console.log(`Goal reminders completed. Sent: ${sentCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        skipped: skippedCount,
        errors: errorCount,
        total: goals.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in goal deadline reminder:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
