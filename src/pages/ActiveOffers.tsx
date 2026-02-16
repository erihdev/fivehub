import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Coffee,
  Tag,
  Percent,
  Package,
  Search,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Filter,
  Clock,
  Building2,
  MessageCircle,
  SortAsc,
  SortDesc,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { NotificationSoundToggle } from "@/components/NotificationSoundToggle";
import BackButton from "@/components/BackButton";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  discount_percentage: number | null;
  discount_amount: number | null;
  currency: string | null;
  min_quantity_kg: number | null;
  terms_conditions: string | null;
  is_active: boolean;
  valid_until: string | null;
  valid_from: string | null;
  created_at: string;
  supplier_id: string;
  supplier?: {
    name: string;
    contact_info: string | null;
  };
}

type SortOption = 'newest' | 'oldest' | 'discount_high' | 'discount_low' | 'expiring_soon';

const ActiveOffers = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { language, t, dir } = useLanguage();
  const navigate = useNavigate();
  
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBySupplier, setFilterBySupplier] = useState<string>('all');
  const [filterByDiscount, setFilterByDiscount] = useState<string>('all');
  const [filterByExpiry, setFilterByExpiry] = useState<string>('all');
  const [suppliers, setSuppliers] = useState<{id: string; name: string}[]>([]);

  const isRtl = dir === 'rtl';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch active offers with supplier info
        const { data: offersData } = await supabase
          .from('supplier_offers')
          .select(`
            *,
            supplier:suppliers(name, contact_info)
          `)
          .eq('is_active', true)
          .or('valid_until.is.null,valid_until.gt.now()')
          .order('created_at', { ascending: false });

        // Transform offers data
        const transformedOffers = (offersData || []).map(offer => ({
          ...offer,
          supplier: Array.isArray(offer.supplier) ? offer.supplier[0] : offer.supplier
        }));
        setOffers(transformedOffers);

        // Extract unique suppliers
        const uniqueSuppliers = transformedOffers
          .filter(o => o.supplier)
          .reduce((acc, offer) => {
            if (!acc.find(s => s.id === offer.supplier_id)) {
              acc.push({ id: offer.supplier_id, name: offer.supplier?.name || '' });
            }
            return acc;
          }, [] as {id: string; name: string}[]);
        setSuppliers(uniqueSuppliers);

      } catch (error) {
        console.error('Error fetching offers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time offer updates
    const channel = supabase
      .channel('active-offers-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supplier_offers',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Filter and sort offers
  const filteredOffers = offers
    .filter((offer) => {
      const matchesSearch = 
        offer.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSupplier = filterBySupplier === 'all' || offer.supplier_id === filterBySupplier;
      
      let matchesDiscount = true;
      if (filterByDiscount !== 'all') {
        const discount = offer.discount_percentage || 0;
        switch (filterByDiscount) {
          case '10+':
            matchesDiscount = discount >= 10;
            break;
          case '20+':
            matchesDiscount = discount >= 20;
            break;
          case '30+':
            matchesDiscount = discount >= 30;
            break;
          case '50+':
            matchesDiscount = discount >= 50;
            break;
        }
      }
      
      let matchesExpiry = true;
      if (filterByExpiry !== 'all' && offer.valid_until) {
        const now = new Date();
        const expiryDate = new Date(offer.valid_until);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (filterByExpiry) {
          case 'today':
            matchesExpiry = daysUntilExpiry <= 1;
            break;
          case 'week':
            matchesExpiry = daysUntilExpiry <= 7;
            break;
          case 'month':
            matchesExpiry = daysUntilExpiry <= 30;
            break;
          case 'no_expiry':
            matchesExpiry = false; // Will be handled below
            break;
        }
      } else if (filterByExpiry === 'no_expiry') {
        matchesExpiry = !offer.valid_until;
      }
      
      return matchesSearch && matchesSupplier && matchesDiscount && matchesExpiry;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'discount_high':
          return (b.discount_percentage || 0) - (a.discount_percentage || 0);
        case 'discount_low':
          return (a.discount_percentage || 0) - (b.discount_percentage || 0);
        case 'expiring_soon':
          if (!a.valid_until) return 1;
          if (!b.valid_until) return -1;
          return new Date(a.valid_until).getTime() - new Date(b.valid_until).getTime();
        default:
          return 0;
      }
    });

  const getDaysRemaining = (validUntil: string | null) => {
    if (!validUntil) return null;
    const now = new Date();
    const end = new Date(validUntil);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir={dir}>
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir={dir}>
      <div className="container mx-auto px-6 py-12">
        {/* Back Button */}
        <div className="mb-6">
          <BackButton />
        </div>
        
        {/* Quick Stats */}
        {(() => {
          const totalOffers = offers.length;
          const avgDiscount = offers.length > 0 
            ? Math.round(offers.reduce((sum, o) => sum + (o.discount_percentage || 0), 0) / offers.filter(o => o.discount_percentage).length) || 0
            : 0;
          const maxDiscount = offers.length > 0 
            ? Math.max(...offers.map(o => o.discount_percentage || 0))
            : 0;
          const expiringThisWeek = offers.filter(o => {
            if (!o.valid_until) return false;
            const days = Math.ceil((new Date(o.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            return days > 0 && days <= 7;
          }).length;

          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-success/10 to-transparent border-success/20">
                <CardContent className="p-4 text-center">
                  <Tag className="w-8 h-8 text-success mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{totalOffers}</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'إجمالي العروض' : 'Total Offers'}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-info/10 to-transparent border-info/20">
                <CardContent className="p-4 text-center">
                  <Percent className="w-8 h-8 text-info mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{avgDiscount}%</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'متوسط الخصم' : 'Avg Discount'}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-fivehub-brown/10 to-transparent border-fivehub-brown/20">
                <CardContent className="p-4 text-center">
                  <Percent className="w-8 h-8 text-fivehub-brown mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{maxDiscount}%</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'أعلى خصم' : 'Max Discount'}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                <CardContent className="p-4 text-center">
                  <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{expiringThisWeek}</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'تنتهي هذا الأسبوع' : 'Expiring Soon'}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Discount Distribution Chart */}
        {offers.length > 0 && (() => {
          const discountRanges = [
            { name: language === 'ar' ? '0-10%' : '0-10%', min: 0, max: 10, count: 0, color: '#94a3b8' },
            { name: language === 'ar' ? '10-20%' : '10-20%', min: 10, max: 20, count: 0, color: '#22c55e' },
            { name: language === 'ar' ? '20-30%' : '20-30%', min: 20, max: 30, count: 0, color: '#3b82f6' },
            { name: language === 'ar' ? '30-50%' : '30-50%', min: 30, max: 50, count: 0, color: '#a855f7' },
            { name: language === 'ar' ? '50%+' : '50%+', min: 50, max: 100, count: 0, color: '#f97316' },
          ];

          offers.forEach(offer => {
            const discount = offer.discount_percentage || 0;
            for (const range of discountRanges) {
              if (discount >= range.min && discount < range.max) {
                range.count++;
                break;
              }
              if (range.max === 100 && discount >= 50) {
                range.count++;
                break;
              }
            }
          });

          const chartData = discountRanges.filter(r => r.count > 0);

          return (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  {language === 'ar' ? 'توزيع نسب الخصم' : 'Discount Distribution'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Bar Chart */}
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical">
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={60} />
                        <Tooltip 
                          formatter={(value: number) => [value, language === 'ar' ? 'عروض' : 'Offers']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Pie Chart */}
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [value, language === 'ar' ? 'عروض' : 'Offers']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Offers by Supplier Chart */}
        {offers.length > 0 && suppliers.length > 0 && (() => {
          const supplierColors = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ef4444', '#06b6d4', '#84cc16', '#f43f5e'];
          
          const supplierData = suppliers.map((supplier, index) => {
            const count = offers.filter(o => o.supplier_id === supplier.id).length;
            return {
              name: supplier.name.length > 15 ? supplier.name.substring(0, 15) + '...' : supplier.name,
              fullName: supplier.name,
              count,
              color: supplierColors[index % supplierColors.length]
            };
          }).filter(s => s.count > 0).sort((a, b) => b.count - a.count);

          return (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  {language === 'ar' ? 'توزيع العروض حسب المورد' : 'Offers by Supplier'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Bar Chart */}
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={supplierData} layout="vertical">
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip 
                          formatter={(value: number, name: string, props: any) => [
                            value, 
                            language === 'ar' ? 'عروض' : 'Offers'
                          ]}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {supplierData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Pie Chart */}
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={supplierData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="count"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {supplierData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [value, language === 'ar' ? 'عروض' : 'Offers']}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
            <Percent className="w-8 h-8 text-green-500" />
            {language === 'ar' ? 'جميع العروض النشطة' : 'All Active Offers'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? `${filteredOffers.length} عرض متاح من ${suppliers.length} مورد` 
              : `${filteredOffers.length} offers available from ${suppliers.length} suppliers`}
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5`} />
                  <Input
                    placeholder={language === 'ar' ? 'ابحث في العروض...' : 'Search offers...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={isRtl ? 'pr-12' : 'pl-12'}
                    dir={dir}
                  />
                </div>
              </div>

              {/* Supplier Filter */}
              <Select value={filterBySupplier} onValueChange={setFilterBySupplier}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Building2 className="w-4 h-4 ml-2" />
                  <SelectValue placeholder={language === 'ar' ? 'جميع الموردين' : 'All Suppliers'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === 'ar' ? 'جميع الموردين' : 'All Suppliers'}
                  </SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Discount Filter */}
              <Select value={filterByDiscount} onValueChange={setFilterByDiscount}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Percent className="w-4 h-4 ml-2" />
                  <SelectValue placeholder={language === 'ar' ? 'نسبة الخصم' : 'Discount %'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === 'ar' ? 'جميع الخصومات' : 'All Discounts'}
                  </SelectItem>
                  <SelectItem value="10+">
                    {language === 'ar' ? '10% فأكثر' : '10% or more'}
                  </SelectItem>
                  <SelectItem value="20+">
                    {language === 'ar' ? '20% فأكثر' : '20% or more'}
                  </SelectItem>
                  <SelectItem value="30+">
                    {language === 'ar' ? '30% فأكثر' : '30% or more'}
                  </SelectItem>
                  <SelectItem value="50+">
                    {language === 'ar' ? '50% فأكثر' : '50% or more'}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Expiry Filter */}
              <Select value={filterByExpiry} onValueChange={setFilterByExpiry}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Clock className="w-4 h-4 ml-2" />
                  <SelectValue placeholder={language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === 'ar' ? 'جميع العروض' : 'All Offers'}
                  </SelectItem>
                  <SelectItem value="today">
                    {language === 'ar' ? 'ينتهي اليوم' : 'Expires Today'}
                  </SelectItem>
                  <SelectItem value="week">
                    {language === 'ar' ? 'ينتهي خلال أسبوع' : 'Expires This Week'}
                  </SelectItem>
                  <SelectItem value="month">
                    {language === 'ar' ? 'ينتهي خلال شهر' : 'Expires This Month'}
                  </SelectItem>
                  <SelectItem value="no_expiry">
                    {language === 'ar' ? 'بدون تاريخ انتهاء' : 'No Expiry Date'}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="w-4 h-4 ml-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">
                    {language === 'ar' ? 'الأحدث أولاً' : 'Newest First'}
                  </SelectItem>
                  <SelectItem value="oldest">
                    {language === 'ar' ? 'الأقدم أولاً' : 'Oldest First'}
                  </SelectItem>
                  <SelectItem value="discount_high">
                    {language === 'ar' ? 'أعلى خصم' : 'Highest Discount'}
                  </SelectItem>
                  <SelectItem value="discount_low">
                    {language === 'ar' ? 'أقل خصم' : 'Lowest Discount'}
                  </SelectItem>
                  <SelectItem value="expiring_soon">
                    {language === 'ar' ? 'ينتهي قريباً' : 'Expiring Soon'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Offers Grid */}
        {filteredOffers.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Tag className="w-20 h-20 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-bold mb-2">
                {language === 'ar' ? 'لا توجد عروض متاحة' : 'No offers available'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || filterBySupplier !== 'all' || filterByDiscount !== 'all' || filterByExpiry !== 'all'
                  ? (language === 'ar' ? 'جرب تغيير معايير البحث' : 'Try changing your search criteria')
                  : (language === 'ar' ? 'تابعنا للحصول على أحدث العروض من الموردين' : 'Stay tuned for the latest offers from suppliers')}
              </p>
              {(searchQuery || filterBySupplier !== 'all' || filterByDiscount !== 'all' || filterByExpiry !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={() => { setSearchQuery(''); setFilterBySupplier('all'); setFilterByDiscount('all'); setFilterByExpiry('all'); }}
                >
                  {language === 'ar' ? 'إزالة الفلاتر' : 'Clear Filters'}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map((offer) => {
              const daysRemaining = getDaysRemaining(offer.valid_until);
              const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
              const isExpired = daysRemaining !== null && daysRemaining <= 0;

              return (
                <Card 
                  key={offer.id} 
                  className={`overflow-hidden transition-all hover:shadow-lg ${
                    isExpiringSoon 
                      ? 'border-2 border-orange-500/50 bg-gradient-to-br from-orange-500/5 to-transparent' 
                      : 'border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent hover:border-green-500/40'
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge className={isExpiringSoon ? 'bg-orange-500' : 'bg-green-500'}>
                        {offer.discount_percentage 
                          ? `${offer.discount_percentage}% ${language === 'ar' ? 'خصم' : 'OFF'}`
                          : offer.discount_amount
                            ? `${offer.discount_amount} ${offer.currency || 'SAR'} ${language === 'ar' ? 'خصم' : 'OFF'}`
                            : (language === 'ar' ? 'عرض خاص' : 'Special Offer')}
                      </Badge>
                      {isExpiringSoon && (
                        <Badge variant="outline" className="text-orange-600 border-orange-500 text-xs">
                          <Clock className="w-3 h-3 ml-1" />
                          {daysRemaining} {language === 'ar' ? 'يوم متبقي' : 'days left'}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-2">{offer.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      {offer.supplier?.name}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {offer.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {offer.description}
                      </p>
                    )}
                    
                    <div className="space-y-2 text-sm mb-4">
                      {offer.min_quantity_kg && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Package className="w-4 h-4" />
                          <span>
                            {language === 'ar' ? 'الحد الأدنى:' : 'Min order:'} {offer.min_quantity_kg} {language === 'ar' ? 'كغ' : 'kg'}
                          </span>
                        </div>
                      )}
                      
                      {offer.valid_until && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>
                            {language === 'ar' ? 'ينتهي:' : 'Expires:'} {new Date(offer.valid_until).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {offer.terms_conditions && (
                      <details className="mb-4">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          {language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}
                        </summary>
                        <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                          {offer.terms_conditions}
                        </p>
                      </details>
                    )}
                    
                    <div className="flex gap-2">
                      {offer.supplier?.contact_info && (
                        <WhatsAppButton 
                          phoneNumber={offer.supplier.contact_info}
                          message={`${language === 'ar' ? 'مرحباً، أنا مهتم بعرض:' : 'Hello, I am interested in the offer:'} ${offer.title}`}
                          className="flex-1"
                        />
                      )}
                      <Link to="/messages" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <MessageCircle className="w-4 h-4" />
                          {language === 'ar' ? 'رسالة' : 'Message'}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default ActiveOffers;
