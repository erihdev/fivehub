import { Link } from "react-router-dom";
import { Play, Sparkles, Star, Users, Award, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import fivehubLogo from "@/assets/fivehub-logo-official.png";
import FiveFingersPillars from "./FiveFingersPillars";

const FiveHubHero = () => {
  const { language } = useLanguage();
  const { user } = useAuth();

  const scrollToFeatures = () => {
    document.getElementById("five-pillars")?.scrollIntoView({ behavior: "smooth" });
  };

  const stats = [
    { icon: Users, value: "2,500+", labelAr: "مستخدم نشط", labelEn: "Active Users" },
    { icon: Globe, value: "45+", labelAr: "دولة", labelEn: "Countries" },
    { icon: Award, value: "98%", labelAr: "رضا العملاء", labelEn: "Satisfaction" },
    { icon: Star, value: "15,000+", labelAr: "صفقة ناجحة", labelEn: "Deals" },
  ];

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Modern Gradient Background - 2025 Color Trends */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-fivehub-navy-light to-fivehub-teal" />
      
      {/* Simple Overlay */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center pt-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full border border-white/20">
            <Sparkles className="w-4 h-4 text-fivehub-gold" />
            <span className="font-semibold text-sm md:text-base">
              {language === "ar" ? "منصة سلسلة القهوة المتكاملة" : "Complete Coffee Supply Chain"}
            </span>
          </div>

          {/* Logo */}
          <div className="flex justify-center">
            <img 
              src={fivehubLogo} 
              alt="FIVE HUB" 
              className="h-24 md:h-32 lg:h-40 w-auto drop-shadow-lg"
            />
          </div>

          {/* Tagline */}
          <h1 className="text-2xl md:text-4xl lg:text-5xl text-white font-black tracking-tight">
            {language === "ar" ? (
              <>خمسة أركان، <span className="text-fivehub-gold">منصة واحدة</span></>
            ) : (
              <>Five Pillars, <span className="text-fivehub-gold">One Platform</span></>
            )}
          </h1>

          {/* Description */}
          <p className="text-base md:text-lg lg:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed font-medium">
            {language === "ar"
              ? "نربط المزارع بالموردين، والموردين بالمحامص، والمحامص بالمقاهي"
              : "Connecting farms to suppliers, suppliers to roasters, roasters to cafes"}
          </p>

          {/* Five Fingers Pillars - Hand with icons on each finger */}
          <div className="pt-12 md:pt-16 pb-8">
            <FiveFingersPillars />
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 pt-6">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/20 hover:bg-white/20 transition-colors"
              >
                <stat.icon className="w-6 h-6 md:w-7 md:h-7 text-fivehub-gold mx-auto mb-1.5" />
                <div className="text-xl md:text-2xl font-black text-white">
                  {stat.value}
                </div>
                <div className="text-white/80 text-xs md:text-sm font-medium">
                  {language === "ar" ? stat.labelAr : stat.labelEn}
                </div>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3 justify-center pt-6 pb-8">
            {user ? (
              <Link to="/dashboard">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg font-bold text-base px-8 py-6 rounded-full">
                  {language === "ar" ? "لوحة التحكم" : "Dashboard"}
                </Button>
              </Link>
            ) : (
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-bold text-base px-8 py-6 rounded-full shadow-lg"
                onClick={scrollToFeatures}
              >
                <Play className="w-4 h-4 ml-2" />
                {language === "ar" ? "اكتشف المزيد" : "Learn More"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" className="w-full">
          <path
            fill="hsl(var(--background))"
            d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
          />
        </svg>
      </div>
    </section>
  );
};

export default FiveHubHero;
