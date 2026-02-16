import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const AnalyzePdfSchema = z.object({
  pdfContent: z.string().min(1, "PDF content is required").max(10_000_000, "PDF content too large (max 10MB)"),
  supplierName: z.string().min(1).max(255).optional().default("Unknown"),
  supplierId: z.string().uuid("Invalid supplier ID format").optional(),
  isPdf: z.boolean().optional().default(true),
  language: z.enum(["ar", "en"]).optional().default("ar"),
  limitPages: z.boolean().optional().default(false),
  maxPages: z.number().int().min(1).max(1000).optional().default(50),
  checkDuplicates: z.boolean().optional().default(false),
});

// Larger chunk size to reduce number of API calls (500k chars ~ 125k tokens)
const MAX_CHUNK_SIZE = 500000;
// Maximum chunks to process (to avoid timeout)
const MAX_CHUNKS = 10;
// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000;

function splitContentIntoChunks(content: string, maxSize: number): string[] {
  if (content.length <= maxSize) {
    return [content];
  }

  const chunks: string[] = [];
  let currentIndex = 0;

  while (currentIndex < content.length) {
    let endIndex = currentIndex + maxSize;
    
    if (endIndex < content.length) {
      const lastNewline = content.lastIndexOf('\n', endIndex);
      const lastSpace = content.lastIndexOf(' ', endIndex);
      
      if (lastNewline > currentIndex + maxSize * 0.8) {
        endIndex = lastNewline + 1;
      } else if (lastSpace > currentIndex + maxSize * 0.8) {
        endIndex = lastSpace + 1;
      }
    }
    
    chunks.push(content.slice(currentIndex, endIndex));
    currentIndex = endIndex;
  }

  return chunks;
}

async function analyzeChunkWithRetry(
  chunk: string, 
  supplierName: string, 
  chunkIndex: number, 
  totalChunks: number,
  isArabic: boolean,
  apiKey: string
): Promise<{ offerings: any[], error?: string }> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt} for chunk ${chunkIndex + 1}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
      
      const offerings = await analyzeChunk(chunk, supplierName, chunkIndex, totalChunks, isArabic, apiKey);
      return { offerings };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt + 1} failed for chunk ${chunkIndex + 1}:`, lastError.message);
      
      // Don't retry on payment/credits error
      if (lastError.message === "Payment required" || lastError.message === "Not enough credits") {
        return { offerings: [], error: "CREDITS_EXHAUSTED" };
      }
    }
  }
  
  console.error(`All retries failed for chunk ${chunkIndex + 1}`);
  return { offerings: [], error: lastError?.message };
}

async function analyzeChunk(
  chunk: string, 
  supplierName: string, 
  chunkIndex: number, 
  totalChunks: number,
  isArabic: boolean,
  apiKey: string
): Promise<any[]> {
  const systemPrompt = isArabic 
    ? `أنت خبير في تحليل قوائم أسعار القهوة الخضراء. استخرج جميع المحاصيل من المستند.

لكل محصول استخرج (بالعربية):
- name: الاسم
- origin: البلد  
- region: المنطقة
- process: طريقة المعالجة
- price: السعر (رقم فقط)
- currency: SAR أو USD
- altitude: الارتفاع
- variety: الصنف
- flavor: النكهات
- score: التقييم
- available: true/false

أرجع JSON array فقط بدون نص إضافي. مثال:
[{"name":"إثيوبيا يرغاشيفي","origin":"إثيوبيا","price":85,"currency":"SAR"}]`
    : `You are an expert in analyzing green coffee price lists. Extract all coffee crops.

For each crop extract:
- name, origin, region, process, price (number only), currency, altitude, variety, flavor, score, available

