import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  TrendingDown, Package, Coffee, Calendar, Scale, Percent
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface RoastingStats {
  totalBatches: number;
  totalGreenKg: number;
  totalOutputKg: number;
  avgLossPercentage: number;
  batchesThisWeek: number;
  batchesThisMonth: number;
}

interface LossDataPoint {
  date: string;
  loss: number;
  batchNumber: string;
}

interface CoffeeTypeData {
  name: string;
  count: number;
  quantity: number;
}

const RoastingAnalytics = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [stats, setStats] = useState<RoastingStats | null>(null);
  const [lossData, setLossData] = useState<LossDataPoint[]>([]);
  const [coffeeTypeData, setCoffeeTypeData] = useState<CoffeeTypeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isArabic = language === 'ar';
  const dateLocale = isArabic ? ar : enUS;

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10B981', '#F59E0B', '#EF4444'];

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const thirtyDaysAgo = subDays(now, 30);

      // Fetch all completed logs
      const { data: logs, error } = await supabase
        .from("roasting_logs")
        .select("*")
        .eq("roaster_id", user?.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (error) throw error;

      if (logs && logs.length > 0) {
        // Calculate stats
        const totalBatches = logs.length;
        const totalGreenKg = logs.reduce((sum, log) => sum + (log.total_green_kg || 0), 0);
        const totalOutputKg = logs.reduce((sum, log) => sum + (log.output_kg || 0), 0);
        const avgLossPercentage = logs.reduce((sum, log) => sum + (log.loss_percentage || 0), 0) / totalBatches;

        const batchesThisWeek = logs.filter(log => {
          const date = new Date(log.completed_at);
          return date >= weekStart && date <= weekEnd;
        }).length;

        const batchesThisMonth = logs.filter(log => {
          const date = new Date(log.completed_at);
          return date >= monthStart && date <= monthEnd;
        }).length;

        setStats({
          totalBatches,
          totalGreenKg,
          totalOutputKg,
          avgLossPercentage,
          batchesThisWeek,
          batchesThisMonth
        });

        // Loss data for chart (last 30 days)
        const recentLogs = logs.filter(log => {
          const date = new Date(log.completed_at);
          return date >= thirtyDaysAgo;
        });

        const lossChartData = recentLogs.map(log => ({
          date: format(new Date(log.completed_at), "MM/dd", { locale: dateLocale }),
          loss: log.loss_percentage || 0,
          batchNumber: log.batch_number || `#${log.log_number}`
        })).reverse();

        setLossData(lossChartData);

        // Coffee type popularity
        const coffeeCount: Record<string, { count: number; quantity: number }> = {};
        logs.forEach(log => {
          const name = log.green_coffee_name || 'Unknown';
          if (!coffeeCount[name]) {
            coffeeCount[name] = { count: 0, quantity: 0 };
          }
          coffeeCount[name].count++;
          coffeeCount[name].quantity += log.total_green_kg || 0;
        });

        const coffeeData = Object.entries(coffeeCount)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        setCoffeeTypeData(coffeeData);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-6 w-6 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold">{stats?.totalBatches || 0}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "إجمالي الدفعات" : "Total Batches"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto text-green-500 mb-2" />
            <div className="text-2xl font-bold">{stats?.batchesThisWeek || 0}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "هذا الأسبوع" : "This Week"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{stats?.batchesThisMonth || 0}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "هذا الشهر" : "This Month"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Scale className="h-6 w-6 mx-auto text-amber-500 mb-2" />
            <div className="text-2xl font-bold">{stats?.totalGreenKg?.toFixed(0) || 0}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "كجم أخضر" : "Green Kg"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Coffee className="h-6 w-6 mx-auto text-orange-500 mb-2" />
            <div className="text-2xl font-bold">{stats?.totalOutputKg?.toFixed(0) || 0}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "كجم محمص" : "Roasted Kg"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Percent className="h-6 w-6 mx-auto text-red-500 mb-2" />
            <div className="text-2xl font-bold">{stats?.avgLossPercentage?.toFixed(1) || 0}%</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "متوسط الفاقد" : "Avg Loss"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Loss Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5" />
              {isArabic ? "اتجاه نسبة الفاقد (آخر 30 يوم)" : "Loss Trend (Last 30 Days)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lossData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={lossData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis unit="%" className="text-xs" />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border rounded-lg p-2 shadow-lg">
                            <p className="font-medium">{payload[0].payload.batchNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              {isArabic ? "الفاقد" : "Loss"}: {payload[0].value}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="loss" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                {isArabic ? "لا توجد بيانات كافية" : "Not enough data"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Roasted Coffee Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coffee className="h-5 w-5" />
              {isArabic ? "أكثر الأنواع تحميصاً" : "Most Roasted Types"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coffeeTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={coffeeTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ name, percent }) => `${name.substring(0, 10)}${name.length > 10 ? '...' : ''} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {coffeeTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border rounded-lg p-2 shadow-lg">
                            <p className="font-medium">{payload[0].payload.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {isArabic ? "الدفعات" : "Batches"}: {payload[0].payload.count}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {isArabic ? "الكمية" : "Quantity"}: {payload[0].payload.quantity.toFixed(1)} kg
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                {isArabic ? "لا توجد بيانات كافية" : "Not enough data"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Summary Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            {isArabic ? "ملخص الكميات (آخر 30 يوم)" : "Quantity Summary (Last 30 Days)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lossData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={lossData.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="loss" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              {isArabic ? "لا توجد بيانات كافية" : "Not enough data"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RoastingAnalytics;
