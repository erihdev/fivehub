import { useLanguage } from "@/hooks/useLanguage";
import { Badge } from "@/components/ui/badge";
import { HandSVG } from "@/components/HandPattern";

const HowItWorks = () => {
  const { language } = useLanguage();

  const steps = [
    {
      step: "01",
      title: language === "ar" ? "سجل حسابك" : "Create Account",
      description: language === "ar"
        ? "أنشئ حسابك مجاناً وحدد دورك في سلسلة القهوة"
        : "Create your free account and define your role in the coffee chain",
      icon: "👤",
    },
    {
      step: "02",
      title: language === "ar" ? "تواصل مع الشركاء" : "Connect with Partners",
      description: language === "ar"
        ? "ابحث وتواصل مع المزارع والموردين والمحامص والمقاهي"
        : "Search and connect with farms, suppliers, roasters, and cafes",
      icon: "🤝",
    },
    {
      step: "03",
      title: language === "ar" ? "أدر أعمالك" : "Manage Business",
      description: language === "ar"
        ? "استخدم أدواتنا الذكية لإدارة المخزون والطلبات والتقارير"
        : "Use our smart tools to manage inventory, orders, and reports",
      icon: "📊",
    },
    {
      step: "04",
      title: language === "ar" ? "انمُ ونجح" : "Grow & Succeed",
      description: language === "ar"
        ? "وسّع شبكتك واستفد من برامج الولاء والمكافآت"
        : "Expand your network and benefit from loyalty programs and rewards",
      icon: "🚀",
    },
  ];

  return (
    <section className="py-24 bg-secondary/30 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-fivehub-gold via-primary to-fivehub-orange-dark" />
      
      {/* Hand Pattern Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-16 w-32 h-48 opacity-[0.04] rotate-12">
          <HandSVG color="hsl(var(--foreground))" variant="outline" className="w-full h-full" />
        </div>
        <div className="absolute bottom-20 left-16 w-28 h-42 opacity-[0.04] -rotate-12">
          <HandSVG color="hsl(var(--foreground))" variant="outline" className="w-full h-full" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-96 opacity-[0.02]">
          <HandSVG color="hsl(var(--foreground))" variant="solid" className="w-full h-full" />
        </div>
      </div>

      <div className="container mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            {language === "ar" ? "كيف يعمل؟" : "How It Works?"}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            {language === "ar" ? "أربع خطوات بسيطة" : "Four Simple Steps"}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {language === "ar"
              ? "ابدأ رحلتك مع FIVE HUB في دقائق معدودة"
              : "Start your journey with FIVE HUB in just minutes"}
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/3 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent" />

          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Step Card */}
              <div className="bg-card rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2 relative z-10">
                {/* Icon */}
                <div className="text-5xl mb-6">{step.icon}</div>

                {/* Step Number */}
                <div className="absolute top-4 right-4 text-7xl font-display font-black text-muted/20">
                  {step.step}
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>

              {/* Arrow (hidden on last item) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/3 -right-4 z-20">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-primary-foreground text-lg">→</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
