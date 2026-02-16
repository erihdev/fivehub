import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Coffee,
  Building2,
  Package,
  DollarSign,
  TrendingUp,
  MapPin,
  Loader2,
  BarChart3,
  PieChart,
  ArrowUpRight,
  Bell,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { translateOrigin } from "@/lib/countryTranslations";
import TrendingCoffeeSearch from "@/components/TrendingCoffeeSearch";
import SmartPurchaseRecommendations from "@/components/SmartPurchaseRecommendations";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useMessages } from "@/hooks/useMessages";
import { Badge } from "@/components/ui/badge";
import InventoryAlertCard from "@/components/InventoryAlertCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

interface Supplier {
  id: string;
  name: string;
  created_at: string;
}

interface CoffeeOffering {
  id: string;
  name: string;
  origin: string | null;
  process: string | null;
  price: number | null;
  score: number | null;
  available: boolean | null;
  supplier_id: string;
}

interface SupplierStats {
  name: string;
  count: number;
}

interface OriginStats {
  name: string;
  value: number;
}

const COLORS = ["hsl(25, 95%, 53%)", "hsl(38, 85%, 55%)", "hsl(24, 50%, 20%)", "hsl(160, 45%, 45%)", "hsl(24, 70%, 30%)", "hsl(25, 95%, 45%)", "hsl(38, 85%, 48%)"];

const Dashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language, t, dir } = useLanguage();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [coffees, setCoffees] = useState<CoffeeOffering[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { unreadCount } = useMessages();

  const isRtl = dir === 'rtl';
  const iconMargin = isRtl ? 'ml-1' : 'mr-1';

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
        const [suppliersRes, coffeesRes] = await Promise.all([
          supabase.from("suppliers").select("*").order("created_at", { ascending: false }),
          supabase.from("coffee_offerings").select("*"),
        ]);

        if (suppliersRes.data) setSuppliers(suppliersRes.data);
        if (coffeesRes.data) setCoffees(coffeesRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculate statistics
  const totalSuppliers = suppliers.length;
  const totalCoffees = coffees.length;
  const availableCoffees = coffees.filter((c) => c.available).length;
  const avgPrice =
    coffees.filter((c) => c.price).reduce((sum, c) => sum + (c.price || 0), 0) /
      (coffees.filter((c) => c.price).length || 1) || 0;
  const avgScore =
    coffees.filter((c) => c.score).reduce((sum, c) => sum + (c.score || 0), 0) /
      (coffees.filter((c) => c.score).length || 1) || 0;

  // Supplier stats for bar chart
  const supplierStats: SupplierStats[] = suppliers
    .map((supplier) => ({
      name: supplier.name.length > 15 ? supplier.name.slice(0, 15) + "..." : supplier.name,
      count: coffees.filter((c) => c.supplier_id === supplier.id).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Origin stats for pie chart
  const originCounts: { [key: string]: number } = {};
  coffees.forEach((coffee) => {
    const origin = translateOrigin(coffee.origin, language) || t('dashboard.undefined');
    originCounts[origin] = (originCounts[origin] || 0) + 1;
  });
  const originStats: OriginStats[] = Object.entries(originCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  // Process stats
  const processCounts: { [key: string]: number } = {};
  coffees.forEach((coffee) => {
    const process = coffee.process || t('dashboard.undefined');
    processCounts[process] = (processCounts[process] || 0) + 1;
  });
  const processStats = Object.entries(processCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Recent suppliers
  const recentSuppliers = suppliers.slice(0, 5);

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir={dir}>
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir={dir}>
      {/* Header */}
      <header className="bg-primary py-6">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2">
                <Coffee className="w-8 h-8 text-primary-foreground" />
                <span className="text-2xl font-display font-bold text-primary-foreground">
                  {t('brand.name')}
                </span>
              </Link>
            </div>
            <nav className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
              <Link to="/messages" className="relative">
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:text-primary-foreground/80">
                  <MessageSquare className="w-5 h-5" />
                </Button>
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive">
                    {unreadCount}
                  </Badge>
                )}
              </Link>
              <Link to="/price-alerts">
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:text-primary-foreground/80">
                  <Bell className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/">
                <Button variant="ghost" className="text-primary-foreground hover:text-primary-foreground/80">
                  {t('nav.home')}
                </Button>
              </Link>
              <Link to="/suppliers">
                <Button variant="ghost" className="text-primary-foreground hover:text-primary-foreground/80">
                  {t('nav.suppliers')}
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="ghost" className="text-primary-foreground hover:text-primary-foreground/80">
                  {t('nav.profile')}
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              {t('dashboard.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('dashboard.subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/custom-dashboard">
              <Button size="sm" className="bg-fivehub-gold hover:bg-fivehub-gold/90 text-fivehub-brown">
                ✨ {language === 'ar' ? 'لوحة تحكم مخصصة' : 'Custom Dashboard'}
              </Button>
            </Link>
            <Link to="/messages">
              <Button variant="outline" size="sm" className="relative">
                💬 {language === 'ar' ? 'الرسائل' : 'Messages'}
                {unreadCount > 0 && (
                  <Badge className="ms-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link to="/price-alerts"><Button variant="outline" size="sm">🔔 {language === 'ar' ? 'تنبيهات الأسعار' : 'Price Alerts'}</Button></Link>
            <Link to="/reports"><Button variant="outline" size="sm">📊 {language === 'ar' ? 'التقارير' : 'Reports'}</Button></Link>
            <Link to="/inventory-report"><Button variant="outline" size="sm">📈 {language === 'ar' ? 'تقرير المخزون' : 'Inventory Report'}</Button></Link>
            <Link to="/inventory"><Button variant="outline" size="sm">📦 {t('nav.inventory')}</Button></Link>
            <Link to="/cupping"><Button variant="outline" size="sm">☕ {t('nav.cupping')}</Button></Link>
            <Link to="/favorites"><Button variant="outline" size="sm">❤️ {t('nav.favorites')}</Button></Link>
            <Link to="/calculator"><Button variant="outline" size="sm">🧮 {t('nav.calculator')}</Button></Link>
            <Link to="/orders"><Button variant="outline" size="sm">📋 {t('nav.orders')}</Button></Link>
            <Link to="/roast-profiles"><Button variant="outline" size="sm">🔥 {t('nav.roastProfiles')}</Button></Link>
            <Link to="/harvest-calendar"><Button variant="outline" size="sm">📅 {t('nav.harvestCalendar')}</Button></Link>
            <Link to="/profit-calculator"><Button variant="outline" size="sm">💰 {t('nav.profitCalculator')}</Button></Link>
            <Link to="/origin-map"><Button variant="outline" size="sm">🗺️ {t('nav.originMap')}</Button></Link>
          </div>
        </div>

        {/* Inventory Alerts */}
        <div className="mb-8">
          <InventoryAlertCard />
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card variant="stat">
            <CardContent className="p-4 text-center">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{totalSuppliers}</p>
              <p className="text-sm text-muted-foreground">{t('dashboard.supplier')}</p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4 text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-fivehub-gold" />
              <p className="text-3xl font-bold">{totalCoffees}</p>
              <p className="text-sm text-muted-foreground">{t('dashboard.crop')}</p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-success" />
              <p className="text-3xl font-bold">{availableCoffees}</p>
              <p className="text-sm text-muted-foreground">{t('stats.available')}</p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-fivehub-brown-light" />
              <p className="text-3xl font-bold">{avgPrice.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">{t('stats.avgPrice')}</p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 text-info" />
              <p className="text-3xl font-bold">{avgScore.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">{t('stats.avgScore')}</p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4 text-center">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-destructive" />
              <p className="text-3xl font-bold">{Object.keys(originCounts).length}</p>
              <p className="text-sm text-muted-foreground">{t('stats.originCountries')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Suppliers Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                {t('dashboard.cropsPerSupplier')}
              </CardTitle>
              <CardDescription>{t('dashboard.cropsPerSupplierDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {supplierStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={supplierStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={100} 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(25, 95%, 53%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {t('dashboard.noData')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Origin Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                {t('dashboard.cropsPerOrigin')}
              </CardTitle>
              <CardDescription>{t('dashboard.cropsPerOriginDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {originStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={originStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {originStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {t('dashboard.noData')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Smart Purchase Recommendations */}
        <div className="mb-8">
          <SmartPurchaseRecommendations />
        </div>

        {/* Trending Coffee Search */}
        <div className="mb-8">
          <TrendingCoffeeSearch />
        </div>

        {/* Bottom Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Process Stats */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.processMethods')}</CardTitle>
              <CardDescription>{t('dashboard.processMethodsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {processStats.map((process, index) => (
                  <div key={process.name} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{process.name}</span>
                        <span className="text-muted-foreground">{process.value} {t('dashboard.crop')}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{
                            width: `${(process.value / (processStats[0]?.value || 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {processStats.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">{t('dashboard.noData')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Suppliers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('dashboard.recentSuppliers')}</CardTitle>
                  <CardDescription>{t('dashboard.recentSuppliersDesc')}</CardDescription>
                </div>
                <Link to="/suppliers">
                  <Button variant="ghost" size="sm">
                    {t('common.viewAll')}
                    <ArrowUpRight className={`w-4 h-4 ${iconMargin}`} />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSuppliers.map((supplier) => {
                  const coffeeCount = coffees.filter((c) => c.supplier_id === supplier.id).length;
                  return (
                    <Link
                      key={supplier.id}
                      to={`/suppliers/${supplier.id}`}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-coffee-gold/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-coffee-gold" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{supplier.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {coffeeCount} {t('dashboard.crop')}
                        </p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  );
                })}
                {recentSuppliers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">{t('dashboard.noSuppliers')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
