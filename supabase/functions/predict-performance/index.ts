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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // ============ AUTHENTICATION CHECK ============
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized - No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a client with the user's auth token to verify identity
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============ AUTHORIZATION CHECK ============
    // User can only access their own data unless they're an admin
    if (userId !== user.id) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc('is_verified_admin', { 
        _user_id: user.id 
      });
      
      if (adminError || !isAdmin) {
        console.error("Authorization denied - user tried to access another user's data");
        return new Response(JSON.stringify({ error: "Forbidden - Cannot access other user's data" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Use service role for actual data queries (after auth/authz verified)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching performance data for predictions...");

    // Fetch last 30 days of performance logs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: logs, error: logsError } = await supabase
      .from("performance_alert_logs")
      .select("score, threshold, sent_at, alert_data")
      .eq("user_id", userId)
      .gte("sent_at", thirtyDaysAgo.toISOString())
      .order("sent_at", { ascending: true });

    if (logsError) throw logsError;

    // Fetch current inventory status
    const { data: inventory, error: invError } = await supabase
      .from("inventory")
      .select("quantity_kg, min_quantity_kg, auto_reorder_enabled")
      .eq("user_id", userId);

    if (invError) throw invError;

    // Fetch recent orders
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("total_price, status, created_at")
      .eq("user_id", userId)
      .gte("created_at", weekAgo.toISOString());

    if (ordersError) throw ordersError;

    // Prepare context for AI
    const scores = logs?.map(l => l.score) || [];
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 50;
    const trend = scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0;
    const lowStockCount = inventory?.filter(i => Number(i.quantity_kg) < Number(i.min_quantity_kg)).length || 0;
    const totalStock = inventory?.reduce((sum, i) => sum + Number(i.quantity_kg), 0) || 0;
    const ordersCount = orders?.length || 0;

    const contextData = {
      historicalScores: scores.slice(-14),
      averageScore: avgScore,
      trendDirection: trend > 0 ? "improving" : trend < 0 ? "declining" : "stable",
      trendValue: trend,
      currentLowStockItems: lowStockCount,
      totalInventory: totalStock,
      recentOrdersCount: ordersCount,
      inventoryItems: inventory?.length || 0,
    };

    console.log("Calling Lovable AI for predictions...", contextData);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
            content: `أنت محلل أداء مخزون ذكي. قم بتحليل البيانات التاريخية وتقديم توقعات للأسبوع القادم.
            
            يجب أن تعيد JSON فقط بالتنسيق التالي:
            {
              "predictedScores": [number, number, number, number, number, number, number],
              "averagePrediction": number,
              "riskLevel": "low" | "medium" | "high",
              "insights": ["string", "string", "string"],
              "recommendations": ["string", "string"]
            }
            
            - predictedScores: توقعات المؤشر لكل يوم من الأسبوع القادم (7 أرقام)
            - averagePrediction: متوسط التوقع للأسبوع
            - riskLevel: مستوى المخاطر (منخفض/متوسط/عالي)
            - insights: 3 رؤى مهمة عن الأداء
            - recommendations: 2 توصيات للتحسين
            
            اجعل التوقعات منطقية بناءً على الاتجاه التاريخي.`
          },
          {
            role: "user",
            content: `حلل هذه البيانات وقدم توقعات الأسبوع القادم:
            
            - آخر 14 مؤشر أداء: ${JSON.stringify(contextData.historicalScores)}
            - متوسط الأداء: ${contextData.averageScore}
            - اتجاه الأداء: ${contextData.trendDirection} (${contextData.trendValue > 0 ? '+' : ''}${contextData.trendValue})
            - عناصر منخفضة المخزون حالياً: ${contextData.currentLowStockItems}
            - إجمالي المخزون: ${contextData.totalInventory} كجم
            - طلبات الأسبوع الماضي: ${contextData.recentOrdersCount}
            - عدد عناصر المخزون: ${contextData.inventoryItems}`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      // For rate limit or payment errors, return fallback predictions instead of error
      if (aiResponse.status === 429 || aiResponse.status === 402) {
        console.log("AI unavailable, using fallback predictions...");
        const basePrediction = avgScore + Math.round(trend / 2);
        const fallbackPredictions = {
          predictedScores: Array(7).fill(0).map((_, i) => 
            Math.max(0, Math.min(100, basePrediction + Math.round((Math.random() - 0.5) * 10)))
          ),
          averagePrediction: basePrediction,
          riskLevel: basePrediction < 40 ? "high" : basePrediction < 70 ? "medium" : "low",
          insights: [
            `متوسط الأداء الحالي: ${avgScore}`,
            `الاتجاه العام: ${trend > 0 ? "تحسن" : trend < 0 ? "انخفاض" : "مستقر"}`,
            `عناصر تحتاج اهتمام: ${lowStockCount}`
          ],
          recommendations: [
            "راقب مستويات المخزون بانتظام",
            "فعّل إعادة الطلب التلقائي للعناصر الحرجة"
          ]
        };
        
        return new Response(JSON.stringify({ 
          success: true, 
          predictions: fallbackPredictions,
          context: contextData,
          fallback: true
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI API error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    console.log("AI Response:", content);

    // Parse AI response
    let predictions;
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        predictions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback predictions based on historical data
      const basePrediction = avgScore + Math.round(trend / 2);
      predictions = {
        predictedScores: Array(7).fill(0).map((_, i) => 
          Math.max(0, Math.min(100, basePrediction + Math.round((Math.random() - 0.5) * 10)))
        ),
        averagePrediction: basePrediction,
        riskLevel: basePrediction < 40 ? "high" : basePrediction < 70 ? "medium" : "low",
        insights: [
          `متوسط الأداء الحالي: ${avgScore}`,
          `الاتجاه العام: ${trend > 0 ? "تحسن" : trend < 0 ? "انخفاض" : "مستقر"}`,
          `عناصر تحتاج اهتمام: ${lowStockCount}`
        ],
        recommendations: [
          "راقب مستويات المخزون بانتظام",
          "فعّل إعادة الطلب التلقائي للعناصر الحرجة"
        ]
      };
    }

    return new Response(JSON.stringify({ 
      success: true, 
      predictions,
      context: contextData
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in predict-performance:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
