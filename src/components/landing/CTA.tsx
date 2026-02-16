import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { HandSVG, HandPattern } from "@/components/HandPattern";

const CTA = () => {
  const { language, dir } = useLanguage();
  const isRtl = dir === "rtl";

  return (
    <section className="py-24 bg-gradient-to-br from-primary via-primary to-primary/90 relative overflow-hidden">
      {/* Hand Pattern Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Central large hand */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[550px] opacity-[0.06]">
          <HandSVG color="white" variant="glow" className="w-full h-full" />
        </div>
        
        {/* Floating hands */}
        <HandPattern 
          className="absolute top-12 right-[10%] rotate-[20deg]" 
          size="lg" 
          opacity={0.05}
          color="white"
          variant="outline"
          animated
        />
        <HandPattern 
          className="absolute bottom-16 left-[8%] -rotate-[15deg]" 
          size="xl" 
          opacity={0.05}
          color="white"
          variant="outline"
          animated
        />
        <HandPattern 
          className="absolute top-1/4 left-[15%] rotate-[35deg]" 
          size="md" 
          opacity={0.04}
          color="white"
          variant="outline"
        />
        <HandPattern 
          className="absolute bottom-1/3 right-[12%] -rotate-[25deg]" 
          size="md" 
          opacity={0.04}
          color="white"
          variant="outline"
        />
      </div>

      <div className="container mx-auto px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-full mb-8">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold">
              {language === "ar" ? "ابدأ مجاناً اليوم" : "Start Free Today"}
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6">
            {language === "ar"
              ? "انضم لعائلة FIVE HUB"
              : "Join the FIVE HUB Family"}
          </h2>

          {/* Description */}
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            {language === "ar"
              ? "سواء كنت مزارعاً، مورداً، محمصة، مقهى، أو فني صيانة - لدينا كل ما تحتاجه للنجاح"
              : "Whether you're a farmer, supplier, roaster, cafe, or maintenance technician - we have everything you need to succeed"}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/auth">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 shadow-xl font-bold text-lg px-10 py-7 rounded-full"
              >
                {language === "ar" ? "سجل الآن مجاناً" : "Sign Up Free Now"}
                <ArrowRight className={`w-5 h-5 mr-2 ${isRtl ? "rotate-180" : ""}`} />
              </Button>
            </Link>
            <Link to="/suppliers">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 font-bold text-lg px-10 py-7 rounded-full"
              >
                {language === "ar" ? "تصفح الموردين" : "Browse Suppliers"}
              </Button>
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-white/60">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              <span>{language === "ar" ? "آمن 100%" : "100% Secure"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <span>{language === "ar" ? "إعداد سريع" : "Quick Setup"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">💳</span>
              <span>{language === "ar" ? "بدون بطاقة ائتمان" : "No Credit Card"}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
