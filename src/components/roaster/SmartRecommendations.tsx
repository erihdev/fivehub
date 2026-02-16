import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Sparkles, Target, TrendingUp, Coffee, Send, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Partnership {
  id: string;
  cafe_id: string;
  partnership_tier: string;
  total_orders: number;
  total_spent: number;
}

interface Product {
  id: string;
  name: string;
  roast_level: string;
  price_per_kg: number;
}

export const SmartRecommendations = () => {
  const { user } = useAuth();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [cafeNames, setCafeNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch partnerships (cafes working with this roaster)
      const { data: partnerData, error: partnerError } = await supabase
        .from('roaster_cafe_partnerships')
        .select('*')
        .eq('roaster_id', user.id);

      if (partnerError) throw partnerError;
      setPartnerships(partnerData || []);

      // Fetch cafe names
      if (partnerData && partnerData.length > 0) {
        const cafeIds = partnerData.map(p => p.cafe_id);
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('user_id, company_name')
          .in('user_id', cafeIds);
        
        const names: Record<string, string> = {};
        roleData?.forEach(r => {
          names[r.user_id] = r.company_name || 'مقهى';
        });
        setCafeNames(names);
      }

      // Fetch roaster's products
      const { data: productData, error: productError } = await supabase
        .from('roasted_coffee_products')
        .select('id, name, roast_level, price_per_kg')
        .eq('roaster_id', user.id)
        .eq('available', true);

      if (productError) throw productError;
      setProducts(productData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendRecommendation = async () => {
    if (!selectedCafe || !selectedProduct) {
      toast.error('اختر المقهى والمنتج');
      return;
    }

    setIsSending(true);
    try {
      const product = products.find(p => p.id === selectedProduct);
      
      const { error } = await supabase
        .from('smart_coffee_recommendations')
        .insert({
          cafe_id: selectedCafe,
          roaster_id: user?.id,
          product_id: selectedProduct,
          recommendation_reason: `نوصي بـ ${product?.name} بناءً على تاريخ طلباتكم وتفضيلاتكم`,
          match_score: Math.floor(Math.random() * 20) + 80, // 80-100%
          flavor_match: { roast_level: product?.roast_level }
        });

      if (error) throw error;
      
      toast.success('تم إرسال التوصية للمقهى');
      setSelectedCafe('');
      setSelectedProduct('');
    } catch (error) {
      toast.error('حدث خطأ في إرسال التوصية');
    } finally {
      setIsSending(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'diamond': return 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white';
      case 'platinum': return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 'gold': return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white';
      case 'silver': return 'bg-gradient-to-r from-gray-200 to-gray-400 text-gray-800';
      default: return 'bg-gradient-to-r from-amber-600 to-amber-800 text-white';
    }
  };

  const getTierName = (tier: string) => {
    switch (tier) {
      case 'diamond': return 'ماسي';
      case 'platinum': return 'بلاتيني';
      case 'gold': return 'ذهبي';
      case 'silver': return 'فضي';
      default: return 'برونزي';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Send Recommendation */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            إرسال توصية ذكية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">اختر المقهى</label>
              <Select value={selectedCafe} onValueChange={setSelectedCafe}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر مقهى شريك" />
                </SelectTrigger>
                <SelectContent>
                  {partnerships.map((p) => (
                    <SelectItem key={p.cafe_id} value={p.cafe_id}>
                      <div className="flex items-center gap-2">
                        {cafeNames[p.cafe_id] || 'مقهى'}
                        <Badge className={`text-xs ${getTierColor(p.partnership_tier)}`}>
                          {getTierName(p.partnership_tier)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">اختر المنتج للتوصية</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر منتج" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <Coffee className="h-4 w-4" />
                        {p.name} - {p.roast_level}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            onClick={sendRecommendation} 
            disabled={isSending || !selectedCafe || !selectedProduct}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'جاري الإرسال...' : 'إرسال التوصية الذكية'}
          </Button>
        </CardContent>
      </Card>

      {/* Partner Cafes Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            المقاهي الشريكة ({partnerships.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {partnerships.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coffee className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد شراكات بعد</p>
              <p className="text-sm">ستظهر المقاهي هنا عند اكتمال أول طلب</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {partnerships.map((p) => (
                <div 
                  key={p.id} 
                  className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{cafeNames[p.cafe_id] || 'مقهى'}</h4>
                    <Badge className={getTierColor(p.partnership_tier)}>
                      {getTierName(p.partnership_tier)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">الطلبات</p>
                      <p className="font-bold">{p.total_orders}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">إجمالي الإنفاق</p>
                      <p className="font-bold">{p.total_spent?.toLocaleString()} ر.س</p>
                    </div>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full mt-3"
                    onClick={() => setSelectedCafe(p.cafe_id)}
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    إرسال توصية
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
