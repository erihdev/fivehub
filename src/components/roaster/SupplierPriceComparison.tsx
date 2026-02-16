import { useState, useEffect } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, Search, Filter,
  Loader2, Building2, Package, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";

interface CoffeeWithSupplier {
  id: string;
  name: string;
  origin: string | null;
  price: number | null;
  currency: string | null;
  process: string | null;
  score: number | null;
  supplier: {
    id: string;
    name: string;
  } | null;
}

interface GroupedCoffee {
  origin: string;
  process: string;
  coffees: CoffeeWithSupplier[];
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
}

const SupplierPriceComparison = () => {
  const { user } = useAuth();
  const { language, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  const [coffees, setCoffees] = useState<CoffeeWithSupplier[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedCoffee[]>([]);
  const [loading, setLoading] = useState(true);
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [processFilter, setProcessFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const origins = Array.from(new Set(coffees.map(c => c.origin).filter(Boolean))) as string[];
  const processes = Array.from(new Set(coffees.map(c => c.process).filter(Boolean))) as string[];

  useEffect(() => {
    fetchCoffees();
  }, []);

  useEffect(() => {
    groupCoffees();
  }, [coffees, originFilter, processFilter, searchQuery]);

  const fetchCoffees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coffee_offerings')
        .select(`
          id, name, origin, price, currency, process, score,
          supplier:suppliers(id, name)
        `)
        .eq('available', true)
        .not('price', 'is', null)
        .order('origin');

      if (error) throw error;

      const transformedData = (data || []).map(coffee => ({
        ...coffee,
        supplier: Array.isArray(coffee.supplier) ? coffee.supplier[0] : coffee.supplier
      }));
      setCoffees(transformedData);
    } catch (error) {
      console.error('Error fetching coffees:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupCoffees = () => {
    let filtered = coffees;

    if (originFilter !== 'all') {
      filtered = filtered.filter(c => c.origin === originFilter);
    }
    if (processFilter !== 'all') {
      filtered = filtered.filter(c => c.process === processFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.supplier?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const groups: Record<string, CoffeeWithSupplier[]> = {};
    filtered.forEach(coffee => {
      const key = `${coffee.origin || 'Unknown'}-${coffee.process || 'Unknown'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(coffee);
    });

    const groupedArray: GroupedCoffee[] = Object.entries(groups).map(([key, items]) => {
      const prices = items.map(c => c.price || 0).filter(p => p > 0);
      return {
        origin: items[0]?.origin || 'Unknown',
        process: items[0]?.process || 'Unknown',
        coffees: items.sort((a, b) => (a.price || 0) - (b.price || 0)),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      };
    });

    setGroupedData(groupedArray.sort((a, b) => a.origin.localeCompare(b.origin)));
  };

  const getPriceIndicator = (price: number, min: number, max: number) => {
    if (price === min) {
      return <Badge className="bg-green-500">{language === 'ar' ? 'أقل سعر' : 'Lowest'}</Badge>;
    }
    if (price === max && max !== min) {
      return <Badge variant="destructive">{language === 'ar' ? 'أعلى سعر' : 'Highest'}</Badge>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          {language === 'ar' ? 'مقارنة أسعار الموردين' : 'Supplier Price Comparison'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'ar' ? 'قارن أسعار القهوة من موردين مختلفين' : 'Compare coffee prices from different suppliers'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRtl ? 'right-3' : 'left-3'}`} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
            className={isRtl ? 'pr-10' : 'pl-10'}
          />
        </div>
        <Select value={originFilter} onValueChange={setOriginFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={language === 'ar' ? 'المنشأ' : 'Origin'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'ar' ? 'جميع المناشئ' : 'All Origins'}</SelectItem>
            {origins.map(origin => (
              <SelectItem key={origin} value={origin}>{origin}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={processFilter} onValueChange={setProcessFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={language === 'ar' ? 'المعالجة' : 'Process'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'ar' ? 'جميع المعالجات' : 'All Processes'}</SelectItem>
            {processes.map(process => (
              <SelectItem key={process} value={process}>{process}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{coffees.length}</p>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'منتج متاح' : 'Available Products'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-fivehub-gold" />
            <p className="text-2xl font-bold">
              {new Set(coffees.map(c => c.supplier?.id).filter(Boolean)).size}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'مورد' : 'Suppliers'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">
              {coffees.length > 0 ? Math.min(...coffees.map(c => c.price || Infinity)) : 0}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'أقل سعر' : 'Lowest Price'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold">
              {coffees.length > 0 ? Math.max(...coffees.map(c => c.price || 0)) : 0}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'أعلى سعر' : 'Highest Price'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grouped Comparison */}
      {groupedData.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {language === 'ar' ? 'لا توجد نتائج' : 'No Results'}
            </h3>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedData.map((group) => (
            <Card key={`${group.origin}-${group.process}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {group.origin} - {group.process}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="bg-green-50">
                      {language === 'ar' ? 'أقل:' : 'Min:'} {group.minPrice}
                    </Badge>
                    <Badge variant="outline">
                      {language === 'ar' ? 'متوسط:' : 'Avg:'} {Math.round(group.avgPrice)}
                    </Badge>
                    <Badge variant="outline" className="bg-red-50">
                      {language === 'ar' ? 'أعلى:' : 'Max:'} {group.maxPrice}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'المورد' : 'Supplier'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                      <TableHead>{language === 'ar' ? 'التقييم' : 'Score'}</TableHead>
                      <TableHead>{language === 'ar' ? 'السعر/كجم' : 'Price/kg'}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.coffees.map((coffee) => (
                      <TableRow key={coffee.id}>
                        <TableCell className="font-medium">
                          {coffee.supplier?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>{coffee.name}</TableCell>
                        <TableCell>
                          {coffee.score ? (
                            <Badge variant="outline">{coffee.score}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {coffee.price} {coffee.currency || 'SAR'}
                        </TableCell>
                        <TableCell>
                          {getPriceIndicator(coffee.price || 0, group.minPrice, group.maxPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplierPriceComparison;
