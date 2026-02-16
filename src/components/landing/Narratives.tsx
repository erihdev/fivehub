import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, User, Building2 } from "lucide-react";

interface Narrative {
  id: string;
  type: "roaster" | "supplier" | "farm";
  name: string;
  company: string;
  country: string;
  city: string;
  description: string;
  image?: string;
}

const Narratives = () => {
  const { language } = useLanguage();
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNarratives = async () => {
      try {
        // Fetch suppliers/farms
        const { data: suppliers } = await supabase
          .from("suppliers")
          .select("id, name, contact_info")
          .limit(6);

        // Fetch roasters from user_roles with profiles
        const { data: roasters } = await supabase
          .from("user_roles")
          .select(`
            user_id,
            profiles!inner(full_name, company_name, city)
          `)
          .eq("role", "roaster")
          .eq("status", "approved")
          .limit(3);

        const narrativesList: Narrative[] = [];

        // Add suppliers
        suppliers?.forEach((s) => {
          narrativesList.push({
            id: s.id,
            type: "supplier",
            name: s.name || "Unknown",
            company: s.name || "",
            country: "Saudi Arabia",
            city: "",
            description: language === "ar" 
              ? "مورد قهوة متميز يقدم أجود أنواع البن" 
              : "Premium coffee supplier offering the finest beans",
          });
        });

        // Add roasters
        roasters?.forEach((r: any) => {
          narrativesList.push({
            id: r.user_id,
            type: "roaster",
            name: r.profiles?.full_name || "Unknown",
            company: r.profiles?.company_name || "",
            country: "Saudi Arabia",
            city: r.profiles?.city || "",
            description: language === "ar"
              ? "محمصة متخصصة في تحميص القهوة المختصة"
              : "Specialty coffee roaster focused on quality",
          });
        });

        setNarratives(narrativesList.slice(0, 6));
      } catch (error) {
        console.error("Error fetching narratives:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNarratives();
  }, [language]);

  // Placeholder narratives if no data
  const placeholderNarratives: Narrative[] = [
    {
      id: "1",
      type: "roaster",
      name: "أحمد الشريف",
      company: "محمصة الريادة",
      country: "السعودية",
      city: "الرياض",
      description: language === "ar" 
        ? "رحلة شغف مع القهوة بدأت من مزارع إثيوبيا"
        : "A passion journey with coffee that started from Ethiopian farms",
    },
    {
      id: "2",
      type: "supplier",
      name: "فهد العتيبي",
      company: "موردين البن الفاخر",
      country: "اليمن",
      city: "صنعاء",
      description: language === "ar"
        ? "ثلاثة أجيال من تجارة البن اليمني الأصيل"
        : "Three generations of authentic Yemeni coffee trading",
    },
    {
      id: "3",
      type: "farm",
      name: "خالد المالكي",
      company: "مزارع جيزان",
      country: "السعودية",
      city: "جيزان",
      description: language === "ar"
        ? "مزارع بن عربي على ارتفاع 2000 متر"
        : "Arabic coffee farms at 2000m altitude",
    },
  ];

  const displayNarratives = narratives.length > 0 ? narratives : placeholderNarratives;

  const getTypeLabel = (type: string) => {
    if (language === "ar") {
      return type === "roaster" ? "محمصة" : type === "supplier" ? "مورد" : "مزرعة";
    }
    return type === "roaster" ? "Roaster" : type === "supplier" ? "Supplier" : "Farm";
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "roaster": return "bg-orange-500/10 text-orange-600";
      case "supplier": return "bg-blue-500/10 text-blue-600";
      case "farm": return "bg-green-500/10 text-green-600";
      default: return "bg-gray-500/10 text-gray-600";
    }
  };

  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground mb-4">
            {language === "ar" ? "قصص النجاح" : "Narratives"}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === "ar" 
              ? "قصص المنتجين والمحمصين الملهمة"
              : "Inspiring stories of Producers and Roasters"}
          </p>
        </div>

        {/* Narratives Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayNarratives.map((narrative) => (
            <Card
              key={narrative.id}
              className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Image Placeholder */}
              <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building2 className="w-16 h-16 text-primary/30" />
                </div>
                {/* Country Badge */}
                <Badge 
                  className={`absolute top-4 left-4 ${getTypeColor(narrative.type)}`}
                >
                  {getTypeLabel(narrative.type)}
                </Badge>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{narrative.country}{narrative.city && `, ${narrative.city}`}</span>
                </div>
                
                <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2">
                  {narrative.description}
                </h3>
                
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{narrative.name}</p>
                    <p className="text-xs text-muted-foreground">{narrative.company}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-12">
          <Link 
            to="/suppliers"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            {language === "ar" ? "عرض جميع القصص" : "View All Narratives"}
            <span className="text-xl">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Narratives;
