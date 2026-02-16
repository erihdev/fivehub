import { useState, useEffect } from "react";
import { Building2, Package, TrendingUp, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";

const StatsSection = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    suppliers: 0,
    coffees: 0,
    origins: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: suppliersCount } = await supabase
          .from("suppliers")
          .select("*", { count: "exact", head: true });

        const { count: coffeesCount } = await supabase
          .from("coffee_offerings")
          .select("*", { count: "exact", head: true });

        const { data: originsData } = await supabase
          .from("coffee_offerings")
          .select("origin")
          .not("origin", "is", null);

        const uniqueOrigins = new Set(originsData?.map((o) => o.origin));

        setStats({
          suppliers: suppliersCount || 0,
          coffees: coffeesCount || 0,
          origins: uniqueOrigins.size,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();

    const channel = supabase
      .channel("stats-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suppliers" },
        () => fetchStats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coffee_offerings" },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statsDisplay = [
    {
      icon: Building2,
      value: stats.suppliers.toString(),
      label: t('stats.suppliers'),
      color: "text-coffee-gold",
    },
    {
      icon: Package,
      value: stats.coffees.toString(),
      label: t('stats.coffees'),
      color: "text-coffee-green",
    },
    {
      icon: Globe,
      value: stats.origins.toString(),
      label: t('stats.origins'),
      color: "text-coffee-medium",
    },
    {
      icon: TrendingUp,
      value: stats.coffees > 0 ? t('stats.systemActive') : t('stats.systemReady'),
      label: t('stats.systemStatus'),
      color: "text-coffee-gold",
    },
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {statsDisplay.map((stat, index) => (
            <Card key={index} variant="stat">
              <CardContent className="p-6 text-center">
                <stat.icon className={`w-10 h-10 mx-auto mb-3 ${stat.color}`} />
                <p className="text-3xl md:text-4xl font-display font-bold text-foreground mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
