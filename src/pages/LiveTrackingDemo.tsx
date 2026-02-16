import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Navigation, CreditCard, Receipt, Sparkles } from "lucide-react";
import LiveGPSTracker from "@/components/tracking/LiveGPSTracker";
import PaymentSystem from "@/components/payment/PaymentSystem";
import ElectronicInvoice from "@/components/payment/ElectronicInvoice";

const LiveTrackingDemo = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isArabic = language === 'ar';
  
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  // Demo order items
  const demoItems = [
    { name: "Ethiopian Yirgacheffe", nameAr: "إثيوبي يرغاشيف", quantity: 10, unitPrice: 120 },
    { name: "Colombian Supremo", nameAr: "كولومبي سوبريمو", quantity: 5, unitPrice: 95 },
  ];

  // Demo invoice data
  const invoiceData = {
    invoiceId: invoiceId || "INV-2026-001234",
    orderDate: new Date(),
    supplierName: "Green Bean Traders Co.",
    supplierVatNumber: "300012345600003",
    customerName: "Riyadh Roasters LLC",
    items: demoItems,
    currency: "SAR"
  };

  const handlePaymentSuccess = (newInvoiceId: string) => {
    setInvoiceId(newInvoiceId);
    setShowInvoice(true);
  };

  return (
    <div 
      className="min-h-screen bg-background" 
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-fivehub-gold" />
              <h1 className="text-3xl font-bold text-foreground">
                {isArabic ? 'ميزات التتبع والدفع' : 'Tracking & Payment Features'}
              </h1>
            </div>
            <p className="text-muted-foreground mt-1">
              {isArabic 
                ? 'تجربة التتبع الحي ونظام الدفع والفواتير الإلكترونية' 
                : 'Experience live tracking, payment system, and electronic invoicing'}
            </p>
          </div>
        </div>

        {/* Demo Badge */}
        <Card className="mb-8 bg-gradient-to-r from-fivehub-orange/10 to-fivehub-gold/10 border-fivehub-orange/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-fivehub-orange flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-fivehub-orange">
                  {isArabic ? 'وضع العرض التجريبي' : 'Demo Mode'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isArabic 
                    ? 'مستوحى من تطبيق PulluP - التتبع الحي GPS ونظام الدفع السعودي' 
                    : 'Inspired by PulluP - Live GPS tracking & Saudi payment system'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="tracking" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              {isArabic ? 'التتبع الحي' : 'Live Tracking'}
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              {isArabic ? 'الدفع' : 'Payment'}
            </TabsTrigger>
            <TabsTrigger value="invoice" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              {isArabic ? 'الفاتورة' : 'Invoice'}
            </TabsTrigger>
          </TabsList>

          {/* Live Tracking Tab */}
          <TabsContent value="tracking" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <LiveGPSTracker 
                orderId="demo-order-001"
                destinationLat={24.7136}
                destinationLng={46.6753}
                onArrival={() => console.log("Order arrived!")}
              />
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-primary" />
                    {isArabic ? 'كيف يعمل التتبع الحي؟' : 'How Live Tracking Works'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {[
                      {
                        step: "1",
                        title: isArabic ? "تتبع GPS ذكي" : "Smart GPS Tracking",
                        desc: isArabic 
                          ? "نراقب موقع الشحنة وسرعتها في الوقت الفعلي" 
                          : "We monitor shipment location and speed in real-time"
                      },
                      {
                        step: "2",
                        title: isArabic ? "حساب ETA الديناميكي" : "Dynamic ETA Calculation",
                        desc: isArabic 
                          ? "نحسب وقت الوصول بناءً على المسافة والسرعة" 
                          : "We calculate arrival time based on distance and speed"
                      },
                      {
                        step: "3",
                        title: isArabic ? "إشعارات ذكية" : "Smart Notifications",
                        desc: isArabic 
                          ? "نرسل تنبيهات عند اقتراب الشحنة" 
                          : "We send alerts when shipment is nearby"
                      },
                      {
                        step: "4",
                        title: isArabic ? "تأكيد الاستلام" : "Delivery Confirmation",
                        desc: isArabic 
                          ? "تأكيد فوري عند وصول الشحنة" 
                          : "Instant confirmation when shipment arrives"
                      }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{item.step}</span>
                        </div>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment">
            <div className="max-w-lg mx-auto">
              <PaymentSystem 
                items={demoItems}
                currency="SAR"
                onPaymentSuccess={handlePaymentSuccess}
              />
            </div>
          </TabsContent>

          {/* Invoice Tab */}
          <TabsContent value="invoice">
            <ElectronicInvoice 
              data={invoiceData}
              onDownload={() => console.log("Download PDF")}
              onPrint={() => window.print()}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LiveTrackingDemo;
