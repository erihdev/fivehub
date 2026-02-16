import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const NotifySupplierSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
  supplierId: z.string().uuid("Invalid supplier ID format"),
  supplierName: z.string().min(1).max(255, "Supplier name too long"),
  coffeeName: z.string().min(1).max(255, "Coffee name too long"),
  roasterName: z.string().min(1).max(255, "Roaster name too long"),
  daysDelayed: z.number().int().min(1).max(365, "Days delayed must be between 1 and 365"),
  expectedDelivery: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date format for expected delivery"),
  quantity: z.number().positive("Quantity must be positive").max(100000, "Quantity too large"),
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify cron secret for scheduled/system calls
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  
  // Also allow authenticated admin users
  const authHeader = req.headers.get('Authorization');
  let isAuthenticated = false;
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userSupabase.auth.getUser();
    if (user) {
      // Check if user is admin
      const { data: isAdmin } = await supabase.rpc('is_verified_admin', { _user_id: user.id });
      isAuthenticated = !!isAdmin;
    }
  }
  
  if (!isAuthenticated && (!cronSecret || !expectedSecret || cronSecret !== expectedSecret)) {
    console.error("Unauthorized access attempt - missing or invalid credentials");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
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
    const validationResult = NotifySupplierSchema.safeParse(rawInput);
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
      orderId,
      supplierId,
      supplierName,
      coffeeName,
      roasterName,
      daysDelayed,
      expectedDelivery,
      quantity,
    } = validationResult.data;

    console.log("Notifying supplier about delayed shipment:", { orderId, supplierId, daysDelayed });

    // Get supplier user_id from suppliers table
    const { data: supplierData } = await supabase
      .from('suppliers')
      .select('user_id')
      .eq('id', supplierId)
      .single();

    if (!supplierData?.user_id) {
      console.log("No user_id found for supplier:", supplierId);
      return new Response(JSON.stringify({ success: false, error: "Supplier user not found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get supplier email from auth
    const { data: userData } = await supabase.auth.admin.getUserById(supplierData.user_id);
    const supplierEmail = userData?.user?.email;

    if (!supplierEmail) {
      console.log("No email found for supplier user:", supplierData.user_id);
      return new Response(JSON.stringify({ success: false, error: "Supplier email not found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Sending email to supplier:", supplierEmail);

    // Check if we already notified this supplier for this order today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingNotification } = await supabase
      .from('supplier_delayed_notifications')
      .select('id')
      .eq('order_id', orderId)
      .gte('notification_sent_at', today)
      .maybeSingle();

    if (existingNotification) {
      console.log("Already notified supplier today for this order");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Sanitize all user-provided strings for HTML
    const safeSupplierName = sanitizeHtml(supplierName);
    const safeCoffeeName = sanitizeHtml(coffeeName);
    const safeRoasterName = sanitizeHtml(roasterName);

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .alert-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .alert-box h2 { color: #ea580c; margin-top: 0; font-size: 18px; }
          .info-grid { display: grid; gap: 12px; }
          .info-item { background: #f8fafc; padding: 12px; border-radius: 8px; border-right: 4px solid #c8a97e; }
          .info-label { color: #64748b; font-size: 12px; margin-bottom: 3px; }
          .info-value { color: #1e293b; font-size: 14px; font-weight: 600; }
          .days-badge { background: #f97316; color: white; padding: 6px 14px; border-radius: 16px; display: inline-block; font-weight: bold; font-size: 16px; }
          .action-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin-top: 20px; text-align: center; }
          .action-box h3 { color: #059669; margin-top: 0; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ تنبيه: شحنة متأخرة عن موعد التسليم</h1>
          </div>
          <div class="content">
            <p style="margin-bottom: 20px;">مرحباً <strong>${safeSupplierName}</strong>،</p>
            
            <div class="alert-box">
              <h2>هناك شحنة متأخرة تحتاج اهتمامك</h2>
              <p>طلب من المحمصة <strong>${safeRoasterName}</strong> متأخر عن موعد التسليم المتوقع بـ:</p>
              <div style="text-align: center; margin: 15px 0;">
                <span class="days-badge">${daysDelayed} ${daysDelayed === 1 ? 'يوم' : 'أيام'}</span>
              </div>
            </div>
            
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">المنتج</div>
                <div class="info-value">${safeCoffeeName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">الكمية</div>
                <div class="info-value">${quantity} كغ</div>
              </div>
              <div class="info-item">
                <div class="info-label">تاريخ التسليم المتوقع</div>
                <div class="info-value">${new Date(expectedDelivery).toLocaleDateString('ar-SA')}</div>
              </div>
              <div class="info-item">
                <div class="info-label">العميل</div>
                <div class="info-value">${safeRoasterName}</div>
              </div>
            </div>
            
            <div class="action-box">
              <h3>🔄 يرجى تحديث حالة الشحنة</h3>
              <p style="margin: 0; color: #059669; font-size: 14px;">
                قم بتسجيل الدخول إلى لوحة التحكم الخاصة بك لتحديث حالة الشحنة وإضافة رقم التتبع.
              </p>
            </div>
          </div>
          <div class="footer">
            <p>منصة دال للقهوة المختصة</p>
            <p>هذا البريد تم إرساله تلقائياً بناءً على تأخر الشحنة</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "دال للقهوة <onboarding@resend.dev>",
        to: [supplierEmail],
        subject: `⚠️ تنبيه: شحنة ${safeCoffeeName} متأخرة ${daysDelayed} ${daysDelayed === 1 ? 'يوم' : 'أيام'}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent to supplier:", emailResult);

    // Log the notification
    await supabase.from('supplier_delayed_notifications').insert({
      order_id: orderId,
      supplier_id: supplierId,
      days_delayed: daysDelayed,
      status: 'sent',
    });

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error notifying supplier:", error);
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
