import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Sprout, Package, Flame, Coffee, Wrench, ArrowRight, Sparkles, Zap, Shield, TrendingUp, Clock, ChevronRight, Play } from "lucide-react";
import { useRef, useEffect, useState, useCallback, memo } from "react";

// Import videos
import farmsVideo from "@/assets/videos/farms-reel.mp4";
import suppliersVideo from "@/assets/videos/suppliers-reel.mp4";
import roastersVideo from "@/assets/videos/roasters-reel.mp4";
import cafesVideo from "@/assets/videos/cafes-reel.mp4";
import maintenanceVideo from "@/assets/videos/maintenance-reel.mp4";

// Reliable Video Player Component with robust error handling
const ReliableVideoPlayer = memo(({ src, className }: { src: string; className?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const playAttemptRef = useRef<number>(0);
  const maxRetries = 3;

  const attemptPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || playAttemptRef.current >= maxRetries) return;

    try {
      // Ensure video is muted (required for autoplay)
      video.muted = true;
      video.playsInline = true;
      
      // Only play if paused
      if (video.paused) {
        await video.play();
      }
    } catch (error) {
      playAttemptRef.current++;
      // Retry after a short delay
      if (playAttemptRef.current < maxRetries) {
        setTimeout(attemptPlay, 500);
      }
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset retry counter
    playAttemptRef.current = 0;

    const handleCanPlay = () => {
      setIsLoaded(true);
      attemptPlay();
    };

    const handleLoadedData = () => {
      setIsLoaded(true);
      attemptPlay();
    };

    const handleError = () => {
      // On error, try to reload the video
      if (playAttemptRef.current < maxRetries) {
        playAttemptRef.current++;
        video.load();
      }
    };

    // Listen for visibility changes to resume playback
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && video.paused) {
        attemptPlay();
      }
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial load
    video.load();

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [attemptPlay, src]);

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      loop
      muted
      playsInline
      preload="auto"
      style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
    />
  );
});

ReliableVideoPlayer.displayName = 'ReliableVideoPlayer';

