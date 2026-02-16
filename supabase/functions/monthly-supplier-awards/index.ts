import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    console.log('Starting monthly supplier awards calculation...');

    // Get current month's first day
    const now = new Date();
    const awardMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const awardMonthStr = awardMonth.toISOString().split('T')[0];

    // Check if awards already exist for this month
    const { data: existingAwards } = await supabase
      .from('monthly_supplier_awards')
      .select('id')
      .eq('award_month', awardMonthStr)
      .limit(1);

    if (existingAwards && existingAwards.length > 0) {
      console.log('Awards already calculated for this month');
      return new Response(
        JSON.stringify({ message: 'Awards already calculated for this month' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all suppliers with performance data
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('id, name, performance_score, performance_level, user_id, total_orders, delayed_orders')
      .not('performance_score', 'is', null)
      .order('performance_score', { ascending: false });

    if (suppliersError) throw suppliersError;
    if (!suppliers || suppliers.length === 0) {
      console.log('No suppliers with performance data found');
      return new Response(
        JSON.stringify({ message: 'No suppliers found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${suppliers.length} suppliers with performance data`);

    const awards: any[] = [];
    const notifications: any[] = [];

    // Gold Award - Top performer
    if (suppliers.length >= 1) {
      const gold = suppliers[0];
      awards.push({
        supplier_id: gold.id,
        award_month: awardMonthStr,
        award_type: 'gold',
        award_name: 'المورد الذهبي',
        performance_score: gold.performance_score,
        rank: 1,
        prize_description: 'أفضل مورد أداءً لهذا الشهر'
      });
      notifications.push({ ...gold, award: 'gold', rank: 1 });
    }

    // Silver Award - Second place
    if (suppliers.length >= 2) {
      const silver = suppliers[1];
      awards.push({
        supplier_id: silver.id,
        award_month: awardMonthStr,
        award_type: 'silver',
        award_name: 'المورد الفضي',
        performance_score: silver.performance_score,
        rank: 2,
        prize_description: 'ثاني أفضل مورد أداءً'
      });
      notifications.push({ ...silver, award: 'silver', rank: 2 });
    }

    // Bronze Award - Third place
    if (suppliers.length >= 3) {
      const bronze = suppliers[2];
      awards.push({
        supplier_id: bronze.id,
        award_month: awardMonthStr,
        award_type: 'bronze',
        award_name: 'المورد البرونزي',
        performance_score: bronze.performance_score,
        rank: 3,
        prize_description: 'ثالث أفضل مورد أداءً'
      });
      notifications.push({ ...bronze, award: 'bronze', rank: 3 });
    }

    // Most Improved - Find supplier with biggest improvement
    const { data: previousHistory } = await supabase
      .from('supplier_performance_history')
      .select('supplier_id, performance_score')
      .lt('period_end', awardMonthStr)
      .order('period_end', { ascending: false });

    if (previousHistory && previousHistory.length > 0) {
      const improvements: { supplier_id: string; improvement: number; name: string }[] = [];
      
      for (const supplier of suppliers) {
        const previous = previousHistory.find(h => h.supplier_id === supplier.id);
        if (previous && supplier.performance_score) {
          const improvement = supplier.performance_score - (previous.performance_score || 0);
          if (improvement > 0) {
            improvements.push({
              supplier_id: supplier.id,
              improvement,
              name: supplier.name
            });
          }
        }
      }

      if (improvements.length > 0) {
        improvements.sort((a, b) => b.improvement - a.improvement);
        const mostImproved = improvements[0];
        const supplier = suppliers.find(s => s.id === mostImproved.supplier_id);

        if (supplier && mostImproved.improvement > 5) {
          awards.push({
            supplier_id: mostImproved.supplier_id,
            award_month: awardMonthStr,
            award_type: 'most_improved',
            award_name: 'الأكثر تطوراً',
            performance_score: supplier.performance_score,
            rank: null,
            prize_description: `تحسن بنسبة ${mostImproved.improvement.toFixed(1)}%`
          });
        }
      }
    }

    // Insert awards
    if (awards.length > 0) {
      const { error: insertError } = await supabase
        .from('monthly_supplier_awards')
        .insert(awards);

      if (insertError) throw insertError;
      console.log(`Inserted ${awards.length} awards`);
    }

    // Send email notifications
    if (resendApiKey && notifications.length > 0) {
      for (const notif of notifications) {
        // Get supplier email
        const { data: userData } = await supabase.auth.admin.getUserById(notif.user_id);
        const email = userData?.user?.email;

        if (email) {
          const awardNames: Record<string, string> = {
            gold: '🥇 المورد الذهبي',
            silver: '🥈 المورد الفضي',
            bronze: '🥉 المورد البرونزي'
          };

          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Dal Coffee <noreply@resend.dev>',
                to: email,
                subject: `🏆 تهانينا! حصلت على جائزة ${awardNames[notif.award]}`,
                html: `
                  <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
                    <h1 style="color: #D97706;">🎉 تهانينا ${notif.name}!</h1>
                    <p style="font-size: 18px;">لقد حصلت على جائزة <strong>${awardNames[notif.award]}</strong> لهذا الشهر!</p>
                    <div style="background: linear-gradient(135deg, #FCD34D, #F59E0B); padding: 20px; border-radius: 10px; color: white; text-align: center;">
                      <h2>المركز ${notif.rank}</h2>
                      <p>نسبة الأداء: ${notif.performance_score}%</p>
                    </div>
                    <p style="margin-top: 20px;">استمر في العمل الرائع! 💪</p>
                  </div>
                `,
              }),
            });
            console.log(`Email sent to ${email}`);

            // Update notification status
            await supabase
              .from('monthly_supplier_awards')
              .update({ notified_at: new Date().toISOString() })
              .eq('supplier_id', notif.id)
              .eq('award_month', awardMonthStr);
          } catch (emailError) {
            console.error('Error sending email:', emailError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        awards_count: awards.length,
        month: awardMonthStr
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error calculating awards:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
