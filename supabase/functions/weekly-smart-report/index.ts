import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportSettings {
  user_id: string;
  weekly_report_enabled: boolean;
  weekly_report_day: number;
  weekly_report_hour: number;
  timezone: string;
  threshold: number;
}

interface SmartCheckLog {
  id: string;
  sent_at: string;
  score: number;
  status: string;
  alert_data: {
    type?: string;
    risk_level?: string;
    predictions?: {
      averagePrediction?: number;
      predictedScores?: number[];
    };
  } | null;
}

// Get current hour and day in a specific timezone
function getTimeInTimezone(timezone: string): { hour: number; day: number } {
  try {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
      weekday: 'short',
    };
    
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);
    
    let hour = 0;
    let dayName = '';
    
    for (const part of parts) {
      if (part.type === 'hour') {
        hour = parseInt(part.value, 10);
      } else if (part.type === 'weekday') {
        dayName = part.value;
      }
    }
    
    const dayMap: { [key: string]: number } = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    const day = dayMap[dayName] ?? new Date().getDay();
    
    return { hour, day };
  } catch (error) {
    console.error(`Error getting time for timezone ${timezone}:`, error);
    const now = new Date();
    return { hour: now.getUTCHours(), day: now.getUTCDay() };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for test mode
    let testMode = false;
    let targetUserId: string | null = null;
    
    try {
      const body = await req.json();
      testMode = body.testMode === true;
      targetUserId = body.userId || null;
      console.log('Request body:', { testMode, targetUserId });
    } catch {
      // No body or invalid JSON - scheduled call
    }

    console.log('Starting weekly smart check report...', { testMode, targetUserId });

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let settings: ReportSettings[] = [];

    if (testMode && targetUserId) {
      // Test mode: fetch settings for specific user
      const { data: userSettings, error: settingsError } = await supabase
        .from('performance_alert_settings')
        .select('user_id, weekly_report_enabled, weekly_report_day, weekly_report_hour, timezone, threshold')
        .eq('user_id', targetUserId)
        .single();

      if (settingsError) {
        console.error('Error fetching user settings:', settingsError);
        // Create default settings for test
        settings = [{
          user_id: targetUserId,
          weekly_report_enabled: true,
          weekly_report_day: 0,
          weekly_report_hour: 9,
          timezone: 'Asia/Riyadh',
          threshold: 40,
        }];
      } else {
        settings = [userSettings as ReportSettings];
      }
    } else {
      // Scheduled mode: fetch all users with reports enabled
      const { data: allSettings, error: settingsError } = await supabase
        .from('performance_alert_settings')
        .select('user_id, weekly_report_enabled, weekly_report_day, weekly_report_hour, timezone, threshold')
        .eq('weekly_report_enabled', true);

      if (settingsError) {
        console.error('Error fetching settings:', settingsError);
        throw settingsError;
      }

      settings = (allSettings || []) as ReportSettings[];
    }

    if (!settings || settings.length === 0) {
      console.log('No users to process');
      return new Response(
        JSON.stringify({ message: 'No users to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${settings.length} user(s)`);

    const results = [];

    for (const setting of settings) {
      const timezone = setting.timezone || 'Asia/Riyadh';
      
      // Skip schedule check in test mode
      if (!testMode) {
        const { hour: currentHour, day: currentDay } = getTimeInTimezone(timezone);
        const matchesDay = setting.weekly_report_day === currentDay;
        const matchesHour = setting.weekly_report_hour === currentHour;

        console.log(`User ${setting.user_id}: day=${currentDay}, hour=${currentHour}, scheduledDay=${setting.weekly_report_day}, scheduledHour=${setting.weekly_report_hour}`);

        if (!matchesDay || !matchesHour) {
          console.log(`Skipping user ${setting.user_id} - not scheduled time`);
          continue;
        }
      }

      try {
        // Fetch smart check logs for the past week
        const { data: logs, error: logsError } = await supabase
          .from('performance_alert_logs')
          .select('*')
          .eq('user_id', setting.user_id)
          .gte('sent_at', oneWeekAgo.toISOString())
          .order('sent_at', { ascending: false });

        if (logsError) {
          console.error(`Error fetching logs for user ${setting.user_id}:`, logsError);
          continue;
        }

        const smartCheckLogs = (logs || []).filter((log: SmartCheckLog) => 
          log.alert_data?.type === 'smart_check'
        );

        // Calculate statistics
        const totalChecks = smartCheckLogs.length;
        const highRiskCount = smartCheckLogs.filter((log: SmartCheckLog) => 
          log.alert_data?.risk_level === 'high'
        ).length;
        const mediumRiskCount = smartCheckLogs.filter((log: SmartCheckLog) => 
          log.alert_data?.risk_level === 'medium'
        ).length;
        const lowRiskCount = totalChecks - highRiskCount - mediumRiskCount;
        
        const averageScore = totalChecks > 0
          ? Math.round(smartCheckLogs.reduce((sum: number, log: SmartCheckLog) => 
              sum + (log.alert_data?.predictions?.averagePrediction || log.score || 0), 0) / totalChecks)
          : 0;

        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(setting.user_id);

        if (!userData?.user?.email) {
          console.log(`No email found for user ${setting.user_id}`);
          continue;
        }

        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) {
          console.error('RESEND_API_KEY not configured');
          continue;
        }

        const localTime = now.toLocaleString('ar-SA', { timeZone: timezone });
        const weekStartDate = oneWeekAgo.toLocaleDateString('ar-SA', { timeZone: timezone });
        const weekEndDate = now.toLocaleDateString('ar-SA', { timeZone: timezone });

        // Generate email content
        const emailContent = `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; border-radius: 12px; margin-bottom: 20px; color: white;">
              <h1 style="margin: 0 0 10px 0; font-size: 24px;">📊 التقرير الأسبوعي للفحوصات الذكية</h1>
              <p style="margin: 0; opacity: 0.9;">الفترة: ${weekStartDate} - ${weekEndDate}</p>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
              <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 18px;">ملخص الأسبوع</h2>
              
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
                  <div style="font-size: 28px; font-weight: bold; color: #1e3a5f;">${totalChecks}</div>
                  <div style="color: #64748b; font-size: 14px;">إجمالي الفحوصات</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
                  <div style="font-size: 28px; font-weight: bold; color: #1e3a5f;">${averageScore}</div>
                  <div style="color: #64748b; font-size: 14px;">متوسط النقاط</div>
                </div>
              </div>
            </div>

            <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
              <h3 style="color: #1e3a5f; margin: 0 0 15px 0;">توزيع مستويات المخاطر</h3>
              
              <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span style="color: #dc2626;">🔴 مخاطر عالية</span>
                  <span style="font-weight: bold;">${highRiskCount}</span>
                </div>
                <div style="background: #fee2e2; border-radius: 4px; height: 8px;">
                  <div style="background: #dc2626; height: 100%; border-radius: 4px; width: ${totalChecks > 0 ? (highRiskCount / totalChecks * 100) : 0}%;"></div>
                </div>
              </div>
              
              <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span style="color: #ca8a04;">⚠️ مخاطر متوسطة</span>
                  <span style="font-weight: bold;">${mediumRiskCount}</span>
                </div>
                <div style="background: #fef3c7; border-radius: 4px; height: 8px;">
                  <div style="background: #ca8a04; height: 100%; border-radius: 4px; width: ${totalChecks > 0 ? (mediumRiskCount / totalChecks * 100) : 0}%;"></div>
                </div>
              </div>
              
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span style="color: #16a34a;">✅ آمن</span>
                  <span style="font-weight: bold;">${lowRiskCount}</span>
                </div>
                <div style="background: #dcfce7; border-radius: 4px; height: 8px;">
                  <div style="background: #16a34a; height: 100%; border-radius: 4px; width: ${totalChecks > 0 ? (lowRiskCount / totalChecks * 100) : 0}%;"></div>
                </div>
              </div>
            </div>

            ${highRiskCount > 0 ? `
            <div style="background: #fef2f2; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #fecaca;">
              <p style="color: #991b1b; margin: 0; font-weight: 500;">
                ⚠️ تم رصد ${highRiskCount} حالة مخاطر عالية هذا الأسبوع. يُنصح بمراجعة التفاصيل واتخاذ الإجراءات اللازمة.
              </p>
            </div>
            ` : `
            <div style="background: #f0fdf4; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #bbf7d0;">
              <p style="color: #166534; margin: 0; font-weight: 500;">
                ✅ أسبوع ممتاز! لم يتم رصد أي مخاطر عالية.
              </p>
            </div>
            `}

            <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 20px;">
              تم إنشاء هذا التقرير تلقائياً في ${localTime}<br>
              دال للقهوة - نظام الفحص الذكي
            </p>
          </div>
        `;

        // Send email
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'Dal Coffee <onboarding@resend.dev>',
            to: [userData.user.email],
            subject: `📊 التقرير الأسبوعي للفحوصات الذكية - ${weekEndDate}`,
            html: emailContent,
          }),
        });

        if (emailResponse.ok) {
          console.log(`Weekly report sent to ${userData.user.email}`);
          
          // Log the report
          await supabase.from('sent_reports').insert({
            user_id: setting.user_id,
            recipient_email: userData.user.email,
            report_type: 'weekly_smart_check',
            status: 'sent',
            is_test: testMode,
            report_data: {
              period_start: oneWeekAgo.toISOString(),
              period_end: now.toISOString(),
              total_checks: totalChecks,
              high_risk: highRiskCount,
              medium_risk: mediumRiskCount,
              low_risk: lowRiskCount,
              average_score: averageScore,
            },
          });

          results.push({
            userId: setting.user_id,
            status: 'sent',
            totalChecks,
            highRiskCount,
            mediumRiskCount,
          });
        } else {
          const errorText = await emailResponse.text();
          console.error(`Failed to send report: ${errorText}`);
          results.push({
            userId: setting.user_id,
            status: 'failed',
            error: errorText,
          });
        }
      } catch (userError) {
        console.error(`Error processing user ${setting.user_id}:`, userError);
        results.push({
          userId: setting.user_id,
          status: 'error',
          error: String(userError),
        });
      }
    }

    console.log(`Weekly reports complete. Processed ${results.length} users.`);

    return new Response(
      JSON.stringify({
        message: 'Weekly smart check reports complete',
        timestamp: now.toISOString(),
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Weekly report error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
