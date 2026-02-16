import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderNotificationRequest {
  order_id: string;
  supplier_id: string;
  roaster_name: string;
  coffee_name: string;
  quantity_kg: number;
  total_price: number;
  currency: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-supplier-new-order function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify cron secret for system calls OR JWT for authenticated users
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');
    let isAuthorized = false;
    
    // Check cron secret
    if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
      isAuthorized = true;
    }
    
    // Allow authenticated users (triggered from order creation)
    if (!isAuthorized && authHeader && authHeader.startsWith('Bearer ')) {
      const userSupabase = createClient(supabaseUrl, supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userSupabase.auth.getUser();
      isAuthorized = !!user;
    }
    
    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      order_id, 
      supplier_id, 
      roaster_name, 
      coffee_name, 
      quantity_kg, 
      total_price, 
      currency 
    }: OrderNotificationRequest = await req.json();

    console.log("Processing order notification for supplier:", supplier_id);

    // Get supplier details
    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("name, user_id")
      .eq("id", supplier_id)
      .single();

    if (supplierError || !supplier) {
      console.error("Error fetching supplier:", supplierError);
      throw new Error("Supplier not found");
    }

    // Get supplier user's email from user_roles
    const { data: userRole, error: userRoleError } = await supabase
      .from("user_roles")
      .select("company_email")
      .eq("user_id", supplier.user_id)
      .single();

    if (userRoleError || !userRole?.company_email) {
      console.error("Error fetching supplier email:", userRoleError);
      throw new Error("Supplier email not found");
    }

    const supplierEmail = userRole.company_email;
    const supplierName = supplier.name;

    console.log("Sending email to:", supplierEmail);

    // Send email using Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "دال للقهوة <onboarding@resend.dev>",
        to: [supplierEmail],
        subject: `🎉 طلب جديد من ${roaster_name}`,
        html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f5f5f5;
              margin: 0;
              padding: 20px;
              direction: rtl;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #8B4513 0%, #D4A574 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              padding: 30px;
            }
            .order-card {
              background-color: #f8f4f0;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .order-item {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e0d5cc;
            }
            .order-item:last-child {
              border-bottom: none;
            }
            .label {
              color: #666;
              font-size: 14px;
            }
            .value {
              font-weight: bold;
              color: #333;
            }
            .total {
              background-color: #8B4513;
              color: white;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
              margin-top: 20px;
            }
            .total-amount {
              font-size: 28px;
              font-weight: bold;
            }
            .footer {
              background-color: #f0f0f0;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .cta-button {
              display: inline-block;
              background-color: #8B4513;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>☕ طلب جديد!</h1>
              <p>مرحباً ${supplierName}</p>
            </div>
            <div class="content">
              <p>لديك طلب جديد من <strong>${roaster_name}</strong>!</p>
              
              <div class="order-card">
                <div class="order-item">
                  <span class="label">المنتج:</span>
                  <span class="value">${coffee_name}</span>
                </div>
                <div class="order-item">
                  <span class="label">الكمية:</span>
                  <span class="value">${quantity_kg} كغ</span>
                </div>
                <div class="order-item">
                  <span class="label">العميل:</span>
                  <span class="value">${roaster_name}</span>
                </div>
              </div>

              <div class="total">
                <div>إجمالي الطلب</div>
                <div class="total-amount">${total_price.toFixed(2)} ${currency}</div>
              </div>

              <p style="text-align: center; margin-top: 20px;">
                يرجى تسجيل الدخول لإدارة هذا الطلب
              </p>
            </div>
            <div class="footer">
              <p>هذا البريد مرسل تلقائياً من منصة دال للقهوة</p>
              <p>© ${new Date().getFullYear()} دال - جميع الحقوق محفوظة</p>
            </div>
          </div>
        </body>
        </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(`Failed to send email: ${JSON.stringify(errorData)}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    

    return new Response(
      JSON.stringify({ success: true, message: "Email notification sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-supplier-new-order function:", error);
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
