import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FavoriteOffer {
  offer_id: string;
  user_id: string;
  created_at: string;
  offer: {
    id: string;
    title: string;
    description: string | null;
    discount_percentage: number | null;
    discount_amount: number | null;
    currency: string | null;
    valid_until: string | null;
    is_active: boolean;
    supplier: {
      name: string;
    } | null;
  } | null;
}

interface UserPreferences {
  user_id: string;
  weekly_enabled: boolean;
  weekly_day: number;
  weekly_hour: number;
  timezone: string;
}

// Get current hour and day in a specific timezone
function getCurrentTimeInTimezone(timezone: string): { hour: number; day: number } {
  try {
    const now = new Date();
    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false
    });
    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short'
    });
    
    const hour = parseInt(hourFormatter.format(now), 10);
    const dayStr = dayFormatter.format(now);
    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    
    return { hour, day: dayMap[dayStr] ?? 0 };
  } catch (e) {
    console.error(`Error getting time for timezone ${timezone}:`, e);
    const now = new Date();
    return { hour: now.getUTCHours(), day: now.getUTCDay() };
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Weekly favorite offers summary started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a test request for a specific user
    let testMode = false;
    let specificUserId: string | null = null;
    
    if (req.method === "POST") {
      try {
        const body = await req.json();
        testMode = body.test === true;
        specificUserId = body.userId || null;
        console.log(`Test mode: ${testMode}, User ID: ${specificUserId}`);
      } catch (e) {
        // Not a JSON body, continue normally
      }
    }

    // Fetch user preferences with weekly enabled
    const { data: allPreferences, error: prefsError } = await supabase
      .from("favorite_offers_summary_preferences")
      .select("user_id, weekly_enabled, weekly_day, weekly_hour, timezone");

    if (prefsError) {
      console.error("Error fetching preferences:", prefsError);
    }

    const userPrefsMap: Record<string, UserPreferences> = {};
    for (const pref of (allPreferences || []) as UserPreferences[]) {
      userPrefsMap[pref.user_id] = pref;
    }

    console.log(`Found ${Object.keys(userPrefsMap).length} user preferences`);

    // Fetch all favorite offers
    const { data: favorites, error: favError } = await supabase
      .from("offer_favorites")
      .select(`
        offer_id,
        user_id,
        created_at,
        offer:supplier_offers(
          id,
          title,
          description,
          discount_percentage,
          discount_amount,
          currency,
          valid_until,
          is_active,
          supplier:suppliers(name)
        )
      `);

    if (favError) {
      console.error("Error fetching favorites:", favError);
      throw favError;
    }

    console.log(`Found ${favorites?.length || 0} total favorites`);

    // Group by user
    const userOffers: Record<string, FavoriteOffer[]> = {};
    const now = new Date();

    for (const fav of (favorites || []) as any[]) {
      const offer = Array.isArray(fav.offer) ? fav.offer[0] : fav.offer;
      if (!offer) continue;

      if (!userOffers[fav.user_id]) {
        userOffers[fav.user_id] = [];
      }
      userOffers[fav.user_id].push({
        ...fav,
        offer: {
          ...offer,
          supplier: Array.isArray(offer.supplier) ? offer.supplier[0] : offer.supplier
        }
      });
    }

    // Filter users based on preferences
    let userIds: string[] = [];
    
    if (testMode && specificUserId) {
      userIds = [specificUserId];
      if (!userOffers[specificUserId]) {
        userOffers[specificUserId] = [];
      }
    } else {
      userIds = Object.keys(userPrefsMap).filter(userId => {
        const prefs = userPrefsMap[userId];
        
        if (!prefs?.weekly_enabled) {
          console.log(`User ${userId} has disabled weekly summaries`);
          return false;
        }
        
        const { hour, day } = getCurrentTimeInTimezone(prefs.timezone || 'Asia/Riyadh');
        const shouldSend = hour === prefs.weekly_hour && day === prefs.weekly_day;
        
        if (!shouldSend) {
          console.log(`User ${userId}: current day ${day} hour ${hour} != preferred day ${prefs.weekly_day} hour ${prefs.weekly_hour}`);
        }
        
        return shouldSend;
      });
    }
    
    console.log(`Users to notify: ${userIds.length}`);

    if (userIds.length === 0 && !testMode) {
      return new Response(
        JSON.stringify({ message: "No users to notify at this time" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user emails
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching users:", authError);
      throw authError;
    }

    const userEmails: Record<string, string> = {};
    for (const user of authData.users) {
      if (user.email) {
        userEmails[user.id] = user.email;
      }
    }

    let emailsSent = 0;
    let emailsFailed = 0;

    const dayNames: Record<string, string[]> = {
      ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
      en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    };

    // Send email to each user
    for (const userId of userIds) {
      const email = userEmails[userId];
      if (!email) {
        console.log(`No email found for user ${userId}`);
        continue;
      }

      const offers = userOffers[userId] || [];
      
      // Calculate stats
      const activeOffers = offers.filter(fav => {
        const offer = fav.offer;
        if (!offer?.is_active) return false;
        if (offer.valid_until && new Date(offer.valid_until) < now) return false;
        return true;
      });

      const expiringOffers = offers.filter(fav => {
        const offer = fav.offer;
        if (!offer?.is_active || !offer.valid_until) return false;
        const expiryDate = new Date(offer.valid_until);
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return expiryDate > now && expiryDate <= sevenDaysFromNow;
      });

      const expiredOffers = offers.filter(fav => {
        const offer = fav.offer;
        if (!offer?.valid_until) return false;
        return new Date(offer.valid_until) < now;
      });

      // Get offers added this week
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const newThisWeek = offers.filter(fav => new Date(fav.created_at) >= oneWeekAgo);

      // Generate HTML for top offers
      const topOffersHtml = activeOffers.slice(0, 5).map(fav => {
        const offer = fav.offer!;
        const discountText = offer.discount_percentage 
          ? `${offer.discount_percentage}% خصم`
          : offer.discount_amount ? `${offer.discount_amount} ${offer.currency || 'SAR'} خصم` : '';

        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <div style="font-weight: 600; color: #1f2937;">${offer.title}</div>
              <div style="font-size: 12px; color: #6b7280;">${offer.supplier?.name || 'مورد'}</div>
              ${discountText ? `<span style="display: inline-block; margin-top: 4px; padding: 2px 8px; background-color: #22c55e; color: white; border-radius: 4px; font-size: 11px;">${discountText}</span>` : ''}
            </td>
          </tr>
        `;
      }).join('');

      const testBadge = testMode ? '<span style="display: inline-block; padding: 4px 8px; background-color: #6366f1; color: white; border-radius: 4px; font-size: 10px; margin-right: 8px;">تجريبي</span>' : '';
      const subjectPrefix = testMode ? '🧪 [تجريبي] ' : '';

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #1a1a2e; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
              ${testBadge}
              <h1 style="margin: 0; color: #d4a574; font-size: 24px;">☕ دال</h1>
              <p style="margin: 8px 0 0 0; color: #ffffff;">الملخص الأسبوعي للعروض المفضلة</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 24px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px;">📊 ملخص هذا الأسبوع</h2>
              
              <!-- Stats Grid -->
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px;">
                <div style="background: linear-gradient(135deg, #8B4513 0%, #a0522d 100%); padding: 16px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: #fff;">${offers.length}</div>
                  <div style="font-size: 12px; color: rgba(255,255,255,0.9);">إجمالي المفضلة</div>
                </div>
                <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 16px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: #fff;">${activeOffers.length}</div>
                  <div style="font-size: 12px; color: rgba(255,255,255,0.9);">نشطة</div>
                </div>
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 16px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: #fff;">${expiringOffers.length}</div>
                  <div style="font-size: 12px; color: rgba(255,255,255,0.9);">تنتهي قريباً</div>
                </div>
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 16px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: #fff;">${newThisWeek.length}</div>
                  <div style="font-size: 12px; color: rgba(255,255,255,0.9);">جديد هذا الأسبوع</div>
                </div>
              </div>

              ${expiringOffers.length > 0 ? `
                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin-bottom: 24px;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    ⚠️ لديك ${expiringOffers.length} عرض${expiringOffers.length > 1 ? '' : ''} ينتهي خلال الأسبوع القادم!
                  </p>
                </div>
              ` : ''}

              ${expiredOffers.length > 0 ? `
                <div style="background-color: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 12px; margin-bottom: 24px;">
                  <p style="margin: 0; color: #991b1b; font-size: 14px;">
                    ❌ ${expiredOffers.length} عرض منتهي الصلاحية - قد ترغب في إزالتها من المفضلة
                  </p>
                </div>
              ` : ''}
              
              ${activeOffers.length > 0 ? `
                <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px;">🌟 أبرز العروض النشطة</h3>
                <table style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                  ${topOffersHtml}
                </table>
              ` : `
                <div style="text-align: center; padding: 24px; color: #6b7280;">
                  <p style="margin: 0;">لا توجد عروض نشطة حالياً</p>
                  <p style="margin: 8px 0 0 0; font-size: 12px;">استكشف العروض الجديدة من الموردين</p>
                </div>
              `}
              
              <div style="text-align: center;">
                <a href="${Deno.env.get('SITE_URL') || 'https://lovable.app'}/favorite-offers" 
                   style="display: inline-block; padding: 12px 24px; background-color: #d4a574; color: #1a1a2e; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  عرض جميع العروض المفضلة
                </a>
              </div>
            </div>
            
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 0 0 8px 8px; text-align: center; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">تم إرسال هذا البريد من منصة دال للقهوة المختصة</p>
              <p style="margin: 8px 0 0 0;">لإيقاف هذه الإشعارات، يمكنك تعديل إعداداتك من صفحة إعدادات التنبيهات</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const { error: emailError } = await resend.emails.send({
          from: "دال <onboarding@resend.dev>",
          to: [email],
          subject: `${subjectPrefix}📊 الملخص الأسبوعي: ${offers.length} عرض مفضل`,
          html: htmlContent,
        });

        if (emailError) {
          console.error(`Failed to send email to ${email}:`, emailError);
          emailsFailed++;
          
          await supabase.from("sent_reports").insert({
            user_id: userId,
            recipient_email: email,
            report_type: "weekly_favorite_offers_summary",
            status: "failed",
            is_test: testMode,
            error_message: emailError.message || "Unknown error",
            report_data: { 
              totalOffers: offers.length,
              activeOffers: activeOffers.length,
              expiringOffers: expiringOffers.length,
              newThisWeek: newThisWeek.length
            }
          });
        } else {
          console.log(`Weekly summary email sent successfully to ${email}`);
          emailsSent++;
          
          await supabase.from("sent_reports").insert({
            user_id: userId,
            recipient_email: email,
            report_type: "weekly_favorite_offers_summary",
            status: "sent",
            is_test: testMode,
            report_data: { 
              totalOffers: offers.length,
              activeOffers: activeOffers.length,
              expiringOffers: expiringOffers.length,
              newThisWeek: newThisWeek.length
            }
          });
        }
      } catch (err: any) {
        console.error(`Error sending email to ${email}:`, err);
        emailsFailed++;
        
        await supabase.from("sent_reports").insert({
          user_id: userId,
          recipient_email: email,
          report_type: "weekly_favorite_offers_summary",
          status: "failed",
          is_test: testMode,
          error_message: err.message || "Unknown error",
          report_data: { totalOffers: offers.length }
        });
      }
    }

    console.log(`Weekly summary: ${emailsSent} emails sent, ${emailsFailed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent, 
        emailsFailed,
        message: `Sent ${emailsSent} emails, ${emailsFailed} failed` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in weekly-favorite-offers-summary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