Return JSON array only. Example:
[{"name":"Ethiopia Yirgacheffe","origin":"Ethiopia","price":85,"currency":"SAR"}]`;

  const chunkInfo = totalChunks > 1 
    ? (isArabic ? `[جزء ${chunkIndex + 1}/${totalChunks}] ` : `[Part ${chunkIndex + 1}/${totalChunks}] `)
    : '';

  // Sanitize supplier name to prevent injection
  const sanitizedSupplierName = supplierName.replace(/[<>"'&]/g, '');
  
  const userMessage = isArabic
    ? `${chunkInfo}استخرج جميع محاصيل القهوة من "${sanitizedSupplierName}":\n\n${chunk}`
    : `${chunkInfo}Extract all coffee crops from "${sanitizedSupplierName}":\n\n${chunk}`;

  console.log(`Analyzing chunk ${chunkIndex + 1}/${totalChunks}, size: ${chunk.length} chars`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

  try {
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`Chunk ${chunkIndex + 1} AI error:`, aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      if (aiResponse.status === 402) {
        throw new Error("Payment required");
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      console.log(`Chunk ${chunkIndex + 1}: No content returned`);
      return [];
    }

    // Clean the content - remove markdown code blocks if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    try {
      const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`Chunk ${chunkIndex + 1}: Found ${parsed.length} offerings`);
        return Array.isArray(parsed) ? parsed : [];
      }
      
      const parsed = JSON.parse(cleanContent);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error(`Chunk ${chunkIndex + 1}: Failed to parse JSON response`);
      console.error(`Response preview: ${cleanContent.substring(0, 200)}...`);
      return [];
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input with Zod
    const validationResult = AnalyzePdfSchema.safeParse(rawInput);
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Validation failed", 
          details: validationResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { pdfContent, supplierName, supplierId, isPdf, language, limitPages, maxPages, checkDuplicates } = validationResult.data;

    // If limiting pages, estimate and truncate content
    let contentToAnalyze = pdfContent;
    if (limitPages && pdfContent.length > 100000) {
      // Rough estimation: ~2000 chars per page for text content
      const estimatedCharsPerPage = 2000;
      const maxChars = maxPages * estimatedCharsPerPage;
      if (pdfContent.length > maxChars) {
        contentToAnalyze = pdfContent.substring(0, maxChars);
        console.log(`Limited content from ${pdfContent.length} to ${contentToAnalyze.length} chars (first ${maxPages} pages)`);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analyzing content for supplier:", supplierName, "isPdf:", isPdf, "contentLength:", contentToAnalyze.length, "language:", language, "limitPages:", limitPages, "checkDuplicates:", checkDuplicates);

    const isArabic = language === 'ar';
    
    // Get existing coffee names for this supplier if checking duplicates
    let existingCoffeeNames: Set<string> = new Set();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (checkDuplicates && supplierId) {
      const { data: existingCoffees } = await supabase
        .from("coffee_offerings")
        .select("name")
        .eq("supplier_id", supplierId);
      
      if (existingCoffees) {
        existingCoffees.forEach((coffee: any) => {
          if (coffee.name) {
            existingCoffeeNames.add(coffee.name.toLowerCase().trim());
          }
        });
        console.log(`Found ${existingCoffeeNames.size} existing coffees for this supplier`);
      }
    }
    
    // Split content into chunks
    let chunks = splitContentIntoChunks(contentToAnalyze, MAX_CHUNK_SIZE);
    
    // Limit number of chunks to avoid timeout
    if (chunks.length > MAX_CHUNKS) {
      console.log(`Limiting from ${chunks.length} to ${MAX_CHUNKS} chunks`);
      chunks = chunks.slice(0, MAX_CHUNKS);
    }
    
    console.log(`Processing ${chunks.length} chunk(s)`);

    let allOfferings: any[] = [];
    let successfulChunks = 0;
    let failedChunks = 0;
    let creditsExhausted = false;

    // Process chunks sequentially with proper error handling
    for (let i = 0; i < chunks.length; i++) {
      try {
        const result = await analyzeChunkWithRetry(
          chunks[i], 
          supplierName, 
          i, 
          chunks.length, 
          isArabic, 
          LOVABLE_API_KEY
        );
        
        // Check for credits exhausted error
        if (result.error === "CREDITS_EXHAUSTED") {
          creditsExhausted = true;
          console.error("Credits exhausted - stopping processing");
          break;
        }
        
        if (result.offerings.length > 0) {
          allOfferings = allOfferings.concat(result.offerings);
          successfulChunks++;
        } else if (result.error) {
          failedChunks++;
        }
        
        // Delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (chunkError) {
        console.error(`Error processing chunk ${i + 1}:`, chunkError);
        failedChunks++;
      }
    }

    // Return early with specific error if credits exhausted
    if (creditsExhausted && allOfferings.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "CREDITS_EXHAUSTED",
          message: "نفاد رصيد الذكاء الاصطناعي. يرجى المحاولة لاحقاً.",
          messageEn: "AI credits exhausted. Please try again later."
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Completed: ${successfulChunks} successful, ${failedChunks} failed`);
    console.log(`Total offerings found: ${allOfferings.length}`);

    // Remove duplicates based on name (from AI extraction)
    const uniqueOfferings = allOfferings.reduce((acc: any[], curr: any) => {
      if (!curr.name) return acc;
      const exists = acc.find(item => 
        item.name?.toLowerCase().trim() === curr.name?.toLowerCase().trim()
      );
      if (!exists) {
        acc.push(curr);
      }
      return acc;
    }, []);

    console.log(`Unique offerings after deduplication: ${uniqueOfferings.length}`);

    // Filter out coffees that already exist in database
    let duplicatesSkipped = 0;
    const newOfferings = uniqueOfferings.filter((offering: any) => {
      if (!offering.name) return false;
      const nameKey = offering.name.toLowerCase().trim();
      if (existingCoffeeNames.has(nameKey)) {
        duplicatesSkipped++;
        return false;
      }
      return true;
    });

    console.log(`New offerings after checking existing: ${newOfferings.length}, duplicates skipped: ${duplicatesSkipped}`);

    // Save to database if we have a supplier ID and new offerings
    if (supplierId && newOfferings.length > 0) {
      const offeringsToInsert = newOfferings.map((offering: any) => ({
        supplier_id: supplierId,
        name: String(offering.name || "غير محدد").substring(0, 255),
        origin: offering.origin ? String(offering.origin).substring(0, 100) : null,
        region: offering.region ? String(offering.region).substring(0, 100) : null,
        process: offering.process ? String(offering.process).substring(0, 100) : null,
        price: offering.price ? parseFloat(String(offering.price).replace(/[^\d.]/g, '')) || null : null,
        currency: offering.currency === 'USD' ? 'USD' : 'SAR',
        score: offering.score ? Math.min(100, Math.max(0, parseInt(String(offering.score)) || 0)) : null,
        altitude: offering.altitude ? String(offering.altitude).substring(0, 50) : null,
        variety: offering.variety ? String(offering.variety).substring(0, 100) : null,
        flavor: offering.flavor ? String(offering.flavor).substring(0, 500) : null,
        available: offering.available !== false,
      }));

      console.log(`Inserting ${offeringsToInsert.length} offerings to database`);

      const { data: insertedData, error: insertError } = await supabase
        .from("coffee_offerings")
        .insert(offeringsToInsert)
        .select();

      if (insertError) {
        console.error("Error inserting offerings:", insertError);
      } else {
        console.log(`Successfully inserted ${insertedData?.length || 0} offerings`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        offerings: newOfferings,
        count: newOfferings.length,
        chunksProcessed: successfulChunks,
        chunksFailed: failedChunks,
        duplicatesSkipped: duplicatesSkipped
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-pdf function:", error);
    const errorMessage = error instanceof Error ? error.message : "حدث خطأ غير متوقع";
    return new Response(
      JSON.stringify({ error: "فشل في تحليل الملف", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
