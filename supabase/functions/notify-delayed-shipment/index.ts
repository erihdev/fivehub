import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DelayedShipmentRequest {
  userId: string;
  userEmail: string;
  orderId: string;
  supplierName: string;
  coffeeName: string;
  daysDelayed: number;
  expectedDelivery: string;
  quantity: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      userId,
      userEmail,
      orderId,
      supplierName,
      coffeeName,
      daysDelayed,
      expectedDelivery,
      quantity,
    }: DelayedShipmentRequest = await req.json();

    console.log("Sending delayed shipment notification to:", userEmail);
    console.log("Order details:", { orderId, supplierName, coffeeName, daysDelayed });

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "دال للقهوة <onboarding@resend.dev>",
        to: [userEmail],
        subject: `⚠️ تنبيه: تأخر شحنة طلب ${coffeeName}`,
        html: `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; }
              .content { padding: 30px; }
              .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
              .alert-box h2 { color: #dc2626; margin-top: 0; }
              .info-grid { display: grid; gap: 15px; }
              .info-item { background: #f8fafc; padding: 15px; border-radius: 8px; border-right: 4px solid #c8a97e; }
              .info-label { color: #64748b; font-size: 14px; margin-bottom: 5px; }
              .info-value { color: #1e293b; font-size: 16px; font-weight: 600; }
              .days-badge { background: #dc2626; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; font-size: 18px; }
              .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚠️ تنبيه تأخر الشحنة</h1>
              </div>
              <div class="content">
                <div class="alert-box">
                  <h2>شحنتك متأخرة عن موعد التسليم!</h2>
                  <p>طلبك من <strong>${supplierName}</strong> متأخر بـ:</p>
                  <div style="text-align: center; margin: 20px 0;">
                    <span class="days-badge">${daysDelayed} ${daysDelayed === 1 ? 'يوم' : 'أيام'}</span>
                  </div>
                </div>
                
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">المنتج</div>
                    <div class="info-value">${coffeeName}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">المورد</div>
                    <div class="info-value">${supplierName}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">الكمية</div>
                    <div class="info-value">${quantity} كغ</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">تاريخ التسليم المتوقع</div>
                    <div class="info-value">${new Date(expectedDelivery).toLocaleDateString('ar-SA')}</div>
                  </div>
                </div>
                
                <p style="margin-top: 25px; color: #64748b;">
                  ننصحك بالتواصل مع المورد للاستفسار عن حالة الشحنة.
                </p>
              </div>
              <div class="footer">
                <p>منصة دال للقهوة المختصة</p>
                <p>هذا البريد تم إرساله تلقائياً</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const result = await emailResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending delayed shipment notification:", error);
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
