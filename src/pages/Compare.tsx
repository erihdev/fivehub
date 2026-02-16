import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { translateOrigin } from '@/lib/countryTranslations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { 
  Coffee, 
  ArrowRight,
  ArrowLeft,
  Scale, 
  Search, 
  X, 
  Star, 
  MapPin, 
  DollarSign,
  Mountain,
  Leaf,
  CheckCircle,
  XCircle,
  Printer
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CoffeeOffering {
  id: string;
  name: string;
  origin: string | null;
  region: string | null;
  price: number | null;
  currency: string | null;
  score: number | null;
  process: string | null;
  altitude: string | null;
  variety: string | null;
  flavor: string | null;
  available: boolean | null;
  supplier_id: string;
  supplier_name?: string;
}

const Compare = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language, dir } = useLanguage();
  const [coffees, setCoffees] = useState<CoffeeOffering[]>([]);
  const [selectedCoffees, setSelectedCoffees] = useState<CoffeeOffering[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);
  
  const isArabic = language === 'ar';
  const BackArrow = isArabic ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchCoffees = async () => {
      if (!user) return;

      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('user_id', user.id);

      if (!suppliers || suppliers.length === 0) {
        setLoading(false);
        return;
      }

      const supplierIds = suppliers.map(s => s.id);
      const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s.name]));

      const { data: coffeesData, error } = await supabase
        .from('coffee_offerings')
        .select('*')
        .in('supplier_id', supplierIds);

      if (error) {
        toast({
          title: 'خطأ',
          description: 'فشل في تحميل المحاصيل',
          variant: 'destructive',
        });
      } else {
        const coffeesWithSupplier = (coffeesData || []).map(c => ({
          ...c,
          supplier_name: supplierMap[c.supplier_id]
        }));
        setCoffees(coffeesWithSupplier);
      }
      setLoading(false);
    };

    fetchCoffees();
  }, [user]);

  const toggleCoffeeSelection = (coffee: CoffeeOffering) => {
    if (selectedCoffees.find(c => c.id === coffee.id)) {
      setSelectedCoffees(selectedCoffees.filter(c => c.id !== coffee.id));
    } else if (selectedCoffees.length < 4) {
      setSelectedCoffees([...selectedCoffees, coffee]);
    } else {
      toast({
        title: 'تنبيه',
        description: 'يمكنك اختيار 4 محاصيل كحد أقصى للمقارنة',
      });
    }
  };

  const clearSelection = () => {
    setSelectedCoffees([]);
  };

  const handlePrint = () => {
    if (tableRef.current) {
      // Sanitize HTML content to prevent XSS attacks
      const printContent = DOMPurify.sanitize(tableRef.current.innerHTML);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl">
          <head>
            <title>مقارنة المحاصيل</title>
            <style>
              body { font-family: 'Cairo', sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: center; }
              th { background: #f5f5f5; }
              tr:nth-child(even) { background: #fafafa; }
              h1 { text-align: center; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <h1>تقرير مقارنة المحاصيل</h1>
            ${printContent}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const filteredCoffees = coffees.filter(coffee =>
    coffee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coffee.origin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coffee.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Scale className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-display font-bold text-foreground">
            {isArabic ? 'مقارنة المحاصيل' : 'Compare Coffees'}
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="w-5 h-5" />
              اختر المحاصيل للمقارنة
              <Badge variant="secondary">{selectedCoffees.length}/4</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="ابحث بالاسم أو المنشأ أو المورد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            {selectedCoffees.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedCoffees.map(coffee => (
                  <Badge key={coffee.id} variant="default" className="gap-2 py-1.5 px-3">
                    {coffee.name}
                    <X
                      className="w-4 h-4 cursor-pointer hover:text-destructive"
                      onClick={() => toggleCoffeeSelection(coffee)}
                    />
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" onClick={clearSelection} className="text-destructive">
                  مسح الكل
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
              {filteredCoffees.map(coffee => (
                <div
                  key={coffee.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedCoffees.find(c => c.id === coffee.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleCoffeeSelection(coffee)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={!!selectedCoffees.find(c => c.id === coffee.id)}
                      onCheckedChange={() => toggleCoffeeSelection(coffee)}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{coffee.name}</h4>
                      <p className="text-sm text-muted-foreground truncate">{coffee.supplier_name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {coffee.origin && <span>{coffee.origin}</span>}
                        {coffee.price && <span>• {coffee.price} {coffee.currency}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredCoffees.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Coffee className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد محاصيل للعرض</p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedCoffees.length >= 2 && (
          <Card className="animate-fade-up">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  جدول المقارنة
                </div>
                <Button onClick={handlePrint} variant="outline" className="gap-2">
                  <Printer className="w-4 h-4" />
                  طباعة
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div ref={tableRef}>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground w-40">الخاصية</th>
                      {selectedCoffees.map(coffee => (
                        <th key={coffee.id} className="text-center py-3 px-4 min-w-[200px]">
                          <div className="font-bold text-foreground">{coffee.name}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-muted/30">
                      <td className="py-3 px-4"><div className="flex items-center gap-2 text-muted-foreground"><Coffee className="w-4 h-4" />{isArabic ? 'المورد' : 'Supplier'}</div></td>
                      {selectedCoffees.map(c => <td key={c.id} className="text-center py-3 px-4">{c.supplier_name || '-'}</td>)}
                    </tr>
                    <tr>
                      <td className="py-3 px-4"><div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4" />{isArabic ? 'المنشأ' : 'Origin'}</div></td>
                      {selectedCoffees.map(c => <td key={c.id} className="text-center py-3 px-4">{translateOrigin(c.origin, language)}</td>)}
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="py-3 px-4"><div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4" />{isArabic ? 'المنطقة' : 'Region'}</div></td>
                      {selectedCoffees.map(c => <td key={c.id} className="text-center py-3 px-4">{c.region || '-'}</td>)}
                    </tr>
                    <tr>
                      <td className="py-3 px-4"><div className="flex items-center gap-2 text-muted-foreground"><DollarSign className="w-4 h-4" />{isArabic ? 'السعر' : 'Price'}</div></td>
                      {selectedCoffees.map(c => <td key={c.id} className="text-center py-3 px-4">{c.price ? `${c.price} ${c.currency || 'SAR'}` : '-'}</td>)}
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="py-3 px-4"><div className="flex items-center gap-2 text-muted-foreground"><Star className="w-4 h-4" />{isArabic ? 'الدرجة' : 'Score'}</div></td>
                      {selectedCoffees.map(c => <td key={c.id} className="text-center py-3 px-4">{c.score ? `${c.score}/100` : '-'}</td>)}
                    </tr>
                    <tr>
                      <td className="py-3 px-4"><div className="flex items-center gap-2 text-muted-foreground"><Leaf className="w-4 h-4" />{isArabic ? 'المعالجة' : 'Process'}</div></td>
                      {selectedCoffees.map(c => <td key={c.id} className="text-center py-3 px-4">{c.process || '-'}</td>)}
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="py-3 px-4"><div className="flex items-center gap-2 text-muted-foreground"><Mountain className="w-4 h-4" />الارتفاع</div></td>
                      {selectedCoffees.map(c => <td key={c.id} className="text-center py-3 px-4">{c.altitude || '-'}</td>)}
                    </tr>
                    <tr>
                      <td className="py-3 px-4"><div className="flex items-center gap-2 text-muted-foreground"><Coffee className="w-4 h-4" />الصنف</div></td>
                      {selectedCoffees.map(c => <td key={c.id} className="text-center py-3 px-4">{c.variety || '-'}</td>)}
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="py-3 px-4"><div className="flex items-center gap-2 text-muted-foreground"><Coffee className="w-4 h-4" />النكهات</div></td>
                      {selectedCoffees.map(c => <td key={c.id} className="text-center py-3 px-4">{c.flavor || '-'}</td>)}
                    </tr>
                    <tr>
                      <td className="py-3 px-4"><div className="flex items-center gap-2 text-muted-foreground"><CheckCircle className="w-4 h-4" />متوفر</div></td>
                      {selectedCoffees.map(c => (
                        <td key={c.id} className="text-center py-3 px-4">
                          {c.available ? <CheckCircle className="w-5 h-5 text-green-600 mx-auto" /> : <XCircle className="w-5 h-5 text-destructive mx-auto" />}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedCoffees.length === 1 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>اختر محصول آخر على الأقل للمقارنة</p>
            </CardContent>
          </Card>
        )}

        {selectedCoffees.length === 0 && coffees.length > 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>اختر محصولين أو أكثر من القائمة أعلاه للمقارنة بينهم</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Compare;