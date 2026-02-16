import { useLanguage } from "@/hooks/useLanguage";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Sprout, Flame, Coffee, Wrench } from "lucide-react";

const CommunityStats = () => {
  const { language } = useLanguage();
  const [stats, setStats] = useState({
    farms: 0,
    suppliers: 0,
    roasters: 0,
    cafes: 0,
    maintenance: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
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

          setStats({
            farms: counts.farm || 0,
            suppliers: counts.supplier || 0,
            roasters: counts.roaster || 0,
            cafes: counts.cafe || 0,
            maintenance: counts.maintenance || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();

    const channel = supabase
      .channel("community-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground mb-4">
            {language === "ar" ? "مجتمعنا" : "Our Community"}
          </h2>
          <p className="text-muted-foreground">
            {language === "ar" 
              ? "شبكة متنامية من شركاء القهوة المختصة"
              : "A growing network of specialty coffee partners"}
          </p>
        </div>

        {/* Role Breakdown */}
        <div className="flex flex-wrap justify-center gap-4">
          {[
            { icon: Sprout, count: stats.farms, label: language === "ar" ? "مزرعة" : "Farm", color: "#10B981" },
            { icon: Package, count: stats.suppliers, label: language === "ar" ? "مورد" : "Supplier", color: "#3B82F6" },
            { icon: Flame, count: stats.roasters, label: language === "ar" ? "محمصة" : "Roaster", color: "#F97316" },
            { icon: Coffee, count: stats.cafes, label: language === "ar" ? "مقهى" : "Cafe", color: "#EC4899" },
            { icon: Wrench, count: stats.maintenance, label: language === "ar" ? "صيانة" : "Maintenance", color: "#64748B" },
          ].map((item, index) => (
            <div 
              key={index}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border"
            >
              <item.icon className="w-4 h-4" style={{ color: item.color }} />
              <span className="font-bold" style={{ color: item.color }}>{item.count}</span>
              <span className="text-muted-foreground text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CommunityStats;
