import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, AlertCircle, Plus, Trash2, Info } from "lucide-react";
import BackButton from "@/components/BackButton";

interface Seller {
  id: string;
  name: string;
  company_name: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export default function CreateDirectContract() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isArabic = language === "ar";

  const [loading, setLoading] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [formData, setFormData] = useState({
    seller_id: "",
    notes: "",
  });
  const [items, setItems] = useState<OrderItem[]>([
    { name: "", quantity: 1, unit_price: 0, total: 0 }
  ]);

  const COMMISSION_RATE = 10; // 10%

  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (userRole) {
      fetchSellers();
    }
  }, [userRole]);

  const fetchUserRole = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .single();
    
    if (data) {
      setUserRole(data.role);
    }
  };

  const fetchSellers = async () => {
    // Cafe buys from Roaster, Roaster buys from Supplier
    const sellerRole = userRole === 'cafe' ? 'roaster' : 'supplier';
    
    const { data } = await supabase
      .from('user_roles')
      .select('user_id, company_name')
      .eq('role', sellerRole)
      .eq('status', 'approved');

    if (data) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', data.map(d => d.user_id));

      const sellersData = data.map(d => ({
        id: d.user_id,
        name: profiles?.find(p => p.user_id === d.user_id)?.full_name || '',
        company_name: d.company_name || ''
      }));
      
      setSellers(sellersData);
    }
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { name: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
  const commissionAmount = (totalAmount * COMMISSION_RATE) / 100;
  const sellerAmount = totalAmount - commissionAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.seller_id) {
      toast.error(isArabic ? "يرجى اختيار البائع" : "Please select a seller");
      return;
    }

    if (items.some(item => !item.name || item.quantity <= 0 || item.unit_price <= 0)) {
      toast.error(isArabic ? "يرجى ملء جميع بيانات المنتجات" : "Please fill all product details");
      return;
    }

    setLoading(true);

    try {
      const orderType = userRole === 'cafe' ? 'cafe_to_roaster' : 'roaster_to_supplier';
      const sellerRole = userRole === 'cafe' ? 'roaster' : 'supplier';

      const { data, error } = await supabase
        .from('direct_supply_contracts')
        .insert([{
          buyer_id: user?.id,
          buyer_role: userRole,
          seller_id: formData.seller_id,
          seller_role: sellerRole,
          order_type: orderType,
          items: JSON.parse(JSON.stringify(items)),
          total_amount: totalAmount,
          platform_commission_rate: COMMISSION_RATE,
          platform_commission_amount: commissionAmount,
          notes: formData.notes,
          status: 'pending_seller'
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success(isArabic ? "تم إنشاء العقد بنجاح" : "Contract created successfully");
      navigate(`/contract/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-background p-4 md:p-8 ${isArabic ? 'rtl' : 'ltr'}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {isArabic ? "إنشاء عقد توريد مباشر" : "Create Direct Supply Contract"}
            </h1>
            <p className="text-muted-foreground">
              {isArabic ? "أنشئ طلبك واحصل على العقد مباشرة" : "Create your order and get the contract directly"}
            </p>
          </div>
        </div>

        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription>
            {isArabic ? (
              <>
                <strong>آلية العمل:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>أنت ترسل الطلب للبائع</li>
                  <li>البائع يوافق على الطلب أو يرفضه</li>
                  <li>بعد موافقة البائع، تدفع عمولة المنصة ({COMMISSION_RATE}%)</li>
                  <li>التوقيع على العقد (البائع ← المشتري ← المنصة)</li>
                  <li>تحول المبلغ المتبقي للبائع</li>
                  <li>يُحفظ العقد في حساب الجميع</li>
                </ol>
              </>
            ) : (
              <>
                <strong>How it works:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>You send the order request to seller</li>
                  <li>Seller approves or rejects the order</li>
                  <li>After seller approval, you pay platform commission ({COMMISSION_RATE}%)</li>
                  <li>Sign the contract (Seller → Buyer → Platform)</li>
                  <li>Transfer remaining amount to seller</li>
                  <li>Contract saved in everyone's account</li>
                </ol>
              </>
            )}
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? "اختر البائع" : "Select Seller"}</CardTitle>
              <CardDescription>
                {userRole === 'cafe' 
                  ? (isArabic ? "اختر المحمصة التي تريد الشراء منها" : "Choose the roaster you want to buy from")
                  : (isArabic ? "اختر المورد الذي تريد الشراء منه" : "Choose the supplier you want to buy from")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select 
                value={formData.seller_id} 
                onValueChange={(value) => setFormData({ ...formData, seller_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isArabic ? "اختر البائع..." : "Select seller..."} />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.company_name || seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{isArabic ? "المنتجات" : "Products"}</CardTitle>
                  <CardDescription>
                    {isArabic ? "أضف المنتجات التي تريد طلبها" : "Add products you want to order"}
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                  <Plus className="w-4 h-4" />
                  {isArabic ? "إضافة" : "Add"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end p-4 border rounded-lg bg-muted/20">
                  <div className="col-span-12 md:col-span-4">
                    <Label>{isArabic ? "اسم المنتج" : "Product Name"}</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      placeholder={isArabic ? "مثال: قهوة إثيوبية" : "e.g. Ethiopian Coffee"}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label>{isArabic ? "الكمية (كجم)" : "Qty (kg)"}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label>{isArabic ? "السعر/كجم" : "Price/kg"}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-3 md:col-span-3">
                    <Label>{isArabic ? "الإجمالي" : "Total"}</Label>
                    <Input
                      value={`${item.total.toLocaleString()} SAR`}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="col-span-1">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? "ملخص المبالغ" : "Amount Summary"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">{isArabic ? "إجمالي الطلب" : "Order Total"}</span>
                <span className="font-bold text-lg">{totalAmount.toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b bg-primary/5 px-3 rounded">
                <span className="text-primary font-medium">
                  {isArabic ? `عمولة المنصة (${COMMISSION_RATE}%)` : `Platform Commission (${COMMISSION_RATE}%)`}
                </span>
                <span className="font-bold text-lg text-primary">{commissionAmount.toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">{isArabic ? "المبلغ للبائع" : "Amount to Seller"}</span>
                <span className="font-bold text-lg text-green-600">{sellerAmount.toLocaleString()} SAR</span>
              </div>

              <Alert className="mt-4 border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  {isArabic 
                    ? "سيتم إرسال الطلب للبائع للموافقة أولاً، ثم تدفع العمولة بعد موافقته"
                    : "Order will be sent to seller for approval first, then you pay commission after their approval"}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? "ملاحظات" : "Notes"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={isArabic ? "أي ملاحظات إضافية للطلب..." : "Any additional notes for the order..."}
                rows={3}
              />
            </CardContent>
          </Card>

          <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isArabic ? (
              <>
                إرسال الطلب للبائع
                <ArrowLeft className="w-5 h-5" />
              </>
            ) : (
              <>
                Send Order Request to Seller
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
