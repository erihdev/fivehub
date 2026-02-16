import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find subscriptions expiring in the next 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const today = new Date();

    const { data: expiringSubscriptions, error: fetchError } = await supabase
      .from("user_subscriptions")
      .select(`
        id,
        user_id,
        ends_at,
        billing_cycle,
        subscription_plans (
          name,
          name_ar,
          price_monthly,
          price_yearly,
          currency
        )
      `)
      .eq("status", "active")
      .gte("ends_at", today.toISOString())
      .lte("ends_at", sevenDaysFromNow.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${expiringSubscriptions?.length || 0} expiring subscriptions`);

    const results = [];

    for (const subscription of expiringSubscriptions || []) {
      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(subscription.user_id);
      
      if (!userData?.user?.email) {
        console.log(`No email found for user ${subscription.user_id}`);
        continue;
      }

      const userEmail = userData.user.email;
      const plan = subscription.subscription_plans as any;
      const daysUntilExpiry = Math.ceil(
        (new Date(subscription.ends_at).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const price = subscription.billing_cycle === "yearly" 
        ? plan.price_yearly 
        : plan.price_monthly;

      // Check if we already sent a reminder for this subscription
      const { data: existingReminder } = await supabase
        .from("subscription_reminders")
        .select("id")
        .eq("subscription_id", subscription.id)
        .eq("days_before", daysUntilExpiry)
        .single();

      if (existingReminder) {
        console.log(`Reminder already sent for subscription ${subscription.id}, ${daysUntilExpiry} days before`);
        continue;
      }

      // Send email via Resend
      if (RESEND_API_KEY) {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "FIVE HUB <noreply@fivehub.app>",
            to: [userEmail],
            subject: daysUntilExpiry <= 1 
              ? "⚠️ اشتراكك ينتهي غداً! - Your Subscription Expires Tomorrow!" 
              : `🔔 اشتراكك ينتهي خلال ${daysUntilExpiry} أيام - Your Subscription Expires Soon`,
            html: `
              <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #f97316; margin: 0;">FIVE HUB</h1>
                </div>
                
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <h2 style="color: #92400e; margin: 0 0 12px 0; text-align: center;">
                    ${daysUntilExpiry <= 1 ? "⚠️ اشتراكك ينتهي غداً!" : `🔔 اشتراكك ينتهي خلال ${daysUntilExpiry} أيام`}
                  </h2>
                  <p style="color: #78350f; margin: 0; text-align: center;">
                    ${daysUntilExpiry <= 1 ? "Your subscription expires tomorrow!" : `Your subscription expires in ${daysUntilExpiry} days`}
                  </p>
                </div>

                <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                  <h3 style="margin: 0 0 16px 0; color: #1e293b;">تفاصيل الاشتراك / Subscription Details</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #64748b;">الباقة / Plan:</td>
                      <td style="padding: 8px 0; font-weight: bold; text-align: left;">${plan.name_ar} / ${plan.name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b;">تاريخ الانتهاء / Expiry Date:</td>
                      <td style="padding: 8px 0; font-weight: bold; text-align: left;">${new Date(subscription.ends_at).toLocaleDateString('ar-SA')}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b;">مبلغ التجديد / Renewal Amount:</td>
                      <td style="padding: 8px 0; font-weight: bold; text-align: left;">${price} ${plan.currency}</td>
                    </tr>
                  </table>
                </div>

                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="${SUPABASE_URL.replace('.supabase.co', '.lovable.app')}/subscription-plans" 
                     style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #eab308 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                    🔄 تجديد الاشتراك / Renew Subscription
                  </a>
                </div>

                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="${SUPABASE_URL.replace('.supabase.co', '.lovable.app')}/subscription-plans" 
                     style="display: inline-block; background: #10b981; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    ⬆️ ترقية الباقة / Upgrade Plan
                  </a>
                </div>

                <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 32px;">
                  هذا البريد تلقائي من منصة FIVE HUB<br>
                  This is an automated email from FIVE HUB platform
                </p>
              </div>
            `,
          }),
        });

        if (emailResponse.ok) {
          // Log the reminder
          await supabase.from("subscription_reminders").insert({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            days_before: daysUntilExpiry,
            sent_at: new Date().toISOString(),
            email_sent_to: userEmail,
          });

          results.push({
            subscription_id: subscription.id,
            email: userEmail,
            days_until_expiry: daysUntilExpiry,
            status: "sent",
          });
        } else {
          const errorText = await emailResponse.text();
          console.error(`Failed to send email: ${errorText}`);
          results.push({
            subscription_id: subscription.id,
            email: userEmail,
            status: "failed",
            error: errorText,
          });
        }
      } else {
        console.log("RESEND_API_KEY not configured");
        results.push({
          subscription_id: subscription.id,
          email: userEmail,
          status: "skipped",
          reason: "No RESEND_API_KEY",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in subscription-expiry-reminder:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
