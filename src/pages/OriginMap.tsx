import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Coffee, Loader2, Users } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { translateOrigin } from "@/lib/countryTranslations";

// Lazy load the map component
const InteractiveMap = lazy(() => import("@/components/InteractiveMap"));

interface OriginData {
  origin: string;
  count: number;
  avgPrice: number;
  avgScore: number;
  suppliers: string[];
}

const originCoordinates: Record<string, { lat: number; lng: number; flag: string; color: string }> = {
  "إثيوبيا": { lat: 9, lng: 38, flag: "🇪🇹", color: "#10b981" },
  "Ethiopia": { lat: 9, lng: 38, flag: "🇪🇹", color: "#10b981" },
  "كولومبيا": { lat: 4, lng: -72, flag: "🇨🇴", color: "#f59e0b" },
  "Colombia": { lat: 4, lng: -72, flag: "🇨🇴", color: "#f59e0b" },
  "البرازيل": { lat: -14, lng: -51, flag: "🇧🇷", color: "#ef4444" },
  "Brazil": { lat: -14, lng: -51, flag: "🇧🇷", color: "#ef4444" },
  "كينيا": { lat: -1, lng: 38, flag: "🇰🇪", color: "#8b5cf6" },
  "Kenya": { lat: -1, lng: 38, flag: "🇰🇪", color: "#8b5cf6" },
  "غواتيمالا": { lat: 15, lng: -90, flag: "🇬🇹", color: "#06b6d4" },
  "Guatemala": { lat: 15, lng: -90, flag: "🇬🇹", color: "#06b6d4" },
  "كوستاريكا": { lat: 10, lng: -84, flag: "🇨🇷", color: "#ec4899" },
  "Costa Rica": { lat: 10, lng: -84, flag: "🇨🇷", color: "#ec4899" },
  "بنما": { lat: 9, lng: -80, flag: "🇵🇦", color: "#22c55e" },
  "Panama": { lat: 9, lng: -80, flag: "🇵🇦", color: "#22c55e" },
  "هندوراس": { lat: 15, lng: -87, flag: "🇭🇳", color: "#84cc16" },
  "Honduras": { lat: 15, lng: -87, flag: "🇭🇳", color: "#84cc16" },
  "السلفادور": { lat: 14, lng: -89, flag: "🇸🇻", color: "#38bdf8" },
  "El Salvador": { lat: 14, lng: -89, flag: "🇸🇻", color: "#38bdf8" },
  "بيرو": { lat: -10, lng: -76, flag: "🇵🇪", color: "#f97316" },
  "Peru": { lat: -10, lng: -76, flag: "🇵🇪", color: "#f97316" },
  "إندونيسيا": { lat: -5, lng: 120, flag: "🇮🇩", color: "#14b8a6" },
  "Indonesia": { lat: -5, lng: 120, flag: "🇮🇩", color: "#14b8a6" },
  "اليمن": { lat: 15, lng: 48, flag: "🇾🇪", color: "#a855f7" },
  "Yemen": { lat: 15, lng: 48, flag: "🇾🇪", color: "#a855f7" },
  "رواندا": { lat: -2, lng: 30, flag: "🇷🇼", color: "#eab308" },
  "Rwanda": { lat: -2, lng: 30, flag: "🇷🇼", color: "#eab308" },
  "بوروندي": { lat: -3, lng: 30, flag: "🇧🇮", color: "#d946ef" },
  "Burundi": { lat: -3, lng: 30, flag: "🇧🇮", color: "#d946ef" },
  "تنزانيا": { lat: -6, lng: 35, flag: "🇹🇿", color: "#0ea5e9" },
  "Tanzania": { lat: -6, lng: 35, flag: "🇹🇿", color: "#0ea5e9" },
  "المكسيك": { lat: 23, lng: -102, flag: "🇲🇽", color: "#fb923c" },
  "Mexico": { lat: 23, lng: -102, flag: "🇲🇽", color: "#fb923c" },
  "نيكاراغوا": { lat: 13, lng: -85, flag: "🇳🇮", color: "#4ade80" },
  "Nicaragua": { lat: 13, lng: -85, flag: "🇳🇮", color: "#4ade80" },
  "الهند": { lat: 20, lng: 77, flag: "🇮🇳", color: "#c084fc" },
  "India": { lat: 20, lng: 77, flag: "🇮🇳", color: "#c084fc" },
  "بوليفيا": { lat: -17, lng: -65, flag: "🇧🇴", color: "#fbbf24" },
  "Bolivia": { lat: -17, lng: -65, flag: "🇧🇴", color: "#fbbf24" },
  "أوغندا": { lat: 1, lng: 32, flag: "🇺🇬", color: "#f43f5e" },
  "Uganda": { lat: 1, lng: 32, flag: "🇺🇬", color: "#f43f5e" },
  "فيتنام": { lat: 14, lng: 108, flag: "🇻🇳", color: "#fbbf24" },
  "Vietnam": { lat: 14, lng: 108, flag: "🇻🇳", color: "#fbbf24" },
};

export { originCoordinates };
export type { OriginData };

