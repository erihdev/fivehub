import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SupplierMetrics {
  id: string;
  name: string;
  userId: string | null;
  totalOrders: number;
  delayedOrders: number;
  avgDelayDays: number;
  performanceScore: number;
  performanceLevel: string;
  previousLevel: string | null;
  previousScore: number | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Starting weekly supplier classification update...');
    
    // Fetch all suppliers with their current levels
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('id, name, user_id, performance_score, performance_level');
    
    if (suppliersError) throw suppliersError;
    
    // Fetch orders from last 30 days for calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, supplier_id, expected_delivery, actual_delivery, status')
      .gte('order_date', thirtyDaysAgo.toISOString())
      .eq('status', 'delivered');
    
    if (ordersError) throw ordersError;
    
    const results: SupplierMetrics[] = [];
    const changedSuppliers: SupplierMetrics[] = [];
    
    for (const supplier of suppliers || []) {
      const supplierOrders = (orders || []).filter(o => 
        o.supplier_id === supplier.id && o.actual_delivery && o.expected_delivery
      );
      
      const delayedOrders = supplierOrders.filter(o => {
        const expected = new Date(o.expected_delivery);
        const actual = new Date(o.actual_delivery);
        return actual > expected;
      });
      
      const totalDelayDays = delayedOrders.reduce((sum, o) => {
        const expected = new Date(o.expected_delivery);
        const actual = new Date(o.actual_delivery);
        return sum + Math.max(0, Math.ceil((actual.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)));
      }, 0);
      
      const delayPercentage = supplierOrders.length > 0 
        ? (delayedOrders.length / supplierOrders.length) * 100 
        : 0;
      
      const avgDelayDays = delayedOrders.length > 0 
        ? totalDelayDays / delayedOrders.length 
        : 0;
      
      // Calculate performance score
      let performanceScore = 100;
      performanceScore -= delayPercentage * 0.5;
      performanceScore -= avgDelayDays * 2;
      performanceScore = Math.max(0, Math.min(100, performanceScore));
      
      // Determine level
      let performanceLevel = 'excellent';
      if (performanceScore >= 90) performanceLevel = 'excellent';
      else if (performanceScore >= 70) performanceLevel = 'good';
      else if (performanceScore >= 50) performanceLevel = 'average';
      else performanceLevel = 'poor';
      
      const metrics: SupplierMetrics = {
        id: supplier.id,
        name: supplier.name,
        userId: supplier.user_id,
        totalOrders: supplierOrders.length,
        delayedOrders: delayedOrders.length,
        avgDelayDays,
        performanceScore,
        performanceLevel,
        previousLevel: supplier.performance_level,
        previousScore: supplier.performance_score,
      };
      
      results.push(metrics);
      
      // Check if level changed
      if (supplier.performance_level !== performanceLevel) {
        changedSuppliers.push(metrics);
      }
      
      // Update supplier record
      await supabase
        .from('suppliers')
        .update({
          performance_score: performanceScore,
          performance_level: performanceLevel,
          total_orders: supplierOrders.length,
          delayed_orders: delayedOrders.length,
          avg_delay_days: avgDelayDays,
          last_performance_update: new Date().toISOString(),
        })
        .eq('id', supplier.id);
      
      // Award badges for excellent performance
      if (performanceLevel === 'excellent' && performanceScore >= 95) {
        // Check if already has this badge active
        const { data: existingBadge } = await supabase
          .from('supplier_badges')
          .select('id')
          .eq('supplier_id', supplier.id)
          .eq('badge_type', 'top_performer')
          .eq('is_active', true)
          .maybeSingle();
        
        if (!existingBadge) {
          await supabase
            .from('supplier_badges')
            .insert({
              supplier_id: supplier.id,
              badge_type: 'top_performer',
              badge_name: 'أداء متميز',
              badge_description: 'حقق تقييم أداء 95% أو أعلى',
              performance_score: performanceScore,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            });
        }
      }
      
      // Award on-time badge
      if (delayPercentage === 0 && supplierOrders.length >= 5) {
        const { data: existingBadge } = await supabase
          .from('supplier_badges')
          .select('id')
          .eq('supplier_id', supplier.id)
          .eq('badge_type', 'perfect_timing')
          .eq('is_active', true)
          .maybeSingle();
        
        if (!existingBadge) {
          await supabase
            .from('supplier_badges')
            .insert({
              supplier_id: supplier.id,
              badge_type: 'perfect_timing',
              badge_name: 'التزام تام',
              badge_description: 'لا يوجد أي تأخير في جميع الشحنات',
              performance_score: performanceScore,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });
        }
      }
      
      // Award trusted supplier badge (10+ orders with good performance)
      if (supplierOrders.length >= 10 && performanceScore >= 80) {
        const { data: existingBadge } = await supabase
          .from('supplier_badges')
          .select('id')
          .eq('supplier_id', supplier.id)
          .eq('badge_type', 'trusted_supplier')
          .eq('is_active', true)
          .maybeSingle();
        
        if (!existingBadge) {
          await supabase
            .from('supplier_badges')
            .insert({
              supplier_id: supplier.id,
              badge_type: 'trusted_supplier',
              badge_name: 'مورد موثوق',
              badge_description: 'أكمل أكثر من 10 طلبات بنجاح',
              performance_score: performanceScore,
            });
        }
      }
    }
    
    // Log classification changes and send notifications
    for (const supplier of changedSuppliers) {
      // Log the change
      await supabase
        .from('supplier_classification_logs')
        .insert({
          supplier_id: supplier.id,
          previous_level: supplier.previousLevel || 'unknown',
          new_level: supplier.performanceLevel,
          previous_score: supplier.previousScore || 0,
          new_score: supplier.performanceScore,
        });
      
      // Send email notification if supplier has user_id
      if (supplier.userId && resendApiKey) {
        const { data: { user } } = await supabase.auth.admin.getUserById(supplier.userId);
        
        if (user?.email) {
          const isImproved = supplier.performanceScore > (supplier.previousScore || 0);
          const levelNames: Record<string, string> = {
            excellent: 'ممتاز',
            good: 'جيد',
            average: 'متوسط',
            poor: 'ضعيف',
          };
          
          const emailHtml = `
            <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: ${isImproved ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}; padding: 30px; border-radius: 10px; color: white; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">☕ تحديث تصنيف أدائك</h1>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
                <h2 style="color: #1a1a2e; margin-top: 0;">
                  ${isImproved ? '🎉 تهانينا! تحسن تصنيفك' : '⚠️ تنبيه: تغير تصنيفك'}
                </h2>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 10px 0;"><strong>الشركة:</strong> ${supplier.name}</p>
                  <p style="margin: 10px 0;">
                    <strong>التصنيف السابق:</strong> ${levelNames[supplier.previousLevel || ''] || supplier.previousLevel}
                    (${(supplier.previousScore || 0).toFixed(0)}%)
                  </p>
                  <p style="margin: 10px 0;">
                    <strong>التصنيف الجديد:</strong> ${levelNames[supplier.performanceLevel] || supplier.performanceLevel}
                    (${supplier.performanceScore.toFixed(0)}%)
                  </p>
                </div>
                
                ${isImproved 
                  ? '<p style="color: #10b981;">استمر في العمل الممتاز! أداؤك في التسليم يتحسن باستمرار.</p>'
                  : '<p style="color: #f59e0b;">نوصي بمراجعة أوقات التسليم لتحسين تصنيفك.</p>'
                }
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                <p>منصة دال للقهوة المختصة</p>
              </div>
            </div>
          `;
          
          try {
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'دال <onboarding@resend.dev>',
                to: [user.email],
                subject: isImproved 
                  ? `🎉 تهانينا! تحسن تصنيف أدائك إلى ${levelNames[supplier.performanceLevel]}`
                  : `⚠️ تنبيه: تغير تصنيف أدائك`,
                html: emailHtml,
              }),
            });
            
            if (emailResponse.ok) {
              await supabase
                .from('supplier_classification_logs')
                .update({
                  notification_sent: true,
                  notification_sent_at: new Date().toISOString(),
                })
                .eq('supplier_id', supplier.id)
                .order('created_at', { ascending: false })
                .limit(1);
            }
          } catch (emailError) {
            console.error('Failed to send email:', emailError);
          }
        }
      }
    }
    
    // Deactivate expired badges
    await supabase
      .from('supplier_badges')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true);
    
    console.log(`Updated ${results.length} suppliers, ${changedSuppliers.length} changed classification`);
    
    return new Response(
      JSON.stringify({
        success: true,
        totalUpdated: results.length,
        changedClassification: changedSuppliers.length,
        suppliers: results.map(s => ({
          name: s.name,
          score: s.performanceScore,
          level: s.performanceLevel,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in weekly-supplier-classification:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
