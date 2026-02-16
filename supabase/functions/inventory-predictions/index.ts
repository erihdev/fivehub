import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Fetching inventory data for user:", user.id);

    // Fetch inventory data
    const { data: inventory, error: invError } = await supabase
      .from("inventory")
      .select(`
        id,
        coffee_id,
        quantity_kg,
        min_quantity_kg,
        auto_reorder_enabled,
        auto_reorder_quantity,
        updated_at,
        coffee_offerings (
          name,
          origin,
          price
        )
      `)
      .eq("user_id", user.id);

    if (invError) {
      console.error("Error fetching inventory:", invError);
      throw invError;
    }

    // Fetch recent orders for consumption patterns
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        coffee_id,
        quantity_kg,
        order_date,
        status
      `)
      .eq("user_id", user.id)
      .gte("order_date", thirtyDaysAgo.toISOString().split("T")[0]);

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
    }

    console.log(`Found ${inventory?.length || 0} inventory items and ${orders?.length || 0} recent orders`);

    // Prepare data for AI analysis
    const inventoryData = inventory?.map(item => {
      const coffeeOffering = item.coffee_offerings as { name?: string; origin?: string; price?: number } | null;
      return {
        name: coffeeOffering?.name || "Unknown",
        origin: coffeeOffering?.origin || "Unknown",
        currentStock: item.quantity_kg,
        minimumStock: item.min_quantity_kg,
        autoReorderEnabled: item.auto_reorder_enabled,
        autoReorderQuantity: item.auto_reorder_quantity,
        lastUpdated: item.updated_at,
      };
    }) || [];

    const orderData = orders?.map(order => ({
      coffeeId: order.coffee_id,
      quantity: order.quantity_kg,
      date: order.order_date,
      status: order.status,
    })) || [];

    // Call Lovable AI for predictions
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `أنت خبير في إدارة مخزون القهوة الخضراء. قم بتحليل بيانات المخزون والطلبات التالية وقدم تنبؤات وتوصيات ذكية.

بيانات المخزون الحالي:
${JSON.stringify(inventoryData, null, 2)}

بيانات الطلبات خلال آخر 30 يوم:
${JSON.stringify(orderData, null, 2)}

المطلوب:
1. تحليل أنماط الاستهلاك لكل نوع قهوة
2. التنبؤ بموعد نفاد المخزون لكل نوع
3. توصيات لتحسين إدارة المخزون
4. تحديد الأصناف التي تحتاج اهتمام عاجل

أجب بصيغة JSON التالية:
{
  "predictions": [
    {
      "coffeeName": "اسم القهوة",
      "currentStock": الكمية الحالية,
      "estimatedDaysUntilEmpty": عدد الأيام المتوقعة للنفاد,
      "dailyConsumption": معدل الاستهلاك اليومي,
      "recommendedReorderDate": "تاريخ إعادة الطلب الموصى به",
      "recommendedQuantity": الكمية الموصى بطلبها,
      "urgencyLevel": "high" أو "medium" أو "low",
      "notes": "ملاحظات إضافية"
    }
  ],
  "generalRecommendations": ["توصية 1", "توصية 2"],
  "urgentItems": ["اسم المنتج العاجل"],
  "summary": "ملخص عام للوضع"
}`;

    console.log("Calling Lovable AI for predictions...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "أنت مساعد ذكي متخصص في إدارة مخزون القهوة. قدم إجابات دقيقة وعملية بصيغة JSON فقط.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار في استخدام الذكاء الاصطناعي" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    console.log("AI response received:", content?.substring(0, 200));

    // Parse JSON from AI response
    let predictions;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      predictions = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      predictions = {
        predictions: inventoryData.map(item => ({
          coffeeName: item.name,
          currentStock: item.currentStock,
          estimatedDaysUntilEmpty: item.currentStock > 0 ? Math.ceil(item.currentStock / 2) : 0,
          dailyConsumption: 2,
          recommendedReorderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          recommendedQuantity: item.autoReorderQuantity || 10,
          urgencyLevel: item.currentStock <= item.minimumStock ? "high" : "low",
          notes: "تنبؤ تلقائي بناءً على البيانات المتوفرة",
        })),
        generalRecommendations: ["راجع مستويات المخزون بانتظام", "فعّل إعادة الطلب التلقائي للأصناف المهمة"],
        urgentItems: inventoryData.filter(i => i.currentStock <= i.minimumStock).map(i => i.name),
        summary: "تحليل أولي للمخزون. يُنصح بمراجعة الأصناف ذات المخزون المنخفض.",
      };
    }

    console.log("Predictions generated successfully");

    return new Response(JSON.stringify(predictions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in inventory-predictions:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});