const OriginMap = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [originsData, setOriginsData] = useState<OriginData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchOriginsData();
  }, [user]);

  const fetchOriginsData = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("coffee_offerings")
      .select(`
        origin, 
        price, 
        score,
        suppliers!inner(name, user_id)
      `)
      .eq("suppliers.user_id", user?.id);

    if (!error && data) {
      const grouped = data.reduce((acc: Record<string, { prices: number[]; scores: number[]; count: number; suppliers: string[] }>, item: any) => {
        if (!item.origin) return acc;
        if (!acc[item.origin]) acc[item.origin] = { prices: [], scores: [], count: 0, suppliers: [] };
        acc[item.origin].count++;
        if (item.price) acc[item.origin].prices.push(item.price);
        if (item.score) acc[item.origin].scores.push(item.score);
        if (item.suppliers?.name && !acc[item.origin].suppliers.includes(item.suppliers.name)) {
          acc[item.origin].suppliers.push(item.suppliers.name);
        }
        return acc;
      }, {});

      const processed = Object.entries(grouped).map(([origin, data]) => ({
        origin,
        count: data.count,
        avgPrice: data.prices.length > 0 ? data.prices.reduce((a, b) => a + b, 0) / data.prices.length : 0,
        avgScore: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0,
        suppliers: data.suppliers,
      })).sort((a, b) => b.count - a.count);

      setOriginsData(processed);
    }
    setIsLoading(false);
  };

  const getFlag = (origin: string) => originCoordinates[origin]?.flag || "🌍";
  const getColor = (origin: string) => originCoordinates[origin]?.color || "#6b7280";

  const totalCoffees = originsData.reduce((sum, o) => sum + o.count, 0);
  const uniqueSuppliers = new Set(originsData.flatMap((o) => o.suppliers)).size;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">خريطة المناشئ</h1>
            <p className="text-muted-foreground mt-1">توزيع المحاصيل حسب بلد المنشأ</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للوحة التحكم
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مناطق القهوة</p>
                <p className="text-2xl font-bold text-foreground">{originsData.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-success/10">
                <Coffee className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المحاصيل</p>
                <p className="text-2xl font-bold text-foreground">{totalCoffees}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-info/10">
                <Users className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الموردون</p>
                <p className="text-2xl font-bold text-foreground">{uniqueSuppliers}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {originsData.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد محاصيل مسجلة بعد</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Map */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  الخريطة التفاعلية
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px] rounded-b-lg overflow-hidden">
                  <Suspense fallback={
                    <div className="h-full flex items-center justify-center bg-muted">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  }>
                    <InteractiveMap 
                      originsData={originsData}
                      originCoordinates={originCoordinates}
                      selectedOrigin={selectedOrigin}
                      onSelectOrigin={setSelectedOrigin}
                      language={language}
                    />
                  </Suspense>
                </div>
              </CardContent>
            </Card>

            {/* Origins List */}
            <Card>
              <CardHeader>
                <CardTitle>قائمة المناطق</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                <div className="space-y-3">
                  {originsData.map((origin) => (
                    <div
                      key={origin.origin}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedOrigin === origin.origin
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedOrigin(selectedOrigin === origin.origin ? null : origin.origin)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getFlag(origin.origin)}</span>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getColor(origin.origin) }}
                          />
                          <span className="font-medium">
                            {translateOrigin(origin.origin, language)}
                          </span>
                        </div>
                        <Badge variant="secondary">{origin.count}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>الموردون: {origin.suppliers.length}</p>
                        <p>متوسط السعر: {origin.avgPrice.toFixed(0)} ريال/كجم</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Selected Origin Details */}
        {selectedOrigin && (
          <Card className="mt-6 border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-3xl">{getFlag(selectedOrigin)}</span>
                {translateOrigin(selectedOrigin, language)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const data = originsData.find(o => o.origin === selectedOrigin);
                if (!data) return null;
                return (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-4 bg-background rounded-lg">
                        <p className="text-2xl font-bold text-primary">{data.count}</p>
                        <p className="text-sm text-muted-foreground">محصول</p>
                      </div>
                      <div className="p-4 bg-background rounded-lg">
                        <p className="text-2xl font-bold">{data.suppliers.length}</p>
                        <p className="text-sm text-muted-foreground">مورد</p>
                      </div>
                      <div className="p-4 bg-background rounded-lg">
                        <p className="text-2xl font-bold">{data.avgPrice.toFixed(0)}</p>
                        <p className="text-sm text-muted-foreground">متوسط السعر (ريال)</p>
                      </div>
                      <div className="p-4 bg-background rounded-lg">
                        <p className="text-2xl font-bold">{data.avgScore.toFixed(0)}</p>
                        <p className="text-sm text-muted-foreground">متوسط الدرجة</p>
                      </div>
                    </div>
                    {data.suppliers.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">الموردون:</p>
                        <div className="flex flex-wrap gap-2">
                          {data.suppliers.map((supplier) => (
                            <Badge key={supplier} variant="outline">
                              {supplier}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
};

export default OriginMap;
