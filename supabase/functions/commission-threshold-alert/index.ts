import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const ThresholdAlertSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  alertType: z.enum(["single", "total"], { errorMap: () => ({ message: "Alert type must be 'single' or 'total'" }) }),
  commissionAmount: z.number().nonnegative("Commission amount cannot be negative").max(10_000_000, "Commission amount too large"),
  totalAmount: z.number().nonnegative("Total amount cannot be negative").max(100_000_000, "Total amount too large"),
  threshold: z.number().positive("Threshold must be positive").max(10_000_000, "Threshold too large"),
  supplierName: z.string().max(255, "Supplier name too long").optional(),
  language: z.enum(["ar", "en"]).default("ar"),
  emailOverride: z.string().email("Invalid email format").max(255).optional(),
});

// Sanitize string for HTML output
function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Commission threshold alert function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Parse and validate input
    let rawInput;
    try {
      rawInput = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate input with Zod
    const validationResult = ThresholdAlertSchema.safeParse(rawInput);
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Validation failed", 
          details: validationResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const {
      userId,
      alertType,
      commissionAmount,
      totalAmount,
      threshold,
      supplierName,
      language,
      emailOverride,
    } = validationResult.data;

    // Verify user is requesting alert for themselves or is an admin
    if (userId !== user.id) {
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: isAdmin } = await adminSupabase.rpc('is_verified_admin', { _user_id: user.id });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Forbidden - Cannot send alerts for other users' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    console.log("Alert request from authenticated user:", { userId, alertType, commissionAmount, totalAmount, threshold });

    // Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !userData.user?.email) {
      console.error("Error getting user:", userError);
      throw new Error("Could not get user email");
    }

    const recipientEmail = emailOverride || userData.user.email;
    const isArabic = language === "ar";

    // Sanitize supplier name for HTML if provided
    const safeSupplierName = supplierName ? sanitizeHtml(supplierName) : "";

    // Build email content
    let subject: string;
    let heading: string;
    let message: string;

    if (alertType === "single") {
      subject = isArabic ? "🎯 إشعار عمولة كبيرة" : "🎯 Large Commission Alert";
      heading = isArabic ? "عمولة كبيرة جديدة!" : "New Large Commission!";
      message = isArabic
        ? `تم تسجيل عمولة جديدة بقيمة <strong>${commissionAmount.toFixed(2)} ر.س</strong> ${safeSupplierName ? `من ${safeSupplierName}` : ""} وهي تتجاوز الحد المحدد (${threshold} ر.س).`
        : `A new commission of <strong>${commissionAmount.toFixed(2)} SAR</strong> ${safeSupplierName ? `from ${safeSupplierName}` : ""} has been recorded, exceeding your threshold (${threshold} SAR).`;
    } else {
      subject = isArabic ? "🏆 تم الوصول لحد العمولات" : "🏆 Commission Threshold Reached";
      heading = isArabic ? "تهانينا! تم الوصول للحد المحدد" : "Congratulations! Threshold Reached";
      message = isArabic
        ? `إجمالي العمولات وصل إلى <strong>${totalAmount.toFixed(2)} ر.س</strong> وتجاوز الحد المحدد (${threshold} ر.س).`
        : `Total commissions have reached <strong>${totalAmount.toFixed(2)} SAR</strong>, exceeding your threshold (${threshold} SAR).`;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="${isArabic ? "rtl" : "ltr"}" lang="${language}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${heading}</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              ${message}
            </p>
            
            <!-- Stats Box -->
            <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #92400e; font-weight: 600;">${isArabic ? "الحد المحدد:" : "Threshold:"}</span>
                <span style="color: #92400e; font-weight: bold;">${threshold.toFixed(2)} ${isArabic ? "ر.س" : "SAR"}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #92400e; font-weight: 600;">${isArabic ? "الإجمالي الحالي:" : "Current Total:"}</span>
                <span style="color: #92400e; font-weight: bold;">${totalAmount.toFixed(2)} ${isArabic ? "ر.س" : "SAR"}</span>
              </div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
              ${isArabic 
                ? "يمكنك مراجعة تفاصيل العمولات من خلال لوحة إدارة العمولات في المنصة."
                : "You can review commission details through the Commission Management panel on the platform."}
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              ${isArabic ? "منصة دال للقهوة المختصة" : "Dal Specialty Coffee Platform"}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log("Sending email to:", recipientEmail);

    const emailResponse = await resend.emails.send({
      from: "Dal Coffee <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in commission-threshold-alert function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
