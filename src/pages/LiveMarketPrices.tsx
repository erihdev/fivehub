import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCcw, Globe, Coffee, DollarSign, BarChart3, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';

interface CommodityPrice {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  currency: string;
  unit: string;
  lastUpdated: Date;
  history: { date: string; price: number }[];
}

interface MarketNews {
  id: string;
  title: string;
  titleAr: string;
  source: string;
  time: string;
  impact: 'positive' | 'negative' | 'neutral';
}

const LiveMarketPrices = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [commodities, setCommodities] = useState<CommodityPrice[]>([]);
  const [news, setNews] = useState<MarketNews[]>([]);

  useEffect(() => {
    generateMarketData();
    const interval = setInterval(generateMarketData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const generateMarketData = () => {
    const baseData: Omit<CommodityPrice, 'history' | 'change' | 'changePercent' | 'previousPrice'>[] = [
      { id: 'arabica', name: 'Arabica Coffee', nameAr: 'قهوة أرابيكا', price: 185.50, currency: 'USD', unit: 'lb', lastUpdated: new Date() },
      { id: 'robusta', name: 'Robusta Coffee', nameAr: 'قهوة روبوستا', price: 98.25, currency: 'USD', unit: 'lb', lastUpdated: new Date() },
      { id: 'brazilian', name: 'Brazilian Santos', nameAr: 'برازيلي سانتوس', price: 42.80, currency: 'USD', unit: 'kg', lastUpdated: new Date() },
      { id: 'colombian', name: 'Colombian Supremo', nameAr: 'كولومبي سوبريمو', price: 55.20, currency: 'USD', unit: 'kg', lastUpdated: new Date() },
      { id: 'ethiopian', name: 'Ethiopian Yirgacheffe', nameAr: 'إثيوبي يرغاتشيف', price: 68.90, currency: 'USD', unit: 'kg', lastUpdated: new Date() },
      { id: 'kenyan', name: 'Kenyan AA', nameAr: 'كيني AA', price: 75.40, currency: 'USD', unit: 'kg', lastUpdated: new Date() },
    ];

    const commoditiesWithData: CommodityPrice[] = baseData.map(item => {
      const variation = (Math.random() - 0.5) * 5;
      const previousPrice = item.price - variation;
      const change = item.price - previousPrice;
      const changePercent = (change / previousPrice) * 100;

      // Generate historical data
      const history = Array.from({ length: 30 }, (_, i) => ({
        date: format(new Date(Date.now() - (29 - i) * 86400000), 'dd/MM'),
        price: item.price + (Math.random() - 0.5) * 10,
      }));

      return {
        ...item,
        previousPrice,
        change,
        changePercent,
        history,
      };
    });

    setCommodities(commoditiesWithData);

    const newsData: MarketNews[] = [
      {
        id: '1',
        title: 'Brazil coffee exports hit record high in November',
        titleAr: 'صادرات البرازيل من البن تسجل رقماً قياسياً في نوفمبر',
        source: 'Reuters',
        time: '2h ago',
        impact: 'negative',
      },
      {
        id: '2',
        title: 'Ethiopian coffee production faces climate challenges',
        titleAr: 'إنتاج البن الإثيوبي يواجه تحديات مناخية',
        source: 'Bloomberg',
        time: '4h ago',
        impact: 'positive',
      },
      {
        id: '3',
        title: 'Global specialty coffee demand continues to grow',
        titleAr: 'الطلب العالمي على القهوة المختصة يستمر في النمو',
        source: 'ICO Report',
        time: '6h ago',
        impact: 'positive',
      },
      {
        id: '4',
        title: 'Vietnam Robusta harvest begins with mixed expectations',
        titleAr: 'حصاد روبوستا في فيتنام يبدأ مع توقعات متباينة',
        source: 'CoffeeNetwork',
        time: '8h ago',
        impact: 'neutral',
      },
    ];

    setNews(newsData);
    setLastUpdate(new Date());
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    generateMarketData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-success';
      case 'negative': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'positive': return { label: language === 'ar' ? 'إيجابي' : 'Bullish', variant: 'default' as const };
      case 'negative': return { label: language === 'ar' ? 'سلبي' : 'Bearish', variant: 'destructive' as const };
      default: return { label: language === 'ar' ? 'محايد' : 'Neutral', variant: 'secondary' as const };
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Globe className="h-8 w-8 text-accent" />
                {language === 'ar' ? 'أسعار السوق المباشرة' : 'Live Market Prices'}
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {language === 'ar' ? 'آخر تحديث:' : 'Last updated:'} {format(lastUpdate, 'HH:mm:ss')}
              </p>
            </div>
          </div>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'أرابيكا (C)' : 'Arabica (C)'}</p>
                  <p className="text-2xl font-bold">${commodities[0]?.price.toFixed(2)}</p>
                </div>
                <div className={`flex items-center ${commodities[0]?.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {commodities[0]?.change >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  <span className="text-sm ml-1">{commodities[0]?.changePercent.toFixed(2)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/50 to-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'روبوستا' : 'Robusta'}</p>
                  <p className="text-2xl font-bold">${commodities[1]?.price.toFixed(2)}</p>
                </div>
                <div className={`flex items-center ${commodities[1]?.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {commodities[1]?.change >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  <span className="text-sm ml-1">{commodities[1]?.changePercent.toFixed(2)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'متوسط التغير' : 'Avg Change'}</p>
                  <p className="text-xl font-bold">
                    {(commodities.reduce((sum, c) => sum + c.changePercent, 0) / commodities.length).toFixed(2)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Coffee className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المنتجات' : 'Products'}</p>
                  <p className="text-xl font-bold">{commodities.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="prices" className="space-y-6">
          <TabsList>
            <TabsTrigger value="prices">
              <DollarSign className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'الأسعار' : 'Prices'}
            </TabsTrigger>
            <TabsTrigger value="charts">
              <BarChart3 className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'الرسوم البيانية' : 'Charts'}
            </TabsTrigger>
            <TabsTrigger value="news">
              <Globe className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'أخبار السوق' : 'Market News'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prices">
            <div className="grid gap-4">
              {commodities.map(commodity => (
                <Card key={commodity.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Coffee className="h-6 w-6 text-primary" />
                          <div>
                            <h3 className="font-semibold">
                              {language === 'ar' ? commodity.nameAr : commodity.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {commodity.currency}/{commodity.unit}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-2xl font-bold">${commodity.price.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {language === 'ar' ? 'السابق:' : 'Prev:'} ${commodity.previousPrice.toFixed(2)}
                          </p>
                        </div>

                        <div className={`flex flex-col items-center ${commodity.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {commodity.change >= 0 ? (
                            <TrendingUp className="h-6 w-6" />
                          ) : (
                            <TrendingDown className="h-6 w-6" />
                          )}
                          <span className="font-semibold">{commodity.change >= 0 ? '+' : ''}{commodity.changePercent.toFixed(2)}%</span>
                        </div>

                        <div className="w-32 h-12">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={commodity.history.slice(-7)}>
                              <Area
                                type="monotone"
                                dataKey="price"
                                stroke={commodity.change >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                                fill={commodity.change >= 0 ? 'hsl(var(--success) / 0.2)' : 'hsl(var(--destructive) / 0.2)'}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="charts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {commodities.slice(0, 4).map(commodity => (
                <Card key={commodity.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {language === 'ar' ? commodity.nameAr : commodity.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={commodity.history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="news">
            <div className="space-y-4">
              {news.map(item => {
                const badge = getImpactBadge(item.impact);
                return (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">
                            {language === 'ar' ? item.titleAr : item.title}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{item.source}</span>
                            <span>•</span>
                            <span>{item.time}</span>
                          </div>
                        </div>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LiveMarketPrices;
