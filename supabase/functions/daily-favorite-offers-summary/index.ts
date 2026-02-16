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
  offer: {
    id: string;
    title: string;
    description: string | null;
    discount_percentage: number | null;
    discount_amount: number | null;
    currency: string | null;
    valid_until: string;
    is_active: boolean;
    supplier: {
      name: string;
    } | null;
  } | null;
}

interface UserPreferences {
  user_id: string;
  enabled: boolean;
  summary_hour: number;
  timezone: string;
}

// Get current hour in a specific timezone
function getCurrentHourInTimezone(timezone: string): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false
    });
    return parseInt(formatter.format(now), 10);
  } catch (e) {
    console.error(`Error getting hour for timezone ${timezone}:`, e);
    return new Date().getUTCHours();
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Daily favorite offers expiry summary started");

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

    // Fetch user preferences
    const { data: allPreferences, error: prefsError } = await supabase
      .from("favorite_offers_summary_preferences")
      .select("*");

    if (prefsError) {
      console.error("Error fetching preferences:", prefsError);
    }

    const userPrefsMap: Record<string, UserPreferences> = {};
    for (const pref of (allPreferences || []) as UserPreferences[]) {
      userPrefsMap[pref.user_id] = pref;
    }

    console.log(`Found ${Object.keys(userPrefsMap).length} user preferences`);

    // Get current date and date 7 days from now
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch all favorite offers with expiry within 7 days
    const { data: favorites, error: favError } = await supabase
      .from("offer_favorites")
      .select(`
        offer_id,
        user_id,
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

    // Group by user and filter expiring offers
    const userOffers: Record<string, FavoriteOffer[]> = {};

    for (const fav of (favorites || []) as any[]) {
      const offer = Array.isArray(fav.offer) ? fav.offer[0] : fav.offer;
      
      if (!offer || !offer.valid_until || !offer.is_active) continue;

      const expiryDate = new Date(offer.valid_until);
      
      // Check if expiring within 7 days and not already expired
      if (expiryDate > now && expiryDate <= sevenDaysFromNow) {
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
    }

    // Filter by specific user if in test mode
    let userIds = Object.keys(userOffers);
    if (testMode && specificUserId) {
      userIds = [specificUserId];
      if (!userOffers[specificUserId]) {
        userOffers[specificUserId] = [];
      }
    } else {
      // For scheduled runs, filter users based on preferences
      userIds = userIds.filter(userId => {
        const prefs = userPrefsMap[userId];
        
        // If no preferences, use defaults (enabled=true, hour=9, timezone=Asia/Riyadh)
        const enabled = prefs?.enabled ?? true;
        const summaryHour = prefs?.summary_hour ?? 9;
        const timezone = prefs?.timezone ?? 'Asia/Riyadh';
        
        if (!enabled) {
          console.log(`User ${userId} has disabled summaries`);
          return false;
        }
        
        // Check if current hour matches user's preferred hour in their timezone
        const currentHour = getCurrentHourInTimezone(timezone);
        const shouldSend = currentHour === summaryHour;
        
        if (!shouldSend) {
          console.log(`User ${userId}: current hour ${currentHour} != preferred hour ${summaryHour} in ${timezone}`);
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
    let skippedNoOffers = 0;

    // Send email to each user with expiring offers
    for (const userId of userIds) {
      const email = userEmails[userId];
      if (!email) {
        console.log(`No email found for user ${userId}`);
        continue;
      }

      const offers = userOffers[userId] || [];
      
      // Skip if no offers and not in test mode
      if (offers.length === 0 && !testMode) {
        skippedNoOffers++;
        continue;
      }
      
      // Generate HTML for email
      let offersHtml = '';
      
      if (offers.length === 0 && testMode) {
        offersHtml = `
          <tr>
            <td style="padding: 24px; text-align: center; color: #6b7280;">
              <p style="margin: 0;">لا توجد عروض مفضلة تنتهي خلال الأسبوع القادم</p>
              <p style="margin: 8px 0 0 0; font-size: 12px;">هذا بريد تجريبي للتأكد من عمل الإشعارات</p>
            </td>
          </tr>
        `;
      } else {
        offersHtml = offers.map(fav => {
          const offer = fav.offer!;
          const expiryDate = new Date(offer.valid_until);
          const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          const discountText = offer.discount_percentage 
            ? `${offer.discount_percentage}% خصم`
            : `${offer.discount_amount} ${offer.currency || 'SAR'} خصم`;

          const urgencyColor = daysRemaining <= 1 ? '#dc2626' : daysRemaining <= 3 ? '#f59e0b' : '#22c55e';

          return `
            <tr>
              <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div>
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1f2937;">${offer.title}</h3>
                    <p style="margin: 0 0 4px 0; font-size: 14px; color: #6b7280;">${offer.supplier?.name || 'مورد'}</p>
                    <span style="display: inline-block; padding: 4px 12px; background-color: #22c55e; color: white; border-radius: 9999px; font-size: 12px;">
                      ${discountText}
                    </span>
                  </div>
                  <div style="text-align: left;">
                    <span style="display: inline-block; padding: 4px 8px; background-color: ${urgencyColor}; color: white; border-radius: 4px; font-size: 12px;">
                      ${daysRemaining <= 1 ? 'ينتهي اليوم!' : `ينتهي خلال ${daysRemaining} أيام`}
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }

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
              <p style="margin: 8px 0 0 0; color: #ffffff;">ملخص العروض المفضلة</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 24px; border-radius: 0 0 8px 8px;">
              <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">
                ${offers.length > 0 ? `⏰ لديك ${offers.length} عرض${offers.length > 1 ? '' : ''} ينتهي قريباً` : '📧 بريد تجريبي'}
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px;">
                هذه العروض المفضلة لديك والتي ستنتهي خلال الأسبوع القادم:
              </p>
              
              <table style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
                ${offersHtml}
              </table>
              
              <div style="margin-top: 24px; text-align: center;">
                <a href="${Deno.env.get('SITE_URL') || 'https://lovable.app'}/favorite-offers" 
                   style="display: inline-block; padding: 12px 24px; background-color: #d4a574; color: #1a1a2e; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  عرض جميع العروض المفضلة
                </a>
              </div>
            </div>
            
            <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">تم إرسال هذا البريد من منصة دال للقهوة المختصة</p>
              <p style="margin: 8px 0 0 0;">لإيقاف هذه الإشعارات، يمكنك تعديل إعداداتك من الملف الشخصي</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const { error: emailError } = await resend.emails.send({
          from: "دال <onboarding@resend.dev>",
          to: [email],
          subject: `${subjectPrefix}${offers.length > 0 ? `⏰ لديك ${offers.length} عرض مفضل ينتهي قريباً` : 'ملخص العروض المفضلة'}`,
          html: htmlContent,
        });

        if (emailError) {
          console.error(`Failed to send email to ${email}:`, emailError);
          emailsFailed++;
          
          // Log failed send
          await supabase.from("sent_reports").insert({
            user_id: userId,
            recipient_email: email,
            report_type: "favorite_offers_summary",
            status: "failed",
            is_test: testMode,
            error_message: emailError.message || "Unknown error",
            report_data: { offersCount: offers.length }
          });
        } else {
          console.log(`Email sent successfully to ${email}`);
          emailsSent++;
          
          // Log successful send
          await supabase.from("sent_reports").insert({
            user_id: userId,
            recipient_email: email,
            report_type: "favorite_offers_summary",
            status: "sent",
            is_test: testMode,
            report_data: { offersCount: offers.length }
          });
        }
      } catch (err: any) {
        console.error(`Error sending email to ${email}:`, err);
        emailsFailed++;
        
        // Log error
        await supabase.from("sent_reports").insert({
          user_id: userId,
          recipient_email: email,
          report_type: "favorite_offers_summary",
          status: "failed",
          is_test: testMode,
          error_message: err.message || "Unknown error",
          report_data: { offersCount: offers.length }
        });
      }
    }

    console.log(`Summary: ${emailsSent} emails sent, ${emailsFailed} failed, ${skippedNoOffers} skipped (no offers)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent, 
        emailsFailed,
        skippedNoOffers,
        message: `Sent ${emailsSent} emails, ${emailsFailed} failed, ${skippedNoOffers} skipped` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in daily-favorite-offers-summary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
