import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import fivehubLogo from "@/assets/fivehub-logo-official.png";
import heroVideo from "@/assets/videos/roasters-reel.mp4";
import { ChevronDown, Sprout, Package, Flame, Coffee, Wrench } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TypicaHero = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const roles = [
    {
      id: "farm",
      icon: Sprout,
      label: language === "ar" ? "مزرعة" : "Farm",
      color: "text-emerald-500",
    },
    {
      id: "supplier",
      icon: Package,
      label: language === "ar" ? "مورد" : "Supplier",
      color: "text-blue-500",
    },
    {
      id: "roaster",
      icon: Flame,
      label: language === "ar" ? "محمصة" : "Roaster",
      color: "text-orange-500",
    },
    {
      id: "cafe",
      icon: Coffee,
      label: language === "ar" ? "مقهى" : "Cafe",
      color: "text-rose-500",
    },
    {
      id: "maintenance",
      icon: Wrench,
      label: language === "ar" ? "صيانة" : "Maintenance",
      color: "text-slate-400",
    },
  ];

  const handleRoleSelect = (roleId: string) => {
    setIsOpen(false);
    navigate(`/auth?role=${roleId}`);
  };

  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Background Video with Luxury Overlay */}
      <div className="absolute inset-0 z-0 scale-105 animate-pulse-slow">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-60"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        {/* Cinematic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-aura opacity-30 animate-aura" />
      </div>

      {/* Hero Content - Focused on the Brand */}
      <div className="relative z-10 text-center space-y-8 max-w-4xl px-4 animate-fade-up">
        <img
          src={fivehubLogo}
          alt="FIVE HUB"
          className="h-32 md:h-56 lg:h-72 w-auto mx-auto drop-shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-105 transition-transform duration-700"
        />

        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-luxury tracking-tighter">
            {language === "ar" ? "مستقبل القهوة السعودية" : "The Future of Saudi Coffee"}
          </h1>
          <p className="text-lg md:text-xl text-white/60 font-medium tracking-wide max-w-2xl mx-auto leading-relaxed">
            {language === "ar"
              ? "نربط المزارع بالمحامص والمقاهي في منظومة رقمية فائقة التكنولوجيا والفخامة."
              : "Connecting farms, roasters, and cafes in a high-tech, luxury digital ecosystem."}
          </p>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-center gap-6">
          <Link to="/auth">
            <button className="px-10 py-4 bg-primary text-primary-foreground font-black rounded-full hover:scale-105 hover:shadow-[0_0_30px_rgba(217,119,6,0.5)] transition-all duration-300 tracking-wider">
              {language === "ar" ? "ابدأ رحلتك الآن" : "START YOUR JOURNEY"}
            </button>
          </Link>

          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <button className="px-10 py-4 glass-card text-white font-bold rounded-full hover:bg-white/10 transition-all duration-300 flex items-center gap-2">
                {language === "ar" ? "انضم كشريك" : "JOIN AS PARTNER"}
                <ChevronDown className={`w-4 h-4 transition-transform duration-500 ${isOpen ? "rotate-180" : ""}`} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className="w-64 glass-card border-white/10 shadow-3xl rounded-2xl p-3 animate-scale-in"
            >
              <div className="px-3 py-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 opacity-70">
                {language === "ar" ? "اختر هويتك" : "SELECT YOUR ROLE"}
              </div>
              {roles.map((role) => (
                <DropdownMenuItem
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className="flex items-center gap-4 px-4 py-4 cursor-pointer rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className={`p-2 rounded-lg bg-background/50 group-hover:bg-primary/20 transition-colors`}>
                    <role.icon className={`w-5 h-5 ${role.color}`} />
                  </div>
                  <span className="font-bold text-sm tracking-wide text-white/90 group-hover:text-white">{role.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 animate-bounce opacity-20">
        <ChevronDown className="w-8 h-8 text-white" />
      </div>
    </section>
  );
};

export default TypicaHero;
