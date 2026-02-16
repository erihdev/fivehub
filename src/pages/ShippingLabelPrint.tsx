import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import DOMPurify from 'dompurify';
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { toast } from "sonner";
import { ArrowRight, Printer, Package, MapPin, User, Phone, QrCode, Barcode, Truck } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import QRCode from "react-qr-code";

interface ShipmentData {
  id: string;
  tracking_number: string;
  order_id: string;
  carrier_id: string;
  shipping_cost: number;
  weight_kg: number;
  dimensions: string;
  status: string;
  shipping_carriers?: {
    name: string;
    name_ar: string;
    code: string;
  };
  orders?: {
    id: string;
    quantity_kg: number;
    notes: string;
    coffee_offerings?: {
      name: string;
      origin: string;
    };
    suppliers?: {
      name: string;
      phone: string;
      address: string;
    };
  };
}

interface CarrierOption {
  id: string;
  name: string;
  name_ar: string;
  code: string;
}

const ShippingLabelPrint = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<CarrierOption[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [selectedCarrier, setSelectedCarrier] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [shipmentData, setShipmentData] = useState<ShipmentData | null>(null);

  const t = {
    title: language === 'ar' ? 'طباعة بوليصة الشحن' : 'Print Shipping Label',
    subtitle: language === 'ar' ? 'إنشاء وطباعة بوليصات الشحن' : 'Create and print shipping labels',
    back: language === 'ar' ? 'العودة' : 'Back',
    selectOrder: language === 'ar' ? 'اختر الطلب' : 'Select Order',
    selectCarrier: language === 'ar' ? 'شركة الشحن' : 'Shipping Carrier',
    trackingNumber: language === 'ar' ? 'رقم التتبع' : 'Tracking Number',
    weight: language === 'ar' ? 'الوزن (كجم)' : 'Weight (kg)',
    dimensions: language === 'ar' ? 'الأبعاد' : 'Dimensions',
    recipientInfo: language === 'ar' ? 'معلومات المستلم' : 'Recipient Info',
    recipientName: language === 'ar' ? 'اسم المستلم' : 'Recipient Name',
    recipientPhone: language === 'ar' ? 'هاتف المستلم' : 'Recipient Phone',
    recipientAddress: language === 'ar' ? 'عنوان المستلم' : 'Recipient Address',
    generateLabel: language === 'ar' ? 'إنشاء البوليصة' : 'Generate Label',
    print: language === 'ar' ? 'طباعة' : 'Print',
    labelPreview: language === 'ar' ? 'معاينة البوليصة' : 'Label Preview',
    from: language === 'ar' ? 'من' : 'From',
    to: language === 'ar' ? 'إلى' : 'To',
    contents: language === 'ar' ? 'المحتويات' : 'Contents',
    date: language === 'ar' ? 'التاريخ' : 'Date',
    noOrders: language === 'ar' ? 'لا توجد طلبات' : 'No orders available',
    kg: language === 'ar' ? 'كجم' : 'kg',
    labelGenerated: language === 'ar' ? 'تم إنشاء البوليصة بنجاح' : 'Label generated successfully',
    fillAllFields: language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields'
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          quantity_kg,
          notes,
          created_at,
          coffee_id,
          supplier_id,
          coffee_offerings (name, origin),
          suppliers (name, phone, address)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Fetch carriers
      const { data: carriersData, error: carriersError } = await supabase
        .from('shipping_carriers')
        .select('id, name, name_ar, code')
        .eq('is_active', true);

      if (carriersError) throw carriersError;
      setCarriers(carriersData || []);

      // Check if order is pre-selected
      const orderId = searchParams.get('order');
      if (orderId) {
        setSelectedOrder(orderId);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateLabel = async () => {
    if (!selectedOrder || !selectedCarrier || !trackingNumber || !recipientName || !recipientAddress) {
      toast.error(t.fillAllFields);
      return;
    }

    try {
      // Save shipment tracking data
      const { data, error } = await supabase
        .from('shipment_tracking')
        .upsert({
          order_id: selectedOrder,
          carrier_id: selectedCarrier,
          tracking_number: trackingNumber,
          weight_kg: parseFloat(weight) || null,
          dimensions: dimensions || null,
          status: 'pending',
          label_printed: true,
          label_printed_at: new Date().toISOString()
        }, {
          onConflict: 'order_id'
        })
        .select(`
          *,
          shipping_carriers (name, name_ar, code),
          orders (
            id,
            quantity_kg,
            notes,
            coffee_offerings (name, origin),
            suppliers (name, phone, address)
          )
        `)
        .single();

      if (error) throw error;

      setShipmentData({
        ...data,
        shipping_carriers: data.shipping_carriers as any,
        orders: data.orders as any
      });
      toast.success(t.labelGenerated);

    } catch (error) {
      console.error('Error generating label:', error);
      toast.error('Error generating label');
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      // Sanitize HTML content to prevent XSS attacks
      const printContent = DOMPurify.sanitize(printRef.current.innerHTML);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="${dir}">
          <head>
            <title>Shipping Label</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .label { border: 2px solid #000; padding: 20px; max-width: 400px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
              .section { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #ccc; }
              .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
              .label-text { font-weight: bold; color: #666; font-size: 12px; }
              .value-text { font-size: 14px; }
              .barcode { text-align: center; margin: 15px 0; }
              .tracking { font-size: 20px; font-weight: bold; letter-spacing: 2px; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>${printContent}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const selectedOrderData = orders.find(o => o.id === selectedOrder);
  const selectedCarrierData = carriers.find(c => c.id === selectedCarrier);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {t.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Order Selection */}
              <div className="space-y-2">
                <Label>{t.selectOrder}</Label>
                <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectOrder} />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.coffee_offerings?.name || 'Order'} - {order.quantity_kg} {t.kg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Carrier Selection */}
              <div className="space-y-2">
                <Label>{t.selectCarrier}</Label>
                <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectCarrier} />
                  </SelectTrigger>
                  <SelectContent>
                    {carriers.map((carrier) => (
                      <SelectItem key={carrier.id} value={carrier.id}>
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          {language === 'ar' ? carrier.name_ar : carrier.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tracking Number */}
              <div className="space-y-2">
                <Label>{t.trackingNumber}</Label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="AWB123456789"
                />
              </div>

              {/* Weight & Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.weight}</Label>
                  <Input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="5.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.dimensions}</Label>
                  <Input
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="30x20x15 cm"
                  />
                </div>
              </div>

              {/* Recipient Info */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t.recipientInfo}
                </h3>
                <div className="space-y-2">
                  <Label>{t.recipientName}</Label>
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.recipientPhone}</Label>
                  <Input
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="+966..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.recipientAddress}</Label>
                  <Input
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={generateLabel} className="w-full">
                <QrCode className={`w-4 h-4 ${dir === 'rtl' ? 'ml-2' : 'mr-2'}`} />
                {t.generateLabel}
              </Button>
            </CardContent>
          </Card>

          {/* Label Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Barcode className="w-5 h-5" />
                  {t.labelPreview}
                </span>
                {shipmentData && (
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className={`w-4 h-4 ${dir === 'rtl' ? 'ml-2' : 'mr-2'}`} />
                    {t.print}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipmentData ? (
                <div ref={printRef} className="border-2 border-dashed rounded-lg p-6 bg-white text-black">
                  <div className="label">
                    {/* Header */}
                    <div className="header text-center border-b-2 border-black pb-4 mb-4">
                      <h2 className="text-xl font-bold">
                        {language === 'ar' ? shipmentData.shipping_carriers?.name_ar : shipmentData.shipping_carriers?.name}
                      </h2>
                      <p className="text-sm text-gray-600">{t.date}: {format(new Date(), 'yyyy-MM-dd')}</p>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center my-4">
                      <QRCode value={shipmentData.tracking_number || 'NO-TRACKING'} size={100} />
                    </div>

                    {/* Tracking Number */}
                    <div className="text-center my-4">
                      <p className="text-sm text-gray-600">{t.trackingNumber}</p>
                      <p className="text-2xl font-bold tracking-widest">{shipmentData.tracking_number}</p>
                    </div>

                    {/* From Section */}
                    <div className="section border-b border-dashed pb-4 mb-4">
                      <p className="text-sm font-bold text-gray-600 mb-2">{t.from}:</p>
                      <p className="font-semibold">{shipmentData.orders?.suppliers?.name}</p>
                      <p className="text-sm">{shipmentData.orders?.suppliers?.address}</p>
                      <p className="text-sm">{shipmentData.orders?.suppliers?.phone}</p>
                    </div>

                    {/* To Section */}
                    <div className="section border-b border-dashed pb-4 mb-4">
                      <p className="text-sm font-bold text-gray-600 mb-2">{t.to}:</p>
                      <p className="font-semibold">{recipientName}</p>
                      <p className="text-sm">{recipientAddress}</p>
                      <p className="text-sm">{recipientPhone}</p>
                    </div>

                    {/* Contents */}
                    <div className="section">
                      <p className="text-sm font-bold text-gray-600 mb-2">{t.contents}:</p>
                      <p>{shipmentData.orders?.coffee_offerings?.name}</p>
                      <p className="text-sm text-gray-600">
                        {shipmentData.orders?.quantity_kg} {t.kg} | {shipmentData.weight_kg} {t.kg} | {shipmentData.dimensions}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t.fillAllFields}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ShippingLabelPrint;