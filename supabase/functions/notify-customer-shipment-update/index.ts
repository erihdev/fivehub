import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyRequest {
  orderId: string;
  supplierId: string;
  shipmentStatus: string;
  trackingNumber?: string;
  estimatedArrival?: string;
  location?: string;
  notes?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { orderId, supplierId, shipmentStatus, trackingNumber, estimatedArrival, location, notes } = await req.json() as NotifyRequest;
    
    console.log('Notifying customer about shipment update:', { orderId, shipmentStatus });
    
    // Get order and customer details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, quantity_kg, expected_delivery')
      .eq('id', orderId)
      .single();
    
    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get customer email from auth
    const { data: { user: customer }, error: userError } = await supabase.auth.admin.getUserById(order.user_id);
    
    if (userError || !customer?.email) {
      console.error('Customer not found:', userError);
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get supplier name
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('name')
      .eq('id', supplierId)
      .single();
    
    const supplierName = supplier?.name || 'المورد';
    
    // Build status message in Arabic
    const statusMessages: Record<string, string> = {
      'preparing': 'جاري تحضير الشحنة',
      'shipped': 'تم شحن الطلب',
      'in_transit': 'الشحنة في الطريق',
      'delivered': 'تم تسليم الطلب',
      'delayed': 'الشحنة متأخرة',
    };
    
    const statusMessage = statusMessages[shipmentStatus] || shipmentStatus;
    
    let emailSent = false;
    let errorMessage = null;
    
    // Send email notification
    if (resendApiKey) {
      try {
        const emailHtml = `
          <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px; color: white; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">☕ تحديث حالة الشحنة</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
              <h2 style="color: #1a1a2e; margin-top: 0;">${statusMessage}</h2>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 10px 0;"><strong>المورد:</strong> ${supplierName}</p>
                <p style="margin: 10px 0;"><strong>رقم الطلب:</strong> ${orderId.slice(0, 8)}</p>
                <p style="margin: 10px 0;"><strong>الكمية:</strong> ${order.quantity_kg} كجم</p>
                ${trackingNumber ? `<p style="margin: 10px 0;"><strong>رقم التتبع:</strong> ${trackingNumber}</p>` : ''}
                ${location ? `<p style="margin: 10px 0;"><strong>الموقع الحالي:</strong> ${location}</p>` : ''}
                ${estimatedArrival ? `<p style="margin: 10px 0;"><strong>الوصول المتوقع:</strong> ${new Date(estimatedArrival).toLocaleDateString('ar-SA')}</p>` : ''}
                ${notes ? `<p style="margin: 10px 0;"><strong>ملاحظات:</strong> ${notes}</p>` : ''}
              </div>
              
              <p style="color: #666; font-size: 14px;">سيتم إعلامك بأي تحديثات جديدة على شحنتك.</p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
              <p>منصة دال للقهوة المختصة</p>
            </div>
          </div>
        `;
        
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'دال <onboarding@resend.dev>',
            to: [customer.email],
            subject: `تحديث الشحنة: ${statusMessage}`,
            html: emailHtml,
          }),
        });
        
        if (emailResponse.ok) {
          emailSent = true;
          console.log('Email sent successfully to:', customer.email);
        } else {
          const emailError = await emailResponse.text();
          console.error('Failed to send email:', emailError);
          errorMessage = emailError;
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        errorMessage = String(emailError);
      }
    } else {
      console.log('RESEND_API_KEY not configured, skipping email');
      errorMessage = 'RESEND_API_KEY not configured';
    }
    
    // Log the notification
    await supabase
      .from('customer_shipment_notifications')
      .insert({
        order_id: orderId,
        customer_id: order.user_id,
        supplier_id: supplierId,
        notification_type: 'shipment_update',
        shipment_status: shipmentStatus,
        tracking_number: trackingNumber || null,
        estimated_arrival: estimatedArrival || null,
        message: notes || null,
        email_sent_to: customer.email,
        status: emailSent ? 'sent' : 'failed',
        error_message: errorMessage,
      });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        emailSent,
        message: emailSent ? 'Customer notified successfully' : 'Notification logged but email not sent'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in notify-customer-shipment-update:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
