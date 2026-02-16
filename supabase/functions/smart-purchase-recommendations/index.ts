import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's inventory data
    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select(`
        *,
        coffee:coffee_offerings(
          id, name, origin, process, price, score, available,
          supplier:suppliers(id, name)
        )
      `)
      .eq('user_id', userId);

    if (invError) {
      console.error('Inventory fetch error:', invError);
      throw invError;
    }

    // Fetch recent orders
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        coffee:coffee_offerings(id, name, origin, process),
        supplier:suppliers(id, name)
      `)
      .eq('user_id', userId)
      .gte('order_date', threeMonthsAgo.toISOString().split('T')[0]);

    if (ordersError) {
      console.error('Orders fetch error:', ordersError);
      throw ordersError;
    }

    // Fetch available coffees from suppliers
    const { data: availableCoffees, error: coffeesError } = await supabase
      .from('coffee_offerings')
      .select(`
        *,
        supplier:suppliers(id, name, contact_info)
      `)
      .eq('available', true)
      .order('score', { ascending: false });

    if (coffeesError) {
      console.error('Coffees fetch error:', coffeesError);
      throw coffeesError;
    }

    // Fetch supplier ratings
    const { data: ratings, error: ratingsError } = await supabase
      .from('supplier_ratings')
      .select('supplier_id, rating');

    // Calculate supplier average ratings
    const supplierRatings: Record<string, number> = {};
    if (ratings) {
      const ratingsBySupplier: Record<string, number[]> = {};
      ratings.forEach(r => {
        if (!ratingsBySupplier[r.supplier_id]) {
          ratingsBySupplier[r.supplier_id] = [];
        }
        ratingsBySupplier[r.supplier_id].push(r.rating);
      });
      Object.entries(ratingsBySupplier).forEach(([supplierId, ratingsList]) => {
        supplierRatings[supplierId] = ratingsList.reduce((a, b) => a + b, 0) / ratingsList.length;
      });
    }

    // Prepare context for AI
    const contextData = {
      inventory: inventory?.map(item => ({
        coffeeName: item.coffee?.name,
        origin: item.coffee?.origin,
        currentStock: item.quantity_kg,
        minStock: item.min_quantity_kg,
        autoReorder: item.auto_reorder_enabled,
        supplier: item.coffee?.supplier?.name,
        price: item.coffee?.price,
        score: item.coffee?.score,
      })),
      recentOrders: orders?.map(order => ({
        coffeeName: order.coffee?.name,
        origin: order.coffee?.origin,
        quantity: order.quantity_kg,
        date: order.order_date,
        status: order.status,
        supplier: order.supplier?.name,
      })),
      availableCoffees: availableCoffees?.slice(0, 30).map(coffee => ({
        name: coffee.name,
        origin: coffee.origin,
        process: coffee.process,
        price: coffee.price,
        score: coffee.score,
        supplierName: coffee.supplier?.name,
        supplierId: coffee.supplier?.id,
        supplierRating: supplierRatings[coffee.supplier?.id] || null,
      })),
      lowStockItems: inventory?.filter(item => 
        item.quantity_kg <= item.min_quantity_kg
      ).map(item => ({
        name: item.coffee?.name,
        currentStock: item.quantity_kg,
        minStock: item.min_quantity_kg,
      })),
    };

    // Call AI for analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `أنت مستشار مشتريات قهوة متخصص. مهمتك تحليل بيانات المخزون والطلبات وتقديم توصيات شراء ذكية.

قم بتحليل البيانات وأعطني استجابة JSON بالتنسيق التالي:
{
  "urgentRecommendations": [
    {
      "type": "restock" | "new_supplier" | "quality_upgrade" | "cost_saving",
      "title": "عنوان التوصية",
      "description": "وصف مفصل",
      "coffeeId": "معرف القهوة إذا متوفر",
      "coffeeName": "اسم القهوة",
      "supplierName": "اسم المورد",
      "priority": "high" | "medium" | "low",
      "estimatedSavings": number | null,
      "reason": "سبب التوصية"
    }
  ],
  "trendInsights": [
    {
      "insight": "ملاحظة عن الاتجاهات",
      "recommendation": "توصية بناءً على الملاحظة"
    }
  ],
  "supplierSuggestions": [
    {
      "supplierName": "اسم المورد",
      "reason": "سبب اقتراح المورد",
      "topCoffees": ["أفضل أنواع القهوة منه"]
    }
  ],
  "costOptimization": {
    "currentAvgCost": number,
    "potentialSavings": number,
    "suggestions": ["اقتراحات توفير التكاليف"]
  },
  "qualityRecommendations": [
    {
      "coffeeName": "اسم القهوة",
      "score": number,
      "reason": "لماذا هذه القهوة مميزة"
    }
  ],
  "summary": "ملخص عام للتوصيات"
}

ركز على:
1. المنتجات منخفضة المخزون التي تحتاج إعادة طلب
2. فرص توفير التكاليف
3. ترقيات الجودة المتاحة
4. موردين جدد بتقييمات عالية
5. اتجاهات الشراء السابقة`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `بيانات المخزون والطلبات:\n${JSON.stringify(contextData, null, 2)}` }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let recommendations;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // Return fallback recommendations
      recommendations = {
        urgentRecommendations: contextData.lowStockItems?.map(item => ({
          type: 'restock',
          title: `إعادة تخزين ${item.name}`,
          description: `المخزون الحالي (${item.currentStock} كجم) أقل من الحد الأدنى (${item.minStock} كجم)`,
          coffeeName: item.name,
          priority: 'high',
          reason: 'مخزون منخفض',
        })) || [],
        trendInsights: [],
        supplierSuggestions: [],
        costOptimization: { suggestions: [] },
        qualityRecommendations: [],
        summary: 'لم نتمكن من إنشاء تحليل كامل. يرجى مراجعة المخزون المنخفض.',
      };
    }

    console.log('Smart recommendations generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        recommendations,
        context: {
          totalInventoryItems: inventory?.length || 0,
          lowStockCount: contextData.lowStockItems?.length || 0,
          recentOrdersCount: orders?.length || 0,
          availableCoffeesCount: availableCoffees?.length || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in smart-purchase-recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
