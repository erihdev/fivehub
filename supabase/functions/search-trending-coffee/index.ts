import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const SearchTrendingSchema = z.object({
  query: z.string().max(500, "Query too long").optional(),
  origin: z.string().max(100, "Origin name too long").optional(),
});

// Sanitize string for use in prompts to prevent injection
function sanitizeForPrompt(str: string): string {
  // Remove control characters and limit special chars
  return str
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[<>{}]/g, '') // Remove potentially dangerous chars
    .trim()
    .substring(0, 200); // Limit length
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    let rawInput;
    try {
      rawInput = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input with Zod
    const validationResult = SearchTrendingSchema.safeParse(rawInput);
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Validation failed", 
          details: validationResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, origin } = validationResult.data;

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    
    if (!PERPLEXITY_API_KEY) {
      console.error("PERPLEXITY_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "مفتاح Perplexity غير مُعد" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query for trending coffee in Gulf region
    let searchQuery = "أحدث وأشهر محاصيل القهوة المختصة الرائجة في محامص الخليج العربي السعودية الإمارات الكويت قطر البحرين عمان 2024";
    
    // Sanitize and add user-provided values
    if (origin) {
      const sanitizedOrigin = sanitizeForPrompt(origin);
      searchQuery += ` من ${sanitizedOrigin}`;
    }
    
    if (query) {
      const sanitizedQuery = sanitizeForPrompt(query);
      searchQuery += ` ${sanitizedQuery}`;
    }

    console.log("Searching with Perplexity:", searchQuery);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: `أنت خبير في القهوة المختصة ومحامص القهوة في منطقة الخليج العربي.
            
مهمتك: البحث في الإنترنت وإيجاد المحاصيل والقهوة الخضراء الأكثر رواجاً حالياً في المحامص الخليجية.

يجب أن ترد بصيغة JSON فقط بالشكل التالي:
{
  "trending": [
    {
      "name": "اسم المحصول",
      "origin": "بلد المنشأ",
      "process": "طريقة المعالجة",
      "flavor_notes": "ملاحظات النكهة",
      "roasters": "المحامص التي تقدمه",
      "price_range": "نطاق السعر التقريبي",
      "popularity_reason": "سبب رواجه"
    }
  ],
  "market_insights": "رؤى عامة عن سوق القهوة الحالي في الخليج"
}

قدم 5-7 محاصيل رائجة حالياً بناءً على بحثك الحقيقي في الإنترنت.`
          },
          { 
            role: 'user', 
            content: searchQuery
          }
        ],
        search_recency_filter: 'month',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "خطأ في البحث" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("Perplexity response received");

    const content = data.choices?.[0]?.message?.content;
    const citations = data.citations || [];

    if (!content) {
      return new Response(
        JSON.stringify({ error: "لم يتم العثور على نتائج" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from content
    let parsedResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        parsedResult = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // Return raw content if parsing fails
      parsedResult = {
        trending: [],
        market_insights: content,
        raw_response: true
      };
    }

    // Add citations to the response
    parsedResult.sources = citations;

    return new Response(
      JSON.stringify(parsedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in search-trending-coffee:", error);
    const errorMessage = error instanceof Error ? error.message : "حدث خطأ غير متوقع";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