const FivePillars = () => {
  const { language, dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute("data-index") || "0");
            setVisibleCards((prev) => [...new Set([...prev, index])]);
          }
        });
      },
      { threshold: 0.2, rootMargin: "50px" }
    );

    const cards = document.querySelectorAll("[data-pillar-card]");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  const pillars = [
    {
      id: "farms",
      Icon: Sprout,
      number: "01",
      title: language === "ar" ? "المزارع" : "Farms",
      subtitle: language === "ar" ? "من الأرض إلى الكوب" : "From Earth to Cup",
      description: language === "ar"
        ? "تواصل مباشر مع أفضل مزارع القهوة حول العالم"
        : "Direct connection with the best coffee farms worldwide",
      features: [
        { icon: TrendingUp, text: language === "ar" ? "تتبع المحاصيل" : "Crop tracking" },
        { icon: Shield, text: language === "ar" ? "ضمان الجودة" : "Quality guarantee" },
        { icon: Clock, text: language === "ar" ? "عقود مبكرة" : "Early contracts" },
      ],
      gradient: "from-emerald-500 via-green-500 to-teal-600",
      bgGradient: "from-emerald-500/10 via-green-500/5 to-transparent",
      iconColor: "text-emerald-500",
      href: "/auth?role=farm",
      video: farmsVideo,
    },
    {
      id: "suppliers",
      Icon: Package,
      number: "02",
      title: language === "ar" ? "الموردين" : "Suppliers",
      subtitle: language === "ar" ? "شركاء النجاح" : "Partners in Success",
      description: language === "ar"
        ? "شبكة واسعة من الموردين المعتمدين"
        : "A wide network of certified suppliers",
      features: [
        { icon: Zap, text: language === "ar" ? "مقارنة الأسعار" : "Price comparison" },
        { icon: Shield, text: language === "ar" ? "تقييمات موثوقة" : "Verified ratings" },
        { icon: TrendingUp, text: language === "ar" ? "توصيل سريع" : "Fast delivery" },
      ],
      gradient: "from-blue-500 via-indigo-500 to-purple-600",
      bgGradient: "from-blue-500/10 via-indigo-500/5 to-transparent",
      iconColor: "text-blue-500",
      href: "/auth?role=supplier",
      video: suppliersVideo,
    },
    {
      id: "roasters",
      Icon: Flame,
      number: "03",
      title: language === "ar" ? "المحامص" : "Roasters",
      subtitle: language === "ar" ? "فن التحميص" : "The Art of Roasting",
      description: language === "ar"
        ? "أدوات متقدمة لإدارة المحمصة"
        : "Advanced tools for roastery management",
      features: [
        { icon: Package, text: language === "ar" ? "إدارة المخزون" : "Inventory" },
        { icon: TrendingUp, text: language === "ar" ? "تتبع الطلبات" : "Order tracking" },
        { icon: Sparkles, text: language === "ar" ? "تحليل الأداء" : "Analytics" },
      ],
      gradient: "from-orange-500 via-amber-500 to-yellow-500",
      bgGradient: "from-orange-500/10 via-amber-500/5 to-transparent",
      iconColor: "text-orange-500",
      href: "/auth?role=roaster",
      video: roastersVideo,
    },
    {
      id: "cafes",
      Icon: Coffee,
      number: "04",
      title: language === "ar" ? "المقاهي" : "Cafes",
      subtitle: language === "ar" ? "تجربة القهوة المثالية" : "The Perfect Coffee Experience",
      description: language === "ar"
        ? "حلول متكاملة للمقاهي"
        : "Integrated solutions for cafes",
      features: [
        { icon: Zap, text: language === "ar" ? "طلب آلي" : "Auto ordering" },
        { icon: Sparkles, text: language === "ar" ? "برنامج ولاء" : "Loyalty" },
        { icon: Shield, text: language === "ar" ? "تدريب معتمد" : "Training" },
      ],
      gradient: "from-rose-500 via-pink-500 to-fuchsia-600",
      bgGradient: "from-rose-500/10 via-pink-500/5 to-transparent",
      iconColor: "text-rose-500",
      href: "/auth?role=cafe",
      video: cafesVideo,
    },
    {
      id: "maintenance",
      Icon: Wrench,
      number: "05",
      title: language === "ar" ? "الصيانة" : "Maintenance",
      subtitle: language === "ar" ? "دعم فني متكامل" : "Complete Technical Support",
      description: language === "ar"
        ? "خدمات صيانة معدات القهوة"
        : "Coffee equipment maintenance services",
      features: [
        { icon: Shield, text: language === "ar" ? "صيانة وقائية" : "Preventive" },
        { icon: Package, text: language === "ar" ? "قطع أصلية" : "Genuine parts" },
        { icon: Clock, text: language === "ar" ? "دعم 24/7" : "24/7 support" },
      ],
      gradient: "from-slate-500 via-gray-500 to-zinc-600",
      bgGradient: "from-slate-500/10 via-gray-500/5 to-transparent",
      iconColor: "text-slate-500",
      href: "/auth?role=maintenance",
      video: maintenanceVideo,
    },
  ];

  return (
    <section id="five-pillars" className="py-24 md:py-32 bg-background relative overflow-hidden" ref={sectionRef}>
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-fivehub-gold/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-6 py-3 rounded-full mb-8 border border-primary/20">
            <Sparkles className="w-5 h-5" />
            <span className="font-bold">{language === "ar" ? "لماذا FIVE HUB؟" : "Why FIVE HUB?"}</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-7xl font-black mb-6">
            {language === "ar" ? (
              <>خمسة أركان <span className="text-primary">لنجاحك</span></>
            ) : (
              <>Five Pillars for <span className="text-primary">Your Success</span></>
            )}
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {language === "ar"
              ? "منصة شاملة تربط جميع أطراف صناعة القهوة في مكان واحد"
              : "A comprehensive platform connecting all coffee industry stakeholders"}
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {pillars.map((pillar, index) => (
            <div 
              key={pillar.id} 
              className={index === 4 ? "lg:col-start-2" : ""}
              data-pillar-card
              data-index={index}
            >
              <Card
                className={`group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 h-full bg-card ${
                  visibleCards.includes(index) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Video Section */}
                <div className="relative aspect-[9/12] overflow-hidden bg-black">
                  <ReliableVideoPlayer
                    src={pillar.video}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Icon Badge */}
                  <div className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} w-12 h-12 rounded-full bg-gradient-to-br ${pillar.gradient} flex items-center justify-center shadow-xl`}>
                    <pillar.Icon className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  
                  {/* Content Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-2xl font-black mb-1">{pillar.title}</h3>
                    <p className="text-white/80 text-sm mb-3">{pillar.subtitle}</p>
                    <p className="text-white/70 text-sm mb-4 line-clamp-2">{pillar.description}</p>
                    
                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {pillar.features.map((feature, i) => (
                        <div 
                          key={i} 
                          className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full text-xs"
                        >
                          <feature.icon className="w-3 h-3" />
                          <span>{feature.text}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* CTA Button */}
                    <Link 
                      to={pillar.href}
                      className={`inline-flex items-center gap-2 bg-gradient-to-r ${pillar.gradient} text-white font-bold px-6 py-3 rounded-full hover:scale-105 transition-transform`}
                    >
                      <span>{language === "ar" ? "ابدأ الآن" : "Get Started"}</span>
                      <ChevronRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
                    </Link>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Connection Visualization */}
        <div className="mt-20 flex justify-center">
          <div className="flex items-center gap-4 bg-muted/50 backdrop-blur-sm px-8 py-4 rounded-full border border-border/50">
            {pillars.map((pillar, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${pillar.gradient} flex items-center justify-center shadow-lg`}>
                  <pillar.Icon className="w-5 h-5 text-white" />
                </div>
                {i < pillars.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FivePillars;
