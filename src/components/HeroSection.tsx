import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Building2, LayoutDashboard, Shield, Flame, Tag, Sparkles, Globe, FileText, Bot, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";

const HeroSection = () => {
  const { user } = useAuth();
  
  const { language, t, dir } = useLanguage();
  const [userRole, setUserRole] = useState<{ role: string; status: string } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  
  const isAdmin = userRole?.role === 'admin' && userRole?.status === 'approved';
  const isSupplier = userRole?.role === 'supplier' && userRole?.status === 'approved';
  const isRoaster = userRole?.role === 'roaster' && userRole?.status === 'approved';
  const isRtl = dir === 'rtl';
  const iconMargin = isRtl ? 'ml-2' : 'mr-2';

  useEffect(() => {
    if (!user) {
      setUserRole(null);
      setPendingCount(0);
      return;
    }

    const checkUserRole = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role, status')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserRole(data);

      if (data?.role === 'admin' && data?.status === 'approved') {
        const { count } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        setPendingCount(count || 0);
      }
    };

    checkUserRole();

    const channel = supabase
      .channel('pending-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        checkUserRole();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const features = useMemo(() => [
    { 
      icon: FileText, 
      label: language === 'ar' ? 'رفع يدوي' : 'Manual Upload', 
      desc: language === 'ar' ? 'إضافة المحاصيل يدوياً' : 'Add crops manually', 
      href: "/supplier-dashboard?tab=manual" 
    },
    { 
      icon: Bot, 
      label: language === 'ar' ? 'رفع بالذكاء الاصطناعي' : 'AI Upload', 
      desc: language === 'ar' ? 'تحليل PDF تلقائي' : 'Auto PDF analysis', 
      href: "/ai-upload" 
    },
    { 
      icon: Search, 
      label: language === 'ar' ? 'بحث ذكي' : 'Smart Search', 
      desc: language === 'ar' ? 'في جميع المحاصيل' : 'All varieties', 
      href: "#search" 
    },
    { 
      icon: Coffee, 
      label: language === 'ar' ? 'المحامص' : 'Roasters', 
      desc: language === 'ar' ? 'المحامص المسجلة' : 'Registered roasters', 
      href: "#roasters" 
    },
  ], [language]);


  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" aria-label={language === 'ar' ? 'القسم الرئيسي' : 'Hero Section'}>

      {/* Background with Dal Brand Orange */}
      <div className="absolute inset-0 bg-accent" aria-hidden="true">
        {/* Salmani Architecture Pattern - Top */}
        <div className="absolute top-0 left-0 right-0 h-12 flex justify-center">
          <svg viewBox="0 0 1200 48" className="w-full h-full" preserveAspectRatio="none">
            <path 
              d="M0,48 L0,24 L24,24 L24,0 L48,0 L48,24 L72,24 L72,0 L96,0 L96,24 L120,24 L120,0 L144,0 L144,24 L168,24 L168,0 L192,0 L192,24 L216,24 L216,0 L240,0 L240,24 L264,24 L264,0 L288,0 L288,24 L312,24 L312,0 L336,0 L336,24 L360,24 L360,0 L384,0 L384,24 L408,24 L408,0 L432,0 L432,24 L456,24 L456,0 L480,0 L480,24 L504,24 L504,0 L528,0 L528,24 L552,24 L552,0 L576,0 L576,24 L600,24 L600,0 L624,0 L624,24 L648,24 L648,0 L672,0 L672,24 L696,24 L696,0 L720,0 L720,24 L744,24 L744,0 L768,0 L768,24 L792,24 L792,0 L816,0 L816,24 L840,24 L840,0 L864,0 L864,24 L888,24 L888,0 L912,0 L912,24 L936,24 L936,0 L960,0 L960,24 L984,24 L984,0 L1008,0 L1008,24 L1032,24 L1032,0 L1056,0 L1056,24 L1080,24 L1080,0 L1104,0 L1104,24 L1128,24 L1128,0 L1152,0 L1152,24 L1176,24 L1176,0 L1200,0 L1200,48 Z" 
              fill="hsl(var(--background))"
            />
          </svg>
        </div>
        
        {/* Decorative Triangles */}
        <div className="absolute top-20 right-20 opacity-20">
          <svg width="60" height="120" viewBox="0 0 60 120">
            <polygon points="30,0 60,30 30,30" fill="white"/>
            <polygon points="30,35 60,65 30,65" fill="white"/>
            <polygon points="30,70 60,100 30,100" fill="white"/>
            <polygon points="10,100 30,120 50,100" fill="white"/>
          </svg>
        </div>
        <div className="absolute top-40 left-20 opacity-20">
          <svg width="40" height="80" viewBox="0 0 40 80">
            <polygon points="20,0 40,20 20,20" fill="white"/>
            <polygon points="20,25 40,45 20,45" fill="white"/>
          </svg>
        </div>
        
        {/* Salmani Architecture Pattern - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-12 flex justify-center rotate-180">
          <svg viewBox="0 0 1200 48" className="w-full h-full" preserveAspectRatio="none">
            <path 
              d="M0,48 L0,24 L24,24 L24,0 L48,0 L48,24 L72,24 L72,0 L96,0 L96,24 L120,24 L120,0 L144,0 L144,24 L168,24 L168,0 L192,0 L192,24 L216,24 L216,0 L240,0 L240,24 L264,24 L264,0 L288,0 L288,24 L312,24 L312,0 L336,0 L336,24 L360,24 L360,0 L384,0 L384,24 L408,24 L408,0 L432,0 L432,24 L456,24 L456,0 L480,0 L480,24 L504,24 L504,0 L528,0 L528,24 L552,24 L552,0 L576,0 L576,24 L600,24 L600,0 L624,0 L624,24 L648,24 L648,0 L672,0 L672,24 L696,24 L696,0 L720,0 L720,24 L744,24 L744,0 L768,0 L768,24 L792,24 L792,0 L816,0 L816,24 L840,24 L840,0 L864,0 L864,24 L888,24 L888,0 L912,0 L912,24 L936,24 L936,0 L960,0 L960,24 L984,24 L984,0 L1008,0 L1008,24 L1032,24 L1032,0 L1056,0 L1056,24 L1080,24 L1080,0 L1104,0 L1104,24 L1128,24 L1128,0 L1152,0 L1152,24 L1176,24 L1176,0 L1200,0 L1200,48 Z" 
              fill="hsl(var(--background))"
            />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center pt-16">
        <div className="max-w-4xl mx-auto">
          {/* FIVE HUB Logo */}
          <header className="flex flex-col items-center justify-center gap-4 mb-8 animate-fade-up">
            <div className="text-5xl md:text-7xl font-display font-black text-white tracking-tight">
              FIVE <span className="text-coffee-gold">HUB</span>
            </div>
          </header>

          {/* Main Heading */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-4 animate-fade-up stagger-1 text-balance">
            {language === 'ar' ? (
              <>منصة ربط سلسلة القهوة الكاملة</>
            ) : (
              <>Complete Coffee Supply Chain Platform</>
            )}
          </h1>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-white/90 font-semibold mb-8 animate-fade-up stagger-2">
            {language === 'ar' ? 'مزارع • موردين • محامص • مقاهي • صيانة' : 'Farms • Suppliers • Roasters • Cafes • Maintenance'}
          </p>

          {/* CTA Buttons */}
          <nav className="flex flex-wrap gap-3 justify-center animate-fade-up stagger-3" aria-label={language === 'ar' ? 'التنقل الرئيسي' : 'Main Navigation'}>
            {user && (
              <>
                {/* Primary Actions */}
                <Link to="/dashboard">
                  <Button size="lg" className="bg-white text-accent hover:bg-white/90 shadow-xl font-bold">
                    <LayoutDashboard className={`w-5 h-5 ${iconMargin}`} aria-hidden="true" />
                    {t('nav.dashboard')}
                  </Button>
                </Link>
                
                <Link to="/supplier-dashboard?tab=manual">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl">
                    <FileText className={`w-5 h-5 ${iconMargin}`} aria-hidden="true" />
                    {language === 'ar' ? 'رفع يدوي' : 'Manual'}
                  </Button>
                </Link>
                
                <Link to="/ai-upload">
                  <Button size="lg" className="bg-success text-success-foreground hover:bg-success/90 shadow-xl">
                    <Bot className={`w-5 h-5 ${iconMargin}`} aria-hidden="true" />
                    {language === 'ar' ? 'رفع بالذكاء الاصطناعي' : 'AI Upload'}
                  </Button>
                </Link>

                {/* Role-specific buttons */}
                
                {isSupplier && (
                  <Link to="/supplier-dashboard">
                    <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover-lift">
                      <Building2 className={`w-5 h-5 ${iconMargin}`} aria-hidden="true" />
                      {language === 'ar' ? 'لوحة المورد' : 'Supplier Panel'}
                    </Button>
                  </Link>
                )}
                
                {isRoaster && (
                  <>
                    <Link to="/roaster-dashboard">
                      <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover-lift">
                        <Flame className={`w-5 h-5 ${iconMargin}`} aria-hidden="true" />
                        {language === 'ar' ? 'لوحة المحمصة' : 'Roaster Panel'}
                      </Button>
                    </Link>
                    <Link to="/active-offers">
                      <Button size="lg" className="bg-success text-success-foreground hover:bg-success/90 shadow-lg hover-lift">
                        <Tag className={`w-5 h-5 ${iconMargin}`} aria-hidden="true" />
                        {language === 'ar' ? 'العروض' : 'Offers'}
                      </Button>
                    </Link>
                    <Link to="/smart-matching">
                      <Button size="lg" className="bg-white/20 text-white hover:bg-white/30 shadow-lg hover-lift backdrop-blur-sm">
                        <Sparkles className={`w-5 h-5 ${iconMargin}`} aria-hidden="true" />
                        {language === 'ar' ? 'المطابقة الذكية' : 'Smart Match'}
                      </Button>
                    </Link>
                    <Link to="/market-prices">
                      <Button size="lg" className="bg-white/20 text-white hover:bg-white/30 shadow-lg hover-lift backdrop-blur-sm">
                        <Globe className={`w-5 h-5 ${iconMargin}`} aria-hidden="true" />
                        {language === 'ar' ? 'أسعار السوق' : 'Market'}
                      </Button>
                    </Link>
                  </>
                )}
                
                {isAdmin && (
                  <Link to="/admin-landing" className="relative">
                    <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover-lift">
                      <Shield className={`w-5 h-5 ${iconMargin}`} aria-hidden="true" />
                      {language === 'ar' ? 'لوحة الإدارة' : 'Admin Panel'}
                    </Button>
                    {pendingCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs min-w-[20px] h-5 flex items-center justify-center animate-pulse-soft">
                        {pendingCount}
                      </Badge>
                    )}
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Features Preview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 animate-fade-up stagger-4">
            {features.map((feature, index) => {
              const isAnchor = feature.href.startsWith("#");
              
              const handleClick = (e: React.MouseEvent) => {
                if (isAnchor) {
                  e.preventDefault();
                  const element = document.querySelector(feature.href);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              };
              
              return isAnchor ? (
                <a
                  key={index}
                  href={feature.href}
                  onClick={handleClick}
                  className="group p-5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 hover-lift cursor-pointer"
                >
                  <feature.icon className="w-8 h-8 text-white mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" aria-hidden="true" />
                  <h3 className="text-white font-semibold text-sm mb-1">{feature.label}</h3>
                  <p className="text-white/70 text-xs">{feature.desc}</p>
                </a>
              ) : (
                <Link
                  key={index}
                  to={feature.href}
                  className="group p-5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 hover-lift"
                >
                  <feature.icon className="w-8 h-8 text-white mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" aria-hidden="true" />
                  <h3 className="text-white font-semibold text-sm mb-1">{feature.label}</h3>
                  <p className="text-white/70 text-xs">{feature.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-12 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" aria-hidden="true" />
    </section>
  );
};

export default HeroSection;