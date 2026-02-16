import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PerformanceSettings {
  user_id: string;
  smart_check_enabled: boolean;
  smart_check_hour: number;
  smart_check_days: number[];
  push_alerts_enabled: boolean;
  threshold: number;
  email_alerts: boolean;
  timezone: string;
  custom_high_risk_title: string | null;
  custom_high_risk_body: string | null;
  custom_medium_risk_title: string | null;
  custom_medium_risk_body: string | null;
  custom_low_avg_title: string | null;
  custom_low_avg_body: string | null;
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
    
    // Convert day name to number (0 = Sunday)
    const dayMap: { [key: string]: number } = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    const day = dayMap[dayName] ?? new Date().getDay();
    
    return { hour, day };
  } catch (error) {
    console.error(`Error getting time for timezone ${timezone}:`, error);
    // Fallback to UTC
    const now = new Date();
    return { hour: now.getUTCHours(), day: now.getUTCDay() };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting scheduled smart check with timezone support...');

    const now = new Date();
    console.log(`Current UTC time: ${now.toISOString()}`);

    // Fetch all users with smart_check_enabled
    const { data: settings, error: settingsError } = await supabase
      .from('performance_alert_settings')
      .select('user_id, smart_check_enabled, smart_check_hour, smart_check_days, push_alerts_enabled, threshold, email_alerts, timezone, custom_high_risk_title, custom_high_risk_body, custom_medium_risk_title, custom_medium_risk_body, custom_low_avg_title, custom_low_avg_body')
      .eq('smart_check_enabled', true);

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw settingsError;
    }

    if (!settings || settings.length === 0) {
      console.log('No users with smart check enabled');
      return new Response(
        JSON.stringify({ message: 'No users to check', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${settings.length} users with smart check enabled`);

    const results = [];

    for (const setting of settings as PerformanceSettings[]) {
      const timezone = setting.timezone || 'Asia/Riyadh';
      const { hour: currentHour, day: currentDay } = getTimeInTimezone(timezone);

      // Check if current hour and day match user's schedule in their timezone
      const matchesHour = setting.smart_check_hour === currentHour;
      const matchesDay = setting.smart_check_days?.includes(currentDay) ?? true;

      console.log(`User ${setting.user_id}: timezone=${timezone}, localHour=${currentHour}, localDay=${currentDay}, scheduledHour=${setting.smart_check_hour}, days=${JSON.stringify(setting.smart_check_days)}, matchesHour=${matchesHour}, matchesDay=${matchesDay}`);

      if (!matchesHour || !matchesDay) {
        console.log(`Skipping user ${setting.user_id} - schedule doesn't match their local time`);
        continue;
      }

      console.log(`Processing smart check for user ${setting.user_id} (timezone: ${timezone})`);

      try {
        // Call predict-performance function
        const predictResponse = await fetch(`${supabaseUrl}/functions/v1/predict-performance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ userId: setting.user_id }),
        });

        if (!predictResponse.ok) {
          console.error(`Prediction failed for user ${setting.user_id}: ${predictResponse.statusText}`);
          continue;
        }

        const predictions = await predictResponse.json();
        console.log(`Predictions for user ${setting.user_id}:`, JSON.stringify(predictions).substring(0, 200));

        // Update last_smart_check_at
        await supabase
          .from('performance_alert_settings')
          .update({ last_smart_check_at: now.toISOString() })
          .eq('user_id', setting.user_id);

        // Check if alerts should be sent based on predictions
        const predictionData = predictions.predictions;
        if (predictionData && (predictionData.riskLevel === 'high' || predictionData.riskLevel === 'medium')) {
          console.log(`Alert triggered for user ${setting.user_id}: ${predictionData.riskLevel} risk`);

          // Send email alert if enabled
          if (setting.email_alerts) {
            // Get user email from auth.users via service role
            const { data: userData } = await supabase.auth.admin.getUserById(setting.user_id);

            if (userData?.user?.email) {
              const resendApiKey = Deno.env.get('RESEND_API_KEY');
              if (resendApiKey) {
                // Format local time for the email
                const localTime = new Date().toLocaleString('ar-SA', { timeZone: timezone });
                const localDate = new Date().toLocaleDateString('ar-SA', { timeZone: timezone });
                const localTimeOnly = new Date().toLocaleTimeString('ar-SA', { timeZone: timezone, hour: '2-digit', minute: '2-digit' });
                
                // Count low score days
                const lowScoreDays = predictionData.predictedScores?.filter((s: number) => s < 40)?.length || 0;
                
                // Use custom messages or defaults
                let highRiskTitle = setting.custom_high_risk_title || 'تنبيه: مخاطر عالية متوقعة';
                let highRiskBody = setting.custom_high_risk_body || 'التوقعات تشير إلى مخاطر عالية للأسبوع القادم';
                let mediumRiskTitle = setting.custom_medium_risk_title || 'تنبيه: مخاطر متوسطة متوقعة';
                let mediumRiskBody = setting.custom_medium_risk_body || 'يُتوقع بعض التحديات الأسبوع القادم';
                
                // Function to replace dynamic variables
                const replaceVariables = (text: string): string => {
                  return text
                    .replace(/\{score\}/g, String(predictionData.averagePrediction || 0))
                    .replace(/\{date\}/g, localDate)
                    .replace(/\{time\}/g, localTimeOnly)
                    .replace(/\{risk\}/g, predictionData.riskLevel === 'high' ? 'عالي' : predictionData.riskLevel === 'medium' ? 'متوسط' : 'منخفض')
                    .replace(/\{days\}/g, String(lowScoreDays))
                    .replace(/\{threshold\}/g, String(setting.threshold || 40));
                };
                
                const isHighRisk = predictionData.riskLevel === 'high';
                const alertTitle = replaceVariables(isHighRisk ? highRiskTitle : mediumRiskTitle);
                const alertBody = replaceVariables(isHighRisk ? highRiskBody : mediumRiskBody);
                
                const emailContent = `
                  <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: ${isHighRisk ? '#fee2e2' : '#fef3c7'}; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                      <h2 style="color: ${isHighRisk ? '#991b1b' : '#92400e'}; margin: 0 0 10px 0;">
                        ${isHighRisk ? '🔴' : '⚠️'} ${alertTitle}
                      </h2>
                      <p style="color: #374151; margin: 0;">
                        ${alertBody}
                      </p>
                    </div>
                    
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                      <h3 style="color: #1f2937; margin: 0 0 15px 0;">تفاصيل التوقعات</h3>
                      <ul style="color: #4b5563; padding-right: 20px; margin: 0;">
                        <li style="margin-bottom: 8px;">متوسط التوقع: <strong>${predictionData.averagePrediction}</strong></li>
                        <li style="margin-bottom: 8px;">مستوى المخاطر: <strong>${isHighRisk ? 'عالي' : 'متوسط'}</strong></li>
                        ${predictionData.predictedScores ? `<li style="margin-bottom: 8px;">النقاط المتوقعة: ${predictionData.predictedScores.join(', ')}</li>` : ''}
                        ${lowScoreDays > 0 ? `<li style="margin-bottom: 8px;">أيام منخفضة: <strong>${lowScoreDays} أيام</strong></li>` : ''}
                        <li style="margin-bottom: 8px;">وقت الفحص: <strong>${localTime}</strong></li>
                        <li>المنطقة الزمنية: <strong>${timezone}</strong></li>
                      </ul>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px; text-align: center;">
                      هذا تنبيه آلي من نظام الفحص الذكي - دال للقهوة
                    </p>
                  </div>
                `;

                try {
                  const emailResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${resendApiKey}`,
                    },
                    body: JSON.stringify({
                      from: 'Dal Coffee <onboarding@resend.dev>',
                      to: [userData.user.email],
                      subject: `${isHighRisk ? '🔴' : '⚠️'} ${alertTitle} - دال`,
                      html: emailContent,
                    }),
                  });

                  if (emailResponse.ok) {
                    console.log(`Email sent to ${userData.user.email} for user ${setting.user_id}`);
                    
                    // Log the alert
                    await supabase.from('performance_alert_logs').insert({
                      user_id: setting.user_id,
                      recipient_email: userData.user.email,
                      score: predictionData.averagePrediction,
                      threshold: setting.threshold,
                      status: 'sent',
                      alert_data: {
                        type: 'smart_check',
                        risk_level: predictionData.riskLevel,
                        predictions: predictionData,
                        timezone: timezone,
                        local_time: localTime,
                      },
                    });
                  } else {
                    const errorText = await emailResponse.text();
                    console.error(`Failed to send email: ${emailResponse.statusText} - ${errorText}`);
                  }
                } catch (emailError) {
                  console.error('Email sending error:', emailError);
                }
              }
            }
          }

          results.push({
            userId: setting.user_id,
            timezone: timezone,
            riskLevel: predictionData.riskLevel,
            averagePrediction: predictionData.averagePrediction,
            alertSent: setting.email_alerts,
          });
        } else {
          results.push({
            userId: setting.user_id,
            timezone: timezone,
            riskLevel: predictionData?.riskLevel || 'low',
            averagePrediction: predictionData?.averagePrediction || 0,
            alertSent: false,
          });
        }
      } catch (userError) {
        console.error(`Error processing user ${setting.user_id}:`, userError);
        results.push({
          userId: setting.user_id,
          timezone: timezone,
          error: String(userError),
        });
      }
    }

    console.log(`Scheduled smart check complete. Processed ${results.length} users.`);

    return new Response(
      JSON.stringify({
        message: 'Scheduled smart check complete',
        timestamp: now.toISOString(),
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scheduled smart check error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
