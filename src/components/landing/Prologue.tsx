import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sprout, Package, Flame, Coffee, Wrench, Play } from "lucide-react";

// Import videos
import farmsVideo from "@/assets/videos/farms-reel.mp4";
import suppliersVideo from "@/assets/videos/suppliers-reel.mp4";
import roastersVideo from "@/assets/videos/roasters-reel.mp4";
import cafesVideo from "@/assets/videos/cafes-reel.mp4";
import maintenanceVideo from "@/assets/videos/maintenance-reel.mp4";

const Prologue = () => {
  const { language, dir } = useLanguage();
  const isRtl = dir === "rtl";

  const roles = [
    {
      id: "farms",
      Icon: Sprout,
      title: language === "ar" ? "المزارع" : "Farm",
      subtitle: language === "ar" 
        ? "تواصل مع المحامص حول العالم وقدم قهوتك الخضراء"
        : "Connect with roasters worldwide and offer your green coffee",
      cta: language === "ar" ? "تواصل مع المحامص" : "Connect with Roasters",
      href: "/auth?role=farm",
      gradient: "from-emerald-500 to-green-600",
      video: farmsVideo,
    },
    {
      id: "suppliers",
      Icon: Package,
      title: language === "ar" ? "الموردين" : "Supplier",
      subtitle: language === "ar"
        ? "شبكة واسعة من الموردين المعتمدين للقهوة الخضراء"
        : "Wide network of certified green coffee suppliers",
      cta: language === "ar" ? "عرض القهوة الخضراء" : "Offer Green Coffee",
      href: "/auth?role=supplier",
      gradient: "from-blue-500 to-indigo-600",
      video: suppliersVideo,
    },
    {
      id: "roasters",
      Icon: Flame,
      title: language === "ar" ? "المحمصة" : "Roaster",
      subtitle: language === "ar"
        ? "تواصل مع منتجي القهوة حول العالم واحصل على قهوتهم الخضراء"
        : "Connect with coffee producers worldwide and source their green coffee",
      cta: language === "ar" ? "تواصل مع المنتجين" : "Connect with Producers",
      href: "/auth?role=roaster",
      gradient: "from-orange-500 to-amber-500",
      video: roastersVideo,
    },
    {
      id: "cafes",
      Icon: Coffee,
      title: language === "ar" ? "المقهى" : "Cafe",
      subtitle: language === "ar"
        ? "اكتشف المحامص التي تقدم قهوة لذيذة حول العالم"
        : "Discover roasters offering delicious coffee around the globe",
      cta: language === "ar" ? "ابحث عن المحامص" : "Find Roasters",
      href: "/auth?role=cafe",
      gradient: "from-rose-500 to-pink-600",
      video: cafesVideo,
    },
    {
      id: "maintenance",
      Icon: Wrench,
      title: language === "ar" ? "الصيانة" : "Maintenance",
      subtitle: language === "ar"
        ? "خدمات صيانة معدات القهوة والدعم الفني"
        : "Coffee equipment maintenance and technical support services",
      cta: language === "ar" ? "قدم خدماتك" : "Offer Services",
      href: "/auth?role=maintenance",
      gradient: "from-slate-500 to-gray-600",
      video: maintenanceVideo,
    },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16 max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground mb-6 leading-tight">
            {language === "ar" ? (
              <>كل محبي القهوة يصبحون واحداً<br />من خلال التجارة المباشرة</>
            ) : (
              <>All coffee lovers becoming one<br />through direct trade</>
            )}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            {language === "ar" ? (
              <>
                FIVE HUB هي منصة إلكترونية حيث يمكن لمنتجي القهوة والمحمصين من جميع أنحاء العالم
                <br className="hidden md:block" />
                المشاركة في التجارة المباشرة للقهوة النادرة والفريدة، بدءاً من كيس جوت واحد فقط.
              </>
            ) : (
              <>
                FIVE HUB is an online platform where coffee producers and roasters from around the world
                <br className="hidden md:block" />
                can engage in direct trade of rare and unique coffees, starting from just one jute bag.
              </>
            )}
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {roles.map((role, index) => (
            <Card
              key={role.id}
              className={`group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 ${
                index === 4 ? "lg:col-start-2" : ""
              }`}
            >
              {/* Video Background */}
              <div className="relative aspect-[4/5] overflow-hidden">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                >
                  <source src={role.video} type="video/mp4" />
                </video>
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                
                {/* Icon Badge */}
                <div className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} w-14 h-14 rounded-full bg-gradient-to-br ${role.gradient} flex items-center justify-center shadow-xl`}>
                  <role.Icon className="w-7 h-7 text-white" strokeWidth={2} />
                </div>
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-3xl font-black mb-2">{role.title}</h3>
                  <p className="text-white/80 text-sm mb-6 line-clamp-3">{role.subtitle}</p>
                  
                  {/* CTA Button */}
                  <Link to={role.href}>
                    <Button 
                      className={`w-full bg-gradient-to-r ${role.gradient} text-white font-bold py-6 rounded-full hover:opacity-90 transition-opacity`}
                    >
                      {role.cta}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Prologue;
