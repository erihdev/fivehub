import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BlendComponent {
  coffeeId?: string;
  coffeeName: string;
  origin: string;
  percentage: number;
}

interface FlavorProfile {
  acidity: number;
  body: number;
  sweetness: number;
  bitterness: number;
  fruitiness: number;
  nuttiness: number;
}

interface Coffee {
  id: string;
  name: string;
  origin: string | null;
  flavor: string | null;
  score: number | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No valid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;
    console.log('Authenticated user:', userId);

    const { components, targetProfile, availableCoffees } = await req.json() as {
      components: BlendComponent[];
      targetProfile: FlavorProfile;
      availableCoffees: Coffee[];
    };

    console.log('Generating blend suggestions for:', { 
      componentsCount: components.length,
      targetProfile,
      availableCoffeesCount: availableCoffees.length,
      userId
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build context about available coffees
    const coffeeContext = availableCoffees.map(c => 
      `- ${c.name} (${c.origin || 'Unknown origin'}): ${c.flavor || 'No flavor notes'}, Score: ${c.score || 'N/A'}`
    ).join('\n');

    // Build current blend context
    const blendContext = components.filter(c => c.coffeeName).map(c =>
      `- ${c.coffeeName} (${c.origin}): ${c.percentage}%`
    ).join('\n') || 'No components selected yet';

    const prompt = `أنت خبير في خلط القهوة المتخصصة. ساعد المستخدم في إنشاء خلطة قهوة مثالية.

ملف النكهة المستهدف:
- الحموضة: ${targetProfile.acidity}%
- الجسم: ${targetProfile.body}%
- الحلاوة: ${targetProfile.sweetness}%
- المرارة: ${targetProfile.bitterness}%
- الفاكهية: ${targetProfile.fruitiness}%
- المكسرات: ${targetProfile.nuttiness}%

المكونات الحالية:
${blendContext}

القهوة المتاحة:
${coffeeContext}

قدم اقتراحات باللغة العربية تشمل:
1. تحليل ملف النكهة المستهدف
2. اقتراحات لأنواع القهوة المناسبة من القائمة المتاحة
3. نسب مقترحة للحصول على التوازن المطلوب
4. نصائح للتحميص والتحضير

اجعل الإجابة مختصرة ومفيدة (حوالي 200 كلمة).`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert coffee blender specializing in specialty coffee. Respond in Arabic.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const suggestions = data.choices?.[0]?.message?.content || 'لم نتمكن من توليد اقتراحات في الوقت الحالي.';

    console.log('Successfully generated suggestions for user:', userId);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-blend-suggestions:', error);
    
    // Return fallback suggestions on error
    const fallbackSuggestions = `بناءً على ملف النكهة المستهدف:

• للحصول على حموضة عالية، جرب إضافة قهوة كينيا أو إثيوبيا
• للجسم الكامل، أضف قهوة سومطرة أو البرازيل
• للحلاوة، جرب قهوة كولومبيا أو غواتيمالا

نسب مقترحة:
- 40% إثيوبيا (للحموضة والفاكهية)
- 35% كولومبيا (للتوازن والحلاوة)
- 25% البرازيل (للجسم والمكسرات)

نصيحة: جرب تحميص متوسط للحفاظ على توازن النكهات.`;

    return new Response(JSON.stringify({ suggestions: fallbackSuggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
