import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyContractRequest {
  contract_id: string;
  buyer_email: string;
  seller_email: string;
  buyer_name: string;
  seller_name: string;
  contract_number: string;
  total_amount: number;
  currency: string;
  language: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      contract_id,
      buyer_email, 
      seller_email, 
      buyer_name, 
      seller_name, 
      contract_number, 
      total_amount, 
      currency,
      language 
    }: NotifyContractRequest = await req.json();

    const isArabic = language === "ar";
    const results = [];

    // Send email to buyer
    if (buyer_email) {
      const buyerSubject = isArabic 
        ? `✅ تم اعتماد العقد ${contract_number} - FiveHub`
        : `✅ Contract ${contract_number} Approved - FiveHub`;
      
      const buyerHtml = isArabic ? `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">FiveHub</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #2E7D32;">🎉 تم اعتماد العقد!</h2>
            <p>مرحباً ${buyer_name}،</p>
            <p>نسعد بإبلاغك أن المنصة قد اعتمدت العقد رقم <strong>${contract_number}</strong> بنجاح.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>الخطوة التالية:</h3>
              <p style="color: #1976D2; font-weight: bold;">
                يرجى تحويل مبلغ <strong>${total_amount.toLocaleString()} ${currency}</strong> إلى حساب البائع لإتمام العقد.
              </p>
            </div>
            
            <a href="${SUPABASE_URL?.replace('.supabase.co', '.lovable.app')}/contract/${contract_id}" 
               style="display: inline-block; background: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">
              عرض تفاصيل العقد
            </a>
          </div>
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>© 2024 FiveHub - منصة القهوة المتخصصة</p>
          </div>
        </div>
      ` : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">FiveHub</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #2E7D32;">🎉 Contract Approved!</h2>
            <p>Hello ${buyer_name},</p>
            <p>We're pleased to inform you that contract <strong>${contract_number}</strong> has been approved by the platform.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Next Step:</h3>
              <p style="color: #1976D2; font-weight: bold;">
                Please transfer <strong>${total_amount.toLocaleString()} ${currency}</strong> to the seller's account to complete the contract.
              </p>
            </div>
            
            <a href="${SUPABASE_URL?.replace('.supabase.co', '.lovable.app')}/contract/${contract_id}" 
               style="display: inline-block; background: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">
              View Contract Details
            </a>
          </div>
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>© 2024 FiveHub - Specialty Coffee Platform</p>
          </div>
        </div>
      `;

      const buyerRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "FiveHub <noreply@fivehub.app>",
          to: [buyer_email],
          subject: buyerSubject,
          html: buyerHtml,
        }),
      });

      results.push({ recipient: "buyer", success: buyerRes.ok });
    }

    // Send email to seller
    if (seller_email) {
      const sellerSubject = isArabic 
        ? `✅ تم اعتماد العقد ${contract_number} - FiveHub`
        : `✅ Contract ${contract_number} Approved - FiveHub`;
      
      const sellerAmount = total_amount;
      
      const sellerHtml = isArabic ? `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">FiveHub</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #2E7D32;">🎉 تم اعتماد العقد!</h2>
            <p>مرحباً ${seller_name}،</p>
            <p>نسعد بإبلاغك أن المنصة قد اعتمدت العقد رقم <strong>${contract_number}</strong> بنجاح.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>ما التالي؟</h3>
              <p style="color: #1976D2;">
                المشتري سيقوم بتحويل مبلغ <strong>${sellerAmount.toLocaleString()} ${currency}</strong> إلى حسابك قريباً.
              </p>
              <p>سيتم إكمال العقد تلقائياً بعد تأكيد الدفع.</p>
            </div>
            
            <a href="${SUPABASE_URL?.replace('.supabase.co', '.lovable.app')}/contract/${contract_id}" 
               style="display: inline-block; background: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">
              عرض تفاصيل العقد
            </a>
          </div>
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>© 2024 FiveHub - منصة القهوة المتخصصة</p>
          </div>
        </div>
      ` : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">FiveHub</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #2E7D32;">🎉 Contract Approved!</h2>
            <p>Hello ${seller_name},</p>
            <p>We're pleased to inform you that contract <strong>${contract_number}</strong> has been approved by the platform.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>What's Next?</h3>
              <p style="color: #1976D2;">
                The buyer will transfer <strong>${sellerAmount.toLocaleString()} ${currency}</strong> to your account soon.
              </p>
              <p>The contract will be completed automatically once payment is confirmed.</p>
            </div>
            
            <a href="${SUPABASE_URL?.replace('.supabase.co', '.lovable.app')}/contract/${contract_id}" 
               style="display: inline-block; background: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">
              View Contract Details
            </a>
          </div>
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>© 2024 FiveHub - Specialty Coffee Platform</p>
          </div>
        </div>
      `;

      const sellerRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "FiveHub <noreply@fivehub.app>",
          to: [seller_email],
          subject: sellerSubject,
          html: sellerHtml,
        }),
      });

      results.push({ recipient: "seller", success: sellerRes.ok });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error sending contract notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
};

serve(handler);
