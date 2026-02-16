import { useLanguage } from "@/hooks/useLanguage";
import { Globe, Users, TrendingUp, DollarSign, Sprout, Package, Flame, Coffee, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TradingData = () => {
  const { language } = useLanguage();
  const [stats, setStats] = useState({
    farms: 0,
    suppliers: 0,
    roasters: 0,
    cafes: 0,
    maintenance: 0,
    coffeeOfferings: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch counts from user_roles for each role
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("status", "approved")
          .in("role", ["farm", "supplier", "roaster", "cafe", "maintenance"]);

        if (rolesData) {
          const counts = rolesData.reduce((acc, item) => {
            acc[item.role] = (acc[item.role] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          // Fetch coffee offerings count
          const { count: offeringsCount } = await supabase
            .from("coffee_offerings")
            .select("*", { count: "exact", head: true });

          setStats({
            farms: counts.farm || 0,
            suppliers: counts.supplier || 0,
            roasters: counts.roaster || 0,
            cafes: counts.cafe || 0,
            maintenance: counts.maintenance || 0,
            coffeeOfferings: offeringsCount || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("trading-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "coffee_offerings" }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const tradingStats = [
    {
      icon: Sprout,
      value: stats.farms,
      label: language === "ar" ? "مزارع" : "Farms",
      color: "#10B981",
    },
    {
      icon: Package,
      value: stats.suppliers,
      label: language === "ar" ? "موردين" : "Suppliers",
      color: "#3B82F6",
    },
    {
      icon: Flame,
      value: stats.roasters,
      label: language === "ar" ? "محامص" : "Roasters",
      color: "#F97316",
    },
    {
      icon: Coffee,
      value: stats.cafes,
      label: language === "ar" ? "مقاهي" : "Cafes",
      color: "#EC4899",
    },
    {
      icon: Wrench,
      value: stats.maintenance,
      label: language === "ar" ? "صيانة" : "Maintenance",
      color: "#64748B",
    },
    {
      icon: TrendingUp,
      value: stats.coffeeOfferings,
      label: language === "ar" ? "عروض قهوة" : "Coffee Offers",
      color: "#c4a35a",
    },
  ];

  const totalPartners = stats.farms + stats.suppliers + stats.roasters + stats.cafes + stats.maintenance;

  return (
    <section className="py-20 bg-gradient-to-br from-foreground to-foreground/90 text-background">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            {language === "ar" ? "بيانات التداول الفعلية" : "Live Trading Data"}
          </h2>
          <p className="text-lg text-background/70 max-w-2xl mx-auto mb-4">
            {language === "ar" 
              ? "أرقام حقيقية من منصتنا في الوقت الفعلي"
              : "Real-time numbers from our platform"}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-primary font-bold text-lg">
              {totalPartners} {language === "ar" ? "شريك نشط" : "Active Partners"}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
          {tradingStats.map((stat, index) => (
            <div 
              key={index}
              className="text-center p-6 rounded-2xl bg-background/5 border border-background/10 hover:bg-background/10 transition-all hover:scale-105"
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
              <div className="text-4xl md:text-5xl font-black mb-2" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-sm font-medium text-background/90">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TradingData;
